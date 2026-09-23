import { createAnthropicLlm } from "@/lib/ai/llm";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { zodConverter } from "@/lib/repos/converter";
import { FirestoreStore } from "@/lib/repos/firestore-store";
import { SourceRepo } from "@/lib/repos/source-repo";
import type { Severity, StepName } from "@/lib/schema/enums";
import { DIMENSION_KEYS } from "@/lib/schema/rubrics";
import { Run } from "@/lib/schema/run";
import type { Usage } from "@/lib/schema/run";

import type { Firestore } from "firebase-admin/firestore";

/** Firestore's own per-batch write cap (stable platform limit), same as SourceRepo/FirestoreStore. */
const MAX_BATCH_WRITES = 500;

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  estimatedCostUsd: 0,
};

const SEVERITY_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function runDoc(db: Firestore, analysisId: string, runId: string) {
  return db
    .collection("analyses")
    .doc(analysisId)
    .collection("runs")
    .doc(runId)
    .withConverter(zodConverter(Run));
}

function sumUsage(usage: Usage[]): Usage {
  return usage.reduce(
    (total, u) => ({
      inputTokens: total.inputTokens + u.inputTokens,
      outputTokens: total.outputTokens + u.outputTokens,
      cacheReadTokens: total.cacheReadTokens + u.cacheReadTokens,
      cacheWriteTokens: total.cacheWriteTokens + u.cacheWriteTokens,
      estimatedCostUsd: total.estimatedCostUsd + u.estimatedCostUsd,
    }),
    ZERO_USAGE,
  );
}

/**
 * A resumed/re-run analysis re-does EXTRACT_FACTS onward (PROJECT_MEMORY
 * D-063 — the user chose this over true deterministic-id step resume, which
 * would need refactoring already-shipped T-2.08/T-2.09 id generation).
 * `Fact` documents carry the producing run's id but are never otherwise
 * scoped or versioned (SCHEMA.md has no such field to key on), so without
 * this cleanup a second run on the same analysis would leave the first
 * run's facts behind forever, and every future `listFacts()` caller would
 * see both runs' facts merged together. Deleting the analysis's whole
 * `facts` subcollection right before a run writes its own is the fix —
 * facts are engine-intermediate data, not a versioned, user-facing
 * document R-DAT-04 protects (that rule is about `Report`, which already
 * gets a fresh id and version every run).
 */
async function deleteExistingFacts(db: Firestore, analysisId: string): Promise<void> {
  const snapshot = await db.collection("analyses").doc(analysisId).collection("facts").get();
  const refs = snapshot.docs.map((doc) => doc.ref);
  for (let start = 0; start < refs.length; start += MAX_BATCH_WRITES) {
    const batch = db.batch();
    for (const ref of refs.slice(start, start + MAX_BATCH_WRITES)) batch.delete(ref);
    await batch.commit();
  }
}

export interface ExecuteRunArgs {
  analysisId: string;
  runId: string;
  signal: AbortSignal;
}

/**
 * The production run orchestrator (T-3.08, TRD Mode A / R-ARC-09: shares
 * `runAnalysisPipeline`'s sequence with the CLI/eval harness, just with real
 * persistence and a real `Run` document instead of an in-memory result).
 * Called from `after()` in `POST /api/analyses/:id/runs` (and from the
 * resume route) so it keeps executing after the request that started it has
 * already responded — TRD 3's "the handler keeps executing the pipeline to
 * completion... must ignore client disconnects" (`after()`'s callback
 * lifecycle is independent of the original request/response, so a client
 * disconnect after the 202 response never touches this).
 *
 * Not wired to a live model in this sandbox — see PROJECT_MEMORY, T-2.18's
 * standing blocker (no `ANTHROPIC_API_KEY` configured here). Verified
 * end-to-end against the real Firestore emulator with a fake `LLM`
 * (`tests/unit/run-pipeline.test.ts`), the same "real store, fake model"
 * split T-2.16's pipeline tests already use.
 */
