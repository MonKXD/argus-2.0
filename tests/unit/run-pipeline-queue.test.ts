import { describe, expect, it, vi } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { SubmitDimensionAnalysisInput } from "@/lib/analysis/prompts/dimension-analysis";
import type { SubmitFactsInput } from "@/lib/analysis/prompts/fact-extraction";
import type { SubmitSynthesisInput } from "@/lib/analysis/prompts/synthesis";
import type { Usage } from "@/lib/schema/run";

import { createFakeFirestore } from "../helpers/fake-firestore";

const createLlmMock = vi.fn();
vi.mock("@/lib/ai/create-llm", () => ({ createLlm: () => createLlmMock() }));
vi.mock("@/lib/env", () => ({
  env: { RUN_TOKEN_BUDGET: 2_000_000, ANALYZE_CONCURRENCY: 4, LOG_LEVEL: "silent", NODE_ENV: "test" },
}));

const { executeRunChunk } = await import("@/lib/analysis/run-pipeline-queue");

function usage(): Usage {
  return { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 };
}

class FakeLlm implements LLM {
  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    const handlers: Record<string, () => unknown> = {
      submit_facts: factsHandler,
      submit_dimension_analysis: dimensionHandler,
      submit_synthesis: synthesisResponse,
    };
    const handler = handlers[args.toolName];
    if (!handler) throw new Error(`FakeLlm: no handler for tool "${args.toolName}"`);
    return { data: handler() as T, usage: usage() };
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

function seedBase(store: ReturnType<typeof createFakeFirestore>["store"]) {
  store.set(`analyses/${ANALYSIS_ID}`, seedAnalysis());
  store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun());
  store.set(`analyses/${ANALYSIS_ID}/sources/${SOURCE_ID}`, seedSource());
  store.set(`analyses/${ANALYSIS_ID}/evidence/${EVIDENCE_ID}`, seedEvidence());
}

describe("executeRunChunk: chunked (queue-mode) orchestration", () => {
  it("runs the full pipeline across three chunked calls, matching Mode A's end state", async () => {
    const { db, store } = createFakeFirestore();
    seedBase(store);
    createLlmMock.mockReturnValue(new FakeLlm());

    const signal = new AbortController().signal;

    const chunkA = await executeRunChunk(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal });
    expect(chunkA.done).toBe(false);
    let run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect((run.steps as Record<string, { status: string }>).EXTRACT_FACTS.status).toBe("DONE");
    expect((run.steps as Record<string, { status: string }>).CONSISTENCY.status).toBe("DONE");
    expect(run.queueState).toBeTruthy();
    const reportId = (run.queueState as { reportId: string }).reportId;

    const chunkB = await executeRunChunk(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal });
    expect(chunkB.done).toBe(false);
    run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect((run.steps as Record<string, { status: string }>).ANALYZE.status).toBe("DONE");
    expect((run.steps as Record<string, { status: string }>).SCORE.status).toBe("DONE");
    expect((run.queueState as { overall: unknown }).overall).toBeTruthy();
    const dimensionDoc = store.get(`analyses/${ANALYSIS_ID}/reports/${reportId}/dimensions/founder`);
    expect(dimensionDoc).toBeTruthy();

    const chunkC = await executeRunChunk(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal });
    expect(chunkC.done).toBe(true);

    run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("SUCCEEDED");
    expect(run.queueState).toBeUndefined();
    expect(run.reportId).toBe(reportId);

    const report = store.get(`analyses/${ANALYSIS_ID}/reports/${reportId}`) as Record<string, unknown>;
    expect(report).toBeTruthy();
    expect(report.id).toBe(reportId);

    const analysis = store.get(`analyses/${ANALYSIS_ID}`) as Record<string, unknown>;
    expect(analysis.status).toBe("COMPLETE");
    expect((analysis.latest as { reportId: string }).reportId).toBe(reportId);
  });

  it("deletes a previous run's leftover facts before the first chunk writes its own (D-063)", async () => {
    const { db, store } = createFakeFirestore();
    seedBase(store);
    store.set(`analyses/${ANALYSIS_ID}/facts/fct_stale`, { id: "fct_stale", key: "stale.fact" });
    createLlmMock.mockReturnValue(new FakeLlm());

    await executeRunChunk(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: new AbortController().signal });

    expect(store.has(`analyses/${ANALYSIS_ID}/facts/fct_stale`)).toBe(false);
  });

  it("marks the run CANCELLED and skips work when cancelRequested is set", async () => {
    const { db, store } = createFakeFirestore();
    seedBase(store);
    store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun({ cancelRequested: true }));
    createLlmMock.mockReturnValue(new FakeLlm());

    const result = await executeRunChunk(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: new AbortController().signal });

    expect(result.done).toBe(true);
    const run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("CANCELLED");
    const analysis = store.get(`analyses/${ANALYSIS_ID}`) as Record<string, unknown>;
    expect(analysis.status).toBe("READY");
  });

  it("fails fast with NO_USABLE_SOURCES when there's no evidence to work from", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${ANALYSIS_ID}`, seedAnalysis());
    store.set(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`, seedRun());
    createLlmMock.mockReturnValue(new FakeLlm());

    const result = await executeRunChunk(db, { analysisId: ANALYSIS_ID, runId: RUN_ID, signal: new AbortController().signal });

    expect(result.done).toBe(true);
    const run = store.get(`analyses/${ANALYSIS_ID}/runs/${RUN_ID}`) as Record<string, unknown>;
    expect(run.status).toBe("FAILED");
    expect((run.error as { code: string }).code).toBe("NO_USABLE_SOURCES");
  });
});
