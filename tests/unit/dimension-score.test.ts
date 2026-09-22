import { describe, expect, it } from "vitest";

import { computeDimensionScore, type ScoredCriterionInput } from "@/lib/analysis/scoring/dimension-score";
import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import type { Claim } from "@/lib/schema/claims";

let claimCounter = 0;
function nextId(): string {
  claimCounter += 1;
  return `clm_${claimCounter.toString().padStart(26, "0")}`;
}

/** A VERIFIED claim citing `sourceCount` distinct sources, all evidence at `reliability`. */
function verifiedClaim(reliability: EvidenceInfo["reliability"], evidenceIds: string[]): Claim {
  return {
    id: nextId(),
    text: "supporting claim",
    confidence: reliabilityToConfidence(reliability),
    entities: [],
    status: "VERIFIED",
    quotes: evidenceIds.map((evidenceId) => ({ evidenceId, quote: "verbatim quote text" })),
  };
}

function reliabilityToConfidence(r: EvidenceInfo["reliability"]): number {
  return r === "INDEPENDENT" ? 1 : r === "FIRST_PARTY" ? 0.7 : 0.5;
}

describe("computeDimensionScore: AI_SPEC 5.4 worked example (golden test)", () => {
  it("reproduces the Founder dimension's exact score (65) and confidence (0.69)", () => {
    // Criteria scores in rubric order: [3, 3, null, 2, 4, 1].
    // Reliability for the five scored criteria: PROVIDED, PROVIDED, FIRST_PARTY, INDEPENDENT, PROVIDED.
    // The score-2 and score-4 criteria each cite two distinct sources; the rest cite one.
    const evidenceInfo = new Map<string, EvidenceInfo>([
      ["ev1", { sourceId: "src1", reliability: "PROVIDED" }],
      ["ev2", { sourceId: "src1", reliability: "PROVIDED" }],
      ["ev3", { sourceId: "src2", reliability: "FIRST_PARTY" }],
      ["ev3b", { sourceId: "src3", reliability: "FIRST_PARTY" }],
      ["ev4", { sourceId: "src4", reliability: "INDEPENDENT" }],
      ["ev4b", { sourceId: "src5", reliability: "INDEPENDENT" }],
      ["ev5", { sourceId: "src6", reliability: "PROVIDED" }],
    ]);
    const evidenceInfoOf = (id: string) => evidenceInfo.get(id);

    const criteria: ScoredCriterionInput[] = [
      { score: 3, claims: [verifiedClaim("PROVIDED", ["ev1"])] },
      { score: 3, claims: [verifiedClaim("PROVIDED", ["ev2"])] },
      { score: null, claims: [] },
      { score: 2, claims: [verifiedClaim("FIRST_PARTY", ["ev3", "ev3b"])] },
      { score: 4, claims: [verifiedClaim("INDEPENDENT", ["ev4", "ev4b"])] },
      { score: 1, claims: [verifiedClaim("PROVIDED", ["ev5"])] },
    ];

    const result = computeDimensionScore(criteria, evidenceInfoOf, false);

    expect(result.score).toBe(65);
    expect(result.confidence).toBe(0.69);
  });
});

describe("computeDimensionScore: formula edge cases", () => {
  it("returns null score but still computes confidence when fewer than half of criteria are scored", () => {
    const criteria: ScoredCriterionInput[] = [
      { score: 3, claims: [verifiedClaim("PROVIDED", ["ev1"])] },
      { score: null, claims: [] },
      { score: null, claims: [] },
    ];
    const result = computeDimensionScore(criteria, () => ({ sourceId: "s1", reliability: "PROVIDED" }), false);
    expect(result.score).toBeNull();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("uses quality 0.25 when a scored criterion has only AI_ANALYSIS support", () => {
    const aiAnalysisClaim: Claim = {
      id: nextId(),
      text: "an inference",
      confidence: 0.5,
      entities: [],
      status: "AI_ANALYSIS",
      basedOn: ["fct_00000000000000000000000001"],
    };
    const criteria: ScoredCriterionInput[] = [{ score: 2, claims: [aiAnalysisClaim] }];
    const result = computeDimensionScore(criteria, () => undefined, false);
    // coverage_c=1, quality_c=0.25, corroboration=0 -> confidence = 0.5*1 + 0.3*0.25 + 0.2*0 = 0.575,
    // which rounds to 0.57 here (0.575 isn't exactly representable in floating point).
    expect(result.confidence).toBe(0.57);
  });

  it("multiplies confidence by 0.9 when evidence was truncated", () => {
    const criteria: ScoredCriterionInput[] = [{ score: 3, claims: [verifiedClaim("INDEPENDENT", ["ev1", "ev2"])] }];
    const evidenceInfoOf = () => ({ sourceId: "s1", reliability: "INDEPENDENT" as const });
    const withoutTruncation = computeDimensionScore(criteria, evidenceInfoOf, false);
    const withTruncation = computeDimensionScore(criteria, evidenceInfoOf, true);
    expect(withTruncation.confidence).toBeCloseTo(withoutTruncation.confidence * 0.9, 2);
  });

  it("returns score null and confidence 0 for a dimension with zero criteria", () => {
    const result = computeDimensionScore([], () => undefined, false);
    expect(result.score).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
