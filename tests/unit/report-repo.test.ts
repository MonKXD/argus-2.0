import { describe, expect, it } from "vitest";

import { demoDimensions, demoReport } from "@/demo";
import { FirestoreStore } from "@/lib/repos/firestore-store";
import { ReportRepo } from "@/lib/repos/report-repo";

import { createFakeFirestore } from "../helpers/fake-firestore";

const ANALYSIS_ID = demoReport.analysisId;

describe("ReportRepo", () => {
  it("returns null for a report that was never saved", async () => {
    const { db } = createFakeFirestore();
    const repo = new ReportRepo(db);

    await expect(repo.getReport(ANALYSIS_ID, demoReport.id)).resolves.toBeNull();
  });

  it("gets a saved report back exactly", async () => {
    const { db } = createFakeFirestore();
    await new FirestoreStore(db).saveReport(ANALYSIS_ID, demoReport);
    const repo = new ReportRepo(db);

    await expect(repo.getReport(ANALYSIS_ID, demoReport.id)).resolves.toEqual(demoReport);
  });

  it("lists every saved dimension in canonical DIMENSION_KEYS order", async () => {
    const { db } = createFakeFirestore();
    const store = new FirestoreStore(db);
    // Save out of order to prove the repo re-sorts, not just echoes insertion order.
    for (const dimension of [...demoDimensions].reverse()) {
      await store.saveDimension(ANALYSIS_ID, demoReport.id, dimension);
    }
    const repo = new ReportRepo(db);

    const result = await repo.listDimensions(ANALYSIS_ID, demoReport.id);

    expect(result.map((d) => d.dimension)).toEqual(demoDimensions.map((d) => d.dimension));
    expect(result).toEqual(expect.arrayContaining(demoDimensions));
  });

  it("omits a dimension that was never saved (e.g. it failed its run)", async () => {
    const { db } = createFakeFirestore();
    const store = new FirestoreStore(db);
    for (const dimension of demoDimensions.slice(1)) {
      await store.saveDimension(ANALYSIS_ID, demoReport.id, dimension);
    }
    const repo = new ReportRepo(db);

    const result = await repo.listDimensions(ANALYSIS_ID, demoReport.id);

    expect(result).toHaveLength(demoDimensions.length - 1);
    expect(result.some((d) => d.dimension === demoDimensions[0]!.dimension)).toBe(false);
  });

  it("lists no versions for an analysis with no saved report", async () => {
    const { db } = createFakeFirestore();
    const repo = new ReportRepo(db);

    await expect(repo.list(ANALYSIS_ID)).resolves.toEqual([]);
  });

  it("lists every saved report version, newest first", async () => {
    const { db } = createFakeFirestore();
    const store = new FirestoreStore(db);
    const earlierVersion = { ...demoReport, id: "rpt_00000000000000000000000002", version: 1 };
    const laterVersion = { ...demoReport, id: "rpt_00000000000000000000000003", version: 2 };
    // Save out of order to prove the repo sorts by `version`, not by write
    // or insertion order.
    await store.saveReport(ANALYSIS_ID, earlierVersion);
    await store.saveReport(ANALYSIS_ID, laterVersion);
    const repo = new ReportRepo(db);

    const result = await repo.list(ANALYSIS_ID);

    expect(result.map((r) => r.version)).toEqual([2, 1]);
  });
});
