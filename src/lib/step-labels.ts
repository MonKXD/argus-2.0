import type { StepName } from "@/lib/schema/enums";

/** SCHEMA.md section 2's declared order — also the run's real execution order. */
export const STEP_ORDER: StepName[] = [
  "INGEST",
  "EXTRACT_FACTS",
  "RESEARCH",
  "CONSISTENCY",
  "ANALYZE",
  "SCORE",
  "SYNTHESIZE",
  "VERIFY",
  "FINALIZE",
];

export const STEP_LABEL: Record<StepName, string> = {
  INGEST: "Ingest sources",
  EXTRACT_FACTS: "Extract facts",
  RESEARCH: "Research",
  CONSISTENCY: "Check consistency",
  ANALYZE: "Analyse dimensions",
  SCORE: "Score",
  SYNTHESIZE: "Synthesise report",
  VERIFY: "Verify claims",
  FINALIZE: "Finalise",
};
