import {
  loopwellAnalysis,
  loopwellDimensions,
  loopwellEvidence,
  loopwellFacts,
  loopwellReport,
  loopwellSources,
} from "@/demo/loopwell";
import {
  fernwayHealthAnalysis,
  fernwayHealthRun,
  nimbusLedgerAnalysis,
  verdantGridAnalysis,
} from "@/demo/portfolio";
import type { Analysis } from "@/lib/schema/analysis";
import type { Run } from "@/lib/schema/run";

export {
  loopwellAnalysis,
  loopwellChecklist,
  loopwellDimensions,
  loopwellEvidence,
  loopwellFacts,
  loopwellFlags,
  loopwellReport,
  loopwellSources,
} from "@/demo/loopwell";
export {
  fernwayHealthAnalysis,
  fernwayHealthRun,
  nimbusLedgerAnalysis,
  verdantGridAnalysis,
} from "@/demo/portfolio";

/** Every demo analysis, for the dashboard list and KPIs (FR-DSH-01, FR-DSH-02). */
export const demoAnalyses: Analysis[] = [
  loopwellAnalysis,
  verdantGridAnalysis,
  nimbusLedgerAnalysis,
  fernwayHealthAnalysis,
];

/** Every demo run (currently just Fernway Health's in-progress one, FR-DSH-03). */
export const demoRuns: Run[] = [fernwayHealthRun];

/** The one fully-worked report (Loopwell), for the landing hero and /sample (FR-LND-02). */
export const demoReport = loopwellReport;
export const demoDimensions = loopwellDimensions;
export const demoSources = loopwellSources;
export const demoEvidence = loopwellEvidence;
export const demoFacts = loopwellFacts;
