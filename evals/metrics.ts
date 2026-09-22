import type { RunAnalysisPipelineResult } from "@/lib/analysis/pipeline";
import type { Claim } from "@/lib/schema/claims";
import type { RunWarning } from "@/lib/schema/report";

import type { FixtureExpectation } from "./types";

/**
 * AI_SPEC 10.2's per-run "final" counts — read directly off the warnings a
 * completed pipeline run produced. Every drop in this codebase's V1-V7
 * checks pushes exactly one `RunWarning`, so counting warnings by code (and,
 * for V3, by whether the message says the claim was actually dropped) is a
 * faithful count of the underlying violations, not an approximation of
 * something else.
 *
 * V3's `ENTITY_UNGROUNDED` code is reused for two different severities
 * (AI_SPEC section 6): a *declared* entity missing from the corpus drops
 * the claim, but the heuristic scan for undeclared capitalised names only
 * warns and keeps the claim (`entity-grounding.ts`'s own doc comment: "a
 * heuristic, so it only warns"). The "Ungrounded named entities" metric
 * counts only the drop case — the heuristic is explicitly approximate and
 * was never meant to gate a hard threshold — distinguished by message
 * prefix since the warning shape carries no separate severity field.
 */
export interface FinalCounts {
  invalidCitations: number;
  ungroundedNumbers: number;
  ungroundedEntities: number;
  sensitiveAttributeHits: number;
}

const DROPPED_CLAIM_PREFIX = "Dropped";

export function computeFinalCounts(warnings: RunWarning[]): FinalCounts {
  const droppedEntityWarnings = warnings.filter(
    (w) => w.code === "ENTITY_UNGROUNDED" && w.message.startsWith(DROPPED_CLAIM_PREFIX),
  );
  return {
    invalidCitations: warnings.filter((w) => w.code === "CITATION_INVALID").length,
    ungroundedNumbers: warnings.filter((w) => w.code === "UNGROUNDED_NUMBER").length,
    ungroundedEntities: droppedEntityWarnings.length,
    sensitiveAttributeHits: warnings.filter((w) => w.code === "SENSITIVE_ATTRIBUTE").length,
  };
}

/**
 * AI_SPEC 10.2's "raw" measurement: "model output before verification."
 * Every warning whose message starts with "Dropped" represents one
 * candidate the model produced that verification removed; every surviving
 * claim is one candidate that kept. `total = survivors + dropped` is
 * therefore the candidate count before verification ran, without needing a
 * separate "raw" capture point in the pipeline itself.
 */
export function computeRawDowngradeRate(result: RunAnalysisPipelineResult): number {
  const survivingClaims = countAllFinalClaims(result);
  const droppedClaims = result.warnings.filter((w) => w.message.startsWith(DROPPED_CLAIM_PREFIX)).length;
  const total = survivingClaims + droppedClaims;
  return total === 0 ? 0 : droppedClaims / total;
}

function countAllFinalClaims(result: RunAnalysisPipelineResult): number {
  const dimensionClaims = result.dimensions.reduce((sum, d) => sum + d.claims.length, 0);
  const narrative = result.report.narrative;
  const narrativeClaims =
    narrative.executiveSummary.length +
    narrative.investmentOverview.length +
    narrative.marketTrends.length +
    narrative.marketGaps.length +
    narrative.aiInsights.length;
  return dimensionClaims + narrativeClaims;
}

function allFinalClaims(result: RunAnalysisPipelineResult): Claim[] {
  const narrative = result.report.narrative;
  return [
    ...result.dimensions.flatMap((d) => d.claims),
    ...narrative.executiveSummary,
    ...narrative.investmentOverview,
    ...narrative.marketTrends,
    ...narrative.marketGaps,
    ...narrative.aiInsights,
  ];
}

export interface ExpectationFailure {
  check: string;
  detail: string;
}

