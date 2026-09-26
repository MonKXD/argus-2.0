import type { Stage } from "@/lib/schema/enums";

/** Shared across the setup wizard's review step, the analysis summary page and the report header. */
export const STAGE_LABEL: Record<Stage, string> = {
  UNKNOWN: "Not specified",
  PRE_SEED: "Pre-seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B_PLUS: "Series B+",
};
