import { describe, expect, it } from "vitest";

import { comparabilityWarnings } from "@/lib/comparability-warnings";

describe("comparabilityWarnings", () => {
  it("returns no warnings when everything matches", () => {
    const result = comparabilityWarnings([
      { scoringVersion: "2026.1", stageProfile: "SEED" },
      { scoringVersion: "2026.1", stageProfile: "SEED" },
    ]);
    expect(result).toEqual([]);
  });

  it("returns no warnings for a single item", () => {
    expect(comparabilityWarnings([{ scoringVersion: "2026.1", stageProfile: "SEED" }])).toEqual([]);
  });

  it("warns when scoring versions differ", () => {
    const result = comparabilityWarnings([
      { scoringVersion: "2026.1", stageProfile: "SEED" },
      { scoringVersion: "2026.2", stageProfile: "SEED" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("scoring versions");
    expect(result[0]).toContain("2026.1");
    expect(result[0]).toContain("2026.2");
  });

  it("warns when stage profiles differ", () => {
    const result = comparabilityWarnings([
      { scoringVersion: "2026.1", stageProfile: "EARLY" },
      { scoringVersion: "2026.1", stageProfile: "GROWTH" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("stage profiles");
    expect(result[0]).toContain("Early");
    expect(result[0]).toContain("Growth");
  });

  it("returns both warnings when both differ", () => {
    const result = comparabilityWarnings([
      { scoringVersion: "2026.1", stageProfile: "EARLY" },
      { scoringVersion: "2026.2", stageProfile: "GROWTH" },
    ]);
    expect(result).toHaveLength(2);
  });
});
