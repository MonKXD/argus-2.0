import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createAnthropicLlm } from "@/lib/ai/llm";
import { runAnalysisPipeline } from "@/lib/analysis/pipeline";
import { newId } from "@/lib/schema/ids";

import { loadManifestSources } from "./load-fixture";
import { FixtureManifest } from "./types";

/**
 * `pnpm analyze <path>` (CLAUDE.md's Commands section, T-2.17): runs the
 * real engine on one local analysis, given a directory containing a
 * `manifest.json` in the same shape `evals/fixtures/*` use (minus
 * `expected.json`, which is eval-only). Unlike the eval harness, this never
 * sets `unsafeAllowPrivateNetworksForTests` — a `url`-type source here goes
 * through the real SSRF-safe fetcher, not a throwaway local server.
 */
async function main(): Promise<void> {
  const [dirArg, ...rest] = process.argv.slice(2);
  if (!dirArg) {
    console.error("Usage: pnpm analyze <path-to-manifest-directory> [--out <report.json>]");
    process.exitCode = 1;
    return;
  }

  const outIndex = rest.indexOf("--out");
  const outPath = outIndex !== -1 ? rest[outIndex + 1] : path.join(dirArg, "report.json");
  if (!outPath) {
    console.error("--out requires a file path");
    process.exitCode = 1;
    return;
  }

  const dir = path.resolve(dirArg);
  const manifest = FixtureManifest.parse(JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf-8")));
  const { sources, cleanup } = await loadManifestSources(dir, manifest);

  try {
    console.error(`Analyzing ${manifest.startupName} (${sources.length} source(s))...`);

    const result = await runAnalysisPipeline({
      analysisId: newId("ana"),
      runId: newId("run"),
      ownerId: "cli",
      version: 1,
      startupName: manifest.startupName,
      stage: manifest.stage,
      sector: manifest.sector,
      companyDomain: manifest.companyDomain,
      sources,
      llm: createAnthropicLlm(),
      onProgress: (step) => console.error(`  [${step}] done`),
    });

    await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
    await writeFile(outPath, JSON.stringify(result, null, 2), "utf-8");

    console.error(
      `\nOverall: score=${result.report.overall.score} label=${result.report.overall.label} confidence=${result.report.overall.confidence}`,
    );
    console.error(`Flags: ${result.report.flags.length}. Warnings: ${result.warnings.length}. Budget exceeded: ${result.budgetExceeded}.`);
    console.error(`Report written to ${outPath}`);
  } finally {
    await cleanup();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