/** Checks one fixture's `expected.json` against its pipeline result. Returns every failure, not just the first. */
export function checkExpectation(result: RunAnalysisPipelineResult, expected: FixtureExpectation): ExpectationFailure[] {
  const failures: ExpectationFailure[] = [];
  const claims = allFinalClaims(result);
  const report = result.report;

  if (expected.scored !== undefined) {
    const isScored = report.overall.label === "SCORED";
    if (isScored !== expected.scored) {
      failures.push({ check: "scored", detail: `expected label ${expected.scored ? "SCORED" : "INSUFFICIENT_EVIDENCE"}, got ${report.overall.label}` });
    }
  }

  if (expected.minOverallScore !== undefined) {
    if (report.overall.score === null || report.overall.score < expected.minOverallScore) {
      failures.push({ check: "minOverallScore", detail: `expected >= ${expected.minOverallScore}, got ${report.overall.score}` });
    }
  }

  if (expected.maxOverallConfidence !== undefined && report.overall.confidence > expected.maxOverallConfidence) {
    failures.push({ check: "maxOverallConfidence", detail: `expected <= ${expected.maxOverallConfidence}, got ${report.overall.confidence}` });
  }

  for (const dimensionKey of expected.nullDimensions ?? []) {
    const dimension = result.dimensions.find((d) => d.dimension === dimensionKey);
    if (dimension?.score !== null) {
      failures.push({ check: "nullDimensions", detail: `expected "${dimensionKey}" score to be null, got ${dimension?.score}` });
    }
  }

  if (expected.minMissingClaims !== undefined) {
    const missingCount = claims.filter((c) => c.status === "MISSING").length;
    if (missingCount < expected.minMissingClaims) {
      failures.push({ check: "minMissingClaims", detail: `expected >= ${expected.minMissingClaims} MISSING claims, got ${missingCount}` });
    }
  }

  for (const [dimensionKey, min] of Object.entries(expected.minClaimsInDimension ?? {})) {
    const dimension = result.dimensions.find((d) => d.dimension === dimensionKey);
    const count = dimension?.claims.length ?? 0;
    if (count < min) {
      failures.push({ check: "minClaimsInDimension", detail: `expected "${dimensionKey}" to have >= ${min} claims, got ${count}` });
    }
  }

  for (const [category, min] of Object.entries(expected.minFlagsOfCategory ?? {})) {
    const count = report.flags.filter((f) => f.category === category).length;
    if (count < min) {
      failures.push({ check: "minFlagsOfCategory", detail: `expected >= ${min} "${category}" flags, got ${count}` });
    }
  }

  for (const category of expected.flagsMustCiteMultipleEvidence ?? []) {
    const offenders = report.flags.filter((f) => f.category === category && new Set(f.evidenceIds).size < 2);
    if (offenders.length > 0) {
      failures.push({ check: "flagsMustCiteMultipleEvidence", detail: `${offenders.length} "${category}" flag(s) cite fewer than 2 distinct evidence items` });
    }
  }

  for (const keyword of expected.checklistMustMentionKeywords ?? []) {
    const found = report.checklist.some(
      (item) => `${item.question} ${item.whyItMatters}`.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (!found) failures.push({ check: "checklistMustMentionKeywords", detail: `no checklist item mentions "${keyword}"` });
  }

  for (const substring of expected.forbiddenTextSubstrings ?? []) {
    const lower = substring.toLowerCase();
    const claimHit = claims.some((c) => c.text.toLowerCase().includes(lower));
    const flagHit = report.flags.some((f) => `${f.title} ${f.description}`.toLowerCase().includes(lower));
    if (claimHit || flagHit) failures.push({ check: "forbiddenTextSubstrings", detail: `forbidden text "${substring}" appears in the final report` });
  }

  if (expected.allEvidenceExtraction) {
    const offenders = result.evidence.filter((e) => e.extraction !== expected.allEvidenceExtraction);
    if (offenders.length > 0) {
      failures.push({ check: "allEvidenceExtraction", detail: `${offenders.length} evidence item(s) not marked "${expected.allEvidenceExtraction}"` });
    }
  }

  return failures;
}

/** AI_SPEC 10.2's "Missing-information recall": share of each fixture's planted-gap keywords actually surfaced as a MISSING claim. */
export function missingInfoRecall(result: RunAnalysisPipelineResult, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const missingText = allFinalClaims(result)
    .filter((c) => c.status === "MISSING")
    .map((c) => `${c.text} ${c.missing.whatIsNeeded} ${c.missing.suggestedSource}`.toLowerCase())
    .join(" ");
  const found = keywords.filter((k) => missingText.includes(k.toLowerCase()));
  return found.length / keywords.length;
}
