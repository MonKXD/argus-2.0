import { describe, expect, it } from "vitest";

import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import { detectUnverifiableClaims } from "@/lib/analysis/steps/unverifiable-claims";
import type { Claim } from "@/lib/schema/claims";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `clm_${counter.toString().padStart(26, "0")}`;
}

function verifiedClaim(text: string, evidenceIds: string[]): Claim {
  return {
    id: nextId(),
    text,
    confidence: 0.5,
    entities: [],
    status: "VERIFIED",
    quotes: evidenceIds.map((evidenceId) => ({ evidenceId, quote: "verbatim text" })),
  };
}

describe("detectUnverifiableClaims", () => {
  it("flags a superlative VERIFIED claim supported only by PROVIDED evidence", () => {
    const claim = verifiedClaim("Loopwell is the only platform that offers real-time freight matching.", ["ev1"]);
    const infos = new Map<string, EvidenceInfo>([["ev1", { sourceId: "s1", reliability: "PROVIDED" }]]);

    const flags = detectUnverifiableClaims([claim], (id) => infos.get(id));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      category: "UNVERIFIABLE_CLAIM",
      severity: "MEDIUM",
      claimIds: [claim.id],
      detectedBy: "VERIFIER",
      status: "OPEN",
    });
  });

  it("does not flag a superlative claim also backed by INDEPENDENT evidence", () => {
    const claim = verifiedClaim("Loopwell is the market leader in freight software.", ["ev1", "ev2"]);
    const infos = new Map<string, EvidenceInfo>([
      ["ev1", { sourceId: "s1", reliability: "PROVIDED" }],
      ["ev2", { sourceId: "s2", reliability: "INDEPENDENT" }],
    ]);

    expect(detectUnverifiableClaims([claim], (id) => infos.get(id))).toEqual([]);
  });

  it("does not flag an ordinary claim with no superlative language", () => {
    const claim = verifiedClaim("ARR reached $2.0M in Q2 2026.", ["ev1"]);
    const infos = new Map<string, EvidenceInfo>([["ev1", { sourceId: "s1", reliability: "PROVIDED" }]]);

    expect(detectUnverifiableClaims([claim], (id) => infos.get(id))).toEqual([]);
  });

  it("does not flag a non-VERIFIED claim even with superlative language", () => {
    const claim: Claim = {
      id: nextId(),
      text: "Loopwell is likely the only viable option in this niche.",
      confidence: 0.25,
      entities: [],
      status: "AI_ANALYSIS",
      basedOn: ["fct_00000000000000000000000001"],
    };

    expect(detectUnverifiableClaims([claim], () => undefined)).toEqual([]);
  });
});
