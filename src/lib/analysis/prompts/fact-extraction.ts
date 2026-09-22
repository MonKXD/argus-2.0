import { z } from "zod";

import { renderEvidenceBlock } from "@/lib/analysis/prompts/evidence-block";
import { PROMPT_PREAMBLE } from "@/lib/analysis/prompts/preamble";
import { CANONICAL_FACT_KEYS } from "@/lib/schema/canonical-fact-keys";
import { FactValue, Quote, type Evidence } from "@/lib/schema/evidence";

/** AI_SPEC 7.2. Bump on any change that can alter output (R-AI-09). */
export const FACT_EXTRACTION_PROMPT_VERSION = "1.0.0";

export const FACT_EXTRACTION_TOOL_NAME = "submit_facts";

export const CandidateFact = z.object({
  key: z.string().regex(/^[a-z_]+(\.[a-z0-9_]+)+$/),
  statement: z.string().max(280),
  value: FactValue,
  period: z.string().optional(),
  asOf: z.string().optional(),
  quotes: z.array(Quote).min(1),
});

export const SubmitFactsInput = z.object({
  facts: z.array(CandidateFact),
});

export type CandidateFact = z.infer<typeof CandidateFact>;
export type SubmitFactsInput = z.infer<typeof SubmitFactsInput>;

export interface FactExtractionEvidenceItem {
  evidence: Evidence;
  sourceTitle: string;
}

export interface FactExtractionPrompt {
  system: string;
  user: string;
  cachePrefix: string;
}

/** AI_SPEC 3.2: called once per source's evidence batch, not once for the whole analysis. */
export function buildFactExtractionPrompt(args: {
  startupName: string;
  items: FactExtractionEvidenceItem[];
}): FactExtractionPrompt {
  const cachePrefix = args.items
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

  const user = [
    `Task: extract atomic facts about ${args.startupName} from the evidence below.`,
    `For each fact provide: key (canonical key list below, else custom.<snake_case>), a one-line`,
    `statement, a typed value, period or asOf when stated, and at least one verbatim quote with`,
    `its evidence id. Do not calculate or infer values. If a figure is given with no period,`,
    `leave period empty. Extract conflicting values as separate facts.`,
    "",
    `Canonical keys: ${CANONICAL_FACT_KEYS.join(", ")}`,
  ].join("\n");

  return { system: PROMPT_PREAMBLE, user, cachePrefix };
}
