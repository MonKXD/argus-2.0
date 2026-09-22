import { z } from "zod";

import { DimensionKey, FlagCategory, Severity } from "@/lib/schema/enums";
import { Quote } from "@/lib/schema/evidence";
import { idOf } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 4. */

const ClaimBase = z.object({
  id: idOf("clm"),
  text: z.string().min(1).max(320),
  confidence: z.number().min(0).max(1),
  factKey: z.string().optional(),
  entities: z.array(z.string().max(120)).default([]),
  derivation: z
    .object({
      formula: z.string(),
      inputs: z.array(z.object({ factId: idOf("fct"), value: z.number() })).min(1),
      result: z.number(),
    })
    .optional(),
});

const RefId = z.string().regex(/^(fct|clm)_[0-9A-HJKMNP-TV-Z]{26}$/);

export const Claim = z.discriminatedUnion("status", [
  ClaimBase.extend({ status: z.literal("VERIFIED"), quotes: z.array(Quote).min(1) }),
  ClaimBase.extend({ status: z.literal("AI_ANALYSIS"), basedOn: z.array(RefId).min(1) }),
  ClaimBase.extend({
    status: z.literal("ASSUMPTION"),
    assumption: z.object({ statement: z.string(), wouldConfirm: z.string() }),
  }),
  ClaimBase.extend({
    status: z.literal("MISSING"),
    missing: z.object({
      whatIsNeeded: z.string(),
      suggestedSource: z.string(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    }),
  }),
]);

export const CriterionScore = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number().int().min(0).max(4).nullable(),
  rationale: z.string().max(400),
  claimIds: z.array(idOf("clm")),
});

export const DimensionAnalysis = z.object({
  dimension: DimensionKey,
  score: z.number().min(0).max(100).nullable(),
  confidence: z.number().min(0).max(1),
  evidenceTruncated: z.boolean().default(false),
  criteria: z.array(CriterionScore).min(3),
  claims: z.array(Claim),
  strengthIds: z.array(idOf("clm")),
  weaknessIds: z.array(idOf("clm")),
  riskIds: z.array(idOf("clm")),
  missingIds: z.array(idOf("clm")),
  scoringVersion: z.string(),
  promptVersion: z.string(),
});

export const Flag = z.object({
  id: idOf("flg"),
  category: FlagCategory,
  severity: Severity,
  title: z.string().max(120),
  description: z.string().max(600),
  evidenceIds: z.array(idOf("ev")),
  claimIds: z.array(idOf("clm")).default([]),
  detectedBy: z.enum(["CONSISTENCY", "DIMENSION", "VERIFIER"]),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "DISMISSED"]).default("OPEN"),
});

export const ChecklistItem = z.object({
  id: idOf("chk"),
  dimension: z.union([DimensionKey, z.literal("general")]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  question: z.string().max(240),
  whyItMatters: z.string().max(400),
  suggestedSource: z.string().max(200),
  linkedClaimIds: z.array(idOf("clm")),
  status: z.enum(["OPEN", "REQUESTED", "RECEIVED", "WAIVED"]).default("OPEN"),
  userNote: z.string().max(1000).optional(),
});

export type Claim = z.infer<typeof Claim>;
export type CriterionScore = z.infer<typeof CriterionScore>;
export type DimensionAnalysis = z.infer<typeof DimensionAnalysis>;
export type Flag = z.infer<typeof Flag>;
export type ChecklistItem = z.infer<typeof ChecklistItem>;
