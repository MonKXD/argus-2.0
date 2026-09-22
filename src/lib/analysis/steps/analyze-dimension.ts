import type { LLM } from "@/lib/ai/llm";
import { SCORING_VERSION } from "@/lib/analysis/config";
import {
  buildDimensionAnalysisPrompt,
  DIMENSION_ANALYSIS_PROMPT_VERSION,
  DIMENSION_ANALYSIS_TOOL_NAME,
  SubmitDimensionAnalysisInput,
  type CandidateClaim,
} from "@/lib/analysis/prompts/dimension-analysis";
import { computeClaimConfidence } from "@/lib/analysis/scoring/claim-confidence";
import { clampCriterionScore } from "@/lib/analysis/scoring/criterion-clamps";
import { computeDimensionScore, type ScoredCriterionInput } from "@/lib/analysis/scoring/dimension-score";
import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import { selectEvidenceForDimension } from "@/lib/analysis/steps/evidence-selection";
import { validateQuote } from "@/lib/analysis/verify/citation";
import { heuristicUndeclaredNames, undeclaredEntities } from "@/lib/analysis/verify/entity-grounding";
import {
  derivationInputsAreReal,
  extractNumbers,
  numberAppearsIn,
  withinTolerance,
} from "@/lib/analysis/verify/numeric-grounding";
import { sensitiveAttributeMatches } from "@/lib/analysis/verify/sensitive-attributes";
import { invalidBasedOnRefs } from "@/lib/analysis/verify/status-integrity";
import type { Claim, CriterionScore, DimensionAnalysis } from "@/lib/schema/claims";
import type { DimensionKey, Stage } from "@/lib/schema/enums";
import type { Evidence, Fact, Quote, Source } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";
import type { RunWarning } from "@/lib/schema/report";
import { RUBRICS } from "@/lib/schema/rubrics";
import type { Usage } from "@/lib/schema/run";

const MAX_OUTPUT_TOKENS = 8192;

export interface AnalyzeDimensionArgs {
  analysisId: string;
  runId: string;
  dimension: DimensionKey;
  startupName: string;
  stage: Stage;
  sector?: string;
  analystFocus?: string;
  llm: LLM;
  evidence: Evidence[];
  sources: Source[];
  facts: Fact[];
  signal?: AbortSignal;
}

export interface AnalyzeDimensionResult {
  dimension: DimensionAnalysis;
  warnings: RunWarning[];
  usage: Usage;
}

/**
 * AI_SPEC 3.5 (ANALYZE, one dimension): a single `submit_dimension_analysis`
 * call, then code validates (V1-V4, V6), clamps (5.1) and scores (5.2) —
 * producing a complete `DimensionAnalysis` for this one dimension. Not
 * wired to `EvidenceStore`/`StepContext`; same scoping as T-2.06/T-2.08 —
 * the real idempotent step runner is T-3.08's job.
 */
