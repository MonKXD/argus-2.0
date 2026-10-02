import { z } from "zod";

import { escapeForPromptBlock, PROMPT_PREAMBLE } from "@/lib/analysis/prompts/preamble";
import { DimensionKey } from "@/lib/schema/enums";

/** AI_SPEC-equivalent for the signals pipeline (T-6.01, FR-WCH-02). Bump on
 * any change that can alter output (R-AI-09). */
export const SIGNAL_DETECTION_PROMPT_VERSION = "1.0.0";

export const SIGNAL_DETECTION_TOOL_NAME = "submit_signal_summary";

export const SubmitSignalSummaryInput = z.object({
  summary: z.string().max(400),
  impact: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "UNCLEAR"]),
  relatedDimension: DimensionKey.optional(),
});

export type SubmitSignalSummaryInput = z.infer<typeof SubmitSignalSummaryInput>;

export interface SignalDetectionPrompt {
  system: string;
  user: string;
  cachePrefix: string;
}

/**
 * The model never supplies the title, URL or publisher — those come from
 * the search hit itself (R-AI-01: never invent sources). It only
 * summarises and classifies the one article's already-extracted,
 * already-sanitised text, grounded in that text alone (same "wrap
 * untrusted content in a delimited block" discipline as every other
 * prompt, R-AI-06).
 */
export function buildSignalDetectionPrompt(companyName: string, articleText: string): SignalDetectionPrompt {
  const user = [
    `Task: the article below may mention ${companyName}. Summarise what it says about the`,
    "company in one or two sentences (at most 400 characters), grounded only in the article",
    "text — do not add information the article doesn't state.",
    "",
    "Classify the likely impact on an investor's view of the company: POSITIVE, NEGATIVE,",
    "NEUTRAL, or UNCLEAR if the article isn't really about the company or has no clear",
    "investment-relevant content. Optionally name the one due-diligence dimension (founder,",
    "market, product, traction, competitive, business_model, financial, risk) the article",
    "most relates to, if any.",
  ].join("\n");

  return {
    system: PROMPT_PREAMBLE,
    user,
    cachePrefix: `<evidence>\n${escapeForPromptBlock(articleText)}\n</evidence>`,
  };
}
