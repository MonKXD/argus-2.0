import { reliabilityWeight } from "@/lib/analysis/scoring/reliability-weight";
import {
  distinctSourceCount,
  evidenceInfoForClaims,
  verifiedClaims,
  type EvidenceInfo,
} from "@/lib/analysis/scoring/verified-support";
import type { Claim } from "@/lib/schema/claims";

/**
 * AI_SPEC 5.2, verbatim:
 *
 * ```
 * scored      = criteria with non-null score
 * if |scored| / |criteria| < 0.5            -> score = null
 * else score = round(100 * sum(scored) / (4 * |scored|))
 *
 * coverage_c    = |scored| / |criteria|
 * quality_c     = mean over scored criteria of q, where q = max reliability weight among the
 *                 criterion's VERIFIED claims (INDEPENDENT 1.0, FIRST_PARTY 0.7, PROVIDED 0.5);
 *                 q = 0.25 when the criterion has only AI_ANALYSIS support
 * corroboration = share of scored criteria whose VERIFIED claims cite >= 2 distinct sources
 * confidence    = 0.5*coverage_c + 0.3*quality_c + 0.2*corroboration      (x0.9 if evidenceTruncated)
 * ```
 *
 * `confidence` is always computed from the weighted formula even when
 * `score` ends up null (the coverage gate only nulls `score`; `confidence`
 * is a required, non-nullable field on `DimensionAnalysis`).
 */
export interface ScoredCriterionInput {
  score: number | null;
  claims: Claim[];
}

export interface DimensionScoreResult {
  score: number | null;
  confidence: number;
}

export function computeDimensionScore(
  criteria: ScoredCriterionInput[],
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined,
  evidenceTruncated: boolean,
): DimensionScoreResult {
  const totalCriteria = criteria.length;
  const scoredCriteria = criteria.filter(
    (c): c is ScoredCriterionInput & { score: number } => c.score !== null,
  );
  const coverage_c = totalCriteria === 0 ? 0 : scoredCriteria.length / totalCriteria;

  const score =
    coverage_c < 0.5
      ? null
      : Math.round((100 * sum(scoredCriteria.map((c) => c.score))) / (4 * scoredCriteria.length));

  const qualities = scoredCriteria.map((c) => criterionQuality(c.claims, evidenceInfoOf));
  const quality_c = qualities.length === 0 ? 0 : mean(qualities);

  const corroboratedCount = scoredCriteria.filter((c) => hasCorroboration(c.claims, evidenceInfoOf)).length;
  const corroboration = scoredCriteria.length === 0 ? 0 : corroboratedCount / scoredCriteria.length;

  let confidence = 0.5 * coverage_c + 0.3 * quality_c + 0.2 * corroboration;
  if (evidenceTruncated) confidence *= 0.9;

  return { score, confidence: round2(confidence) };
}

/**
 * AI_SPEC 5.2's `q`: the max reliability weight among the criterion's
 * VERIFIED claims. `0.25` covers both the documented "only AI_ANALYSIS
 * support" case and, by the same reasoning (no VERIFIED-backed evidence to
 * measure a reliability weight from), a criterion scored on ASSUMPTION
 * claims alone — the doc doesn't name that case separately, so this is a
 * conservative extension of the stated rule, not a new invented number.
 */
function criterionQuality(claims: Claim[], evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined): number {
  const infos = evidenceInfoForClaims(verifiedClaims(claims), evidenceInfoOf);
  if (infos.length === 0) return 0.25;
  return Math.max(...infos.map((i) => reliabilityWeight(i.reliability)));
}

function hasCorroboration(claims: Claim[], evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined): boolean {
  const infos = evidenceInfoForClaims(verifiedClaims(claims), evidenceInfoOf);
  return distinctSourceCount(infos) >= 2;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function mean(values: number[]): number {
  return sum(values) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
