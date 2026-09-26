import { describe, expect, it } from "vitest";

import { dimensionContributions } from "@/lib/analysis/scoring/contribution";
import type { DimensionAnalysis, CriterionScore } from "@/lib/schema/claims";
import type { DimensionKey } from "@/lib/schema/enums";
import type { Overall } from "@/lib/schema/report";

function criteria(count: number): CriterionScore[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `crit_${i}`,
    label: `Criterion ${i}`,
    score: null,
    rationale: "",
    claimIds: [],
  }));
}

function dimension(dimension: DimensionKey, score: number | null, confidence: number): DimensionAnalysis {
  return {
    dimension,
    score,
    confidence,
    evidenceTruncated: false,
    criteria: criteria(3),
    claims: [],
    strengthIds: [],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
    scoringVersion: "v1",
    promptVersion: "v1",
  };
}

// AI_SPEC 5.4's worked example, verbatim.
const GOLDEN_DIMENSIONS: DimensionAnalysis[] = [
  dimension("founder", 65, 0.69),
  dimension("market", 72, 0.55),
  dimension("product", 60, 0.6),
  dimension("traction", null, 0),
  dimension("competitive", 55, 0.4),
  dimension("business_model", 58, 0.45),
  dimension("financial", null, 0),
  dimension("risk", 62, 0.5),
];

const GOLDEN_OVERALL: Overall = {
  score: 63,
  label: "SCORED",
  confidence: 0.435,
  coverage: 0.78,
  weights: {
    founder: 0.2,
    market: 0.16,
    product: 0.14,
    traction: 0.14,
    competitive: 0.1,
    business_model: 0.1,
    financial: 0.08,
    risk: 0.08,
  },
};

describe("dimensionContributions", () => {
  it("computes w_d * s_d / coverage for every scored dimension, per AI_SPEC 5.4", () => {
    const result = dimensionContributions(GOLDEN_OVERALL, GOLDEN_DIMENSIONS);
    const byDimension = new Map(result.map((r) => [r.dimension, r]));

    // 0.20 * 65 / 0.78 = 16.666...
    expect(byDimension.get("founder")!.contribution).toBeCloseTo(16.67, 2);
    // 0.16 * 72 / 0.78 = 14.769...
    expect(byDimension.get("market")!.contribution).toBeCloseTo(14.77, 2);
    // 0.14 * 60 / 0.78 = 10.769...
    expect(byDimension.get("product")!.contribution).toBeCloseTo(10.77, 2);
    // 0.10 * 55 / 0.78 = 7.051...
    expect(byDimension.get("competitive")!.contribution).toBeCloseTo(7.05, 2);
    // 0.10 * 58 / 0.78 = 7.435...
    expect(byDimension.get("business_model")!.contribution).toBeCloseTo(7.44, 2);
    // 0.08 * 62 / 0.78 = 6.358...
    expect(byDimension.get("risk")!.contribution).toBeCloseTo(6.36, 2);
  });

  it("gives an unscored dimension a null contribution", () => {
    const result = dimensionContributions(GOLDEN_OVERALL, GOLDEN_DIMENSIONS);
    const byDimension = new Map(result.map((r) => [r.dimension, r]));

    expect(byDimension.get("traction")!.contribution).toBeNull();
    expect(byDimension.get("financial")!.contribution).toBeNull();
  });

  it("sums the scored contributions back to close to the overall score", () => {
    const result = dimensionContributions(GOLDEN_OVERALL, GOLDEN_DIMENSIONS);
    const sum = result.reduce((total, r) => total + (r.contribution ?? 0), 0);

    // Per-dimension rounding means this doesn't hit 63 exactly, but stays close.
    expect(sum).toBeGreaterThan(62);
    expect(sum).toBeLessThan(64);
  });

  it("carries the weight, score and confidence through unchanged", () => {
    const result = dimensionContributions(GOLDEN_OVERALL, GOLDEN_DIMENSIONS);
    const founder = result.find((r) => r.dimension === "founder")!;

    expect(founder.weight).toBe(0.2);
    expect(founder.score).toBe(65);
    expect(founder.confidence).toBe(0.69);
    expect(founder.label).toBe("Founder");
  });

  it("returns every dimension even when a dimension is missing from the run", () => {
    const withoutRisk = GOLDEN_DIMENSIONS.filter((d) => d.dimension !== "risk");
    const result = dimensionContributions(GOLDEN_OVERALL, withoutRisk);
    const risk = result.find((r) => r.dimension === "risk")!;

    expect(risk).toBeDefined();
    expect(risk.score).toBeNull();
    expect(risk.contribution).toBeNull();
    expect(risk.weight).toBe(0.08);
  });

  it("returns a null contribution when coverage is zero", () => {
    const result = dimensionContributions({ ...GOLDEN_OVERALL, coverage: 0 }, GOLDEN_DIMENSIONS);
    for (const r of result) expect(r.contribution).toBeNull();
  });
});
