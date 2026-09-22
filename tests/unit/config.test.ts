import { describe, expect, it } from "vitest";

import { stageProfileFor, STAGE_PROFILE_WEIGHTS } from "@/lib/analysis/config";
import type { StageProfile } from "@/lib/schema/enums";
import { DIMENSION_KEYS } from "@/lib/schema/rubrics";

describe("STAGE_PROFILE_WEIGHTS", () => {
  it.each(["EARLY", "SEED", "GROWTH"] as StageProfile[])("%s weights sum to 1.00 across all 8 dimensions", (profile) => {
    const weights = STAGE_PROFILE_WEIGHTS[profile];
    expect(Object.keys(weights).sort()).toEqual([...DIMENSION_KEYS].sort());
    const total = DIMENSION_KEYS.reduce((sum, d) => sum + weights[d], 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});

describe("stageProfileFor", () => {
  it("maps PRE_SEED to EARLY", () => {
    expect(stageProfileFor("PRE_SEED")).toBe("EARLY");
  });

  it("maps SEED and UNKNOWN to SEED", () => {
    expect(stageProfileFor("SEED")).toBe("SEED");
    expect(stageProfileFor("UNKNOWN")).toBe("SEED");
  });

  it("maps SERIES_A and SERIES_B_PLUS to GROWTH", () => {
    expect(stageProfileFor("SERIES_A")).toBe("GROWTH");
    expect(stageProfileFor("SERIES_B_PLUS")).toBe("GROWTH");
  });

  it("a user override in run options wins over the stage mapping", () => {
    expect(stageProfileFor("PRE_SEED", "GROWTH")).toBe("GROWTH");
  });
});
