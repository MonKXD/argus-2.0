import { describe, expect, it } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";

import { createFakeFirestore } from "../helpers/fake-firestore";

const otherAnalysis = {
  ...loopwellAnalysis,
  id: "ana_00000000000000000000000099",
  ownerId: "someone-else",
};

describe("AnalysisRepo", () => {
  it("creates and gets an analysis", async () => {
    const { db } = createFakeFirestore();
    const repo = new AnalysisRepo(db);

    await repo.create(loopwellAnalysis);

    await expect(repo.get(loopwellAnalysis.id)).resolves.toEqual(loopwellAnalysis);
  });

  it("returns null for a missing analysis", async () => {
    const { db } = createFakeFirestore();
    const repo = new AnalysisRepo(db);

    await expect(repo.get("ana_doesnotexist000000000001")).resolves.toBeNull();
  });

  it("update merges a partial patch, leaving other fields untouched", async () => {
    const { db } = createFakeFirestore();
    const repo = new AnalysisRepo(db);
    await repo.create(loopwellAnalysis);

    await repo.update(loopwellAnalysis.id, { isWatchlisted: true });

    await expect(repo.get(loopwellAnalysis.id)).resolves.toEqual({
      ...loopwellAnalysis,
      isWatchlisted: true,
    });
  });

  it("listByOwner returns only that owner's analyses", async () => {
    const { db } = createFakeFirestore();
    const repo = new AnalysisRepo(db);
    await repo.create(loopwellAnalysis);
    await repo.create(otherAnalysis);

    const owned = await repo.listByOwner(loopwellAnalysis.ownerId);

    expect(owned.map((a) => a.id)).toEqual([loopwellAnalysis.id]);
  });

  it("listByOwner returns an empty array for an owner with no analyses", async () => {
    const { db } = createFakeFirestore();
    const repo = new AnalysisRepo(db);

    await expect(repo.listByOwner("nobody")).resolves.toEqual([]);
  });
});
