import { describe, expect, it } from "vitest";

import { reliabilityWeight, strongestReliability } from "@/lib/analysis/scoring/reliability-weight";

describe("reliabilityWeight", () => {
  it("matches AI_SPEC 5.2's quality_c table", () => {
    expect(reliabilityWeight("INDEPENDENT")).toBe(1.0);
    expect(reliabilityWeight("FIRST_PARTY")).toBe(0.7);
    expect(reliabilityWeight("PROVIDED")).toBe(0.5);
  });
});

describe("strongestReliability", () => {
  it("picks INDEPENDENT over FIRST_PARTY and PROVIDED", () => {
    expect(strongestReliability("INDEPENDENT", "PROVIDED")).toBe("INDEPENDENT");
    expect(strongestReliability("PROVIDED", "INDEPENDENT")).toBe("INDEPENDENT");
    expect(strongestReliability("INDEPENDENT", "FIRST_PARTY")).toBe("INDEPENDENT");
  });

  it("picks FIRST_PARTY over PROVIDED", () => {
    expect(strongestReliability("FIRST_PARTY", "PROVIDED")).toBe("FIRST_PARTY");
    expect(strongestReliability("PROVIDED", "FIRST_PARTY")).toBe("FIRST_PARTY");
  });

  it("returns the same value when both sides match", () => {
    expect(strongestReliability("PROVIDED", "PROVIDED")).toBe("PROVIDED");
  });
});
