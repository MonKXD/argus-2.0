import { z } from "zod";

/**
 * Verbatim from docs/SCHEMA.md section 2. The rest of that section's
 * schemas (Evidence, Claim, Report, Analysis, Run, ...) land in T-2.01;
 * these enums are pulled forward because T-1.03's UI components need the
 * real ClaimStatus/Reliability vocabulary, and R-COD-03 says types are
 * z.infer of these schemas, not hand-written duplicates.
 */

export const ClaimStatus = z.enum(["VERIFIED", "AI_ANALYSIS", "ASSUMPTION", "MISSING"]);
export const Reliability = z.enum(["INDEPENDENT", "FIRST_PARTY", "PROVIDED"]);
export const DimensionKey = z.enum([
  "founder",
  "market",
  "product",
  "traction",
  "competitive",
  "business_model",
  "financial",
  "risk",
]);
export const SectionKey = z.enum([
  "executive_summary",
  "investment_overview",
  "investment_score",
  "founder_team",
  "product_business_model",
  "market_opportunity",
  "market_trends",
  "competitive_landscape",
  "traction_growth",
  "financial_signals",
  "risks_red_flags",
  "strengths_weaknesses",
  "market_gaps",
  "ai_insights",
  "evidence_sources",
  "missing_information",
]);
export const Stage = z.enum(["PRE_SEED", "SEED", "SERIES_A", "SERIES_B_PLUS", "UNKNOWN"]);
export const StageProfile = z.enum(["EARLY", "SEED", "GROWTH"]);
export const SourceType = z.enum([
  "PITCH_DECK",
  "FINANCIAL_DOC",
  "COMPANY_DOC",
  "WEBSITE",
  "WEB_RESEARCH",
  "USER_NOTES",
]);
export const SourceOrigin = z.enum(["UPLOAD", "URL", "TEXT", "RESEARCH"]);
export const SourceStatus = z.enum(["UPLOADED", "PARSING", "PARSED", "FAILED"]);
export const Severity = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const FlagCategory = z.enum([
  "INCONSISTENCY",
  "UNVERIFIABLE_CLAIM",
  "FOUNDER",
  "MARKET",
  "LEGAL_REGULATORY",
  "FINANCIAL",
  "TRACTION",
  "PRODUCT_TECH",
  "COMPETITION",
  "GOVERNANCE",
  "SOURCE_INTEGRITY",
  "OTHER",
]);
export const AnalysisStatus = z.enum([
  "DRAFT",
  "READY",
  "PROCESSING",
  "COMPLETE",
  "PARTIAL",
  "FAILED",
]);
export const RunStatus = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
]);
export const StepName = z.enum([
  "INGEST",
  "EXTRACT_FACTS",
  "RESEARCH",
  "CONSISTENCY",
  "ANALYZE",
  "SCORE",
  "SYNTHESIZE",
  "VERIFY",
  "FINALIZE",
]);
export const StepStatus = z.enum(["PENDING", "RUNNING", "DONE", "FAILED", "SKIPPED"]);
export const WarningCode = z.enum([
  "CITATION_INVALID",
  "UNGROUNDED_NUMBER",
  "ENTITY_UNGROUNDED",
  "SENSITIVE_ATTRIBUTE",
  "INJECTION_SUSPECTED",
  "SCHEMA_REPAIR",
  "SOURCE_PARSE_FAILED",
  "EVIDENCE_TRUNCATED",
  "BUDGET_EXCEEDED",
  "STEP_RETRIED",
]);

export type ClaimStatus = z.infer<typeof ClaimStatus>;
export type Reliability = z.infer<typeof Reliability>;
export type DimensionKey = z.infer<typeof DimensionKey>;
export type SectionKey = z.infer<typeof SectionKey>;
export type Stage = z.infer<typeof Stage>;
export type StageProfile = z.infer<typeof StageProfile>;
export type SourceType = z.infer<typeof SourceType>;
export type SourceOrigin = z.infer<typeof SourceOrigin>;
export type SourceStatus = z.infer<typeof SourceStatus>;
export type Severity = z.infer<typeof Severity>;
export type FlagCategory = z.infer<typeof FlagCategory>;
export type AnalysisStatus = z.infer<typeof AnalysisStatus>;
export type RunStatus = z.infer<typeof RunStatus>;
export type StepName = z.infer<typeof StepName>;
export type StepStatus = z.infer<typeof StepStatus>;
export type WarningCode = z.infer<typeof WarningCode>;
