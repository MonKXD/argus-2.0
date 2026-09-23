import { Budget } from "@/lib/ai/budget";
import type { LLM } from "@/lib/ai/llm";
import { SCORING_VERSION, stageProfileFor } from "@/lib/analysis/config";
import { ingestSource, type IngestSourceInput } from "@/lib/analysis/ingest/ingest-source";
import { buildInjectionFlags } from "@/lib/analysis/ingest/injection-flags";
import { SYNTHESIS_PROMPT_VERSION } from "@/lib/analysis/prompts/synthesis";
import { computeDimensionScore, type ScoredCriterionInput } from "@/lib/analysis/scoring/dimension-score";
import { computeOverall, type DimensionResult } from "@/lib/analysis/scoring/overall";
import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import { analyzeAllDimensions, type FailedDimension } from "@/lib/analysis/steps/analyze";
import { runConsistency } from "@/lib/analysis/steps/consistency";
import { extractFacts } from "@/lib/analysis/steps/extract-facts";
import { runSynthesis } from "@/lib/analysis/steps/synthesize";
import { runVerify } from "@/lib/analysis/steps/verify";
import type { DimensionAnalysis, Flag } from "@/lib/schema/claims";
import type { Stage, StageProfile, StepName } from "@/lib/schema/enums";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";
import type { Report, RunWarning } from "@/lib/schema/report";
import type { Usage } from "@/lib/schema/run";

const DEFAULT_TOKEN_BUDGET = 2_000_000;

export interface RunAnalysisPipelineArgs {
  analysisId: string;
  runId: string;
  ownerId: string;
  version: number;
  startupName: string;
  stage: Stage;
  sector?: string;
  stageProfileOverride?: StageProfile;
  analystFocus?: string;
  companyDomain?: string;
  sources: IngestSourceInput[];
  llm: LLM;
  tokenBudgetLimit?: number;
  concurrency?: number;
  signal?: AbortSignal;
  /** Called as each step completes — the CLI (T-2.17) uses this for progress output; the eval harness ignores it. */
  onProgress?: (step: StepName) => void;
}

export interface RunAnalysisPipelineResult {
  report: Report;
  dimensions: DimensionAnalysis[];
  facts: Fact[];
  evidence: Evidence[];
  sources: Source[];
  failedDimensions: FailedDimension[];
  warnings: RunWarning[];
  usage: Usage[];
  budgetExceeded: boolean;
}

/**
 * The engine's in-memory orchestration (T-2.16/T-2.17): chains every
 * already-built step — INGEST, EXTRACT_FACTS, CONSISTENCY, ANALYZE, SCORE,
 * SYNTHESIZE, VERIFY, FINALIZE — into one function the eval harness and
 * the `pnpm analyze` CLI both call. Deliberately not the production step
 * runner: no `EvidenceStore` writes, no resumability, no `Run` document,
 * no `RESEARCH` (optional, off by default, and none of the eval fixtures
 * need it). T-3.08 builds the persisted, resumable version on top of this
 * same sequence — this is what "same runPipeline(ctx)" (R-ARC-09) shares
 * the *shape* of, not yet the final interface.
 *
 * "If any dimension claim changes, re-run SCORE and SYNTHESIZE once"
 * (AI_SPEC 3.8) is implemented literally: VERIFY can drop a dimension
 * claim ANALYZE's own per-call checks couldn't see (V7 is new at VERIFY;
 * V4's cascade repair only runs cross-dimension at VERIFY, D-047/D-051) or
 * a narrative claim SYNTHESIZE built on top of one. When that happens,
 * dimension scores are recomputed from the survivors (cheap — no model
 * call, reuses the already-clamped criterion scores), SYNTHESIZE is
 * re-called once against the corrected dimensions, and VERIFY runs once
 * more over the fresh narrative. No second retry, matching "once".
 */
