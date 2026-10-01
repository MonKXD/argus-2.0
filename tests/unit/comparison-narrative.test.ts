import { describe, expect, it } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import {
  buildComparisonNarrativePrompt,
  type ComparisonNarrativeItem,
  type SubmitComparisonNarrativeInput,
} from "@/lib/analysis/prompts/comparison-narrative";
import { runComparisonNarrative } from "@/lib/analysis/steps/comparison-narrative";
import type { Claim, DimensionAnalysis } from "@/lib/schema/claims";
import type { Fact } from "@/lib/schema/evidence";
import type { Overall } from "@/lib/schema/report";
import type { Usage } from "@/lib/schema/run";

function usage(): Usage {
  return { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 };
}

class FakeLlm implements LLM {
  private queue: SubmitComparisonNarrativeInput[] = [];
  public calls: StructuredArgs<unknown>[] = [];

  enqueue(response: SubmitComparisonNarrativeInput): this {
    this.queue.push(response);
    return this;
  }

  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    this.calls.push(args as StructuredArgs<unknown>);
    const next = this.queue.shift();
    if (!next) throw new Error("FakeLlm: no queued response");
    return { data: next as unknown as T, usage: usage() };
  }
}

function overall(score: number): Overall {
  return { score, label: "SCORED", confidence: 0.5, coverage: 0.8, weights: {} };
}

function verifiedClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "clm_00000000000000000000000001",
    text: "Loopwell's ARR is $2,000,000.",
    confidence: 0.8,
    entities: [],
    status: "VERIFIED",
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "ARR of $2,000,000" }],
    ...overrides,
  } as Claim;
}

function dimension(overrides: Partial<DimensionAnalysis> = {}): DimensionAnalysis {
  return {
    dimension: "traction",
    score: 68,
    confidence: 0.6,
    evidenceTruncated: false,
    criteria: [],
    claims: [verifiedClaim()],
    strengthIds: [],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
    ...overrides,
  };
}

function fact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: "fct_00000000000000000000000001",
    analysisId: "ana_00000000000000000000000001",
    key: "traction.arr",
    statement: "ARR is $2,000,000.",
    value: { kind: "money", amount: 200000000, currency: "USD" },
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "ARR of $2,000,000" }],
    reliability: "FIRST_PARTY",
    confidence: 0.8,
    conflictsWith: [],
    runId: "run_00000000000000000000000001",
    ...overrides,
  };
}

function item(overrides: Partial<ComparisonNarrativeItem> = {}): ComparisonNarrativeItem {
  return {
    label: "Loopwell",
    overall: overall(62),
    dimensions: [dimension()],
    flags: [],
    facts: [fact()],
    ...overrides,
  };
}

describe("buildComparisonNarrativePrompt", () => {
  it("includes every startup's label and real claim/fact ids in the prompt", () => {
    const items = [item({ label: "Loopwell" }), item({ label: "Other Startup", overall: overall(50) })];
    const prompt = buildComparisonNarrativePrompt(items);

    expect(prompt.user).toContain("Loopwell");
    expect(prompt.user).toContain("Other Startup");
    expect(prompt.user).toContain("clm_00000000000000000000000001");
    expect(prompt.user).toContain("fct_00000000000000000000000001");
  });
});

describe("runComparisonNarrative", () => {
  it("restates a VERIFIED claim from one startup's own dimension claim, copying its exact quotes", async () => {
    const items = [item({ label: "Loopwell" }), item({ label: "Other Startup", overall: overall(50) })];
    const llm = new FakeLlm().enqueue({
      narrative: [
        {
          localId: "n1",
          status: "VERIFIED",
          restatesId: "clm_00000000000000000000000001",
          text: "Loopwell's ARR is $2,000,000.",
          entities: [],
        },
      ],
    });

    const result = await runComparisonNarrative({ items, llm });

    expect(result.narrative).toHaveLength(1);
    expect(result.narrative[0]).toMatchObject({ status: "VERIFIED", quotes: fact().quotes });
    expect(result.droppedCount).toBe(0);
  });

  it("drops a candidate whose restatesId doesn't resolve to any pooled claim or fact", async () => {
    const items = [item(), item({ label: "Other Startup" })];
    const llm = new FakeLlm().enqueue({
      narrative: [
        {
          localId: "n1",
          status: "VERIFIED",
          restatesId: "clm_doesnotexist00000000000001",
          text: "Something unverifiable.",
          entities: [],
        },
      ],
    });

    const result = await runComparisonNarrative({ items, llm });

    expect(result.narrative).toHaveLength(0);
    expect(result.droppedCount).toBe(1);
  });

  it("pools claims and facts across every item, so restatesId can reference a second startup's own claim", async () => {
    const secondItemClaim = verifiedClaim({ id: "clm_00000000000000000000000099", text: "Other Startup's claim." });
    const items = [
      item({ label: "Loopwell" }),
      item({ label: "Other Startup", dimensions: [dimension({ claims: [secondItemClaim] })] }),
    ];
    const llm = new FakeLlm().enqueue({
      narrative: [
        {
          localId: "n1",
          status: "VERIFIED",
          restatesId: "clm_00000000000000000000000099",
          text: "Other Startup's claim.",
          entities: [],
        },
      ],
    });

    const result = await runComparisonNarrative({ items, llm });

    expect(result.narrative).toHaveLength(1);
    expect(result.droppedCount).toBe(0);
  });
});
