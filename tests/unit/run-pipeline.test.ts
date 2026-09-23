import { describe, expect, it, vi } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { SubmitDimensionAnalysisInput } from "@/lib/analysis/prompts/dimension-analysis";
import type { SubmitFactsInput } from "@/lib/analysis/prompts/fact-extraction";
import type { SubmitSynthesisInput } from "@/lib/analysis/prompts/synthesis";
import type { Usage } from "@/lib/schema/run";

import { createFakeFirestore } from "../helpers/fake-firestore";

const createAnthropicLlmMock = vi.fn();
vi.mock("@/lib/ai/llm", () => ({ createAnthropicLlm: () => createAnthropicLlmMock() }));
vi.mock("@/lib/env", () => ({
  env: { RUN_TOKEN_BUDGET: 2_000_000, ANALYZE_CONCURRENCY: 4, LOG_LEVEL: "silent", NODE_ENV: "test" },
}));

const { executeRun } = await import("@/lib/analysis/run-pipeline");

function usage(): Usage {
  return { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 };
}

/** Same "dispatch by tool name" FakeLlm as pipeline.test.ts, plus AbortSignal checking (this file's own scenario needs it, pipeline.test.ts's doesn't). */
class FakeLlm implements LLM {
  public calls: StructuredArgs<unknown>[] = [];
  constructor(
    private readonly handlers: Record<string, (args: StructuredArgs<unknown>) => unknown>,
    private readonly throwOn?: string,
  ) {}

  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    if (args.signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    this.calls.push(args as StructuredArgs<unknown>);
    if (this.throwOn && args.toolName === this.throwOn) {
      throw new Error("simulated LLM failure");
    }
    const handler = this.handlers[args.toolName];
    if (!handler) throw new Error(`FakeLlm: no handler for tool "${args.toolName}"`);
    return { data: handler(args) as T, usage: usage() };
  }
}

function factsHandler(): SubmitFactsInput {
  return {
    facts: [
      {
        key: "company.hq_location",
        statement: "Testco is based in Austin.",
        value: { kind: "text", value: "Austin" },
        quotes: [{ evidenceId: "ev_00000000000000000000000009", quote: "Austin" }],
      },
    ],
  };
}

function dimensionHandler(): SubmitDimensionAnalysisInput {
  return {
    criteria: [
      { id: "c1", score: 2, rationale: "Adequate.", claimIds: [] },
      { id: "c2", score: 2, rationale: "Adequate.", claimIds: [] },
      { id: "c3", score: 2, rationale: "Adequate.", claimIds: [] },
    ],
    claims: [],
    strengthIds: [],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
  };
}

function synthesisResponse(): SubmitSynthesisInput {
  return {
    executiveSummary: [],
    investmentOverview: [],
    marketTrends: [],
    marketGaps: [],
    aiInsights: [],
    checklist: [],
  };
}

const ANALYSIS_ID = "ana_00000000000000000000000001";
const RUN_ID = "run_00000000000000000000000001";
const SOURCE_ID = "src_00000000000000000000000001";
const EVIDENCE_ID = "ev_00000000000000000000000009";
const OWNER_ID = "user_1";
const NOW = "2026-01-01T00:00:00.000Z";

function seedAnalysis() {
  return {
    id: ANALYSIS_ID,
    ownerId: OWNER_ID,
    startup: { name: "Testco", stage: "SEED" },
    status: "PROCESSING",
    options: { webResearch: false },
    latest: null,
    currentRunId: RUN_ID,
    tags: [],
    isWatchlisted: false,
    isDemo: false,
    createdAt: NOW,
    updatedAt: NOW,
    archivedAt: null,
  };
}

function seedRun(overrides: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    analysisId: ANALYSIS_ID,
    ownerId: OWNER_ID,
    status: "RUNNING",
    options: { webResearch: false, stageProfile: "SEED" },
    steps: {},
    dimensionStatus: {},
    modelIds: { analysis: "claude-x", synthesis: "claude-x", fast: "claude-x" },
    promptVersion: "1.0.0",
    scoringVersion: "1.0.0",
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0 },
    warnings: [],
    cancelRequested: false,
    reportId: null,
    startedAt: NOW,
    ...overrides,
  };
}

function seedSource() {
  return {
    id: SOURCE_ID,
    analysisId: ANALYSIS_ID,
    type: "PITCH_DECK",
    origin: "UPLOAD",
    title: "Pitch deck",
    status: "PARSED",
    reliability: "PROVIDED",
    addedAt: NOW,
    parsedAt: NOW,
  };
}

function seedEvidence() {
  return {
    id: EVIDENCE_ID,
    analysisId: ANALYSIS_ID,
    sourceId: SOURCE_ID,
    locator: { kind: "paragraph", paragraph: 0 },
    text: "Testco is based in Austin.",
    reliability: "PROVIDED",
    extraction: "text",
    retrievedAt: NOW,
    contentHash: "hash",
  };
}

