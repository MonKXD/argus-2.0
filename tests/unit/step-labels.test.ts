import { describe, expect, it } from "vitest";

import type { Run } from "@/lib/schema/run";
import { failedStepLabels } from "@/lib/step-labels";

function buildRun(overrides: Partial<Run> = {}): Run {
  return {
    id: "run_00000000000000000000000001",
    analysisId: "ana_00000000000000000000000001",
    ownerId: "user_1",
    status: "PARTIAL",
    options: { webResearch: true, stageProfile: "SEED" },
    steps: {},
    dimensionStatus: {},
    modelIds: { analysis: "a", synthesis: "s", fast: "f" },
    promptVersion: "v1",
    scoringVersion: "v1",
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0 },
    warnings: [],
    cancelRequested: false,
    reportId: null,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("failedStepLabels", () => {
  it("returns an empty list when nothing failed", () => {
    const run = buildRun({
      steps: { INGEST: { status: "DONE", attempt: 1 }, EXTRACT_FACTS: { status: "DONE", attempt: 1 } },
      dimensionStatus: { founder: "DONE" },
    });
    expect(failedStepLabels(run)).toEqual([]);
  });

  it("labels a failed step by its human-readable name", () => {
    const run = buildRun({
      steps: { INGEST: { status: "DONE", attempt: 1 }, CONSISTENCY: { status: "FAILED", attempt: 1 } },
    });
    expect(failedStepLabels(run)).toEqual(["Check consistency"]);
  });

  it("includes a failed dimension by its raw key", () => {
    const run = buildRun({
      dimensionStatus: { founder: "DONE", traction: "FAILED" },
    });
    expect(failedStepLabels(run)).toEqual(["traction"]);
  });

  it("combines failed steps and failed dimensions", () => {
    const run = buildRun({
      steps: { VERIFY: { status: "FAILED", attempt: 1 } },
      dimensionStatus: { market: "FAILED" },
    });
    expect(failedStepLabels(run)).toEqual(["Verify claims", "market"]);
  });
});
