import type { StepName } from "@/lib/schema/enums";
import type { Run } from "@/lib/schema/run";

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

/** T-3.13 (failure UX): which steps and dimensions a `PARTIAL` run's own
 * document says didn't complete, for the "Not analysed: X, Y" summary. */
export function failedStepLabels(run: Run): string[] {
  const failedSteps = Object.entries(run.steps)
    .filter(([, state]) => state.status === "FAILED")
    .map(([step]) => STEP_LABEL[step as StepName] ?? step);
  const failedDimensions = Object.entries(run.dimensionStatus)
    .filter(([, status]) => status === "FAILED")
    .map(([dimension]) => dimension);
  return [...failedSteps, ...failedDimensions];
}