describe("executeRun: happy path", () => {
  it("runs the pipeline, persists facts/dimensions/report, and marks the run SUCCEEDED", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${ANALYSIS_ID}`, seedAnalysis());
    store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun());
    store.set(`analyses/${ANALYSIS_ID}/sources/${SOURCE_ID}`, seedSource());
    store.set(`analyses/${ANALYSIS_ID}/evidence/${EVIDENCE_ID}`, seedEvidence());
    // A leftover fact from a previous run on this same analysis — must be gone afterward (PROJECT_MEMORY D-063).
    store.set(`analyses/${ANALYSIS_ID}/facts/fct_stale`, { id: "fct_stale", key: "stale.fact" });

    createAnthropicLlmMock.mockReturnValue(
      new FakeLlm({
        submit_facts: factsHandler,
        submit_dimension_analysis: dimensionHandler,
        submit_synthesis: synthesisResponse,
      }),
    );

    await executeRun(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: new AbortController().signal });

    const run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("SUCCEEDED");
    expect(run.reportId).toMatch(/^rpt_/);
    expect(run.finishedAt).toBeDefined();
    const steps = run.steps as Record<string, { status: string }>;
    for (const step of ["INGEST", "EXTRACT_FACTS", "CONSISTENCY", "ANALYZE", "SCORE", "SYNTHESIZE", "VERIFY", "FINALIZE"]) {
      expect(steps[step]?.status).toBe("DONE");
    }

    const analysis = store.get(`analyses/${ANALYSIS_ID}`) as Record<string, unknown>;
    expect(analysis.status).toBe("COMPLETE");
    expect((analysis.latest as { reportId: string }).reportId).toBe(run.reportId);

    expect(store.has("analyses/ana_00000000000000000000000001/facts/fct_stale")).toBe(false);
    const factEntries = [...store.keys()].filter((k) =>
      k.startsWith(`analyses/${ANALYSIS_ID}/facts/`),
    );
    expect(factEntries.length).toBeGreaterThan(0);

    const dimensionEntries = [...store.keys()].filter((k) =>
      k.startsWith(`analyses/${ANALYSIS_ID}/reports/${run.reportId}/dimensions/`),
    );
    expect(dimensionEntries).toHaveLength(8);
  });
});

describe("executeRun: no usable evidence", () => {
  it("fails the run without calling the pipeline", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${ANALYSIS_ID}`, seedAnalysis());
    store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun());
    // No sources/evidence registered.

    createAnthropicLlmMock.mockReturnValue(
      new FakeLlm({ submit_facts: factsHandler, submit_dimension_analysis: dimensionHandler, submit_synthesis: synthesisResponse }),
    );

    await executeRun(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: new AbortController().signal });

    const run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("FAILED");
    expect((run.error as { code: string }).code).toBe("NO_USABLE_SOURCES");

    const analysis = store.get(`analyses/${ANALYSIS_ID}`) as Record<string, unknown>;
    expect(analysis.status).toBe("FAILED");
  });
});

describe("executeRun: cancelRequested before start", () => {
  it("marks the run CANCELLED without running the pipeline", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${ANALYSIS_ID}`, seedAnalysis());
    store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun({ cancelRequested: true }));
    store.set(`analyses/${ANALYSIS_ID}/sources/${SOURCE_ID}`, seedSource());
    store.set(`analyses/${ANALYSIS_ID}/evidence/${EVIDENCE_ID}`, seedEvidence());

    const llm = new FakeLlm({ submit_facts: factsHandler, submit_dimension_analysis: dimensionHandler, submit_synthesis: synthesisResponse });
    createAnthropicLlmMock.mockReturnValue(llm);

    await executeRun(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: new AbortController().signal });

    const run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("CANCELLED");
    expect(llm.calls).toHaveLength(0);

    const analysis = store.get(`analyses/${ANALYSIS_ID}`) as Record<string, unknown>;
    expect(analysis.status).toBe("READY");
  });
});

describe("executeRun: mid-run failure", () => {
  it("marks the run FAILED on a real (non-abort) error", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${ANALYSIS_ID}`, seedAnalysis());
    store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun());
    store.set(`analyses/${ANALYSIS_ID}/sources/${SOURCE_ID}`, seedSource());
    store.set(`analyses/${ANALYSIS_ID}/evidence/${EVIDENCE_ID}`, seedEvidence());

    createAnthropicLlmMock.mockReturnValue(
      new FakeLlm(
        { submit_facts: factsHandler, submit_dimension_analysis: dimensionHandler, submit_synthesis: synthesisResponse },
        "submit_facts",
      ),
    );

    await executeRun(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: new AbortController().signal });

    const run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("FAILED");
    expect((run.error as { code: string }).code).toBe("RUN_FAILED");

    const analysis = store.get(`analyses/${ANALYSIS_ID}`) as Record<string, unknown>;
    expect(analysis.status).toBe("FAILED");
  });

  it("marks the run CANCELLED when the failure is an aborted signal", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${ANALYSIS_ID}`, seedAnalysis());
    store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun());
    store.set(`analyses/${ANALYSIS_ID}/sources/${SOURCE_ID}`, seedSource());
    store.set(`analyses/${ANALYSIS_ID}/evidence/${EVIDENCE_ID}`, seedEvidence());

    createAnthropicLlmMock.mockReturnValue(
      new FakeLlm({ submit_facts: factsHandler, submit_dimension_analysis: dimensionHandler, submit_synthesis: synthesisResponse }),
    );

    const controller = new AbortController();
    controller.abort();

    await executeRun(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: controller.signal });

    const run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("CANCELLED");

    const analysis = store.get(`analyses/${ANALYSIS_ID}`) as Record<string, unknown>;
    expect(analysis.status).toBe("READY");
  });
});
