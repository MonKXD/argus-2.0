import { after, NextResponse } from "next/server";

import { activeModelIds } from "@/lib/ai/create-llm";
import { stageProfileFor, SCORING_VERSION } from "@/lib/analysis/config";
import { SYNTHESIS_PROMPT_VERSION } from "@/lib/analysis/prompts/synthesis";
import { assertWithinRunLimits } from "@/lib/analysis/run-limits";
import { executeRun } from "@/lib/analysis/run-pipeline";
import { registerRun, unregisterRun } from "@/lib/analysis/run-registry";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { zodConverter } from "@/lib/repos/converter";
import { StepName } from "@/lib/schema/enums";
import { newId } from "@/lib/schema/ids";
import { Run } from "@/lib/schema/run";
import type { StepState, Usage } from "@/lib/schema/run";

import type { Firestore } from "firebase-admin/firestore";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  estimatedCostUsd: 0,
};

function initialSteps(): Record<string, StepState> {
  return Object.fromEntries(StepName.options.map((name) => [name, { status: "PENDING", attempt: 0 }]));
}

function idempotencyDoc(db: Firestore, analysisId: string, key: string) {
  return db.collection("analyses").doc(analysisId).collection("runIdempotency").doc(key);
}

/**
 * TRD section 7 / Mode A (Inline, TRD section 3): creates the `Run` document
 * and returns 202 immediately with `runId`; the pipeline itself keeps
 * running via `after()` (Next.js 16, stable since v15.1) after the response
 * has been sent — the request's own abort signal is never touched (a
 * pre-existing PROJECT_MEMORY gotcha this API is the reason for: "the
 * handler must ignore client disconnects"). UI progress comes from the
 * client's own Firestore listener on the run document (D-010), not this
 * response.
 */
export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id: analysisId } = await params;
    const user = await requireUser();
    const db = getAdminFirestore();

    const analysisRepo = new AnalysisRepo(db);
    const analysis = await analysisRepo.get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const existing = await idempotencyDoc(db, analysisId, idempotencyKey).get();
      if (existing.exists) {
        return NextResponse.json({ runId: (existing.data() as { runId: string }).runId }, { status: 202 });
      }
    }

    await assertWithinRunLimits(db, user.uid);

    const runId = newId("run");
    const now = new Date().toISOString();
    const stageProfile = stageProfileFor(analysis.startup.stage, analysis.options.stageProfile);

    const run: Run = {
      id: runId,
      analysisId,
      ownerId: analysis.ownerId,
      status: "RUNNING",
      options: { webResearch: analysis.options.webResearch, stageProfile },
      steps: initialSteps(),
      dimensionStatus: {},
      modelIds: activeModelIds(),
      promptVersion: SYNTHESIS_PROMPT_VERSION,
      scoringVersion: SCORING_VERSION,
      usage: ZERO_USAGE,
      warnings: [],
      cancelRequested: false,
      reportId: null,
      startedAt: now,
    };

    await db
      .collection("analyses")
      .doc(analysisId)
      .collection("runs")
      .doc(runId)
      .withConverter(zodConverter(Run))
      .set(run);

    if (idempotencyKey) {
      await idempotencyDoc(db, analysisId, idempotencyKey).set({ runId, createdAt: now });
    }

    await analysisRepo.update(analysisId, { status: "PROCESSING", currentRunId: runId, updatedAt: now });

    const controller = registerRun(runId);
    after(() =>
      executeRun(db, { analysisId, runId, signal: controller.signal }).finally(() => unregisterRun(runId)),
    );

    return NextResponse.json({ runId }, { status: 202 });
  } catch (error) {
    return handleApiError(error);
  }
}
