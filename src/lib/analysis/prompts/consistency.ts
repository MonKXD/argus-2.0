import { z } from "zod";

import { renderFactBlock } from "@/lib/analysis/prompts/fact-block";
import { PROMPT_PREAMBLE } from "@/lib/analysis/prompts/preamble";
import type { Fact } from "@/lib/schema/evidence";

/** AI_SPEC 7.5. Bump on any change that can alter output (R-AI-09). */
export const CONSISTENCY_PROMPT_VERSION = "1.0.0";

export const CONSISTENCY_TOOL_NAME = "submit_conflicts";

export const ConflictVerdict = z.object({
  pairIndex: z.number().int().nonnegative(),
  verdict: z.enum(["CONFLICT", "DIFFERENT_PERIOD", "ROUNDING"]),
  explanation: z.string().max(300),
});

export const SubmitConflictsInput = z.object({
  verdicts: z.array(ConflictVerdict),
});

export type ConflictVerdict = z.infer<typeof ConflictVerdict>;
export type SubmitConflictsInput = z.infer<typeof SubmitConflictsInput>;

export interface ConsistencyCandidatePair {
  factA: Fact;
  factB: Fact;
}

export interface ConsistencyPrompt {
  system: string;
  user: string;
  cachePrefix: string;
}

export function buildConsistencyPrompt(pairs: ConsistencyCandidatePair[]): ConsistencyPrompt {
  const pairsBlock = pairs
    .map(
      (pair, index) =>
        `Pair ${index}:\nFact A: ${renderFactBlock(pair.factA)}\nFact B: ${renderFactBlock(pair.factB)}`,
    )
    .join("\n\n");

  const user = [
    "Task: for each pair of facts below, decide whether they truly conflict, differ only by",
    "period or definition, or differ by rounding. Explain in one sentence citing the quotes.",
    "",
    "Report each pair's index (as given below) with its verdict: CONFLICT (a real conflict),",
    "DIFFERENT_PERIOD (differs only by period or definition), or ROUNDING (differs only by",
    "rounding).",
  ].join("\n");

  return { system: PROMPT_PREAMBLE, user, cachePrefix: `Pairs:\n${pairsBlock}` };
}
