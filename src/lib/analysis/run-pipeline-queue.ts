import { FieldValue } from "firebase-admin/firestore";

import { recordActivity } from "@/lib/activity";
import { createLlm } from "@/lib/ai/create-llm";
import { stageProfileFor, SCORING_VERSION } from "@/lib/analysis/config";
import { detectInjectionPattern } from "@/lib/analysis/ingest/injection-detection";
import { buildInjectionFlags } from "@/lib/analysis/ingest/injection-flags";
import { makeEvidenceInfoOf, recomputeDimensionScores, toDimensionResults } from "@/lib/analysis/pipeline";
import { SYNTHESIS_PROMPT_VERSION } from "@/lib/analysis/prompts/synthesis";
import { deleteExistingFacts } from "@/lib/analysis/run-pipeline";
import { computeOverall } from "@/lib/analysis/scoring/overall";
import { analyzeAllDimensions } from "@/lib/analysis/steps/analyze";
import { runConsistency } from "@/lib/analysis/steps/consistency";
import { extractFacts } from "@/lib/analysis/steps/extract-facts";
import { runSynthesis } from "@/lib/analysis/steps/synthesize";
import { runVerify } from "@/lib/analysis/steps/verify";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { zodConverter } from "@/lib/repos/converter";
import { FirestoreStore } from "@/lib/repos/firestore-store";
import { ReportRepo } from "@/lib/repos/report-repo";
import { SourceRepo } from "@/lib/repos/source-repo";
import type { Flag } from "@/lib/schema/claims";
import type { Severity, StepName } from "@/lib/schema/enums";
import { newId } from "@/lib/schema/ids";
import type { Report, RunWarning } from "@/lib/schema/report";
import { DIMENSION_KEYS } from "@/lib/schema/rubrics";
import { Run } from "@/lib/schema/run";
import type { RunQueueState, Usage } from "@/lib/schema/run";

import type { Firestore } from "firebase-admin/firestore";

const SEVERITY_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  estimatedCostUsd: 0,
};

function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    estimatedCostUsd: a.estimatedCostUsd + b.estimatedCostUsd,
  };
}

function sumUsage(items: Usage[]): Usage {
  return items.reduce(addUsage, ZERO_USAGE);
}

function runDoc(db: Firestore, analysisId: string, runId: string) {
  return db
    .collection("analyses")
    .doc(analysisId)
    .collection("runs")
    .doc(runId)
    .withConverter(zodConverter(Run));
}

export interface ExecuteRunChunkArgs {
  analysisId: string;
  runId: string;
  signal: AbortSignal;
}

export interface ExecuteRunChunkResult {
  /** `false` means the run isn't finished — the caller (the queue route)
   * should publish another `RunStepMessage` to continue. */
  done: boolean;
}

/**
 * T-6.03 (queue-based Mode B, TQ-4): the chunked counterpart to
 * `run-pipeline.ts`'s `executeRun` (Mode A). Each call does one bounded
 * slice of the same AI_SPEC pipeline Mode A runs in one shot, persists its
 * output, and returns — a fresh QStash-delivered invocation (no shared
 * memory with the last one) picks up from there. Reuses the exact same
 * step functions `pipeline.ts` calls (`extractFacts`, `runConsistency`,
 * `analyzeAllDimensions`, `computeOverall`, `runSynthesis`, `runVerify`)
 * rather than `runAnalysisPipeline()` itself, since that function is one
 * straight-line call with no pause point — R-ARC-09's "share the same
 * runPipeline(ctx)" is satisfied at the step-function level, the smallest
 * unit both modes can actually share.
 *
 * Chunk boundaries (`RunQueueState` carries what survives between them,
 * PROJECT_MEMORY D-099):
 * - A: EXTRACT_FACTS + CONSISTENCY — facts persist via `store.putFacts`
 *   (reloadable in later chunks); flags/warnings/usage start accumulating
 *   in `queueState`.
 * - B: ANALYZE + SCORE — dimensions persist immediately to the real
 *   `reports/{reportId}/dimensions/{key}` subcollection (not kept in
 *   `queueState` — SCHEMA.md's own 1 MiB document-size reason for that
 *   subcollection existing applies here too), `overall` is small enough to
 *   travel in `queueState`.
 * - C: SYNTHESIZE + VERIFY + FINALIZE, including AI_SPEC 3.8's "re-run
 *   SCORE and SYNTHESIZE once" cycle when VERIFY changes a dimension claim
 *   — self-contained in one chunk since it needs the same already-loaded
 *   dimensions/evidence either way.
 */
