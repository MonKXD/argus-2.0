import { describe, expect, it } from "vitest";

import { COMPARE_METRIC_KEYS, formatFactValue, pickComparisonFacts } from "@/lib/compare-metrics";
import type { Fact } from "@/lib/schema/evidence";

function fact(overrides: Partial<Fact>): Fact {
  return {
    id: "fct_00000000000000000000000001",
    analysisId: "ana_00000000000000000000000001",
    key: "traction.arr",
    statement: "ARR is $1,200,000.",
    value: { kind: "money", amount: 120000000, currency: "USD" },
    quotes: [],
    reliability: "FIRST_PARTY",
    confidence: 0.8,
    conflictsWith: [],
    runId: "run_00000000000000000000000001",
    ...overrides,
  };
}

describe("formatFactValue", () => {
  it("formats money from base units", () => {
    expect(formatFactValue({ kind: "money", amount: 120000000, currency: "USD" })).toBe(
      "$1,200,000.00",
    );
  });

  it("formats percent from a 0-100 value", () => {
    expect(formatFactValue({ kind: "percent", value: 42 })).toBe("42%");
  });

  it("formats a number with its unit", () => {
    expect(formatFactValue({ kind: "number", value: 12, unit: "months" })).toBe("12 months");
  });

  it("formats a number with no unit", () => {
    expect(formatFactValue({ kind: "number", value: 12 })).toBe("12");
  });

  it("formats a boolean", () => {
    expect(formatFactValue({ kind: "boolean", value: true })).toBe("Yes");
  });

  it("formats a list by joining", () => {
    expect(formatFactValue({ kind: "list", values: ["a", "b"] })).toBe("a, b");
  });

  it("formats text and date as-is", () => {
    expect(formatFactValue({ kind: "text", value: "beta" })).toBe("beta");
    expect(formatFactValue({ kind: "date", value: "2026-01-01" })).toBe("2026-01-01");
  });
});

describe("pickComparisonFacts", () => {
  it("picks the one matching fact per curated key", () => {
    const result = pickComparisonFacts([fact({ key: "traction.arr" })]);
    expect(result["traction.arr"]).toBeDefined();
    expect(result["traction.arr"]!.value).toEqual({ kind: "money", amount: 120000000, currency: "USD" });
  });

  it("leaves a key undefined ('Not available') when no fact matches", () => {
    const result = pickComparisonFacts([]);
    for (const key of COMPARE_METRIC_KEYS) {
      expect(result[key]).toBeUndefined();
    }
  });

  it("ignores facts outside the curated key list", () => {
    const result = pickComparisonFacts([fact({ key: "company.name", value: { kind: "text", value: "Loopwell" } })]);
    expect(Object.keys(result)).toEqual(COMPARE_METRIC_KEYS);
  });
});
