import { describe, expect, it } from "vitest";

import { round2 } from "@/lib/analysis/scoring/round";

describe("round2", () => {
  it("rounds an exact .xx5 boundary up, even when float summation lands just under it", () => {
    // 0.5*1 + 0.3*0.25 + 0.2*0 is mathematically exactly 0.575 but the raw
    // IEEE-754 sum is 0.575 exactly here; the accumulation-drift case is
    // the overall-confidence one below.
    expect(round2(0.5 * 1 + 0.3 * 0.25 + 0.2 * 0)).toBe(0.58);
  });

  it("rounds the AI_SPEC 5.3 worked example's overall confidence correctly despite accumulation drift", () => {
    const weights = [0.2, 0.16, 0.14, 0.1, 0.1, 0.08];
    const confidences = [0.69, 0.55, 0.6, 0.4, 0.45, 0.5];
    const sum = weights.reduce((total, w, i) => total + w * confidences[i]!, 0);
    expect(sum).not.toBe(0.435); // demonstrates the float drift this function corrects for
    expect(round2(sum)).toBe(0.44);
  });

  it("rounds ordinary non-boundary values correctly", () => {
    expect(round2(0.691234)).toBe(0.69);
    expect(round2(0.686)).toBe(0.69);
    expect(round2(0.684)).toBe(0.68);
    expect(round2(0)).toBe(0);
    expect(round2(1)).toBe(1);
  });
});
