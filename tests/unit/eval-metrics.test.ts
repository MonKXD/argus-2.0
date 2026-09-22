import { describe, expect, it } from "vitest";

import type { RunAnalysisPipelineResult } from "@/lib/analysis/pipeline";
import type { Claim, DimensionAnalysis, Flag } from "@/lib/schema/claims";
import type { Report, RunWarning } from "@/lib/schema/report";

import { checkExpectation, computeFinalCounts, computeRawDowngradeRate, missingInfoRecall } from "../../evals/metrics";

import type { FixtureExpectation } from "../../evals/types";

function claim(overrides: Partial<Claim> = {}): Claim {
  return { id: "clm_1", text: "A claim.", confidence: 0.5, entities: [], status: "AI_ANALYSIS", basedOn: ["fct_1"], ...overrides } as Claim;
}

function missingClaim(text: string, whatIsNeeded: string): Claim {
  return {
    id: "clm_2",
    text,
    confidence: 0,
    entities: [],
    status: "MISSING",
    missing: { whatIsNeeded, suggestedSource: "Founder", priority: "MEDIUM" },
  } as Claim;
}

function dimension(overrides: Partial<DimensionAnalysis> = {}): DimensionAnalysis {
  return {
    dimension: "founder",
    score: 60,
    confidence: 0.5,
    evidenceTruncated: false,
    criteria: [],
    claims: [],
    strengthIds: [],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
    ...overrides,
  };
}

function flag(overrides: Partial<Flag> = {}): Flag {
  return {
    id: "flg_1",
    category: "INCONSISTENCY",
    severity: "HIGH",
    title: "t",
    description: "d",
    evidenceIds: [],
    claimIds: [],
    detectedBy: "CONSISTENCY",
    status: "OPEN",
    ...overrides,
  };
}

function report(overrides: Partial<Report> = {}): Report {
  return {
    id: "rpt_1",
    analysisId: "ana_1",
    runId: "run_1",
    ownerId: "owner_1",
    version: 1,
    schemaVersion: 1,
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
    generatedAt: "2026-09-22T00:00:00Z",
    stage: "SEED",
    stageProfile: "SEED",
    overall: { score: 60, label: "SCORED", confidence: 0.5, coverage: 1, weights: {} },
    narrative: { executiveSummary: [], investmentOverview: [], marketTrends: [], marketGaps: [], aiInsights: [] },
    flags: [],
    checklist: [],
    evidenceStats: {
      sources: 1,
      evidenceItems: 1,
      facts: 1,
      claims: { VERIFIED: 0, AI_ANALYSIS: 0, ASSUMPTION: 0, MISSING: 0 },
      bySection: {},
      reliabilityMix: { INDEPENDENT: 0, FIRST_PARTY: 0, PROVIDED: 0 },
      downgraded: 0,
      dropped: 0,
    },
    warnings: [],
    ...overrides,
  };
}

function result(overrides: Partial<RunAnalysisPipelineResult> = {}): RunAnalysisPipelineResult {
  return {
    report: report(),
    dimensions: [dimension()],
    facts: [],
    evidence: [],
    sources: [],
    failedDimensions: [],
    warnings: [],
    usage: [],
    budgetExceeded: false,
    ...overrides,
  };
}

describe("computeFinalCounts", () => {
  it("counts warnings by code", () => {
    const warnings: RunWarning[] = [
      { code: "CITATION_INVALID", message: "x", step: "ANALYZE" },
      { code: "UNGROUNDED_NUMBER", message: "x", step: "ANALYZE" },
      { code: "UNGROUNDED_NUMBER", message: "x", step: "SYNTHESIZE" },
      { code: "SENSITIVE_ATTRIBUTE", message: "x", step: "VERIFY" },
    ];
    expect(computeFinalCounts(warnings)).toEqual({
      invalidCitations: 1,
      ungroundedNumbers: 2,
      ungroundedEntities: 0,
      sensitiveAttributeHits: 1,
    });
  });

  it("counts only the drop-case ENTITY_UNGROUNDED warnings, not the heuristic warn-only ones", () => {
    const warnings: RunWarning[] = [
      { code: "ENTITY_UNGROUNDED", message: "Dropped claim: declared entities not in evidence [Acme]", step: "ANALYZE" },
      { code: "ENTITY_UNGROUNDED", message: "Possible ungrounded name(s) [Foo]", step: "ANALYZE", refId: "clm_1" },
    ];
    expect(computeFinalCounts(warnings).ungroundedEntities).toBe(1);
  });
});

