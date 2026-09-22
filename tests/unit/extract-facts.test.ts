import { describe, expect, it } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { CandidateFact, SubmitFactsInput } from "@/lib/analysis/prompts/fact-extraction";
import { extractFacts } from "@/lib/analysis/steps/extract-facts";
import type { Evidence, Source } from "@/lib/schema/evidence";
import type { Usage } from "@/lib/schema/run";

function usage(overrides: Partial<Usage> = {}): Usage {
  return { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001, ...overrides };
}

class FakeLlm implements LLM {
  private queue: SubmitFactsInput[] = [];
  public calls: StructuredArgs<unknown>[] = [];

  enqueue(response: SubmitFactsInput): this {
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

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "ev_00000000000000000000000001",
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    sourceId: "src_00000000000000000000000001",
    locator: { kind: "page", page: 1 },
    text: "Loopwell's ARR reached $2.0M in Q2 2026, up from $1.2M the prior year.",
    reliability: "PROVIDED",
    extraction: "text",
    retrievedAt: "2026-09-22T00:00:00Z",
    contentHash: "hash1",
    ...overrides,
  };
}

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "src_00000000000000000000000001",
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    type: "PITCH_DECK",
    origin: "UPLOAD",
    title: "Pitch deck",
    status: "PARSED",
    reliability: "PROVIDED",
    addedAt: "2026-09-22T00:00:00Z",
    ...overrides,
  };
}

function arrFact(overrides: Partial<CandidateFact> = {}): CandidateFact {
  return {
    key: "traction.arr",
    statement: "ARR reached $2.0M in Q2 2026.",
    value: { kind: "money", amount: 2_000_000, currency: "USD" },
    period: "Q2 2026",
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "ARR reached $2.0M in Q2 2026" }],
    ...overrides,
  };
}

const baseArgs = { analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV", runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV", startupName: "Loopwell" };

describe("extractFacts: happy path", () => {
  it("produces a validated fact with a real substring quote, reliability and confidence", async () => {
    const llm = new FakeLlm().enqueue({ facts: [arrFact()] });
    const evidence = [makeEvidence()];
    const sources = [makeSource()];

    const { facts, warnings, usage: usages } = await extractFacts({ ...baseArgs, llm, evidence, sources });

    expect(facts).toHaveLength(1);
    const fact = facts[0]!;
    expect(fact.id).toMatch(/^fct_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(fact.key).toBe("traction.arr");
    expect(fact.reliability).toBe("PROVIDED");
    expect(fact.confidence).toBe(0.5);
    expect(fact.quotes).toEqual([
      { evidenceId: "ev_00000000000000000000000001", quote: "ARR reached $2.0M in Q2 2026" },
    ]);
    expect(warnings).toEqual([]);
    expect(usages).toHaveLength(1);
  });

  it("uses INDEPENDENT reliability and confidence 1.0 when the fact's evidence is INDEPENDENT", async () => {
    const evidence = [makeEvidence({ reliability: "INDEPENDENT" })];
    const llm = new FakeLlm().enqueue({ facts: [arrFact()] });

    const { facts } = await extractFacts({ ...baseArgs, llm, evidence, sources: [makeSource()] });

    expect(facts[0]!.reliability).toBe("INDEPENDENT");
    expect(facts[0]!.confidence).toBe(1.0);
  });
});

describe("extractFacts: citation validation", () => {
  it("drops a fact whose quote is not found in the cited evidence, and records CITATION_INVALID", async () => {
    const llm = new FakeLlm().enqueue({
      facts: [arrFact({ quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "completely unrelated text" }] })],
    });

    const { facts, warnings } = await extractFacts({
      ...baseArgs,
      llm,
      evidence: [makeEvidence()],
      sources: [makeSource()],
    });

    expect(facts).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: "CITATION_INVALID", step: "EXTRACT_FACTS" });
  });

  it("drops a quote citing an evidence id that doesn't exist, dropping the fact if none remain", async () => {
    const llm = new FakeLlm().enqueue({
      facts: [arrFact({ quotes: [{ evidenceId: "ev_00000000000000000000000099", quote: "ARR reached $2.0M" }] })],
    });

    const { facts, warnings } = await extractFacts({
      ...baseArgs,
      llm,
      evidence: [makeEvidence()],
      sources: [makeSource()],
    });

    expect(facts).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it("keeps a fact when at least one of several quotes validates", async () => {
    const llm = new FakeLlm().enqueue({
      facts: [
        arrFact({
          quotes: [
            { evidenceId: "ev_00000000000000000000000001", quote: "ARR reached $2.0M in Q2 2026" },
            { evidenceId: "ev_00000000000000000000000001", quote: "totally made up text" },
          ],
        }),
      ],
    });

    const { facts, warnings } = await extractFacts({
      ...baseArgs,
      llm,
      evidence: [makeEvidence()],
      sources: [makeSource()],
    });

    expect(facts).toHaveLength(1);
    expect(facts[0]!.quotes).toHaveLength(1);
    expect(warnings).toEqual([]);
  });
});

