import type { AnalysisStatus } from "@/lib/schema/enums";

/** Shared by `AnalysesTable` and the analyses-list `FilterBar` (T-5.10's
 * second real caller). Distinct from `evidence-marker.tsx`'s own
 * `STATUS_LABEL`, which is for `ClaimStatus`, an unrelated enum. */
export const ANALYSIS_STATUS_LABEL: Record<AnalysisStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  PROCESSING: "Processing",
  COMPLETE: "Complete",
  PARTIAL: "Partial",
  FAILED: "Failed",
};
