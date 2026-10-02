import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { Analysis } from "@/lib/schema/analysis";
import type { Usage } from "@/lib/schema/run";

import { createFakeFirestore } from "../helpers/fake-firestore";

const search = vi.fn();
const fetchPage = vi.fn();
const ingestSource = vi.fn();

vi.mock("@/lib/analysis/ingest/ingest-source", () => ({
  ingestSource: (...args: unknown[]) => ingestSource(...args),
}));

const { detectSignalsForAnalysis } = await import("@/lib/analysis/steps/detect-signals");

function usage(): Usage {
  return { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.0001 };
}

class FakeLlm implements LLM {
  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    void args;
    return {
      data: { summary: "Testco raised a new round.", impact: "POSITIVE", relatedDimension: "financial" } as T,
      usage: usage(),
    };
  }
}

function analysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    id: "ana_00000000000000000000000001",
    ownerId: "user_1",
    startup: { name: "Testco", stage: "SEED", website: "https://testco.example" },
    status: "COMPLETE",
    options: { webResearch: false },
    latest: null,
    currentRunId: null,
    tags: [],
    isWatchlisted: true,
    isDemo: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    ...overrides,
  } as Analysis;
}

describe("detectSignalsForAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a Signal from a new, unseen search hit", async () => {
    const { db, store } = createFakeFirestore();
    search.mockResolvedValue([{ url: "https://news.example/testco-raises", title: "Testco raises $5M" }]);
    ingestSource.mockResolvedValue({
      source: {
        id: "src_00000000000000000000000001",
        analysisId: "ana_00000000000000000000000001",
        type: "WEB_RESEARCH",
        origin: "RESEARCH",
        title: "Testco raises $5M",
        url: "https://news.example/testco-raises",
        status: "PARSED",
        reliability: "INDEPENDENT",
        addedAt: "2026-01-01T00:00:00.000Z",
        parsedAt: "2026-01-01T00:00:00.000Z",
      },
      evidence: [
        {
          id: "ev_00000000000000000000000001",
          analysisId: "ana_00000000000000000000000001",
          sourceId: "src_00000000000000000000000001",
          locator: { kind: "url", url: "https://news.example/testco-raises" },
          text: "Testco raised $5M in a new round.",
          reliability: "INDEPENDENT",
          extraction: "text",
          retrievedAt: "2026-01-01T00:00:00.000Z",
          contentHash: "hash",
        },
      ],
      injectionMatches: [],
    });

    const result = await detectSignalsForAnalysis({
      db,
      llm: new FakeLlm(),
      research: { search, fetchPage },
      analysis: analysis(),
    });

    expect(result.signalsCreated).toBe(1);
    const signalEntries = [...store.keys()].filter((k) =>
      k.startsWith("analyses/ana_00000000000000000000000001/signals/"),
    );
    expect(signalEntries).toHaveLength(1);
    const signal = store.get(signalEntries[0]!) as Record<string, unknown>;
    expect(signal.url).toBe("https://news.example/testco-raises");
    expect(signal.summary).toBe("Testco raised a new round.");
    expect(signal.impact).toBe("POSITIVE");

    const activityEntries = [...store.keys()]
      .filter((k) => k.startsWith("activity/"))
      .map((k) => store.get(k) as Record<string, unknown>);
    expect(activityEntries).toContainEqual(expect.objectContaining({ type: "SIGNAL_DETECTED" }));
  });

  it("skips a hit whose URL already has a Signal for this analysis", async () => {
    const { db, store } = createFakeFirestore();
    store.set("analyses/ana_00000000000000000000000001/signals/sig_00000000000000000000000002", {
      id: "sig_00000000000000000000000002",
      analysisId: "ana_00000000000000000000000001",
      title: "Old news",
      url: "https://news.example/testco-raises",
      summary: "Already seen.",
      impact: "NEUTRAL",
      evidenceId: "ev_00000000000000000000000002",
      retrievedAt: "2026-01-01T00:00:00.000Z",
    });
    search.mockResolvedValue([{ url: "https://news.example/testco-raises", title: "Testco raises $5M" }]);

    const result = await detectSignalsForAnalysis({
      db,
      llm: new FakeLlm(),
      research: { search, fetchPage },
      analysis: analysis(),
    });

    expect(result.signalsCreated).toBe(0);
    expect(ingestSource).not.toHaveBeenCalled();
  });

  it("continues past one failing candidate without throwing", async () => {
    const { db } = createFakeFirestore();
    search.mockResolvedValue([
      { url: "https://news.example/bad", title: "Bad article" },
      { url: "https://news.example/good", title: "Good article" },
    ]);
    ingestSource
      .mockRejectedValueOnce(new Error("SSRF blocked"))
      .mockResolvedValueOnce({
        source: {
          id: "src_2",
          analysisId: "ana_00000000000000000000000001",
          type: "WEB_RESEARCH",
          origin: "RESEARCH",
          title: "Good article",
          url: "https://news.example/good",
          status: "PARSED",
          reliability: "INDEPENDENT",
          addedAt: "2026-01-01T00:00:00.000Z",
          parsedAt: "2026-01-01T00:00:00.000Z",
        },
        evidence: [
          {
            id: "ev_2",
            analysisId: "ana_00000000000000000000000001",
            sourceId: "src_2",
            locator: { kind: "url", url: "https://news.example/good" },
            text: "Good content.",
            reliability: "INDEPENDENT",
            extraction: "text",
            retrievedAt: "2026-01-01T00:00:00.000Z",
            contentHash: "hash2",
          },
        ],
        injectionMatches: [],
      });

    const result = await detectSignalsForAnalysis({
      db,
      llm: new FakeLlm(),
      research: { search, fetchPage },
      analysis: analysis(),
    });

    expect(result.signalsCreated).toBe(1);
  });
});