export async function executeRun(db: Firestore, args: ExecuteRunArgs): Promise<void> {
  const { analysisId, runId, signal } = args;
  const analysisRepo = new AnalysisRepo(db);
  const sourceRepo = new SourceRepo(db);
  const store = new FirestoreStore(db);
  const ref = runDoc(db, analysisId, runId);

  const [analysis, runSnapshot] = await Promise.all([analysisRepo.get(analysisId), ref.get()]);
  if (!analysis || !runSnapshot.exists) {
    logger.error({ analysisId, runId }, "executeRun: analysis or run document missing");
    return;
  }
  const run = runSnapshot.data()!;

  if (run.cancelRequested) {
    await ref.set(
      { status: "CANCELLED", finishedAt: new Date().toISOString() },
      { merge: true },
    );
    await analysisRepo.update(analysisId, { status: "READY", updatedAt: new Date().toISOString() });
    return;
  }

  // Tracked locally and written in full on every call, rather than relying
  // on Firestore's own merge semantics for the nested `steps` map — awaited
  // at every pipeline call site (pipeline.ts's `onProgress` accepts a
  // promise for exactly this), so writes land in step order instead of
  // racing each other.
  let stepsState = run.steps;
  const onProgress = async (step: StepName): Promise<void> => {
    stepsState = { ...stepsState, [step]: { status: "DONE", attempt: 1, finishedAt: new Date().toISOString() } };
    try {
      await store.updateRun(analysisId, runId, { steps: stepsState });
    } catch (error) {
      logger.warn({ analysisId, runId, step, errorName: (error as Error).name }, "run progress update failed");
    }
  };

  try {
    const sources = await sourceRepo.list(analysisId);
    const evidence = await store.listEvidence(analysisId);

    if (evidence.length === 0) {
      await ref.set(
        {
          status: "FAILED",
          error: { code: "NO_USABLE_SOURCES", message: "No source produced any usable evidence." },
          finishedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      await analysisRepo.update(analysisId, { status: "FAILED", updatedAt: new Date().toISOString() });
      return;
    }

    await deleteExistingFacts(db, analysisId);

    const version = (analysis.latest?.version ?? 0) + 1;

    const result = await runAnalysisPipeline({
      analysisId,
      runId,
      ownerId: analysis.ownerId,
      version,
      startupName: analysis.startup.name,
      stage: analysis.startup.stage,
      sector: analysis.startup.sector,
      stageProfileOverride: run.options.stageProfile,
      analystFocus: analysis.options.analystFocus,
      companyDomain: analysis.startup.website ? new URL(analysis.startup.website).hostname : undefined,
      preIngested: { sources, evidence },
      llm: createAnthropicLlm(),
      tokenBudgetLimit: env.RUN_TOKEN_BUDGET,
      concurrency: env.ANALYZE_CONCURRENCY,
      signal,
      onProgress,
    });

    await store.putFacts(analysisId, result.facts);
    for (const dimension of result.dimensions) {
      await store.saveDimension(analysisId, result.report.id, dimension);
    }
    await store.saveReport(analysisId, result.report);

    const dimensionStatus: Record<string, "DONE" | "FAILED"> = Object.fromEntries(
      DIMENSION_KEYS.map((key) => [key, "DONE"]),
    );
    for (const failed of result.failedDimensions) dimensionStatus[failed.dimension] = "FAILED";

    const warnings = result.budgetExceeded
      ? [...result.warnings, { code: "BUDGET_EXCEEDED" as const, message: "Run token budget exceeded." }]
      : result.warnings;

    const runStatus =
      result.failedDimensions.length > 0 || result.budgetExceeded ? "PARTIAL" : "SUCCEEDED";

    const now = new Date().toISOString();
    await ref.set(
      {
        status: runStatus,
        dimensionStatus,
        usage: sumUsage(result.usage),
        warnings,
        reportId: result.report.id,
        finishedAt: now,
      },
      { merge: true },
    );

    const openFlagSeverities = result.report.flags
      .filter((flag) => flag.status === "OPEN")
      .map((flag) => flag.severity);
    const topFlagSeverity =
      openFlagSeverities.length > 0
        ? openFlagSeverities.reduce((worst, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[worst] ? s : worst))
        : null;

    await analysisRepo.update(analysisId, {
      status: runStatus === "PARTIAL" ? "PARTIAL" : "COMPLETE",
      updatedAt: now,
      latest: {
        reportId: result.report.id,
        version,
        overallScore: result.report.overall.score,
        confidence: result.report.overall.confidence,
        label: result.report.overall.label,
        generatedAt: result.report.generatedAt,
        topFlagSeverity,
      },
    });
  } catch (error) {
    const aborted = signal.aborted;
    const now = new Date().toISOString();
    logger.error(
      { analysisId, runId, aborted, errorName: error instanceof Error ? error.name : "unknown" },
      "run execution failed",
    );
    await ref.set(
      aborted
        ? { status: "CANCELLED", finishedAt: now }
        : {
            status: "FAILED",
            error: { code: "RUN_FAILED", message: "The run failed. Try again." },
            finishedAt: now,
          },
      { merge: true },
    );
    await analysisRepo.update(analysisId, {
      status: aborted ? "READY" : "FAILED",
      updatedAt: now,
    });
  }
}
