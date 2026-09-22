import { describe, expect, it } from "vitest";

import { computeOverall, type DimensionResult } from "@/lib/analysis/scoring/overall";
import type { Flag } from "@/lib/schema/claims";

// AI_SPEC 5.4's worked example, stage profile SEED.
const FOUNDER_EXAMPLE: DimensionResult[] = [
  { dimension: "founder", score: 65, confidence: 0.69 },
  { dimension: "market", score: 72, confidence: 0.55 },
  { dimension: "product", score: 60, confidence: 0.6 },
  { dimension: "traction", score: null, confidence: 0 },
  { dimension: "competitive", score: 55, confidence: 0.4 },
  { dimension: "business_model", score: 58, confidence: 0.45 },
  { dimension: "financial", score: null, confidence: 0 },
  { dimension: "risk", score: 62, confidence: 0.5 },
];

function flag(overrides: Partial<Flag> = {}): Flag {
  return {
    id: "flg_00000000000000000000000001",
    category: "INCONSISTENCY",
    severity: "CRITICAL",
    title: "Conflicting figures",
    description: "Team size differs between slides.",
    evidenceIds: [],
    claimIds: [],
    detectedBy: "CONSISTENCY",
    status: "OPEN",
    ...overrides,
  };
}

describe("computeOverall: AI_SPEC 5.4 worked example (golden test)", () => {
  it("reproduces the exact overall score (63), confidence (0.435) and coverage (0.78)", () => {
    const overall = computeOverall(FOUNDER_EXAMPLE, "SEED", []);

    expect(overall.coverage).toBe(0.78);
    expect(overall.score).toBe(63);
    expect(overall.confidence).toBe(0.44);
    expect(overall.label).toBe("SCORED");
    expect(overall.cap).toBeUndefined();
  });

  it("returns the full stage-profile weight table for transparency", () => {
    const overall = computeOverall(FOUNDER_EXAMPLE, "SEED", []);
    expect(overall.weights.founder).toBe(0.2);
    expect(overall.weights.traction).toBe(0.14);
  });
});

describe("computeOverall: coverage gate", () => {
  it("returns score null and label INSUFFICIENT_EVIDENCE when coverage is below 0.5", () => {
    const dims: DimensionResult[] = [
      { dimension: "founder", score: 70, confidence: 0.6 }, // weight 0.20 in SEED
      { dimension: "risk", score: 50, confidence: 0.5 }, // weight 0.08 in SEED
      ...(["market", "product", "traction", "competitive", "business_model", "financial"] as const).map(
        (dimension) => ({ dimension, score: null, confidence: 0 }),
      ),
    ];
    const overall = computeOverall(dims, "SEED", []);

    expect(overall.coverage).toBeLessThan(0.5);
    expect(overall.score).toBeNull();
    expect(overall.label).toBe("INSUFFICIENT_EVIDENCE");
  });
});

describe("computeOverall: critical flag cap", () => {
  it("caps the score at 60 when an OPEN CRITICAL flag exists", () => {
    const overall = computeOverall(FOUNDER_EXAMPLE, "SEED", [flag()]);

    expect(overall.score).toBe(60);
    expect(overall.cap).toEqual({
      value: 60,
      reason: "An open critical flag caps the score at 60",
      flagIds: ["flg_00000000000000000000000001"],
    });
  });

  it("does not cap on a CRITICAL flag that is not OPEN", () => {
    const overall = computeOverall(FOUNDER_EXAMPLE, "SEED", [flag({ status: "DISMISSED" })]);
    expect(overall.score).toBe(63);
    expect(overall.cap).toBeUndefined();
  });

  it("does not cap on an OPEN flag that is not CRITICAL", () => {
    const overall = computeOverall(FOUNDER_EXAMPLE, "SEED", [flag({ severity: "HIGH" })]);
    expect(overall.score).toBe(63);
    expect(overall.cap).toBeUndefined();
  });

  it("records the cap even when the uncapped score was already <= 60", () => {
    const lowScoreDims: DimensionResult[] = FOUNDER_EXAMPLE.map((d) =>
      d.score !== null ? { ...d, score: 40 } : d,
    );
    const overall = computeOverall(lowScoreDims, "SEED", [flag()]);
    expect(overall.score).toBe(40);
    expect(overall.cap).toEqual({
      value: 40,
      reason: "An open critical flag caps the score at 60",
      flagIds: ["flg_00000000000000000000000001"],
    });
  });

  it("does not attempt to cap when score is already null (insufficient evidence)", () => {
    const dims: DimensionResult[] = FOUNDER_EXAMPLE.map((d) => ({ ...d, score: null }));
    const overall = computeOverall(dims, "SEED", [flag()]);
    expect(overall.score).toBeNull();
    expect(overall.cap).toBeUndefined();
  });
});

describe("computeOverall: no scored dimensions", () => {
  it("returns null score and zero confidence when every dimension is null", () => {
    const dims: DimensionResult[] = FOUNDER_EXAMPLE.map((d) => ({ ...d, score: null, confidence: 0 }));
    const overall = computeOverall(dims, "SEED", []);
    expect(overall.score).toBeNull();
    expect(overall.confidence).toBe(0);
    expect(overall.coverage).toBe(0);
  });
});
