import { describe, expect, it } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { SubmitSynthesisInput } from "@/lib/analysis/prompts/synthesis";
import { runSynthesis } from "@/lib/analysis/steps/synthesize";
import type { Claim, DimensionAnalysis } from "@/lib/schema/claims";
import type { Fact } from "@/lib/schema/evidence";
import type { Overall } from "@/lib/schema/report";
import type { Usage } from "@/lib/schema/run";

function usage(): Usage {
  return { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 };
}

class FakeLlm implements LLM {
  private queue: SubmitSynthesisInput[] = [];
  public calls: StructuredArgs<unknown>[] = [];

  enqueue(response: SubmitSynthesisInput): this {
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

function overall(): Overall {
  return { score: 63, label: "SCORED", confidence: 0.44, coverage: 0.78, weights: {} };
}

function verifiedClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "clm_00000000000000000000000001",
    text: "Jane Doe previously founded and sold a logistics startup.",
    confidence: 0.7,
    entities: ["Jane Doe"],
    status: "VERIFIED",
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" }],
    ...overrides,
  } as Claim;
}

function aiAnalysisClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "clm_00000000000000000000000002",
    text: "The team likely has strong domain expertise.",
    confidence: 0.25,
    entities: [],
    status: "AI_ANALYSIS",
    basedOn: ["clm_00000000000000000000000001"],
    ...overrides,
  } as Claim;
}

function dimension(overrides: Partial<DimensionAnalysis> = {}): DimensionAnalysis {
  return {
    dimension: "founder",
    score: 65,
    confidence: 0.69,
    evidenceTruncated: false,
    criteria: [],
    claims: [verifiedClaim(), aiAnalysisClaim()],
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
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    key: "team.size",
    statement: "Team has 12 employees.",
    value: { kind: "number", value: 12 },
    quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "12 employees" }],
    reliability: "PROVIDED",
    confidence: 0.5,
    conflictsWith: [],
    runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    ...overrides,
  };
}

function emptySections(): Omit<SubmitSynthesisInput, "executiveSummary" | "investmentOverview"> {
  return { marketTrends: [], marketGaps: [], aiInsights: [], checklist: [] };
}

const baseArgs = { startupName: "Loopwell", overall: overall(), dimensions: [dimension()], flags: [], facts: [fact()] };

describe("runSynthesis: restating a VERIFIED dimension claim", () => {
  it("copies the target claim's exact quotes and confidence, ignoring the model's own text as new evidence", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        {
          localId: "n1",
          status: "VERIFIED",
          restatesId: "clm_00000000000000000000000001",
          text: "The founder previously built and sold a logistics company.",
          entities: ["Jane Doe"],
        },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary).toHaveLength(1);
    const claim = result.narrative.executiveSummary[0]!;
    expect(claim.status).toBe("VERIFIED");
    if (claim.status === "VERIFIED") {
      expect(claim.quotes).toEqual([
        { evidenceId: "ev_00000000000000000000000001", quote: "Jane Doe previously founded and sold a logistics startup" },
      ]);
    }
    expect(claim.confidence).toBe(0.7);
    expect(result.warnings).toEqual([]);
  });
});

describe("runSynthesis: restating a fact", () => {
  it("copies the fact's quotes and confidence", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        { localId: "n1", status: "VERIFIED", restatesId: "fct_00000000000000000000000001", text: "The team has 12 employees.", entities: [] },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    const claim = result.narrative.executiveSummary[0]!;
    expect(claim.status).toBe("VERIFIED");
    expect(claim.confidence).toBe(0.5);
  });
});

describe("runSynthesis: invalid restatement", () => {
  it("drops a claim whose restatesId does not resolve to any known claim or fact", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        { localId: "n1", status: "VERIFIED", restatesId: "clm_00000000000000000000000099", text: "This is not verifiable.", entities: [] },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary).toEqual([]);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "CITATION_INVALID", step: "SYNTHESIZE" }));
  });

  it("drops a claim whose restatesId points at a non-VERIFIED dimension claim", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        { localId: "n1", status: "VERIFIED", restatesId: "clm_00000000000000000000000002", text: "The team has strong expertise.", entities: [] },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary).toEqual([]);
    expect(result.warnings).toMatchObject([{ code: "CITATION_INVALID" }]);
  });
});

describe("runSynthesis: AI_ANALYSIS claims", () => {
  it("keeps an AI_ANALYSIS claim whose basedOn references a real claim id", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        {
          localId: "n1",
          status: "AI_ANALYSIS",
          basedOn: ["clm_00000000000000000000000001"],
          text: "The founder's track record is a meaningful strength.",
          entities: [],
        },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary).toHaveLength(1);
    expect(result.narrative.executiveSummary[0]!.status).toBe("AI_ANALYSIS");
    expect(result.narrative.executiveSummary[0]!.confidence).toBe(0.25);
  });

  it("drops an AI_ANALYSIS claim whose basedOn references an unknown id", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        { localId: "n1", status: "AI_ANALYSIS", basedOn: ["clm_doesnotexist"], text: "An unsupported inference.", entities: [] },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary).toEqual([]);
    expect(result.warnings).toMatchObject([{ code: "INVALID_REFERENCE" }]);
  });
});