export async function runAnalysisPipeline(args: RunAnalysisPipelineArgs): Promise<RunAnalysisPipelineResult> {
  const warnings: RunWarning[] = [];
  const usage: Usage[] = [];
  const budget = new Budget(args.tokenBudgetLimit ?? DEFAULT_TOKEN_BUDGET);

  // INGEST
  const sources: Source[] = [];
  const evidence: Evidence[] = [];
  let flags: Flag[] = [];
  for (const sourceInput of args.sources) {
    const result = await ingestSource(args.analysisId, sourceInput);
    sources.push(result.source);
    evidence.push(...result.evidence);
    const injection = buildInjectionFlags(result.injectionMatches);
    flags.push(...injection.flags);
    warnings.push(...injection.warnings);
  }
  args.onProgress?.("INGEST");

  // EXTRACT_FACTS
  const factsResult = await extractFacts({
    analysisId: args.analysisId,
    runId: args.runId,
    startupName: args.startupName,
    llm: args.llm,
    evidence,
    sources,
    signal: args.signal,
  });
  warnings.push(...factsResult.warnings);
  usage.push(...factsResult.usage);
  factsResult.usage.forEach((u) => budget.record(u));
  args.onProgress?.("EXTRACT_FACTS");

  // CONSISTENCY
  const consistencyResult = await runConsistency({ llm: args.llm, facts: factsResult.facts, signal: args.signal });
  const facts = consistencyResult.facts;
  flags.push(...consistencyResult.flags);
  if (consistencyResult.usage) {
    usage.push(consistencyResult.usage);
    budget.record(consistencyResult.usage);
  }
  args.onProgress?.("CONSISTENCY");

  // ANALYZE
  const analyzeResult = await analyzeAllDimensions({
    analysisId: args.analysisId,
    runId: args.runId,
    startupName: args.startupName,
    stage: args.stage,
    sector: args.sector,
    analystFocus: args.analystFocus,
    llm: args.llm,
    evidence,
    sources,
    facts,
    concurrency: args.concurrency,
    signal: args.signal,
  });
  warnings.push(...analyzeResult.warnings);
  usage.push(...analyzeResult.usage);
  analyzeResult.usage.forEach((u) => budget.record(u));
  args.onProgress?.("ANALYZE");

  const stageProfile = stageProfileFor(args.stage, args.stageProfileOverride);
  const evidenceInfoOf = makeEvidenceInfoOf(evidence);

  let dimensions = analyzeResult.dimensions;
  let overall = computeOverall(toDimensionResults(dimensions), stageProfile, flags);
  args.onProgress?.("SCORE");

  // SYNTHESIZE
  let synthResult = await runSynthesis({
    startupName: args.startupName,
    overall,
    dimensions,
    flags,
    facts,
    llm: args.llm,
    signal: args.signal,
  });
  warnings.push(...synthResult.warnings);
  usage.push(synthResult.usage);
  budget.record(synthResult.usage);
  args.onProgress?.("SYNTHESIZE");

  // VERIFY
  let verifyResult = runVerify({
    dimensions,
    narrative: synthResult.narrative,
    flags,
    checklist: synthResult.checklist,
    facts,
    sources,
    evidence,
  });
  warnings.push(...verifyResult.warnings);
  args.onProgress?.("VERIFY");

  // "If any dimension claim changes, re-run SCORE and SYNTHESIZE once" (AI_SPEC 3.8).
  if (verifyResult.changedDimensions.length > 0) {
    dimensions = recomputeDimensionScores(verifyResult.dimensions, evidenceInfoOf, dimensions);
    flags = verifyResult.flags;
    overall = computeOverall(toDimensionResults(dimensions), stageProfile, flags);
    args.onProgress?.("SCORE");

    synthResult = await runSynthesis({
      startupName: args.startupName,
      overall,
      dimensions,
      flags,
      facts,
      llm: args.llm,
      signal: args.signal,
    });
    warnings.push(...synthResult.warnings);
    usage.push(synthResult.usage);
    budget.record(synthResult.usage);
    args.onProgress?.("SYNTHESIZE");

    verifyResult = runVerify({
      dimensions,
      narrative: synthResult.narrative,
      flags,
      checklist: synthResult.checklist,
      facts,
      sources,
      evidence,
    });
    warnings.push(...verifyResult.warnings);
    args.onProgress?.("VERIFY");
  } else {
    dimensions = verifyResult.dimensions;
    flags = verifyResult.flags;
  }

  // FINALIZE
  const report: Report = {
    id: newId("rpt"),
    analysisId: args.analysisId,
    runId: args.runId,
    ownerId: args.ownerId,
    version: args.version,
    schemaVersion: 1,
    scoringVersion: SCORING_VERSION,
    promptVersion: SYNTHESIS_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    stage: args.stage,
    stageProfile,
    overall,
    narrative: verifyResult.narrative,
    flags: verifyResult.flags,
    checklist: verifyResult.checklist,
    evidenceStats: verifyResult.evidenceStats,
    warnings,
  };
  args.onProgress?.("FINALIZE");

  return {
    report,
    dimensions,
    facts,
    evidence,
    sources,
    failedDimensions: analyzeResult.failed,
    warnings,
    usage,
    budgetExceeded: budget.exceeded(),
  };
}

function toDimensionResults(dimensions: DimensionAnalysis[]): DimensionResult[] {
  return dimensions.map((d) => ({ dimension: d.dimension, score: d.score, confidence: d.confidence }));
}

function makeEvidenceInfoOf(evidence: Evidence[]): (evidenceId: string) => EvidenceInfo | undefined {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  return (evidenceId: string) => {
    const e = byId.get(evidenceId);
    return e ? { sourceId: e.sourceId, reliability: e.reliability } : undefined;
  };
}

/**
 * Recomputes `score`/`confidence` for every dimension from its
 * VERIFY-filtered `criteria`/`claims` — cheap and deterministic, no model
 * call. `evidenceTruncated` is carried over from the original ANALYZE
 * result (VERIFY doesn't touch it).
 */
function recomputeDimensionScores(
  verified: DimensionAnalysis[],
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined,
  original: DimensionAnalysis[],
): DimensionAnalysis[] {
  const truncatedByDimension = new Map(original.map((d) => [d.dimension, d.evidenceTruncated]));
  return verified.map((dimension) => {
    const claimsById = new Map(dimension.claims.map((c) => [c.id, c]));
    const scoreInputs: ScoredCriterionInput[] = dimension.criteria.map((c) => ({
      score: c.score,
      claims: c.claimIds.map((id) => claimsById.get(id)).filter((c): c is NonNullable<typeof c> => c !== undefined),
    }));
    const { score, confidence } = computeDimensionScore(
      scoreInputs,
      evidenceInfoOf,
      truncatedByDimension.get(dimension.dimension) ?? false,
    );
    return { ...dimension, score, confidence };
  });
}
