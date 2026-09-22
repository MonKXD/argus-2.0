import { PricingNotFoundError } from "@/lib/ai/errors";

/**
 * Per-million-token USD pricing (TRD section 5.4: "Cost estimates use a
 * price table in config, never inline constants"). Verified against
 * https://platform.claude.com/docs/en/about-claude/pricing on 2026-09-22
 * for the two model families this project's env config uses (R-AI-10):
 * Claude Sonnet 5 (ANALYSIS/SYNTHESIS) and Claude Haiku 4.5 (FAST). The
 * cache-write rate is the 5-minute `cache_control: { type: "ephemeral" }`
 * tier (this client's default, src/lib/ai/llm.ts) — re-verify against the
 * pricing page if a call ever needs the 1-hour tier instead. Re-verify all
 * rates, and add an entry, before wiring in another model family.
 */
export interface ModelPricing {
  inputPerMTok: number;
  cacheWritePerMTok: number;
  cacheReadPerMTok: number;
  outputPerMTok: number;
}

const PRICE_TABLE: Record<string, ModelPricing> = {
  "claude-sonnet-5": { inputPerMTok: 2, cacheWritePerMTok: 2.5, cacheReadPerMTok: 0.2, outputPerMTok: 10 },
  "claude-haiku-4-5": { inputPerMTok: 1, cacheWritePerMTok: 1.25, cacheReadPerMTok: 0.1, outputPerMTok: 5 },
};

/** Model IDs may carry a trailing release-date suffix (e.g. `-20251001'); pricing is keyed on the family name. */
const DATED_SUFFIX = /-\d{8}$/;

function normalizeModelId(modelId: string): string {
  return modelId.replace(DATED_SUFFIX, "");
}

export function pricingForModel(modelId: string): ModelPricing {
  const pricing = PRICE_TABLE[normalizeModelId(modelId)];
  if (!pricing) throw new PricingNotFoundError(modelId);
  return pricing;
}

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}

export function estimateCostUsd(modelId: string, tokens: TokenCounts): number {
  const p = pricingForModel(modelId);
  return (
    (tokens.inputTokens * p.inputPerMTok +
      tokens.outputTokens * p.outputPerMTok +
      tokens.cacheWriteTokens * p.cacheWritePerMTok +
      tokens.cacheReadTokens * p.cacheReadPerMTok) /
    1_000_000
  );
}