export async function executeRunChunk(db: Firestore, args: ExecuteRunChunkArgs): Promise<ExecuteRunChunkResult> {
  const { analysisId, runId, signal } = args;
  const analysisRepo = new AnalysisRepo(db);
  const sourceRepo = new SourceRepo(db);
  const store = new FirestoreStore(db);
  const reportRepo = new ReportRepo(db);
  const ref = runDoc(db, analysisId, runId);

  const [analysis, runSnapshot] = await Promise.all([analysisRepo.get(analysisId), ref.get()]);
  if (!analysis || !runSnapshot.exists) {
    logger.error({ analysisId, runId }, "executeRunChunk: analysis or run document missing");
    return { done: true };
  }
  const run = runSnapshot.data()!;

  if (run.cancelRequested) {
    await ref.set(
      { status: "CANCELLED", finishedAt: new Date().toISOString(), queueState: FieldValue.delete() },
      { merge: true },
    );
    await analysisRepo.update(analysisId, { status: "READY", updatedAt: new Date().toISOString() });
    return { done: true };
  }

  // Mutable, carried across every `markDone` call within this invocation —
  // re-deriving from `run.steps` each time would lose earlier calls' own
  // updates within the same chunk (chunk C marks several steps in one
  // invocation). Same pattern as `executeRun`'s own `stepsState`/`onProgress`.
  let stepsState = run.steps;
  const markDone = async (steps: StepName[]): Promise<void> => {
    const now = new Date().toISOString();
    const patch = Object.fromEntries(steps.map((s) => [s, { status: "DONE" as const, attempt: 1, finishedAt: now }]));
    stepsState = { ...stepsState, ...patch };
    await store.updateRun(analysisId, runId, { steps: stepsState });
  };

  try {
    if (!run.queueState) {
      // First chunk: same setup `executeRun` does once up front.
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
        await recordActivity(db, {
          ownerId: analysis.ownerId,
          type: "RUN_FAILED",
          analysisId,
          message: `The run for ${analysis.startup.name} failed: no usable sources.`,
        });
        return { done: true };
      }

      const flags: Flag[] = [];
      const warnings: RunWarning[] = [];
      const injectionMatches = evidence.flatMap((item) => {
        const pattern = detectInjectionPattern(item.text);
        return pattern ? [{ evidenceId: item.id, pattern }] : [];
      });
      const injection = buildInjectionFlags(injectionMatches);
      flags.push(...injection.flags);
      warnings.push(...injection.warnings);

      await deleteExistingFacts(db, analysisId);

      const factsResult = await extractFacts({
        analysisId,
        runId,
        startupName: analysis.startup.name,
        llm: createLlm(),
        evidence,
        sources,
        signal,
      });
      warnings.push(...factsResult.warnings);
      let usage = sumUsage(factsResult.usage);

      const consistencyResult = await runConsistency({
        llm: createLlm(),
        facts: factsResult.facts,
        signal,
      });
      flags.push(...consistencyResult.flags);
      if (consistencyResult.usage) usage = addUsage(usage, consistencyResult.usage);

      await store.putFacts(analysisId, consistencyResult.facts);

      const queueState: RunQueueState = {
        reportId: newId("rpt"),
        flags,
        warnings,
        usage,
      };
      await markDone(["EXTRACT_FACTS", "CONSISTENCY"]);
      await store.updateRun(analysisId, runId, { queueState });
      return { done: false };
    }

    const queueState = run.queueState;

    if (!queueState.overall) {
      // Chunk B: ANALYZE + SCORE.
      const [sources, evidence, facts] = await Promise.all([
        sourceRepo.list(analysisId),
        store.listEvidence(analysisId),
        store.listFacts(analysisId),
      ]);

      const analyzeResult = await analyzeAllDimensions({
        analysisId,
        runId,
        startupName: analysis.startup.name,
        stage: analysis.startup.stage,
        sector: analysis.startup.sector,
        analystFocus: analysis.options.analystFocus,
        llm: createLlm(),
        evidence,
        sources,
        facts,
        concurrency: env.ANALYZE_CONCURRENCY,
        signal,
      });

      for (const dimension of analyzeResult.dimensions) {
        await store.saveDimension(analysisId, queueState.reportId, dimension);
      }

      const stageProfile = stageProfileFor(analysis.startup.stage, run.options.stageProfile);
      const overall = computeOverall(toDimensionResults(analyzeResult.dimensions), stageProfile, queueState.flags);

      const nextState: RunQueueState = {
        ...queueState,
        overall,
        warnings: [...queueState.warnings, ...analyzeResult.warnings],
        usage: addUsage(queueState.usage, sumUsage(analyzeResult.usage)),
        failedDimensions: analyzeResult.failed,
      };
      await markDone(["ANALYZE", "SCORE"]);
      await store.updateRun(analysisId, runId, { queueState: nextState });
      return { done: false };
    }

    // Chunk C: SYNTHESIZE + VERIFY + FINALIZE, including the "re-run once" cycle.
    const [sources, evidence, facts] = await Promise.all([
      sourceRepo.list(analysisId),
      store.listEvidence(analysisId),
      store.listFacts(analysisId),
    ]);
    let dimensions = await reportRepo.listDimensions(analysisId, queueState.reportId);
    let flags = queueState.flags;
    let overall = queueState.overall!;
    const warnings = [...queueState.warnings];
    let usage = queueState.usage;
    const stageProfile = stageProfileFor(analysis.startup.stage, run.options.stageProfile);
    const evidenceInfoOf = makeEvidenceInfoOf(evidence);

    let synthResult = await runSynthesis({
      startupName: analysis.startup.name,
      overall,
      dimensions,
      flags,
      facts,
      llm: createLlm(),
      signal,
    });
    warnings.push(...synthResult.warnings);
    usage = addUsage(usage, synthResult.usage);
    await markDone(["SYNTHESIZE"]);

    let verifyResult = runVerify({ dimensions, narrative: synthResult.narrative, flags, checklist: synthResult.checklist, facts, sources, evidence });
    warnings.push(...verifyResult.warnings);
    await markDone(["VERIFY"]);

    if (verifyResult.changedDimensions.length > 0) {
      dimensions = recomputeDimensionScores(verifyResult.dimensions, evidenceInfoOf, dimensions);
      for (const dimension of dimensions) await store.saveDimension(analysisId, queueState.reportId, dimension);
      flags = verifyResult.flags;
      overall = computeOverall(toDimensionResults(dimensions), stageProfile, flags);
      await markDone(["SCORE"]);

      synthResult = await runSynthesis({
        startupName: analysis.startup.name,
        overall,
        dimensions,
        flags,
        facts,
        llm: createLlm(),
        signal,
      });
      warnings.push(...synthResult.warnings);
      usage = addUsage(usage, synthResult.usage);
      await markDone(["SYNTHESIZE"]);

      verifyResult = runVerify({ dimensions, narrative: synthResult.narrative, flags, checklist: synthResult.checklist, facts, sources, evidence });
      warnings.push(...verifyResult.warnings);
      await markDone(["VERIFY"]);
    } else {
      dimensions = verifyResult.dimensions;
      flags = verifyResult.flags;
    }

    const version = (analysis.latest?.version ?? 0) + 1;
    const report: Report = {
      id: queueState.reportId,
      analysisId,
      runId,
      ownerId: analysis.ownerId,
      version,
      schemaVersion: 1,
      scoringVersion: SCORING_VERSION,
      promptVersion: SYNTHESIS_PROMPT_VERSION,
      generatedAt: new Date().toISOString(),
      stage: analysis.startup.stage,
      stageProfile,
      overall,
      narrative: verifyResult.narrative,
      flags: verifyResult.flags,
      checklist: verifyResult.checklist,
      evidenceStats: verifyResult.evidenceStats,
      warnings,
    };
    await store.saveReport(analysisId, report);
    await markDone(["FINALIZE"]);

    const dimensionStatus: Record<string, "DONE" | "FAILED"> = Object.fromEntries(
      DIMENSION_KEYS.map((key) => [key, "DONE"]),
    );
    for (const failed of queueState.failedDimensions ?? []) dimensionStatus[failed.dimension] = "FAILED";

    const budgetExceeded = usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens >= env.RUN_TOKEN_BUDGET;
    const finalWarnings = budgetExceeded
      ? [...warnings, { code: "BUDGET_EXCEEDED" as const, message: "Run token budget exceeded." }]
      : warnings;
    const runStatus = (queueState.failedDimensions?.length ?? 0) > 0 || budgetExceeded ? "PARTIAL" : "SUCCEEDED";

    const now = new Date().toISOString();
    await ref.set(
      {
        status: runStatus,
        dimensionStatus,
        usage,
        warnings: finalWarnings,
        reportId: report.id,
        finishedAt: now,
        queueState: FieldValue.delete(),
      },
      { merge: true },
    );

    const openFlagSeverities = report.flags.filter((flag) => flag.status === "OPEN").map((flag) => flag.severity);
    const topFlagSeverity =
      openFlagSeverities.length > 0
        ? openFlagSeverities.reduce((worst, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[worst] ? s : worst))
        : null;

    await analysisRepo.update(analysisId, {
      status: runStatus === "PARTIAL" ? "PARTIAL" : "COMPLETE",
      updatedAt: now,
      latest: {
        reportId: report.id,
        version,
        overallScore: report.overall.score,
        confidence: report.overall.confidence,
        label: report.overall.label,
        generatedAt: report.generatedAt,
        topFlagSeverity,
      },
    });
    await recordActivity(db, {
      ownerId: analysis.ownerId,
      type: "RUN_COMPLETED",
      analysisId,
      message:
        runStatus === "PARTIAL"
          ? `Run for ${analysis.startup.name} completed with some dimensions incomplete.`
          : `Run for ${analysis.startup.name} completed. Score: ${report.overall.score ?? "—"}.`,
    });
    return { done: true };
  } catch (error) {
    const aborted = signal.aborted;
    const now = new Date().toISOString();
    logger.error(
      {
        analysisId,
        runId,
        aborted,
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "queue run chunk failed",
    );
    await ref.set(
      aborted
        ? { status: "CANCELLED", finishedAt: now, queueState: FieldValue.delete() }
        : {
            status: "FAILED",
            error: { code: "RUN_FAILED", message: "The run failed. Try again." },
            finishedAt: now,
            queueState: FieldValue.delete(),
          },
      { merge: true },
    );
    await analysisRepo.update(analysisId, { status: aborted ? "READY" : "FAILED", updatedAt: now });
    if (!aborted) {
      await recordActivity(db, {
        ownerId: analysis.ownerId,
        type: "RUN_FAILED",
        analysisId,
        message: `The run for ${analysis.startup.name} failed.`,
      });
    }
    return { done: true };
  }
}
