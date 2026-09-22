import { demoId } from "@/demo/ids";
import { Analysis } from "@/lib/schema/analysis";
import { Run } from "@/lib/schema/run";

/**
 * Three lightweight fictional analyses (no full report) alongside Loopwell,
 * so the dashboard/list demo data (T-1.13, T-1.14) has more than one row and
 * covers a scored, an insufficient-evidence, and an in-progress state.
 * Fictional per R-DAT-08.
 */

const OWNER_ID = "demo_owner";
const now = "2026-09-22T00:00:00Z";

const VERDANT_ANALYSIS_ID = demoId("ana", 2);
const VERDANT_REPORT_ID = demoId("rpt", 2);

export const verdantGridAnalysis: Analysis = Analysis.parse({
  id: VERDANT_ANALYSIS_ID,
  ownerId: OWNER_ID,
  startup: {
    name: "Verdant Grid",
    website: "https://verdantgrid.example",
    oneLiner: "Demand-response software for mid-size commercial buildings.",
    stage: "SERIES_A",
    sector: "Climate",
    hqCountry: "US",
  },
  status: "COMPLETE",
  options: { webResearch: true, stageProfile: "GROWTH" },
  latest: {
    reportId: VERDANT_REPORT_ID,
    version: 1,
    overallScore: 84,
    confidence: 0.72,
    label: "SCORED",
    generatedAt: now,
    topFlagSeverity: "LOW",
  },
  currentRunId: null,
  tags: ["climate", "energy"],
  isWatchlisted: false,
  isDemo: true,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
});

const NIMBUS_ANALYSIS_ID = demoId("ana", 3);
const NIMBUS_REPORT_ID = demoId("rpt", 3);

export const nimbusLedgerAnalysis: Analysis = Analysis.parse({
  id: NIMBUS_ANALYSIS_ID,
  ownerId: OWNER_ID,
  startup: {
    name: "Nimbus Ledger",
    oneLiner: "Reconciliation tooling for multi-entity treasury teams.",
    stage: "PRE_SEED",
    sector: "Fintech",
  },
  status: "COMPLETE",
  options: { webResearch: false, stageProfile: "EARLY" },
  latest: {
    reportId: NIMBUS_REPORT_ID,
    version: 1,
    overallScore: null,
    confidence: 0.22,
    label: "INSUFFICIENT_EVIDENCE",
    generatedAt: now,
    topFlagSeverity: null,
  },
  currentRunId: null,
  tags: ["fintech"],
  isWatchlisted: false,
  isDemo: true,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
});

const FERNWAY_ANALYSIS_ID = demoId("ana", 4);
const FERNWAY_RUN_ID = demoId("run", 2);

export const fernwayHealthRun: Run = Run.parse({
  id: FERNWAY_RUN_ID,
  analysisId: FERNWAY_ANALYSIS_ID,
  ownerId: OWNER_ID,
  status: "RUNNING",
  options: { webResearch: true, stageProfile: "SEED" },
  steps: {
    INGEST: { status: "DONE", attempt: 1 },
    EXTRACT_FACTS: { status: "DONE", attempt: 1 },
    RESEARCH: { status: "DONE", attempt: 1 },
    CONSISTENCY: { status: "RUNNING", attempt: 1 },
    ANALYZE: { status: "PENDING", attempt: 0 },
    SCORE: { status: "PENDING", attempt: 0 },
    SYNTHESIZE: { status: "PENDING", attempt: 0 },
    VERIFY: { status: "PENDING", attempt: 0 },
    FINALIZE: { status: "PENDING", attempt: 0 },
  },
  dimensionStatus: {
    founder: "PENDING",
    market: "PENDING",
    product: "PENDING",
    traction: "PENDING",
    competitive: "PENDING",
    business_model: "PENDING",
    financial: "PENDING",
    risk: "PENDING",
  },
  modelIds: { analysis: "demo-model", synthesis: "demo-model", fast: "demo-model" },
  promptVersion: "1.0.0",
  scoringVersion: "1.0.0",
  usage: { inputTokens: 12_400, outputTokens: 3_100, estimatedCostUsd: 0.42 },
  warnings: [],
  reportId: null,
  startedAt: now,
});

export const fernwayHealthAnalysis: Analysis = Analysis.parse({
  id: FERNWAY_ANALYSIS_ID,
  ownerId: OWNER_ID,
  startup: {
    name: "Fernway Health",
    oneLiner: "Care-coordination software for independent physical therapy clinics.",
    stage: "SEED",
    sector: "Healthtech",
  },
  status: "PROCESSING",
  options: { webResearch: true, stageProfile: "SEED" },
  latest: null,
  currentRunId: FERNWAY_RUN_ID,
  tags: ["healthtech"],
  isWatchlisted: false,
  isDemo: true,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
});
