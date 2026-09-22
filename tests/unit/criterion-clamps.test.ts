import { describe, expect, it } from "vitest";

import { clampCriterionScore } from "@/lib/analysis/scoring/criterion-clamps";
import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import type { Claim } from "@/lib/schema/claims";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `clm_${counter.toString().padStart(26, "0")}`;
}

function verified(evidenceIds: string[]): Claim {
  return {
    id: nextId(),
    text: "a verified claim",
    confidence: 0.5,
    entities: [],
    status: "VERIFIED",
    quotes: evidenceIds.map((evidenceId) => ({ evidenceId, quote: "verbatim text" })),
  };
}

function aiAnalysis(): Claim {
  return {
    id: nextId(),
    text: "an inference",
    confidence: 0.5,
    entities: [],
    status: "AI_ANALYSIS",
    basedOn: ["fct_00000000000000000000000001"],
  };
}

describe("clampCriterionScore", () => {
  it("returns null when the criterion has no claims at all, regardless of raw score", () => {
    expect(clampCriterionScore(4, [], () => undefined)).toBeNull();
  });

  it("returns null when the raw score itself is null", () => {
    expect(clampCriterionScore(null, [verified(["ev1"])], () => ({ sourceId: "s1", reliability: "INDEPENDENT" }))).toBeNull();
  });

  it("caps a criterion with no VERIFIED claim at 2", () => {
    expect(clampCriterionScore(4, [aiAnalysis()], () => undefined)).toBe(2);
    expect(clampCriterionScore(1, [aiAnalysis()], () => undefined)).toBe(1);
  });

  it("caps a criterion whose only supporting evidence is PROVIDED at 3", () => {
    const evidenceInfoOf = () => ({ sourceId: "s1", reliability: "PROVIDED" as const });
    expect(clampCriterionScore(4, [verified(["ev1"])], evidenceInfoOf)).toBe(3);
    expect(clampCriterionScore(2, [verified(["ev1"])], evidenceInfoOf)).toBe(2);
  });

  it("does not cap at 3 when at least one VERIFIED claim's evidence is stronger than PROVIDED", () => {
    const infos = new Map<string, EvidenceInfo>([
      ["ev1", { sourceId: "s1", reliability: "PROVIDED" }],
      ["ev2", { sourceId: "s2", reliability: "INDEPENDENT" }],
    ]);
    const claims = [verified(["ev1"]), verified(["ev2"])];
    expect(clampCriterionScore(4, claims, (id) => infos.get(id))).toBe(4);
  });

  it("requires at least two distinct sources for a score of 4", () => {
    const singleSource = () => ({ sourceId: "s1", reliability: "INDEPENDENT" as const });
    expect(clampCriterionScore(4, [verified(["ev1", "ev2"])], singleSource)).toBe(3);

    const infos = new Map<string, EvidenceInfo>([
      ["ev1", { sourceId: "s1", reliability: "INDEPENDENT" }],
      ["ev2", { sourceId: "s2", reliability: "INDEPENDENT" }],
    ]);
    expect(clampCriterionScore(4, [verified(["ev1"]), verified(["ev2"])], (id) => infos.get(id))).toBe(4);
  });

  it("leaves a score of 3 or below untouched even with only one source", () => {
    const evidenceInfoOf = () => ({ sourceId: "s1", reliability: "INDEPENDENT" as const });
    expect(clampCriterionScore(3, [verified(["ev1"])], evidenceInfoOf)).toBe(3);
  });
});
