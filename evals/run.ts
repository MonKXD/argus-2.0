import { createAnthropicLlm } from "@/lib/ai/llm";

import { runEvals } from "./harness";

/**
 * `pnpm eval` (AI_SPEC section 10): runs the real pipeline against a live
 * model over every fixture in `evals/fixtures/`, checks each fixture's
 * `expected.json`, and checks the cross-fixture thresholds in
 * `evals/thresholds.json`. R-TST-02 ("CI never calls the live model")
 * applies to `pnpm check`/CI, not to this command — this is the one place
 * in the repo that is *meant* to call the real API, run manually (or in a
 * scheduled job outside CI), never from `pnpm check`.
 */
async function main(): Promise<void> {
  const slugs = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
  const summary = await runEvals({ llm: createAnthropicLlm(), slugs: slugs.length > 0 ? slugs : undefined });

  for (const fixture of summary.fixtures) {
    const status = fixture.passed ? "PASS" : "FAIL";
    console.log(`\n[${status}] ${fixture.slug} (${fixture.trap})`);
    console.log(`  overall: score=${fixture.result.report.overall.score} label=${fixture.result.report.overall.label} confidence=${fixture.result.report.overall.confidence}`);
    console.log(
      `  final counts: citations=${fixture.finalCounts.invalidCitations} numbers=${fixture.finalCounts.ungroundedNumbers} entities=${fixture.finalCounts.ungroundedEntities} sensitive=${fixture.finalCounts.sensitiveAttributeHits}`,
    );
    console.log(`  raw downgrade rate: ${(fixture.rawDowngradeRate * 100).toFixed(1)}%`);
    if (fixture.missingInfoRecall !== undefined) {
      console.log(`  missing-info recall: ${(fixture.missingInfoRecall * 100).toFixed(1)}%`);
    }
    for (const failure of fixture.expectationFailures) {
      console.log(`  ✗ ${failure.check}: ${failure.detail}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  if (summary.thresholdFailures.length > 0) {
    console.log("Threshold results:");
    for (const failure of summary.thresholdFailures) console.log(`  - ${failure}`);
  } else {
    console.log("All cross-fixture thresholds met.");
  }
  console.log(summary.passed ? "\nEVAL SUITE: PASS" : "\nEVAL SUITE: FAIL");

  process.exitCode = summary.passed ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
