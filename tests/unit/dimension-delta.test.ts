import { describe, expect, it } from "vitest";

import { dimensionDelta } from "@/lib/dimension-delta";

describe("dimensionDelta", () => {
  it("returns the signed difference from baseline", () => {
    expect(dimensionDelta(60, 75)).toBe(15);
    expect(dimensionDelta(60, 45)).toBe(-15);
  });

  it("returns 0 for an equal score", () => {
    expect(dimensionDelta(60, 60)).toBe(0);
  });

  it("returns null when the baseline is unscored", () => {
    expect(dimensionDelta(null, 75)).toBeNull();
  });

  it("returns null when the compared value is unscored", () => {
    expect(dimensionDelta(60, null)).toBeNull();
  });

  it("returns null when both are unscored", () => {
    expect(dimensionDelta(null, null)).toBeNull();
  });
});
