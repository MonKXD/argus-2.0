import type { RunStatus } from "@/lib/schema/enums";

/** Distinct from `ANALYSIS_STATUS_LABEL` (a different enum, `AnalysisStatus`)
 * — first used by T-6.08's run/cost dashboard (`/app/settings`). */
export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  SUCCEEDED: "Complete",
  PARTIAL: "Partial",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};
