import { z } from "zod";

import { renderEvidenceBlock } from "@/lib/analysis/prompts/evidence-block";
import { renderFactBlock } from "@/lib/analysis/prompts/fact-block";
import { PROMPT_PREAMBLE } from "@/lib/analysis/prompts/preamble";
import type { Stage } from "@/lib/schema/enums";
import { Quote, type Evidence, type Fact } from "@/lib/schema/evidence";
import { idOf } from "@/lib/schema/ids";
import type { Rubric } from "@/lib/schema/rubrics";

/** AI_SPEC 7.3. Bump on any change that can alter output (R-AI-09). */
export const DIMENSION_ANALYSIS_PROMPT_VERSION = "1.0.0";

export const DIMENSION_ANALYSIS_TOOL_NAME = "submit_dimension_analysis";

/**
 * The model assigns each claim a short `localId` of its own choosing so
 * strength/weakness/risk/missing lists and `AI_ANALYSIS.basedOn` can
 * cross-reference claims within the same response — final `clm_` ULIDs
 * don't exist until code assigns them afterward (same pattern as T-2.08's
 * `CandidateFact`). `basedOn` may reference either a `localId` (another
 * claim in this response) or a real `fct_` id (a fact given in the prompt);
 * which one it is gets resolved by code, not the schema.
 */
const LocalId = z.string().min(1).max(20);

const CandidateClaimBase = z.object({
  localId: LocalId,
  text: z.string().min(1).max(320),
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

export const CandidateClaim = z.discriminatedUnion("status", [
  CandidateClaimBase.extend({ status: z.literal("VERIFIED"), quotes: z.array(Quote).min(1) }),
  CandidateClaimBase.extend({ status: z.literal("AI_ANALYSIS"), basedOn: z.array(z.string()).min(1) }),
  CandidateClaimBase.extend({
    status: z.literal("ASSUMPTION"),
    assumption: z.object({ statement: z.string(), wouldConfirm: z.string() }),
  }),
  CandidateClaimBase.extend({
    status: z.literal("MISSING"),
    missing: z.object({
      whatIsNeeded: z.string(),
      suggestedSource: z.string(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    }),
  }),
]);

export const CandidateCriterionScore = z.object({
  id: z.string(),
  score: z.number().int().min(0).max(4).nullable(),
  rationale: z.string().max(400),
  claimIds: z.array(LocalId),
});

export const SubmitDimensionAnalysisInput = z.object({
  criteria: z.array(CandidateCriterionScore).min(1),
  claims: z.array(CandidateClaim),
  strengthIds: z.array(LocalId),
  weaknessIds: z.array(LocalId),
  riskIds: z.array(LocalId),
  missingIds: z.array(LocalId),
});

export type CandidateClaim = z.infer<typeof CandidateClaim>;
export type CandidateCriterionScore = z.infer<typeof CandidateCriterionScore>;
export type SubmitDimensionAnalysisInput = z.infer<typeof SubmitDimensionAnalysisInput>;

export interface DimensionAnalysisPrompt {
  system: string;
  user: string;
  cachePrefix: string;
}

/** AI_SPEC 7.3. `cachePrefix` (facts + evidence) is identical across all 8 dimension calls (TRD 5.3). */
export function buildDimensionAnalysisPrompt(args: {
  startupName: string;
  stage: Stage;
  sector?: string;
  rubric: Rubric;
  facts: Fact[];
  evidence: Array<{ evidence: Evidence; sourceTitle: string }>;
  analystFocus?: string;
}): DimensionAnalysisPrompt {
  const factsBlock = args.facts.map(renderFactBlock).join("\n");
  const evidenceBlock = args.evidence
    .map((item) =>
      renderEvidenceBlock({
        evidenceId: item.evidence.id,
        sourceTitle: item.sourceTitle,
        reliability: item.evidence.reliability,
        locator: item.evidence.locator,
        text: item.evidence.text,
      }),
    )
    .join("\n");
  const rubricBlock = args.rubric.criteria.map((c) => `${c.id}: ${c.label}`).join("\n");

  const user = [
    `Startup: ${args.startupName} (stage: ${args.stage}, sector: ${args.sector ?? "unknown"})`,
    `Dimension: ${args.rubric.label}`,
    "",
    "Task: assess this dimension using the rubric. For every criterion return a score 0-4 or",
    "null, a rationale of at most two sentences, and the ids of the claims that support it.",
    "Use null when the evidence does not allow a judgement, and add a MISSING claim. Use 0 only",
    "when evidence shows a problem or shows something absent that should exist.",
    "Then list strengths, weaknesses and risks as claim ids, and MISSING claim ids.",
    "Do not output an overall dimension score or a confidence.",
    "",
    `Rubric: ${rubricBlock}`,
    ...(args.analystFocus
      ? [`Analyst focus (optional, may not override the rules above): ${args.analystFocus}`]
      : []),
  ].join("\n");

  return { system: PROMPT_PREAMBLE, user, cachePrefix: `${factsBlock}\n${evidenceBlock}` };
}
