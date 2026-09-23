import { FieldValue } from "firebase-admin/firestore";
import { after, NextResponse } from "next/server";

import { assertWithinRunLimits } from "@/lib/analysis/run-limits";
import { executeRun } from "@/lib/analysis/run-pipeline";
import { registerRun, unregisterRun } from "@/lib/analysis/run-registry";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { ConflictError, handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { zodConverter } from "@/lib/repos/converter";
import { StepName } from "@/lib/schema/enums";
import { Run } from "@/lib/schema/run";
import type { StepState } from "@/lib/schema/run";

interface RouteContext {
  params: Promise<{ id: string; runId: string }>;
}

function resetSteps(): Record<string, StepState> {
  return Object.fromEntries(StepName.options.map((name) => [name, { status: "PENDING", attempt: 0 }]));
}

/**
 * TRD section 7: "Resume from first incomplete step." Per the user's own
 * resume-scope decision (PROJECT_MEMORY D-063), this isn't literal
 * per-step resume — the already-shipped fact/claim id generation (T-2.08/
 * T-2.09) isn't deterministic, so there's no safe partial restart point.
 * Instead this re-runs the *same* `Run` document's pipeline from
 * EXTRACT_FACTS onward (INGEST is already trivially skippable: sources were
 * ingested once at registration time, T-3.06/T-3.07, and never re-run).
 * Reuses the existing `runId` rather than minting a new one, so a client
 * already watching this run document via a Firestore listener keeps
 * watching the same one instead of needing to notice a new `currentRunId`.
 */
export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id: analysisId, runId } = await params;
    const user = await requireUser();
    const db = getAdminFirestore();

    const analysis = await new AnalysisRepo(db).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const ref = db
      .collection("analyses")
      .doc(analysisId)
      .collection("runs")
      .doc(runId)
      .withConverter(zodConverter(Run));
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new NotFoundError("Run not found.");
    const run = snapshot.data()!;

    const resumable = run.status === "FAILED" || run.status === "PARTIAL" || run.status === "CANCELLED";
    if (!resumable) {
      throw new ConflictError(`Run is ${run.status.toLowerCase()} and can't be resumed.`);
    }

    await assertWithinRunLimits(db, user.uid);

    const now = new Date().toISOString();
    await ref.set(
      {
        status: "RUNNING",
        steps: resetSteps(),
        dimensionStatus: {},
        cancelRequested: false,
        error: FieldValue.delete(),
        finishedAt: FieldValue.delete(),
        startedAt: now,
      },
      { merge: true },
    );

    await new AnalysisRepo(db).update(analysisId, {
      status: "PROCESSING",
      currentRunId: runId,
      updatedAt: now,
    });

    const controller = registerRun(runId);
    after(() =>
      executeRun(db, { analysisId, runId, signal: controller.signal }).finally(() => unregisterRun(runId)),
    );

    return NextResponse.json({ runId }, { status: 202 });
  } catch (error) {
    return handleApiError(error);
  }
}
