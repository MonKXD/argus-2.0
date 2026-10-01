import type { Stage, StageProfile } from "@/lib/schema/enums";

/** Shared across the setup wizard's review step, the analysis summary page and the report header. */
export const STAGE_LABEL: Record<Stage, string> = {
  UNKNOWN: "Not specified",
  PRE_SEED: "Pre-seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B_PLUS: "Series B+",
};

/** The scoring-rubric weight profile a report was generated under (`config.ts`'s `Stage` to `StageProfile` mapping) — distinct from `Stage` above, which is the startup's own self-reported stage. Used by T-5.03's comparability warning. */
export const STAGE_PROFILE_LABEL: Record<StageProfile, string> = {
  EARLY: "Early",
  SEED: "Seed",
  GROWTH: "Growth",
};
