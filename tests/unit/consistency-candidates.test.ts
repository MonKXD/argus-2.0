import { describe, expect, it } from "vitest";

import { findConsistencyCandidates } from "@/lib/analysis/steps/consistency-candidates";
import type { Fact, FactValue } from "@/lib/schema/evidence";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `fct_${counter.toString().padStart(26, "0")}`;
}

function fact(key: string, value: FactValue, overrides: Partial<Fact> = {}): Fact {
  return {
    id: nextId(),
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    key,
    statement: "a fact",
    value,
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "verbatim text" }],
    reliability: "PROVIDED",
    confidence: 0.5,
    conflictsWith: [],
    runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    ...overrides,
  };
}

describe("findConsistencyCandidates", () => {
  it("finds no candidates when there is only one fact per key", () => {
    const facts = [fact("team.size", { kind: "number", value: 12 })];
    expect(findConsistencyCandidates(facts)).toEqual([]);
  });

  it("finds a candidate for numeric values differing by more than 5%", () => {
    const facts = [
      fact("team.size", { kind: "number", value: 12 }),
      fact("team.size", { kind: "number", value: 20 }),
    ];
    expect(findConsistencyCandidates(facts)).toHaveLength(1);
  });

  it("does not flag numeric values within 5% of each other", () => {
    const facts = [
      fact("team.size", { kind: "number", value: 100 }),
      fact("team.size", { kind: "number", value: 103 }),
    ];
    expect(findConsistencyCandidates(facts)).toEqual([]);
  });

  it("finds a candidate for money values that differ by currency", () => {
    const facts = [
      fact("traction.arr", { kind: "money", amount: 2_000_000, currency: "USD" }),
      fact("traction.arr", { kind: "money", amount: 2_000_000, currency: "EUR" }),
    ];
    expect(findConsistencyCandidates(facts)).toHaveLength(1);
  });

  it("finds a candidate for differing textual values", () => {
    const facts = [
      fact("company.hq_location", { kind: "text", value: "San Francisco" }),
      fact("company.hq_location", { kind: "text", value: "Austin" }),
    ];
    expect(findConsistencyCandidates(facts)).toHaveLength(1);
  });

  it("does not compare facts under different keys", () => {
    const facts = [
      fact("team.size", { kind: "number", value: 12 }),
      fact("traction.customers", { kind: "number", value: 50 }),
    ];
    expect(findConsistencyCandidates(facts)).toEqual([]);
  });

  it("does not group facts by period -- differing-period pairs still become candidates for the model to adjudicate", () => {
    const facts = [
      fact("traction.arr", { kind: "money", amount: 1_000_000, currency: "USD" }, { period: "Q1 2026" }),
      fact("traction.arr", { kind: "money", amount: 2_000_000, currency: "USD" }, { period: "Q2 2026" }),
    ];
    expect(findConsistencyCandidates(facts)).toHaveLength(1);
  });

  it("generates all pairwise candidates within a group of 3+", () => {
    const facts = [
      fact("team.size", { kind: "number", value: 10 }),
      fact("team.size", { kind: "number", value: 20 }),
      fact("team.size", { kind: "number", value: 30 }),
    ];
    expect(findConsistencyCandidates(facts)).toHaveLength(3);
  });
});
