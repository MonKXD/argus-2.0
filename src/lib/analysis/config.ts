import type { DimensionKey, Stage, StageProfile } from "@/lib/schema/enums";

/**
 * SCHEMA.md section 7: "Scoring constants (mirrored in
 * `src/lib/analysis/config.ts`)." R-TST-07: the scoring golden test changes
 * only together with a SCORING_VERSION bump.
 */
export const SCORING_VERSION = "1.0.0";

/** Weight of each dimension per stage profile; each column sums to 1.00. */
export const STAGE_PROFILE_WEIGHTS: Record<StageProfile, Record<DimensionKey, number>> = {
  EARLY: {
    founder: 0.25,
    market: 0.18,
    product: 0.15,
    traction: 0.06,
    competitive: 0.1,
    business_model: 0.1,
    financial: 0.04,
    risk: 0.12,
  },
  SEED: {
    founder: 0.2,
    market: 0.16,
    product: 0.14,
    traction: 0.14,
    competitive: 0.1,
    business_model: 0.1,
    financial: 0.08,
    risk: 0.08,
  },
  GROWTH: {
    founder: 0.14,
    market: 0.12,
    product: 0.12,
    traction: 0.22,
    competitive: 0.1,
    business_model: 0.1,
    financial: 0.14,
    risk: 0.06,
  },
};

const STAGE_TO_PROFILE: Record<Stage, StageProfile> = {
  PRE_SEED: "EARLY",
  SEED: "SEED",
  UNKNOWN: "SEED",
  SERIES_A: "GROWTH",
  SERIES_B_PLUS: "GROWTH",
};

/** SCHEMA section 7: "A user override in run options wins." */
export function stageProfileFor(stage: Stage, override?: StageProfile): StageProfile {
  return override ?? STAGE_TO_PROFILE[stage];
}
