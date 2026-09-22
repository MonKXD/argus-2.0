import { readFile } from "node:fs/promises";
import path from "node:path";

import type { LLM } from "@/lib/ai/llm";
import { runAnalysisPipeline, type RunAnalysisPipelineResult } from "@/lib/analysis/pipeline";
import { newId } from "@/lib/schema/ids";

import { loadFixture, listFixtureSlugs } from "./load-fixture";
import { checkExpectation, computeFinalCounts, computeRawDowngradeRate, missingInfoRecall, type ExpectationFailure } from "./metrics";
import { Thresholds } from "./types";

const THRESHOLDS_PATH = path.join(import.meta.dirname, "thresholds.json");

export interface FixtureRunResult {
  slug: string;
  trap: string;
  isInjectionFixture: boolean;
  passed: boolean;
  expectationFailures: ExpectationFailure[];
  finalCounts: ReturnType<typeof computeFinalCounts>;
  rawDowngradeRate: number;
  missingInfoRecall: number | undefined;
  result: RunAnalysisPipelineResult;
}

export interface EvalRunSummary {
  fixtures: FixtureRunResult[];
  thresholds: Thresholds;
  thresholdFailures: string[];
  passed: boolean;
}

export interface RunEvalsArgs {
  llm: LLM;
  /** Defaults to every fixture under evals/fixtures/. */
  slugs?: string[];
}

export async function runEvals(args: RunEvalsArgs): Promise<EvalRunSummary> {
  const thresholds = Thresholds.parse(JSON.parse(await readFile(THRESHOLDS_PATH, "utf-8")));
  const slugs = args.slugs ?? (await listFixtureSlugs());

  const fixtures: FixtureRunResult[] = [];
  for (const slug of slugs) {
    fixtures.push(await runFixture(slug, args.llm));
  }

  const thresholdFailures = checkThresholds(fixtures, thresholds);
  const passed = thresholdFailures.length === 0 && fixtures.every((f) => f.passed);

  return { fixtures, thresholds, thresholdFailures, passed };
}

async function runFixture(slug: string, llm: LLM): Promise<FixtureRunResult> {
  const fixture = await loadFixture(slug);
  try {
    const result = await runAnalysisPipeline({
      analysisId: newId("ana"),
      runId: newId("run"),
      ownerId: "eval-harness",
      version: 1,
      startupName: fixture.manifest.startupName,
      stage: fixture.manifest.stage,
      sector: fixture.manifest.sector,
      companyDomain: fixture.manifest.companyDomain,
      sources: fixture.sources,
      llm,
    });

    const expectationFailures = checkExpectation(result, fixture.expected);
    const recall =
      fixture.expected.plantedGapKeywords && fixture.expected.plantedGapKeywords.length > 0
        ? missingInfoRecall(result, fixture.expected.plantedGapKeywords)
        : undefined;

    return {
      slug,
      trap: fixture.manifest.trap,
      isInjectionFixture: fixture.expected.isInjectionFixture ?? false,
      passed: expectationFailures.length === 0,
      expectationFailures,
      finalCounts: computeFinalCounts(result.warnings),
      rawDowngradeRate: computeRawDowngradeRate(result),
      missingInfoRecall: recall,
      result,
    };
  } finally {
    await fixture.cleanup();
  }
}

/** AI_SPEC 10.2's cross-fixture metrics: final counts (threshold 0, aggregated across all fixtures), injection resistance, missing-info recall, and the raw downgrade alert. */
function checkThresholds(fixtures: FixtureRunResult[], thresholds: Thresholds): string[] {
  const failures: string[] = [];

  const totals = fixtures.reduce(
    (acc, f) => ({
      invalidCitations: acc.invalidCitations + f.finalCounts.invalidCitations,
      ungroundedNumbers: acc.ungroundedNumbers + f.finalCounts.ungroundedNumbers,
      ungroundedEntities: acc.ungroundedEntities + f.finalCounts.ungroundedEntities,
      sensitiveAttributeHits: acc.sensitiveAttributeHits + f.finalCounts.sensitiveAttributeHits,
    }),
    { invalidCitations: 0, ungroundedNumbers: 0, ungroundedEntities: 0, sensitiveAttributeHits: 0 },
  );

  if (totals.invalidCitations > thresholds.invalidCitationsFinal) {
    failures.push(`Invalid citations (final): ${totals.invalidCitations} > threshold ${thresholds.invalidCitationsFinal}`);
  }
  if (totals.ungroundedNumbers > thresholds.ungroundedNumbersFinal) {
    failures.push(`Ungrounded numbers (final): ${totals.ungroundedNumbers} > threshold ${thresholds.ungroundedNumbersFinal}`);
  }
  if (totals.ungroundedEntities > thresholds.ungroundedEntitiesFinal) {
    failures.push(`Ungrounded named entities (final): ${totals.ungroundedEntities} > threshold ${thresholds.ungroundedEntitiesFinal}`);
  }
  if (totals.sensitiveAttributeHits > thresholds.sensitiveAttributeHitsFinal) {
    failures.push(`Sensitive-attribute hits (final): ${totals.sensitiveAttributeHits} > threshold ${thresholds.sensitiveAttributeHitsFinal}`);
  }

  const injectionFixtures = fixtures.filter((f) => f.isInjectionFixture);
  if (injectionFixtures.length > 0) {
    const resistantRate = injectionFixtures.filter((f) => f.passed).length / injectionFixtures.length;
    if (resistantRate < thresholds.injectionResistanceMinRate) {
      failures.push(
        `Injection resistance: ${(resistantRate * 100).toFixed(0)}% < threshold ${(thresholds.injectionResistanceMinRate * 100).toFixed(0)}%`,
      );
    }
  }

  const recallFixtures = fixtures.filter((f) => f.missingInfoRecall !== undefined);
  if (recallFixtures.length > 0) {
    const meanRecall = recallFixtures.reduce((sum, f) => sum + (f.missingInfoRecall ?? 0), 0) / recallFixtures.length;
    if (meanRecall < thresholds.missingInfoRecallMinRate) {
      failures.push(
        `Missing-information recall: ${(meanRecall * 100).toFixed(0)}% < threshold ${(thresholds.missingInfoRecallMinRate * 100).toFixed(0)}%`,
      );
    }
  }

  // Raw downgrade rate is "tracked; alert if above 25%" (not a hard failure per AI_SPEC 10.2's own wording).
  for (const f of fixtures) {
    if (f.rawDowngradeRate > thresholds.rawDowngradeRateAlertAbove) {
      failures.push(
        `[alert, not a failure] "${f.slug}" raw downgrade rate ${(f.rawDowngradeRate * 100).toFixed(0)}% > ${(thresholds.rawDowngradeRateAlertAbove * 100).toFixed(0)}%`,
      );
    }
  }

  return failures;
}
