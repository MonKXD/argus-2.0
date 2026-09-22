import { describe, expect, it } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { SubmitDimensionAnalysisInput } from "@/lib/analysis/prompts/dimension-analysis";
import { analyzeDimension } from "@/lib/analysis/steps/analyze-dimension";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import type { Usage } from "@/lib/schema/run";

function usage(): Usage {
  return { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 };
}

class FakeLlm implements LLM {
  private queue: SubmitDimensionAnalysisInput[] = [];
  public calls: StructuredArgs<unknown>[] = [];

  enqueue(response: SubmitDimensionAnalysisInput): this {
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
    text: "Jane Doe previously founded and sold a logistics startup, and has spent a decade in supply chain software.",
    reliability: "INDEPENDENT",
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

const baseArgs = {
  analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  dimension: "founder" as const,
  startupName: "Loopwell",
  stage: "SEED" as const,
};

function baseCriterion(overrides: Partial<SubmitDimensionAnalysisInput["criteria"][number]> = {}) {
  return {
    id: "founder.execution_history",
    score: 3,
    rationale: "Prior successful exit in an adjacent space.",
    claimIds: ["c1"],
    ...overrides,
  };
}

describe("analyzeDimension: happy path", () => {
  it("keeps a valid VERIFIED claim, clamps and scores the criterion, and computes dimension confidence", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion()],
      claims: [
        {
          localId: "c1",
          text: "Jane Doe previously founded and sold a logistics startup.",
          entities: ["Jane Doe"],
          status: "VERIFIED",
          quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
        },
      ],
      strengthIds: ["c1"],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const result = await analyzeDimension({
      ...baseArgs,
      llm,
      evidence: [makeEvidence()],
      sources: [makeSource()],
      facts: [],
    });

    expect(result.dimension.claims).toHaveLength(1);
    const claim = result.dimension.claims[0]!;
    expect(claim.id).toMatch(/^clm_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(claim.status).toBe("VERIFIED");
    expect(claim.confidence).toBe(1.0); // INDEPENDENT evidence

    expect(result.dimension.criteria).toHaveLength(1);
    expect(result.dimension.criteria[0]!.score).toBe(3);
    expect(result.dimension.criteria[0]!.claimIds).toEqual([claim.id]);
    expect(result.dimension.criteria[0]!.label).toBe("Prior ventures, shipped products, notable outcomes");

    expect(result.dimension.strengthIds).toEqual([claim.id]);
    expect(result.dimension.score).not.toBeNull();
    expect(result.dimension.confidence).toBeGreaterThan(0);
    expect(result.dimension.evidenceTruncated).toBe(false);
    expect(result.dimension.scoringVersion).toBeTruthy();
    expect(result.dimension.promptVersion).toBeTruthy();
    expect(result.warnings).toEqual([]);
  });
});

describe("analyzeDimension: V1 citation validity", () => {
  it("drops a VERIFIED claim whose quote is not found in the cited evidence", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion({ claimIds: ["c1"] })],
      claims: [
        {
          localId: "c1",
          text: "Unsupported claim text.",
          entities: [],
          status: "VERIFIED",
          quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "completely fabricated quote text" }],
        },
      ],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [makeEvidence()], sources: [makeSource()], facts: [] });

    expect(result.dimension.claims).toEqual([]);
    expect(result.warnings.some((w) => w.code === "CITATION_INVALID")).toBe(true);
    expect(result.dimension.criteria[0]!.claimIds).toEqual([]);
  });
});

describe("analyzeDimension: V3 entity grounding", () => {
  it("drops a claim that declares an entity absent from the evidence corpus", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion({ claimIds: ["c1"] })],
      claims: [
        {
          localId: "c1",
          text: "Jane Doe previously worked with Acme Robotics.",
          entities: ["Acme Robotics"],
          status: "VERIFIED",
          quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
        },
      ],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [makeEvidence()], sources: [makeSource()], facts: [] });

    expect(result.dimension.claims).toEqual([]);
    expect(result.warnings.some((w) => w.code === "ENTITY_UNGROUNDED")).toBe(true);
  });
});

describe("analyzeDimension: V6 sensitive attributes", () => {
  it("drops a claim matching a sensitive-attribute pattern", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion({ claimIds: ["c1"] })],
      claims: [
        {
          localId: "c1",
          text: "The founder is 62 years old and has decades of experience.",
          entities: [],
          status: "AI_ANALYSIS",
          basedOn: ["fct_00000000000000000000000001"],
        },
      ],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const facts: Fact[] = [
      {
        id: "fct_00000000000000000000000001",
        analysisId: baseArgs.analysisId,
        key: "founder.jane.name",
        statement: "Founder is Jane Doe.",
        value: { kind: "text", value: "Jane Doe" },
        quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
        reliability: "INDEPENDENT",
        confidence: 1,
        conflictsWith: [],
        runId: baseArgs.runId,
      },
    ];

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [makeEvidence()], sources: [makeSource()], facts });

    expect(result.dimension.claims).toEqual([]);
    expect(result.warnings.some((w) => w.code === "SENSITIVE_ATTRIBUTE")).toBe(true);
  });
});

