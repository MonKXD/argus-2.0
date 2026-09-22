import { z } from "zod";

import { renderFactBlock } from "@/lib/analysis/prompts/fact-block";
import { escapeForPromptBlock, PROMPT_PREAMBLE } from "@/lib/analysis/prompts/preamble";
import type { Claim, DimensionAnalysis, Flag } from "@/lib/schema/claims";
import { DimensionKey } from "@/lib/schema/enums";
import type { Fact } from "@/lib/schema/evidence";
import type { Overall } from "@/lib/schema/report";

/** AI_SPEC 7.6. Bump on any change that can alter output (R-AI-09). */
export const SYNTHESIS_PROMPT_VERSION = "1.0.0";

export const SYNTHESIS_TOOL_NAME = "submit_synthesis";

const LocalId = z.string().min(1).max(20);

const CandidateNarrativeClaimBase = z.object({
  localId: LocalId,
  text: z.string().min(1).max(320),
  entities: z.array(z.string().max(120)).default([]),
});

/**
 * Unlike ANALYZE's `CandidateClaim`, `VERIFIED` here carries no quotes of
 * its own. AI_SPEC 3.7 requires a narrative `VERIFIED` claim to be a
 * restatement that "reuses [an existing claim's or fact's] quotes"
 * verbatim, and this step's prompt (7.6) gives the model no raw evidence
 * text to re-cite from in the first place — only already-validated
 * dimension claims and canonical facts. `restatesId` names the real
 * `clm_`/`fct_` id being restated; code resolves it to that record's real
 * quotes rather than trusting the model to retype them (R-AI-02: model
 * output is never trusted as-is).
 */
export const CandidateNarrativeClaim = z.discriminatedUnion("status", [
  CandidateNarrativeClaimBase.extend({ status: z.literal("VERIFIED"), restatesId: z.string() }),
  CandidateNarrativeClaimBase.extend({ status: z.literal("AI_ANALYSIS"), basedOn: z.array(z.string()).min(1) }),
  CandidateNarrativeClaimBase.extend({
    status: z.literal("ASSUMPTION"),
    assumption: z.object({ statement: z.string(), wouldConfirm: z.string() }),
  }),
  CandidateNarrativeClaimBase.extend({
    status: z.literal("MISSING"),
    missing: z.object({
      whatIsNeeded: z.string(),
      suggestedSource: z.string(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    }),
  }),
]);

export const CandidateChecklistItem = z.object({
  dimension: z.union([DimensionKey, z.literal("general")]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  question: z.string().max(240),
  whyItMatters: z.string().max(400),
  suggestedSource: z.string().max(200),
  // Real fct_/clm_ ids, or a localId of a narrative claim from this same
  // response (e.g. a checklist item pointing at a MISSING claim it just
  // authored) — resolved by code, not the schema, same split as ANALYZE's
  // basedOn.
  linkedClaimIds: z.array(z.string()).min(1),
});

export const SubmitSynthesisInput = z.object({
  executiveSummary: z.array(CandidateNarrativeClaim).min(1).max(20),
  investmentOverview: z.array(CandidateNarrativeClaim).min(1).max(20),
  marketTrends: z.array(CandidateNarrativeClaim).max(20),
  marketGaps: z.array(CandidateNarrativeClaim).max(20),
  aiInsights: z.array(CandidateNarrativeClaim).max(20),
  checklist: z.array(CandidateChecklistItem).max(80),
});

export type CandidateNarrativeClaim = z.infer<typeof CandidateNarrativeClaim>;
export type CandidateChecklistItem = z.infer<typeof CandidateChecklistItem>;
export type SubmitSynthesisInput = z.infer<typeof SubmitSynthesisInput>;

export interface SynthesisPrompt {
  system: string;
  user: string;
  cachePrefix: string;
}

/** AI_SPEC 7.6. `cachePrefix` (dimensions + flags + facts) is the same for the single SYNTHESIZE call. */
export function buildSynthesisPrompt(args: {
  startupName: string;
  overall: Overall;
  dimensions: DimensionAnalysis[];
  flags: Flag[];
  facts: Fact[];
}): SynthesisPrompt {
  const dimensionsBlock = args.dimensions.map(renderDimensionBlock).join("\n");
  const flagsBlock = args.flags.length > 0 ? args.flags.map(renderFlagBlock).join("\n") : "(none)";
  const factsBlock = args.facts.map(renderFactBlock).join("\n");
  const overallLine = `score=${args.overall.score ?? "null"} label=${args.overall.label} confidence=${args.overall.confidence} coverage=${args.overall.coverage}`;

  const user = [
    `Startup: ${args.startupName}`,
    "",
    "Task: write the report narrative using only the validated material below. Sections:",
    "executiveSummary (5-7 claims), investmentOverview (key thesis points for and against,",
    "key questions), marketTrends, marketGaps, aiInsights (4-8 cross-dimension observations),",
    "checklist (prioritised due diligence questions built from MISSING claims, null criteria",
    "and open flags below, each linking to the claim ids that caused it).",
    "",
    "Constraints:",
    "- Each sentence is one claim. To restate a claim or fact already shown below as VERIFIED,",
    '  set status VERIFIED and restatesId to its real "clm_..." or "fct_..." id — do not retype',
    "  its quote. For anything else, use AI_ANALYSIS with basedOn referencing existing claim or",
    "  fact ids below.",
    "- No new numbers or names: only numbers and entities already present in the material below.",
    '- No superlatives ("best", "guaranteed", "certain"). No recommendation to invest or pass —',
    '  use "considerations" and "questions".',
    "- State low-confidence (below 0.35) and missing dimensions plainly, not glossed over.",
    "",
    `Overall: ${overallLine}`,
  ].join("\n");

  return { system: PROMPT_PREAMBLE, user, cachePrefix: `${dimensionsBlock}\n${flagsBlock}\n${factsBlock}` };
}

function renderDimensionBlock(dimension: DimensionAnalysis): string {
  const claims = dimension.claims.map(renderClaimForPrompt).join("\n");
  return `<dimension key="${dimension.dimension}" score="${dimension.score ?? "null"}" confidence="${dimension.confidence}">\n${claims}\n</dimension>`;
}

function renderClaimForPrompt(claim: Claim): string {
  const text = escapeForPromptBlock(claim.text);
  const detail = claimDetail(claim);
  return `<claim id="${claim.id}" status="${claim.status}">${text}${detail ? ` (${escapeForPromptBlock(detail)})` : ""}</claim>`;
}

function claimDetail(claim: Claim): string | undefined {
  switch (claim.status) {
    case "VERIFIED":
      return `quote: "${claim.quotes.map((q) => q.quote).join('" / "')}"`;
    case "MISSING":
      return `needed: ${claim.missing.whatIsNeeded}`;
    default:
      return undefined;
  }
}

function renderFlagBlock(flag: Flag): string {
  const title = escapeForPromptBlock(flag.title);
  const description = escapeForPromptBlock(flag.description);
  return `<flag id="${flag.id}" category="${flag.category}" severity="${flag.severity}" status="${flag.status}">${title} — ${description}</flag>`;
}
