import { describe, expect, it } from "vitest";

import { PricingNotFoundError } from "@/lib/ai/errors";
import { estimateCostUsd, pricingForModel } from "@/lib/ai/pricing";

describe("pricingForModel", () => {
  it("resolves Claude Sonnet 5 pricing", () => {
    expect(pricingForModel("claude-sonnet-5")).toEqual({
      inputPerMTok: 2,
      cacheWritePerMTok: 2.5,
      cacheReadPerMTok: 0.2,
      outputPerMTok: 10,
    });
  });

  it("resolves Claude Haiku 4.5 pricing from a dated model ID", () => {
    expect(pricingForModel("claude-haiku-4-5-20251001")).toEqual({
      inputPerMTok: 1,
      cacheWritePerMTok: 1.25,
      cacheReadPerMTok: 0.1,
      outputPerMTok: 5,
    });
  });

  it("throws PricingNotFoundError for an unconfigured model", () => {
    expect(() => pricingForModel("claude-opus-5")).toThrow(PricingNotFoundError);
  });
});

describe("estimateCostUsd", () => {
  it("matches the worked example from the pricing docs (Sonnet 5, no caching)", () => {
    const cost = estimateCostUsd("claude-sonnet-5", {
      inputTokens: 50_000,
      outputTokens: 15_000,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
    });
    expect(cost).toBeCloseTo(50_000 * (2 / 1_000_000) + 15_000 * (10 / 1_000_000), 10);
  });

  it("prices cache write and cache read tokens separately from base input", () => {
    const cost = estimateCostUsd("claude-haiku-4-5-20251001", {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.25 + 0.1, 10);
  });

  it("returns 0 for an all-zero usage", () => {
    expect(
      estimateCostUsd("claude-sonnet-5", {
        inputTokens: 0,
        outputTokens: 0,
        cacheWriteTokens: 0,
        cacheReadTokens: 0,
      }),
    ).toBe(0);
  });
});
