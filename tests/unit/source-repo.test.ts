import { describe, expect, it } from "vitest";

import { loopwellEvidence, loopwellSources } from "@/demo/loopwell";
import { FirestoreStore } from "@/lib/repos/firestore-store";
import { SourceRepo } from "@/lib/repos/source-repo";

import { createFakeFirestore } from "../helpers/fake-firestore";

const ANALYSIS_ID = loopwellSources[0]!.analysisId;
const deckSource = loopwellSources[0]!;
const deckEvidence = loopwellEvidence.filter((e) => e.sourceId === deckSource.id);
const otherSource = loopwellSources[1]!;
const otherEvidence = loopwellEvidence.filter((e) => e.sourceId === otherSource.id);

describe("SourceRepo", () => {
  it("creates a source with its evidence", async () => {
    const { db } = createFakeFirestore();
    const repo = new SourceRepo(db);

    await repo.create(deckSource, deckEvidence);

    await expect(repo.get(ANALYSIS_ID, deckSource.id)).resolves.toEqual(deckSource);
  });

  it("returns null for a missing source", async () => {
    const { db } = createFakeFirestore();
    const repo = new SourceRepo(db);

    await expect(repo.get(ANALYSIS_ID, "src_doesnotexist00000000001")).resolves.toBeNull();
  });

  it("lists every source for an analysis, oldest first", async () => {
    const { db } = createFakeFirestore();
    const repo = new SourceRepo(db);
    await repo.create(deckSource, deckEvidence);
    await repo.create(otherSource, otherEvidence);

    const sources = await repo.list(ANALYSIS_ID);

    expect(sources.map((s) => s.id).sort()).toEqual([deckSource.id, otherSource.id].sort());
  });

  it("delete removes the source and only its own evidence", async () => {
    const { db } = createFakeFirestore();
    const repo = new SourceRepo(db);
    await repo.create(deckSource, deckEvidence);
    await repo.create(otherSource, otherEvidence);

    await repo.delete(ANALYSIS_ID, deckSource.id);

    await expect(repo.get(ANALYSIS_ID, deckSource.id)).resolves.toBeNull();
    await expect(repo.get(ANALYSIS_ID, otherSource.id)).resolves.toEqual(otherSource);

    const remainingEvidence = await new FirestoreStore(db).listEvidence(ANALYSIS_ID);
    expect(remainingEvidence.map((e) => e.id).sort()).toEqual(
      otherEvidence.map((e) => e.id).sort(),
    );
  });

  it("delete on a source with no evidence does not error", async () => {
    const { db } = createFakeFirestore();
    const repo = new SourceRepo(db);
    await repo.create(otherSource, []);

    await expect(repo.delete(ANALYSIS_ID, otherSource.id)).resolves.toBeUndefined();
    await expect(repo.get(ANALYSIS_ID, otherSource.id)).resolves.toBeNull();
  });
});
