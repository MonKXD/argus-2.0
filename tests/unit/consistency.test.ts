import { describe, expect, it } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { SubmitConflictsInput } from "@/lib/analysis/prompts/consistency";
import { runConsistency } from "@/lib/analysis/steps/consistency";
import type { Fact } from "@/lib/schema/evidence";
import type { Usage } from "@/lib/schema/run";

function usage(): Usage {
  return { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.0001 };
}

class FakeLlm implements LLM {
  private queue: SubmitConflictsInput[] = [];
  public calls: StructuredArgs<unknown>[] = [];

  enqueue(response: SubmitConflictsInput): this {
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

let counter = 0;
function nextId(): string {
  counter += 1;
  return `fct_${counter.toString().padStart(26, "0")}`;
}

function fact(key: string, amount: number, overrides: Partial<Fact> = {}): Fact {
  return {
    id: nextId(),
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    key,
    statement: `${key} is ${amount}`,
    value: { kind: "money", amount, currency: "USD" },
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "verbatim text" }],
    reliability: "PROVIDED",
    confidence: 0.5,
    conflictsWith: [],
    runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    ...overrides,
  };
}

describe("runConsistency: no candidates", () => {
  it("makes no LLM call and returns facts unchanged when there is nothing to compare", async () => {
    const llm = new FakeLlm();
    const facts = [fact("team.size", 12)];

    const result = await runConsistency({ llm, facts });

    expect(llm.calls).toHaveLength(0);
    expect(result.flags).toEqual([]);
    expect(result.facts).toBe(facts);
    expect(result.usage).toBeUndefined();
  });
});

describe("runConsistency: real conflict", () => {
  it("creates an INCONSISTENCY flag and sets conflictsWith on both facts", async () => {
    const factA = fact("traction.arr", 1_000_000);
    const factB = fact("traction.arr", 2_000_000);
    const llm = new FakeLlm().enqueue({
      verdicts: [{ pairIndex: 0, verdict: "CONFLICT", explanation: "The two figures directly contradict." }],
    });

    const result = await runConsistency({ llm, facts: [factA, factB] });

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0]).toMatchObject({
      category: "INCONSISTENCY",
      severity: "HIGH", // traction.arr is revenue-related
      detectedBy: "CONSISTENCY",
      status: "OPEN",
    });
    expect(result.flags[0]!.evidenceIds).toEqual(
      expect.arrayContaining([factA.quotes[0]!.evidenceId, factB.quotes[0]!.evidenceId]),
    );

    const updatedA = result.facts.find((f) => f.id === factA.id)!;
    const updatedB = result.facts.find((f) => f.id === factB.id)!;
    expect(updatedA.conflictsWith).toEqual([factB.id]);
    expect(updatedB.conflictsWith).toEqual([factA.id]);
  });

  it("uses MEDIUM severity for a non-material fact key", async () => {
    const factA = fact("product.stage", 1);
    const factB = fact("product.stage", 2);
    const llm = new FakeLlm().enqueue({
      verdicts: [{ pairIndex: 0, verdict: "CONFLICT", explanation: "Different stages stated." }],
    });

    const result = await runConsistency({ llm, facts: [factA, factB] });
    expect(result.flags[0]!.severity).toBe("MEDIUM");
  });
});

describe("runConsistency: non-conflict verdicts", () => {
  it("creates no flag and no conflictsWith when the model says the difference is a rounding difference", async () => {
    const factA = fact("traction.arr", 1_000_000);
    const factB = fact("traction.arr", 2_000_000);
    const llm = new FakeLlm().enqueue({
      verdicts: [{ pairIndex: 0, verdict: "ROUNDING", explanation: "Same figure, different precision." }],
    });

    const result = await runConsistency({ llm, facts: [factA, factB] });

    expect(result.flags).toEqual([]);
    expect(result.facts.every((f) => f.conflictsWith.length === 0)).toBe(true);
  });

  it("creates no flag when the model says the values differ only by period", async () => {
    const factA = fact("traction.arr", 1_000_000);
    const factB = fact("traction.arr", 2_000_000);
    const llm = new FakeLlm().enqueue({
      verdicts: [{ pairIndex: 0, verdict: "DIFFERENT_PERIOD", explanation: "Different fiscal quarters." }],
    });

    const result = await runConsistency({ llm, facts: [factA, factB] });
    expect(result.flags).toEqual([]);
  });

  it("ignores a verdict referencing an out-of-range pair index", async () => {
    const factA = fact("traction.arr", 1_000_000);
    const factB = fact("traction.arr", 2_000_000);
    const llm = new FakeLlm().enqueue({
      verdicts: [{ pairIndex: 5, verdict: "CONFLICT", explanation: "Bogus reference." }],
    });

    const result = await runConsistency({ llm, facts: [factA, factB] });
    expect(result.flags).toEqual([]);
  });
});