describe("analyzeDimension: V4 status integrity", () => {
  it("drops an AI_ANALYSIS claim whose basedOn cites an id that doesn't exist", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion({ claimIds: ["c1"] })],
      claims: [
        {
          localId: "c1",
          text: "The team is well rounded based on the evidence.",
          entities: [],
          status: "AI_ANALYSIS",
          basedOn: ["fct_00000000000000000000000099"],
        },
      ],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [makeEvidence()], sources: [makeSource()], facts: [] });

    expect(result.dimension.claims).toEqual([]);
    expect(result.warnings.some((w) => w.code === "INVALID_REFERENCE")).toBe(true);
  });

  it("keeps an AI_ANALYSIS claim whose basedOn cites another surviving claim in the same response", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [
        baseCriterion({ id: "founder.domain_fit", claimIds: ["c1"] }),
        baseCriterion({ id: "founder.credibility", claimIds: ["c2"] }),
      ],
      claims: [
        {
          localId: "c1",
          text: "Jane Doe previously founded and sold a logistics startup.",
          entities: ["Jane Doe"],
          status: "VERIFIED",
          quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
        },
        {
          localId: "c2",
          text: "This prior exit suggests strong domain credibility.",
          entities: [],
          status: "AI_ANALYSIS",
          basedOn: ["c1"],
        },
      ],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [makeEvidence()], sources: [makeSource()], facts: [] });

    expect(result.dimension.claims).toHaveLength(2);
    const aiAnalysisClaim = result.dimension.claims.find((c) => c.status === "AI_ANALYSIS");
    expect(aiAnalysisClaim).toBeDefined();
    const verifiedClaim = result.dimension.claims.find((c) => c.status === "VERIFIED")!;
    expect(aiAnalysisClaim && "basedOn" in aiAnalysisClaim ? aiAnalysisClaim.basedOn : undefined).toEqual([verifiedClaim.id]);
  });
});

describe("analyzeDimension: V2 numeric grounding", () => {
  it("drops a claim asserting a number not present anywhere in the corpus", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion({ claimIds: ["c1"] })],
      claims: [
        {
          localId: "c1",
          text: "The team has grown to 85 employees this year.",
          entities: [],
          status: "AI_ANALYSIS",
          basedOn: ["fct_00000000000000000000000001"],
        },
      ],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const facts: Fact[] = [
      {
        id: "fct_00000000000000000000000001",
        analysisId: baseArgs.analysisId,
        key: "team.size",
        statement: "Team has 12 employees.",
        value: { kind: "number", value: 12 },
        quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
        reliability: "PROVIDED",
        confidence: 0.5,
        conflictsWith: [],
        runId: baseArgs.runId,
      },
    ];

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [makeEvidence()], sources: [makeSource()], facts });

    expect(result.dimension.claims).toEqual([]);
    expect(result.warnings.some((w) => w.code === "UNGROUNDED_NUMBER")).toBe(true);
  });

  it("accepts a derivation-grounded number when its inputs are real and the result matches within 1%", async () => {
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion({ claimIds: ["c1"] })],
      claims: [
        {
          localId: "c1",
          text: "Runway is approximately 18 months at the current burn rate.",
          entities: [],
          status: "AI_ANALYSIS",
          basedOn: ["fct_00000000000000000000000001", "fct_00000000000000000000000002"],
          derivation: {
            formula: "cash / burn_monthly",
            inputs: [
              { factId: "fct_00000000000000000000000001", value: 900_000 },
              { factId: "fct_00000000000000000000000002", value: 50_000 },
            ],
            result: 18,
          },
        },
      ],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const facts: Fact[] = [
      {
        id: "fct_00000000000000000000000001",
        analysisId: baseArgs.analysisId,
        key: "financial.cash",
        statement: "Cash on hand is $900,000.",
        value: { kind: "money", amount: 900_000, currency: "USD" },
        quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
        reliability: "PROVIDED",
        confidence: 0.5,
        conflictsWith: [],
        runId: baseArgs.runId,
      },
      {
        id: "fct_00000000000000000000000002",
        analysisId: baseArgs.analysisId,
        key: "financial.burn_monthly",
        statement: "Monthly burn is $50,000.",
        value: { kind: "money", amount: 50_000, currency: "USD" },
        quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
        reliability: "PROVIDED",
        confidence: 0.5,
        conflictsWith: [],
        runId: baseArgs.runId,
      },
    ];

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [makeEvidence()], sources: [makeSource()], facts });

    expect(result.dimension.claims).toHaveLength(1);
    expect(result.warnings.some((w) => w.code === "UNGROUNDED_NUMBER")).toBe(false);
  });
});

describe("analyzeDimension: evidence truncation", () => {
  it("sets evidenceTruncated when evidence exceeds the per-call budget", async () => {
    const bigEvidence = makeEvidence({ text: "word ".repeat(20_000) });
    const llm = new FakeLlm().enqueue({
      criteria: [baseCriterion({ claimIds: [] })],
      claims: [],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    });

    const result = await analyzeDimension({ ...baseArgs, llm, evidence: [bigEvidence], sources: [makeSource()], facts: [] });

    expect(result.dimension.evidenceTruncated).toBe(true);
  });
});
