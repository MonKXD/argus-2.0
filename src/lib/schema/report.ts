import { z } from "zod";

import { Claim, ChecklistItem, Flag } from "@/lib/schema/claims";
import { Stage, StageProfile, StepName, WarningCode } from "@/lib/schema/enums";
import { idOf, Iso } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 5 (Report). */

const StatusCounts = z.object({
  VERIFIED: z.number(),
  AI_ANALYSIS: z.number(),
  ASSUMPTION: z.number(),
  MISSING: z.number(),
});

export const EvidenceStats = z.object({
  sources: z.number(),
  evidenceItems: z.number(),
  facts: z.number(),
  claims: StatusCounts,
  bySection: z.record(z.string(), StatusCounts),
  reliabilityMix: z.object({
    INDEPENDENT: z.number(),
    FIRST_PARTY: z.number(),
    PROVIDED: z.number(),
  }),
  downgraded: z.number(),
  dropped: z.number(),
});

export const Overall = z.object({
  score: z.number().min(0).max(100).nullable(),
  label: z.enum(["SCORED", "INSUFFICIENT_EVIDENCE"]),
  confidence: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),
  cap: z
    .object({ value: z.number(), reason: z.string(), flagIds: z.array(idOf("flg")) })
    .optional(),
  weights: z.record(z.string(), z.number()),
});

export const RunWarning = z.object({
  code: WarningCode,
  message: z.string(),
  step: StepName.optional(),
  refId: z.string().optional(),
});

export const Report = z.object({
  id: idOf("rpt"),
  analysisId: idOf("ana"),
  runId: idOf("run"),
  ownerId: z.string(),
  version: z.number().int().positive(),
  schemaVersion: z.literal(1),
  scoringVersion: z.string(),
  promptVersion: z.string(),
  generatedAt: Iso,
  stage: Stage,
  stageProfile: StageProfile,
  overall: Overall,
  narrative: z.object({
    executiveSummary: z.array(Claim),
    investmentOverview: z.array(Claim),
    marketTrends: z.array(Claim),
    marketGaps: z.array(Claim),
    aiInsights: z.array(Claim),
  }),
  flags: z.array(Flag).max(50),
  checklist: z.array(ChecklistItem).max(80),
  evidenceStats: EvidenceStats,
  warnings: z.array(RunWarning),
});

export type EvidenceStats = z.infer<typeof EvidenceStats>;
export type Overall = z.infer<typeof Overall>;
export type RunWarning = z.infer<typeof RunWarning>;
export type Report = z.infer<typeof Report>;