export async function analyzeDimension(args: AnalyzeDimensionArgs): Promise<AnalyzeDimensionResult> {
  const rubric = RUBRICS[args.dimension];
  const { selected, truncated } = selectEvidenceForDimension(args.evidence, rubric);

  const sourceTitleById = new Map(args.sources.map((s) => [s.id, s.title]));
  const evidenceItems = selected.map((evidence) => {
    const sourceTitle = sourceTitleById.get(evidence.sourceId);
    if (!sourceTitle) throw new Error(`analyzeDimension: evidence references unknown sourceId "${evidence.sourceId}"`);
    return { evidence, sourceTitle };
  });

  const prompt = buildDimensionAnalysisPrompt({
    startupName: args.startupName,
    stage: args.stage,
    sector: args.sector,
    rubric,
    facts: args.facts,
    evidence: evidenceItems,
    analystFocus: args.analystFocus,
  });

  const { data, usage } = await args.llm.structured({
    role: "ANALYSIS",
    system: prompt.system,
    user: prompt.user,
    cachePrefix: prompt.cachePrefix,
    toolName: DIMENSION_ANALYSIS_TOOL_NAME,
    schema: SubmitDimensionAnalysisInput,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    signal: args.signal,
  });

  const evidenceById = new Map(selected.map((e) => [e.id, e]));
  const evidenceInfoOf = (evidenceId: string): EvidenceInfo | undefined => {
    const evidence = evidenceById.get(evidenceId);
    return evidence ? { sourceId: evidence.sourceId, reliability: evidence.reliability } : undefined;
  };
  const factById = new Map(args.facts.map((f) => [f.id, f]));
  const factValueOf = (factId: string): number | undefined => {
    const fact = factById.get(factId);
    return fact ? factNumericValue(fact) : undefined;
  };
  const corpusText = [...selected.map((e) => e.text), ...args.facts.map((f) => f.statement)].join("\n");

  // Real ids up front: local claim ids are just "exists in this response" (V4), not
  // "survives every other check" — chasing cascading drops through multiple claims
  // that cite each other is out of scope; see the module-level note on finalizeClaim.
  const localToReal = new Map(data.claims.map((c) => [c.localId, newId("clm")]));
  const knownRefIds = new Set<string>([...args.facts.map((f) => f.id), ...localToReal.values()]);

  const warnings: RunWarning[] = [];
  const finalClaims = new Map<string, Claim>();

  for (const candidate of data.claims) {
    const realId = localToReal.get(candidate.localId)!;
    const outcome = finalizeClaim(candidate, realId, {
      evidenceById,
      evidenceInfoOf,
      factValueOf,
      corpusText,
      knownRefIds,
      localToReal,
    });
    warnings.push(...outcome.warnings);
    if (outcome.claim) finalClaims.set(realId, outcome.claim);
  }

  const remapSurviving = (localIds: string[]): string[] =>
    localIds.map((id) => localToReal.get(id)).filter((id): id is string => id !== undefined && finalClaims.has(id));

  const criteria: CriterionScore[] = data.criteria.map((c) => {
    const claimIds = remapSurviving(c.claimIds);
    const supportingClaims = claimIds.map((id) => finalClaims.get(id)!);
    const label = rubric.criteria.find((rc) => rc.id === c.id)?.label ?? c.id;
    return {
      id: c.id,
      label,
      score: clampCriterionScore(c.score, supportingClaims, evidenceInfoOf),
      rationale: c.rationale,
      claimIds,
    };
  });

  const scoreInputs: ScoredCriterionInput[] = criteria.map((c) => ({
    score: c.score,
    claims: c.claimIds.map((id) => finalClaims.get(id)!),
  }));
  const { score, confidence } = computeDimensionScore(scoreInputs, evidenceInfoOf, truncated);

  const dimensionAnalysis: DimensionAnalysis = {
    dimension: args.dimension,
    score,
    confidence,
    evidenceTruncated: truncated,
    criteria,
    claims: [...finalClaims.values()],
    strengthIds: remapSurviving(data.strengthIds),
    weaknessIds: remapSurviving(data.weaknessIds),
    riskIds: remapSurviving(data.riskIds),
    missingIds: remapSurviving(data.missingIds),
    scoringVersion: SCORING_VERSION,
    promptVersion: DIMENSION_ANALYSIS_PROMPT_VERSION,
  };

  return { dimension: dimensionAnalysis, warnings, usage };
}

interface FinalizeContext {
  evidenceById: Map<string, Evidence>;
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined;
  factValueOf: (factId: string) => number | undefined;
  corpusText: string;
  knownRefIds: ReadonlySet<string>;
  localToReal: Map<string, string>;
}

interface FinalizeOutcome {
  claim: Claim | undefined;
  warnings: RunWarning[];
}

/**
 * Runs V6, V3, V4, V1 (VERIFIED only) and V2 in order, dropping the claim
 * (returning `claim: undefined`) at the first violation that AI_SPEC
 * section 6 says drops/strips it. V3's heuristic pass and V5's attribution
 * labelling only warn — V5 (attribution) is a report-rendering concern
 * (SCHEMA `Claim` carries no separate "Sourced" field to set), not
 * something this step's output needs to represent.
 */
