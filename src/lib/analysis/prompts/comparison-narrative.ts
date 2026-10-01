import { z } from "zod";

import { renderFactBlock } from "@/lib/analysis/prompts/fact-block";
import { renderDimensionBlock, renderFlagBlock } from "@/lib/analysis/prompts/narrative-blocks";
import { escapeForPromptBlock, PROMPT_PREAMBLE } from "@/lib/analysis/prompts/preamble";
import { CandidateNarrativeClaim } from "@/lib/analysis/prompts/synthesis";
import type { DimensionAnalysis, Flag } from "@/lib/schema/claims";
import type { Fact } from "@/lib/schema/evidence";
import type { Overall } from "@/lib/schema/report";

/** FR-CMP-05/AI_SPEC's step table has no row for this — it's T-5.04's own
 * addition, following SYNTHESIZE's exact versioning contract (R-AI-09:
 * bump on any change that can alter output). */
export const COMPARISON_NARRATIVE_PROMPT_VERSION = "1.0.0";

export const COMPARISON_NARRATIVE_TOOL_NAME = "submit_comparison_narrative";

/** Flat, not sectioned like `Report.narrative` — `Comparison.narrative` is a
 * single `Claim[]` (SCHEMA.md section 6), so there's no section structure
 * for the model to fill. */
export const SubmitComparisonNarrativeInput = z.object({
  narrative: z.array(CandidateNarrativeClaim).min(1).max(20),
});

export type SubmitComparisonNarrativeInput = z.infer<typeof SubmitComparisonNarrativeInput>;

export interface ComparisonNarrativeItem {
  label: string;
  overall: Overall;
  dimensions: DimensionAnalysis[];
  flags: Flag[];
  facts: Fact[];
}

export interface ComparisonNarrativePrompt {
  system: string;
  user: string;
  cachePrefix: string;
}

/**
 * Same shape and constraints as `buildSynthesisPrompt` (AI_SPEC 7.6), over
 * N startups' already-validated material instead of one — reusing
 * `CandidateNarrativeClaim`'s exact restatement contract (`restatesId`
 * pointing at a real `clm_`/`fct_` id) works unchanged here since claim and
 * fact ids are globally unique ULIDs, not scoped per analysis, so no
 * per-startup id prefixing is needed to keep them apart across startups.
 */
export function buildComparisonNarrativePrompt(items: ComparisonNarrativeItem[]): ComparisonNarrativePrompt {
  const startupBlocks = items.map(renderStartupBlock).join("\n");

  const user = [
    `Comparing ${items.length} startups: ${items.map((i) => i.label).join(", ")}.`,
    "",
    "Task: write a comparative narrative (5 to 10 claims) using only the validated material below.",
    "Cover relative strengths, relative risks, and how the startups differ across dimensions —",
    "always naming which startup a comparative statement is about.",
    "",
    "Constraints:",
    "- Each sentence is one claim. To restate a claim or fact already shown below as VERIFIED,",
    '  set status VERIFIED and restatesId to its real "clm_..." or "fct_..." id — do not retype',
    "  its quote. For anything else, use AI_ANALYSIS with basedOn referencing existing claim or",
    "  fact ids below.",
    "- No new numbers or names: only numbers and entities already present in the material below.",
    '- No superlatives ("best", "guaranteed", "certain"). No recommendation to invest or pass —',
    '  use "considerations" and "questions".',
    "- State where a startup has no comparable data plainly, not glossed over.",
    "",
    startupBlocks,
  ].join("\n");

  return { system: PROMPT_PREAMBLE, user, cachePrefix: startupBlocks };
}

function renderStartupBlock(item: ComparisonNarrativeItem): string {
  const dimensionsBlock = item.dimensions.map(renderDimensionBlock).join("\n");
  const flagsBlock = item.flags.length > 0 ? item.flags.map(renderFlagBlock).join("\n") : "(none)";
  const factsBlock = item.facts.length > 0 ? item.facts.map(renderFactBlock).join("\n") : "(none)";
  const overallLine = `score=${item.overall.score ?? "null"} label=${item.overall.label} confidence=${item.overall.confidence}`;
  return [
    `<startup label="${escapeForPromptBlock(item.label)}" overall="${overallLine}">`,
    dimensionsBlock,
    flagsBlock,
    factsBlock,
    "</startup>",
  ].join("\n");
}
