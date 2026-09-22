import { describe, expect, it } from "vitest";

import { Analysis } from "@/lib/schema/analysis";
import { Claim, ChecklistItem, DimensionAnalysis, Flag } from "@/lib/schema/claims";
import { Evidence, Fact, Source } from "@/lib/schema/evidence";
import { Report } from "@/lib/schema/report";
import { Run } from "@/lib/schema/run";

// Minimal valid instances of every core schema in docs/SCHEMA.md sections 3
// to 5, parsed rather than merely type-checked, so a shape mismatch (e.g. a
// wrong discriminated-union key) fails loudly instead of only surfacing once
// real demo/fixture data is built on top of it (T-1.08).

const now = "2026-09-22T00:00:00Z";

describe("core schemas parse minimal valid instances", () => {
  it("Source", () => {
    expect(() =>
      Source.parse({
        id: "src_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        type: "PITCH_DECK",
        origin: "UPLOAD",
        title: "Deck.pdf",
        status: "PARSED",
        reliability: "PROVIDED",
        addedAt: now,
      }),
    ).not.toThrow();
  });

  it("Evidence", () => {
    expect(() =>
      Evidence.parse({
        id: "ev_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        sourceId: "src_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        locator: { kind: "page", page: 7 },
        text: "ARR reached $2.0M in Q2.",
        reliability: "PROVIDED",
        retrievedAt: now,
        contentHash: "abc123",
      }),
    ).not.toThrow();
  });

  it("Fact", () => {
    expect(() =>
      Fact.parse({
        id: "fct_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        key: "financial.arr",
        statement: "ARR is $2.0M",
        value: { kind: "money", amount: 200_000_000, currency: "USD" },
        quotes: [{ evidenceId: "ev_01ARZ3NDEKTSV4RRFFQ69G5FAV", quote: "ARR reached $2.0M" }],
        reliability: "PROVIDED",
        confidence: 0.8,
        runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      }),
    ).not.toThrow();
  });

  it.each([
    ["VERIFIED", { quotes: [{ evidenceId: "ev_01ARZ3NDEKTSV4RRFFQ69G5FAV", quote: "abc" }] }],
    ["AI_ANALYSIS", { basedOn: ["fct_01ARZ3NDEKTSV4RRFFQ69G5FAV"] }],
    ["ASSUMPTION", { assumption: { statement: "a", wouldConfirm: "b" } }],
    [
      "MISSING",
      { missing: { whatIsNeeded: "a", suggestedSource: "b", priority: "MEDIUM" as const } },
    ],
  ])("Claim status %s", (status, extra) => {
    expect(() =>
      Claim.parse({
        id: "clm_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        text: "The company has ARR of $2.0M.",
        confidence: 0.8,
        status,
        ...extra,
      }),
    ).not.toThrow();
  });

  it("DimensionAnalysis", () => {
    expect(() =>
      DimensionAnalysis.parse({
        dimension: "founder",
        score: 80,
        confidence: 0.8,
        criteria: [
          { id: "founder.domain_fit", label: "Domain fit", score: 3, rationale: "r", claimIds: [] },
          {
            id: "founder.track_record",
            label: "Track record",
            score: 2,
            rationale: "r",
            claimIds: [],
          },
          { id: "founder.commitment", label: "Commitment", score: 4, rationale: "r", claimIds: [] },
        ],
        claims: [],
        strengthIds: [],
        weaknessIds: [],
        riskIds: [],
        missingIds: [],
        scoringVersion: "1.0.0",
        promptVersion: "1.0.0",
      }),
    ).not.toThrow();
  });

  it("Flag", () => {
    expect(() =>
      Flag.parse({
        id: "flg_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        category: "FINANCIAL",
        severity: "MEDIUM",
        title: "Unverified ARR",
        description: "ARR is founder-stated only.",
        evidenceIds: [],
        detectedBy: "VERIFIER",
      }),
    ).not.toThrow();
  });

  it("ChecklistItem", () => {
    expect(() =>
      ChecklistItem.parse({
        id: "chk_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        dimension: "financial",
        priority: "HIGH",
        question: "What is the burn rate?",
        whyItMatters: "Determines runway.",
        suggestedSource: "Financial statements",
        linkedClaimIds: [],
      }),
    ).not.toThrow();
  });

  it("Analysis", () => {
    expect(() =>
      Analysis.parse({
        id: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerId: "user_1",
        startup: { name: "Fictional Co" },
        status: "COMPLETE",
        options: { webResearch: false },
        latest: null,
        currentRunId: null,
        tags: [],
        isWatchlisted: false,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      }),
    ).not.toThrow();
  });

  it("Run", () => {
    expect(() =>
      Run.parse({
        id: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerId: "user_1",
        status: "SUCCEEDED",
        options: { webResearch: false, stageProfile: "SEED" },
        steps: {},
        dimensionStatus: {},
        modelIds: { analysis: "claude", synthesis: "claude", fast: "claude" },
        promptVersion: "1.0.0",
        scoringVersion: "1.0.0",
        usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
        warnings: [],
        reportId: null,
        startedAt: now,
      }),
    ).not.toThrow();
  });

  it("Report", () => {
    expect(() =>
      Report.parse({
        id: "rpt_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerId: "user_1",
        version: 1,
        schemaVersion: 1,
        scoringVersion: "1.0.0",
        promptVersion: "1.0.0",
        generatedAt: now,
        stage: "SEED",
        stageProfile: "SEED",
        overall: {
          score: 71,
          label: "SCORED",
          confidence: 0.6,
          coverage: 0.8,
          weights: { founder: 0.2 },
        },
        narrative: {
          executiveSummary: [],
          investmentOverview: [],
          marketTrends: [],
          marketGaps: [],
          aiInsights: [],
        },
        flags: [],
        checklist: [],
        evidenceStats: {
          sources: 1,
          evidenceItems: 1,
          facts: 1,
          claims: { VERIFIED: 1, AI_ANALYSIS: 0, ASSUMPTION: 0, MISSING: 0 },
          bySection: {},
          reliabilityMix: { INDEPENDENT: 0, FIRST_PARTY: 0, PROVIDED: 1 },
          downgraded: 0,
          dropped: 0,
        },
        warnings: [],
      }),
    ).not.toThrow();
  });
});