describe("runSynthesis: grounding checks", () => {
  it("drops a narrative claim asserting a number not present in the reused quote", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        {
          localId: "n1",
          status: "VERIFIED",
          restatesId: "clm_00000000000000000000000001",
          text: "The founder previously built a $50M logistics company.",
          entities: ["Jane Doe"],
        },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary).toEqual([]);
    expect(result.warnings).toMatchObject([{ code: "UNGROUNDED_NUMBER" }]);
  });

  it("drops a claim matching a sensitive-attribute pattern", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        {
          localId: "n1",
          status: "AI_ANALYSIS",
          basedOn: ["clm_00000000000000000000000001"],
          text: "The founder is currently on medical leave.",
          entities: [],
        },
      ],
      investmentOverview: [],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary).toEqual([]);
    expect(result.warnings).toMatchObject([{ code: "SENSITIVE_ATTRIBUTE" }]);
  });
});

describe("runSynthesis: MISSING and ASSUMPTION claims", () => {
  it("keeps a MISSING claim with confidence 0 and an ASSUMPTION claim with confidence 0.1", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        {
          localId: "n1",
          status: "MISSING",
          text: "Financial statements are not available.",
          entities: [],
          missing: { whatIsNeeded: "Audited financials", suggestedSource: "Founder", priority: "HIGH" },
        },
      ],
      investmentOverview: [
        {
          localId: "n2",
          status: "ASSUMPTION",
          text: "The team is assumed to be full-time.",
          entities: [],
          assumption: { statement: "Full-time commitment", wouldConfirm: "An employment record" },
        },
      ],
      ...emptySections(),
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.narrative.executiveSummary[0]!.confidence).toBe(0);
    expect(result.narrative.investmentOverview[0]!.confidence).toBe(0.1);
  });
});

describe("runSynthesis: checklist", () => {
  it("keeps a checklist item linked to a real dimension claim id", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        {
          localId: "n1",
          status: "AI_ANALYSIS",
          basedOn: ["clm_00000000000000000000000001"],
          text: "The founder's track record is a meaningful strength.",
          entities: [],
        },
      ],
      investmentOverview: [],
      marketTrends: [],
      marketGaps: [],
      aiInsights: [],
      checklist: [
        {
          dimension: "founder",
          priority: "HIGH",
          question: "Can the founder provide references from the prior exit?",
          whyItMatters: "Corroborates the claimed outcome.",
          suggestedSource: "Founder interview",
          linkedClaimIds: ["clm_00000000000000000000000001"],
        },
      ],
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.checklist).toHaveLength(1);
    expect(result.checklist[0]).toMatchObject({ dimension: "founder", status: "OPEN", linkedClaimIds: ["clm_00000000000000000000000001"] });
  });

  it("resolves a checklist item linked to a narrative claim's own localId", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [
        {
          localId: "n1",
          status: "MISSING",
          text: "Financial statements are not available.",
          entities: [],
          missing: { whatIsNeeded: "Audited financials", suggestedSource: "Founder", priority: "HIGH" },
        },
      ],
      investmentOverview: [],
      marketTrends: [],
      marketGaps: [],
      aiInsights: [],
      checklist: [
        {
          dimension: "financial",
          priority: "HIGH",
          question: "Request audited financial statements.",
          whyItMatters: "Needed to assess runway.",
          suggestedSource: "Founder",
          linkedClaimIds: ["n1"],
        },
      ],
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    const missingClaimId = result.narrative.executiveSummary[0]!.id;
    expect(result.checklist).toHaveLength(1);
    expect(result.checklist[0]!.linkedClaimIds).toEqual([missingClaimId]);
  });

  it("drops a checklist item whose linkedClaimIds resolve to nothing known", async () => {
    const llm = new FakeLlm().enqueue({
      executiveSummary: [],
      investmentOverview: [],
      marketTrends: [],
      marketGaps: [],
      aiInsights: [],
      checklist: [
        {
          dimension: "general",
          priority: "LOW",
          question: "Unfounded question.",
          whyItMatters: "N/A",
          suggestedSource: "N/A",
          linkedClaimIds: ["clm_doesnotexist"],
        },
      ],
    });

    const result = await runSynthesis({ ...baseArgs, llm });

    expect(result.checklist).toEqual([]);
    expect(result.warnings).toMatchObject([{ code: "INVALID_REFERENCE", step: "SYNTHESIZE" }]);
  });
});

describe("runSynthesis: prompt wiring", () => {
  it("calls the LLM once with the SYNTHESIS role", async () => {
    const llm = new FakeLlm().enqueue({ executiveSummary: [], investmentOverview: [], ...emptySections() });

    await runSynthesis({ ...baseArgs, llm });

    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0]!.role).toBe("SYNTHESIS");
  });
});
