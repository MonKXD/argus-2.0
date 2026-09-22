import { describe, expect, it } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { SubmitDimensionAnalysisInput } from "@/lib/analysis/prompts/dimension-analysis";
import { analyzeAllDimensions } from "@/lib/analysis/steps/analyze";
import type { Evidence, Source } from "@/lib/schema/evidence";
import { DIMENSION_KEYS } from "@/lib/schema/rubrics";
import type { Usage } from "@/lib/schema/run";

function usage(): Usage {
  return { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.0001 };
}

function emptyResponse(): SubmitDimensionAnalysisInput {
  return {
    criteria: [{ id: "x.y", score: null, rationale: "no evidence", claimIds: [] }],
    claims: [],
    strengthIds: [],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
  };
}

class FakeLlm implements LLM {
  public calls = 0;
  public concurrentCalls = 0;
  public maxConcurrentCalls = 0;

  constructor(
    private readonly behavior: (role: string) => Promise<SubmitDimensionAnalysisInput> = async () => emptyResponse(),
  ) {}

  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    this.calls += 1;
    this.concurrentCalls += 1;
    this.maxConcurrentCalls = Math.max(this.maxConcurrentCalls, this.concurrentCalls);
    // yield so concurrent calls actually overlap
    await new Promise((resolve) => setTimeout(resolve, 5));
    const data = await this.behavior(args.role);
    this.concurrentCalls -= 1;
    return { data: data as unknown as T, usage: usage() };
  }
}

function makeEvidence(): Evidence {
  return {
    id: "ev_00000000000000000000000001",
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    sourceId: "src_00000000000000000000000001",
    locator: { kind: "page", page: 1 },
    text: "Some evidence text.",
    reliability: "PROVIDED",
    extraction: "text",
    retrievedAt: "2026-09-22T00:00:00Z",
    contentHash: "hash",
  };
}

function makeSource(): Source {
  return {
    id: "src_00000000000000000000000001",
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    type: "PITCH_DECK",
    origin: "UPLOAD",
    title: "Pitch deck",
    status: "PARSED",
    reliability: "PROVIDED",
    addedAt: "2026-09-22T00:00:00Z",
  };
}

const baseArgs = {
  analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  startupName: "Loopwell",
  stage: "SEED" as const,
  evidence: [makeEvidence()],
  sources: [makeSource()],
  facts: [],
};

describe("analyzeAllDimensions", () => {
  it("analyzes all 8 dimensions and returns them in DIMENSION_KEYS order", async () => {
    const llm = new FakeLlm();
    const result = await analyzeAllDimensions({ ...baseArgs, llm });

    expect(llm.calls).toBe(8);
    expect(result.dimensions).toHaveLength(8);
    expect(result.dimensions.map((d) => d.dimension)).toEqual(DIMENSION_KEYS);
    expect(result.failed).toEqual([]);
    expect(result.usage).toHaveLength(8);
  });

  it("bounds concurrency to the given value", async () => {
    const llm = new FakeLlm();
    await analyzeAllDimensions({ ...baseArgs, llm, concurrency: 2 });
    expect(llm.maxConcurrentCalls).toBeLessThanOrEqual(2);
  });

  it("runs more than one call concurrently when concurrency > 1", async () => {
    const llm = new FakeLlm();
    await analyzeAllDimensions({ ...baseArgs, llm, concurrency: 4 });
    expect(llm.maxConcurrentCalls).toBeGreaterThan(1);
  });

  it("records a failed dimension without aborting the others", async () => {
    const llm = new FakeLlm();
    let callCount = 0;
    const originalStructured = llm.structured.bind(llm);
    llm.structured = async (args) => {
      callCount += 1;
      if (callCount === 1) throw new Error("simulated LLM failure");
      return originalStructured(args);
    };

    const result = await analyzeAllDimensions({ ...baseArgs, llm, concurrency: 1 });

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.error).toContain("simulated LLM failure");
    expect(result.dimensions).toHaveLength(7);
  });
});