describe("extractFacts: batching and merging", () => {
  it("calls the LLM once per source", async () => {
    const evidence = [
      makeEvidence({ id: "ev_00000000000000000000000001", sourceId: "src_00000000000000000000000001" }),
      makeEvidence({ id: "ev_00000000000000000000000002", sourceId: "src_00000000000000000000000002", text: "Website says ARR is $2.0M." }),
    ];
    const sources = [makeSource(), makeSource({ id: "src_00000000000000000000000002", title: "Website", type: "WEBSITE" })];
    const llm = new FakeLlm()
      .enqueue({ facts: [] })
      .enqueue({ facts: [] });

    await extractFacts({ ...baseArgs, llm, evidence, sources });

    expect(llm.calls).toHaveLength(2);
  });

  it("merges duplicate facts (same key, value, period) from different sources into one, with combined quotes and strongest reliability", async () => {
    const evidence = [
      makeEvidence({ id: "ev_00000000000000000000000001", sourceId: "src_00000000000000000000000001", reliability: "PROVIDED" }),
      makeEvidence({
        id: "ev_00000000000000000000000002",
        sourceId: "src_00000000000000000000000002",
        reliability: "INDEPENDENT",
        text: "TechCrunch reports Loopwell's ARR reached $2.0M in Q2 2026.",
      }),
    ];
    const sources = [
      makeSource(),
      makeSource({ id: "src_00000000000000000000000002", title: "TechCrunch", type: "WEB_RESEARCH" }),
    ];
    const llm = new FakeLlm()
      .enqueue({ facts: [arrFact({ quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "ARR reached $2.0M in Q2 2026" }] })] })
      .enqueue({
        facts: [
          arrFact({
            quotes: [{ evidenceId: "ev_00000000000000000000000002", quote: "ARR reached $2.0M in Q2 2026" }],
          }),
        ],
      });

    const { facts } = await extractFacts({ ...baseArgs, llm, evidence, sources });

    expect(facts).toHaveLength(1);
    expect(facts[0]!.quotes).toHaveLength(2);
    expect(facts[0]!.reliability).toBe("INDEPENDENT");
  });

  it("keeps distinct values under the same key as separate facts", async () => {
    const evidence = [makeEvidence()];
    const sources = [makeSource()];
    const llm = new FakeLlm().enqueue({
      facts: [
        arrFact({ value: { kind: "money", amount: 2_000_000, currency: "USD" } }),
        arrFact({ value: { kind: "money", amount: 1_800_000, currency: "USD" }, statement: "A conflicting ARR figure was also stated." }),
      ],
    });

    const { facts } = await extractFacts({ ...baseArgs, llm, evidence, sources });

    expect(facts).toHaveLength(2);
  });
});

describe("extractFacts: input integrity", () => {
  it("throws when evidence references a sourceId absent from the given sources", async () => {
    const llm = new FakeLlm();
    await expect(
      extractFacts({
        ...baseArgs,
        llm,
        evidence: [makeEvidence({ sourceId: "src_does_not_exist" })],
        sources: [],
      }),
    ).rejects.toThrow(/unknown sourceId/);
  });
});
