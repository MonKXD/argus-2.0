import { describe, expect, it } from "vitest";

import {
  derivationInputsAreReal,
  extractNumbers,
  numberAppearsIn,
  withinTolerance,
} from "@/lib/analysis/verify/numeric-grounding";

describe("extractNumbers", () => {
  it("extracts a currency amount with a letter multiplier", () => {
    expect(extractNumbers("ARR reached $2.0M in Q2 2026.")).toEqual(
      expect.arrayContaining([
        { kind: "currency", value: 2_000_000 },
        { kind: "integer", value: 2026 },
      ]),
    );
  });

  it("extracts a currency amount with a spelled-out multiplier word", () => {
    expect(extractNumbers("Total raised: $1.2 million across two rounds.")).toEqual([
      { kind: "currency", value: 1_200_000 },
    ]);
  });

  it("extracts percent and multiple tokens", () => {
    expect(extractNumbers("Revenue grew 40% at a 3x multiple.")).toEqual([
      { kind: "percent", value: 40 },
      { kind: "multiple", value: 3 },
    ]);
  });

  it("does not double-count a currency amount as a bare integer", () => {
    expect(extractNumbers("CAC is $500 and LTV is $3,000.")).toEqual([
      { kind: "currency", value: 500 },
      { kind: "currency", value: 3000 },
    ]);
  });

  it("exempts bare integers of 10 or below (AI_SPEC V2 known limitation)", () => {
    expect(extractNumbers("The team has 4 engineers and 2 sales reps.")).toEqual([]);
  });

  it("extracts a bare integer above 10", () => {
    expect(extractNumbers("Runway is 18 months.")).toEqual([{ kind: "integer", value: 18 }]);
  });
});

describe("numberAppearsIn", () => {
  it("is true when the same magnitude appears, even in a different textual form", () => {
    expect(numberAppearsIn(2_000_000, "The deck states ARR of $2.0M this quarter.")).toBe(true);
  });

  it("is false when the magnitude is absent", () => {
    expect(numberAppearsIn(5_000_000, "The deck states ARR of $2.0M this quarter.")).toBe(false);
  });
});

describe("withinTolerance", () => {
  it("accepts an exact match", () => {
    expect(withinTolerance(100, 100)).toBe(true);
  });

  it("accepts a difference within 1%", () => {
    expect(withinTolerance(100, 100.9)).toBe(true);
  });

  it("rejects a difference beyond 1%", () => {
    expect(withinTolerance(100, 102)).toBe(false);
  });

  it("treats two zeros as equal", () => {
    expect(withinTolerance(0, 0)).toBe(true);
  });
});

describe("derivationInputsAreReal", () => {
  it("is true when every input matches a real fact's value", () => {
    const derivation = {
      formula: "cash / burn_monthly",
      inputs: [
        { factId: "fct_00000000000000000000000001", value: 900_000 },
        { factId: "fct_00000000000000000000000002", value: 50_000 },
      ],
      result: 18,
    };
    const facts = new Map([
      ["fct_00000000000000000000000001", 900_000],
      ["fct_00000000000000000000000002", 50_000],
    ]);
    expect(derivationInputsAreReal(derivation, (id) => facts.get(id))).toBe(true);
  });

  it("is false when an input cites a fact id that doesn't exist", () => {
    const derivation = {
      formula: "cash / burn_monthly",
      inputs: [{ factId: "fct_00000000000000000000000099", value: 900_000 }],
      result: 18,
    };
    expect(derivationInputsAreReal(derivation, () => undefined)).toBe(false);
  });

  it("is false when an input's stated value doesn't match the real fact's value", () => {
    const derivation = {
      formula: "cash / burn_monthly",
      inputs: [{ factId: "fct_00000000000000000000000001", value: 900_000 }],
      result: 18,
    };
    const facts = new Map([["fct_00000000000000000000000001", 500_000]]);
    expect(derivationInputsAreReal(derivation, (id) => facts.get(id))).toBe(false);
  });
});
