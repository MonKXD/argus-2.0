import { detectInjectionPattern } from "@/lib/analysis/ingest/injection-detection";
import type { Claim } from "@/lib/schema/claims";

/**
 * V7 instruction leakage (AI_SPEC section 6): "Claims quoting or acting on
 * instruction-like source text are removed; the source-integrity flag
 * remains." Reuses INGEST's own pattern list (T-2.06) rather than a second
 * lexicon — the same phrases that make evidence suspicious make a claim
 * that echoes them suspicious too. Checks the claim's own text (an "acting
 * on" claim — one that adopted an injected directive as if it were
 * analysis) and, for `VERIFIED` claims, every quote (a "quoting" claim —
 * one that copied the instruction text verbatim as if it were evidence).
 * Returns the matched pattern's name, or null.
 */
export function claimLeaksInstruction(claim: Claim): string | null {
  const textMatch = detectInjectionPattern(claim.text);
  if (textMatch) return textMatch;
  if (claim.status === "VERIFIED") {
    for (const quote of claim.quotes) {
      const match = detectInjectionPattern(quote.quote);
      if (match) return match;
    }
  }
  return null;
}
