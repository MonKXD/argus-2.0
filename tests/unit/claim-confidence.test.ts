import { describe, expect, it } from "vitest";

import { computeClaimConfidence } from "@/lib/analysis/scoring/claim-confidence";
import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";

describe("computeClaimConfidence", () => {
  it("VERIFIED: reuses the strongest cited evidence's reliability weight", () => {
    const infos = new Map<string, EvidenceInfo>([
      ["ev1", { sourceId: "s1", reliability: "PROVIDED" }],
      ["ev2", { sourceId: "s2", reliability: "INDEPENDENT" }],
    ]);
    const confidence = computeClaimConfidence(
      { status: "VERIFIED", quotes: [{ evidenceId: "ev1" }, { evidenceId: "ev2" }] },
      (id) => infos.get(id),
    );
    expect(confidence).toBe(1.0);
  });

  it("VERIFIED with no resolvable evidence falls back to the AI_ANALYSIS constant", () => {
    const confidence = computeClaimConfidence({ status: "VERIFIED", quotes: [{ evidenceId: "ev1" }] }, () => undefined);
    expect(confidence).toBe(0.25);
  });

  it("AI_ANALYSIS is fixed at 0.25 (AI_SPEC 5.2's own constant)", () => {
    expect(computeClaimConfidence({ status: "AI_ANALYSIS" }, () => undefined)).toBe(0.25);
  });

  it("ASSUMPTION is fixed at 0.1", () => {
    expect(computeClaimConfidence({ status: "ASSUMPTION" }, () => undefined)).toBe(0.1);
  });

  it("MISSING is fixed at 0", () => {
    expect(computeClaimConfidence({ status: "MISSING" }, () => undefined)).toBe(0);
  });
});
