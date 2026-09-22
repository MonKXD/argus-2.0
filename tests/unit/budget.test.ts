import { describe, expect, it } from "vitest";

import { Budget } from "@/lib/ai/budget";
import type { Usage } from "@/lib/schema/run";

function usage(overrides: Partial<Usage> = {}): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    estimatedCostUsd: 0,
    ...overrides,
  };
}

describe("Budget", () => {
  it("starts with the full limit remaining and not exceeded", () => {
    const budget = new Budget(1000);
    expect(budget.remainingTokens()).toBe(1000);
    expect(budget.exceeded()).toBe(false);
    expect(budget.spentTokens).toBe(0);
  });

  it("sums input, output and both cache token kinds across records", () => {
    const budget = new Budget(1000);
    budget.record(usage({ inputTokens: 100, outputTokens: 50 }));
    budget.record(usage({ cacheWriteTokens: 20, cacheReadTokens: 10 }));
    expect(budget.spentTokens).toBe(180);
    expect(budget.remainingTokens()).toBe(820);
  });

  it("reports exceeded once spend reaches the limit", () => {
    const budget = new Budget(100);
    budget.record(usage({ inputTokens: 100 }));
    expect(budget.exceeded()).toBe(true);
    expect(budget.remainingTokens()).toBe(0);
  });

  it("clamps remainingTokens at 0 rather than going negative", () => {
    const budget = new Budget(100);
    budget.record(usage({ inputTokens: 250 }));
    expect(budget.remainingTokens()).toBe(0);
    expect(budget.exceeded()).toBe(true);
  });
});