describe("computeRawDowngradeRate", () => {
  it("is zero when no candidate was dropped", () => {
    const r = result({ dimensions: [dimension({ claims: [claim(), claim({ id: "clm_2" })] })] });
    expect(computeRawDowngradeRate(r)).toBe(0);
  });

  it("computes dropped / (dropped + surviving)", () => {
    const r = result({
      dimensions: [dimension({ claims: [claim()] })],
      warnings: [{ code: "CITATION_INVALID", message: "Dropped claim: no quote passed citation validation", step: "ANALYZE" }],
    });
    // 1 surviving + 1 dropped = 2 total, 1 dropped -> 50%
    expect(computeRawDowngradeRate(r)).toBe(0.5);
  });

  it("is zero when there were no candidates at all", () => {
    expect(computeRawDowngradeRate(result())).toBe(0);
  });
});

describe("checkExpectation", () => {
  it("passes an empty expectation with no failures", () => {
    expect(checkExpectation(result(), {})).toEqual([]);
  });

  it("flags a score below minOverallScore", () => {
    const failures = checkExpectation(result({ report: report({ overall: { score: 20, label: "SCORED", confidence: 0.5, coverage: 1, weights: {} } }) }), {
      minOverallScore: 40,
    } satisfies FixtureExpectation);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.check).toBe("minOverallScore");
  });

  it("flags a non-null dimension when nullDimensions expects null", () => {
    const failures = checkExpectation(result({ dimensions: [dimension({ dimension: "financial", score: 50 })] }), {
      nullDimensions: ["financial"],
    });
    expect(failures).toHaveLength(1);
  });

  it("passes when the dimension really is null", () => {
    const failures = checkExpectation(result({ dimensions: [dimension({ dimension: "financial", score: null })] }), {
      nullDimensions: ["financial"],
    });
    expect(failures).toEqual([]);
  });

  it("flags too few MISSING claims", () => {
    const failures = checkExpectation(result({ dimensions: [dimension({ claims: [missingClaim("x", "y")] })] }), {
      minMissingClaims: 2,
    });
    expect(failures).toHaveLength(1);
  });

  it("flags a flag category below the minimum count", () => {
    const failures = checkExpectation(result({ report: report({ flags: [flag({ category: "INCONSISTENCY" })] }) }), {
      minFlagsOfCategory: { INCONSISTENCY: 2 },
    });
    expect(failures).toHaveLength(1);
  });

  it("flags an INCONSISTENCY flag citing only one evidence item", () => {
    const failures = checkExpectation(
      result({ report: report({ flags: [flag({ category: "INCONSISTENCY", evidenceIds: ["ev_1"] })] }) }),
      { flagsMustCiteMultipleEvidence: ["INCONSISTENCY"] },
    );
    expect(failures).toHaveLength(1);
  });

  it("passes when the flag cites two distinct evidence items", () => {
    const failures = checkExpectation(
      result({ report: report({ flags: [flag({ category: "INCONSISTENCY", evidenceIds: ["ev_1", "ev_2"] })] }) }),
      { flagsMustCiteMultipleEvidence: ["INCONSISTENCY"] },
    );
    expect(failures).toEqual([]);
  });

  it("flags a checklist missing a required keyword", () => {
    const failures = checkExpectation(result(), { checklistMustMentionKeywords: ["financial statements"] });
    expect(failures).toHaveLength(1);
  });

  it("flags forbidden text appearing in a claim", () => {
    const failures = checkExpectation(
      result({ dimensions: [dimension({ claims: [claim({ text: "We have no competitors at all." })] })] }),
      { forbiddenTextSubstrings: ["no competitors"] },
    );
    expect(failures).toHaveLength(1);
  });

  it("flags forbidden text appearing in a flag's title or description", () => {
    const failures = checkExpectation(result({ report: report({ flags: [flag({ description: "cites the phrase perfect 100" })] }) }), {
      forbiddenTextSubstrings: ["perfect 100"],
    });
    expect(failures).toHaveLength(1);
  });

  it("flags evidence not marked with the expected extraction kind", () => {
    const failures = checkExpectation(
      result({ evidence: [{ id: "ev_1", analysisId: "a", sourceId: "s", locator: { kind: "page" }, text: "x", reliability: "PROVIDED", extraction: "text", retrievedAt: "2026-01-01T00:00:00Z", contentHash: "h" }] }),
      { allEvidenceExtraction: "vision" },
    );
    expect(failures).toHaveLength(1);
  });
});

describe("missingInfoRecall", () => {
  it("returns 1 when no keywords are planted", () => {
    expect(missingInfoRecall(result(), [])).toBe(1);
  });

  it("computes the share of keywords found in a MISSING claim's text or whatIsNeeded", () => {
    const r = result({ dimensions: [dimension({ claims: [missingClaim("Runway is not stated.", "Financial statements")] })] });
    expect(missingInfoRecall(r, ["runway", "burn rate"])).toBe(0.5);
  });

  it("is case-insensitive", () => {
    const r = result({ dimensions: [dimension({ claims: [missingClaim("REVENUE figures are absent.", "x")] })] });
    expect(missingInfoRecall(r, ["revenue"])).toBe(1);
  });
});
