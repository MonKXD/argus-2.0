import type { Reliability } from "@/lib/schema/enums";

/**
 * AI_SPEC 5.2's reliability weight table (quality_c: "max reliability weight
 * among the criterion's VERIFIED claims"). Extracted as a shared primitive
 * now because `Fact.confidence` (AI_SPEC 3.2, this file's other export)
 * needs the identical table and the full scoring module doesn't land until
 * T-2.10 — a second, drifting copy of these three numbers is worse than
 * building this one small piece early.
 */
const RELIABILITY_WEIGHT: Record<Reliability, number> = {
  INDEPENDENT: 1.0,
  FIRST_PARTY: 0.7,
  PROVIDED: 0.5,
};

export function reliabilityWeight(reliability: Reliability): number {
  return RELIABILITY_WEIGHT[reliability];
}

const RELIABILITY_RANK: Record<Reliability, number> = {
  INDEPENDENT: 3,
  FIRST_PARTY: 2,
  PROVIDED: 1,
};

/** AI_SPEC 3.2: "computes `reliability` as the strongest among quotes." */
export function strongestReliability(a: Reliability, b: Reliability): Reliability {
  return RELIABILITY_RANK[a] >= RELIABILITY_RANK[b] ? a : b;
}
