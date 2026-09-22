import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FileStore } from "@/lib/analysis/store/file-store";

// FileStore backs EvidenceStore with JSON files (TRD section 5.1, T-2.02).
// Each test gets its own temp directory so nothing touches the repo.

const analysisId = "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV";

describe("FileStore", () => {
  let rootDir: string;
  let store: FileStore;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "argus-filestore-"));
    store = new FileStore(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("putEvidence then listEvidence round-trips", async () => {
    const evidence = {
      id: "ev_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      analysisId,
      sourceId: "src_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      locator: { kind: "page" as const, page: 7 },
      text: "ARR reached $2.0M in Q2.",
      reliability: "PROVIDED" as const,
      extraction: "text" as const,
      retrievedAt: "2026-09-22T00:00:00Z",
      contentHash: "abc123",
    };

    await store.putEvidence(analysisId, [evidence]);
    expect(await store.listEvidence(analysisId)).toEqual([evidence]);
  });

  it("listEvidence returns an empty array before anything is written", async () => {
    expect(await store.listEvidence(analysisId)).toEqual([]);
  });

  it("putEvidence upserts by id: a second call with the same id overwrites, not duplicates", async () => {
    const base = {
      id: "ev_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      analysisId,
      sourceId: "src_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      locator: { kind: "page" as const, page: 7 },
      reliability: "PROVIDED" as const,
      extraction: "text" as const,
      retrievedAt: "2026-09-22T00:00:00Z",
      contentHash: "abc123",
    };

    await store.putEvidence(analysisId, [{ ...base, text: "First version." }]);
    await store.putEvidence(analysisId, [{ ...base, text: "Corrected version." }]);

    const items = await store.listEvidence(analysisId);
    expect(items).toHaveLength(1);
    expect(items[0]?.text).toBe("Corrected version.");
  });

  it("putFacts then listFacts round-trips", async () => {
    const fact = {
      id: "fct_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      analysisId,
      key: "financial.arr",
      statement: "ARR is $2.0M",
      value: { kind: "money" as const, amount: 200_000_000, currency: "USD" },
      quotes: [{ evidenceId: "ev_01ARZ3NDEKTSV4RRFFQ69G5FAV", quote: "ARR reached $2.0M" }],
      reliability: "PROVIDED" as const,
      confidence: 0.8,
      conflictsWith: [],
      runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    };

    await store.putFacts(analysisId, [fact]);
    expect(await store.listFacts(analysisId)).toEqual([fact]);
  });

  it("saveDimension writes one file per dimension key", async () => {
    const reportId = "rpt_01ARZ3NDEKTSV4RRFFQ69G5FAV";
    const dimension = {
      dimension: "founder" as const,
      score: 80,
      confidence: 0.8,
      evidenceTruncated: false,
      criteria: [],
      claims: [],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
      scoringVersion: "1.0.0",
      promptVersion: "1.0.0",
    };

    await store.saveDimension(analysisId, reportId, dimension);

    const raw = await readFile(
      join(rootDir, analysisId, "reports", reportId, "dimensions", "founder.json"),
      "utf-8",
    );
    expect(JSON.parse(raw)).toEqual(dimension);
  });

  it("updateRun creates a run document from the first patch, then merges later patches", async () => {
    const runId = "run_01ARZ3NDEKTSV4RRFFQ69G5FAV";

    await store.updateRun(analysisId, runId, { id: runId, status: "RUNNING" });
    await store.updateRun(analysisId, runId, { status: "SUCCEEDED" });

    const raw = await readFile(join(rootDir, analysisId, "runs", `${runId}.json`), "utf-8");
    expect(JSON.parse(raw)).toEqual({ id: runId, status: "SUCCEEDED" });
  });
});