function finalizeClaim(candidate: CandidateClaim, realId: string, ctx: FinalizeContext): FinalizeOutcome {
  const warnings: RunWarning[] = [];

  const sensitiveHits = sensitiveAttributeMatches(candidate.text);
  if (sensitiveHits.length > 0) {
    warnings.push({
      code: "SENSITIVE_ATTRIBUTE",
      message: `Dropped claim: matched sensitive-attribute pattern(s) [${sensitiveHits.map((h) => h.category).join(", ")}]`,
      step: "ANALYZE",
    });
    return { claim: undefined, warnings };
  }

  const missingEntities = undeclaredEntities(candidate.entities, ctx.corpusText);
  if (missingEntities.length > 0) {
    warnings.push({
      code: "ENTITY_UNGROUNDED",
      message: `Dropped claim: declared entities not in evidence [${missingEntities.join(", ")}]`,
      step: "ANALYZE",
    });
    return { claim: undefined, warnings };
  }
  const heuristicHits = heuristicUndeclaredNames(candidate.text, candidate.entities, ctx.corpusText);
  if (heuristicHits.length > 0) {
    warnings.push({
      code: "ENTITY_UNGROUNDED",
      message: `Possible ungrounded name(s) [${heuristicHits.join(", ")}]`,
      step: "ANALYZE",
      refId: realId,
    });
  }

  if (candidate.status === "AI_ANALYSIS") {
    const resolvedBasedOn = candidate.basedOn.map((ref) => ctx.localToReal.get(ref) ?? ref);
    const invalid = invalidBasedOnRefs(realId, resolvedBasedOn, ctx.knownRefIds);
    if (invalid.length > 0) {
      warnings.push({
        code: "INVALID_REFERENCE",
        message: `Dropped claim: invalid basedOn reference(s) [${invalid.join(", ")}]`,
        step: "ANALYZE",
      });
      return { claim: undefined, warnings };
    }
  }

  let finalQuotes: Quote[] | undefined;
  if (candidate.status === "VERIFIED") {
    finalQuotes = [];
    for (const q of candidate.quotes) {
      const evidence = ctx.evidenceById.get(q.evidenceId);
      if (!evidence) continue;
      const result = validateQuote(q.quote, evidence.text);
      if (result.valid && result.matchedText) finalQuotes.push({ evidenceId: q.evidenceId, quote: result.matchedText });
    }
    if (finalQuotes.length === 0) {
      warnings.push({ code: "CITATION_INVALID", message: "Dropped claim: no quote passed citation validation", step: "ANALYZE" });
      return { claim: undefined, warnings };
    }
  }

  const groundingText =
    candidate.status === "VERIFIED" ? finalQuotes!.map((q) => q.quote).join(" ") : ctx.corpusText;
  const derivationValid = candidate.derivation ? derivationInputsAreReal(candidate.derivation, ctx.factValueOf) : false;
  const ungrounded = extractNumbers(candidate.text).filter((n) => {
    if (derivationValid && withinTolerance(n.value, candidate.derivation!.result)) return false;
    return !numberAppearsIn(n.value, groundingText);
  });
  if (candidate.derivation && !derivationValid) {
    warnings.push({ code: "UNGROUNDED_NUMBER", message: "Dropped claim: derivation inputs or result could not be verified", step: "ANALYZE" });
    return { claim: undefined, warnings };
  }
  if (ungrounded.length > 0) {
    warnings.push({
      code: "UNGROUNDED_NUMBER",
      message: `Dropped claim: ungrounded number(s) [${ungrounded.map((n) => n.value).join(", ")}]`,
      step: "ANALYZE",
    });
    return { claim: undefined, warnings };
  }

  const confidence = computeClaimConfidence(
    candidate.status === "VERIFIED" ? { status: candidate.status, quotes: finalQuotes } : { status: candidate.status },
    ctx.evidenceInfoOf,
  );

  const base = {
    id: realId,
    text: candidate.text,
    confidence,
    factKey: candidate.factKey,
    entities: candidate.entities,
    derivation: candidate.derivation,
  };

  switch (candidate.status) {
    case "VERIFIED":
      return { claim: { ...base, status: "VERIFIED", quotes: finalQuotes! }, warnings };
    case "AI_ANALYSIS":
      return {
        claim: { ...base, status: "AI_ANALYSIS", basedOn: candidate.basedOn.map((ref) => ctx.localToReal.get(ref) ?? ref) },
        warnings,
      };
    case "ASSUMPTION":
      return { claim: { ...base, status: "ASSUMPTION", assumption: candidate.assumption }, warnings };
    case "MISSING":
      return { claim: { ...base, status: "MISSING", missing: candidate.missing }, warnings };
  }
}

function factNumericValue(fact: Fact): number | undefined {
  switch (fact.value.kind) {
    case "number":
      return fact.value.value;
    case "money":
      return fact.value.amount;
    case "percent":
      return fact.value.value;
    default:
      return undefined;
  }
}
