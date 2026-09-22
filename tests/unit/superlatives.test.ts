import { describe, expect, it } from "vitest";

import { containsSuperlative } from "@/lib/analysis/verify/superlatives";

describe("containsSuperlative: catches genuine competitive-superiority claims", () => {
  it.each([
    "We are the first company to combine AI with logistics routing.",
    "Loopwell is the only platform that offers real-time freight matching.",
    "The deck states there are no competitors in this space.",
    "Ranked #1 in customer satisfaction among logistics startups.",
    "Our product is best-in-class for route optimization.",
    "Loopwell is the market leader in mid-market freight software.",
    "The solution is unmatched in the industry.",
    "Loopwell's technology is unparalleled among peers.",
  ])("flags: %s", (text) => {
    expect(containsSuperlative(text)).toBe(true);
  });
});

describe("containsSuperlative: never flags mundane, non-competitive uses of the same words", () => {
  it.each([
    "ARR reached $2.0M in the first quarter of 2026.",
    "The founder hired her first engineer in January.",
    "This is the company's first year of operation.",
    "The team closed their first enterprise customer in March.",
    "Only 12 employees work at the company today.",
    "The company raised its first round of funding in 2025.",
  ])("does not flag: %s", (text) => {
    expect(containsSuperlative(text)).toBe(false);
  });
});
