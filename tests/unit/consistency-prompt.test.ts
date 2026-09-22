import { describe, expect, it } from "vitest";

import { buildConsistencyPrompt } from "@/lib/analysis/prompts/consistency";
import type { Fact } from "@/lib/schema/evidence";

function fact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: "fct_00000000000000000000000001",
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    key: "team.size",
    statement: "Team has 12 employees.",
    value: { kind: "number", value: 12 },
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "12 employees" }],
    reliability: "PROVIDED",
    confidence: 0.5,
    conflictsWith: [],
    runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    ...overrides,
  };
}

describe("buildConsistencyPrompt", () => {
  it("renders each pair with its index and both facts", () => {
    const factA = fact();
    const factB = fact({ id: "fct_00000000000000000000000002", statement: "Team has 20 employees." });

    const prompt = buildConsistencyPrompt([{ factA, factB }]);

    expect(prompt.cachePrefix).toContain("Pair 0:");
    expect(prompt.cachePrefix).toContain("Fact A:");
    expect(prompt.cachePrefix).toContain("Fact B:");
    expect(prompt.cachePrefix).toContain('id="fct_00000000000000000000000001"');
    expect(prompt.cachePrefix).toContain('id="fct_00000000000000000000000002"');
    expect(prompt.user).toContain("CONFLICT");
    expect(prompt.user).toContain("DIFFERENT_PERIOD");
    expect(prompt.user).toContain("ROUNDING");
  });

  it("renders multiple pairs with increasing indices", () => {
    const factA = fact();
    const factB = fact({ id: "fct_00000000000000000000000002" });
    const factC = fact({ id: "fct_00000000000000000000000003" });

    const prompt = buildConsistencyPrompt([
      { factA, factB },
      { factA: factB, factB: factC },
    ]);

    expect(prompt.cachePrefix).toContain("Pair 0:");
    expect(prompt.cachePrefix).toContain("Pair 1:");
  });
});
