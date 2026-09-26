import { round2 } from "@/lib/analysis/scoring/round";
import { DIMENSION_LABEL } from "@/lib/dimension-labels";
import type { DimensionAnalysis } from "@/lib/schema/claims";
import type { DimensionKey } from "@/lib/schema/enums";
import type { Overall } from "@/lib/schema/report";
import { DIMENSION_KEYS } from "@/lib/schema/rubrics";

export interface DimensionContribution {
  dimension: DimensionKey;
  label: string;
  weight: number;
  score: number | null;
  confidence: number;
  /** Points of the overall score this dimension contributes: `w_d * s_d / coverage`
   * (AI_SPEC 5.3's own overall-score formula, decomposed per dimension so the
   * dimensions' contributions sum back to `overall.score`). `null` when the
   * dimension has no score (excluded from both the numerator and `coverage`). */
  contribution: number | null;
}

/**
 * FR-RPT-22's "explain the score" breakdown: for every dimension, the stage
 * profile's weight, the dimension's own score/confidence, and the points it
 * contributes to the overall score. Pure decomposition of `computeOverall()`
 * (src/lib/analysis/scoring/overall.ts) — introduces no new formula, reuses
 * its exact inputs (`overall.weights`, `overall.coverage`) so this can never
 * drift from what actually produced `overall.score`.
 */
export function dimensionContributions(overall: Overall, dimensions: DimensionAnalysis[]): DimensionContribution[] {
  const weights = overall.weights as Partial<Record<DimensionKey, number>>;
  const byKey = new Map(dimensions.map((d) => [d.dimension, d]));

  return DIMENSION_KEYS.map((key) => {
    const weight = weights[key] ?? 0;
    const dimension = byKey.get(key);
    const score = dimension?.score ?? null;
    const confidence = dimension?.confidence ?? 0;
    const contribution = score === null || overall.coverage === 0 ? null : round2((weight * score) / overall.coverage);

    return { dimension: key, label: DIMENSION_LABEL[key], weight, score, confidence, contribution };
  });
}
