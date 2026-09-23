import { NextResponse } from "next/server";

import { abortRun } from "@/lib/analysis/run-registry";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { zodConverter } from "@/lib/repos/converter";
import { Run } from "@/lib/schema/run";

interface RouteContext {
  params: Promise<{ id: string; runId: string }>;
}

/**
 * TRD section 7: request cancellation. Sets the durable
 * `Run.cancelRequested` flag (observable by any process, and by a future
 * resume) and, best-effort, aborts this process's own in-flight
 * `AbortController` for the run if it happens to be the one executing it
 * (PROJECT_MEMORY D-063's in-process registry). A run already in a terminal
 * state is a no-op, not an error — cancelling something that already
 * finished is a race any client can hit legitimately.
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

    const terminal = run.status === "SUCCEEDED" || run.status === "FAILED" || run.status === "CANCELLED";
    if (terminal) {
      return NextResponse.json({ status: run.status, aborted: false });
    }

    await ref.set({ cancelRequested: true }, { merge: true });
    const aborted = abortRun(runId);

    return NextResponse.json({ status: run.status, aborted });
  } catch (error) {
    return handleApiError(error);
  }
}
