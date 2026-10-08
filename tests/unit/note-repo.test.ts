import { describe, expect, it } from "vitest";

import { NoteRepo } from "@/lib/repos/note-repo";

import { createFakeFirestore } from "../helpers/fake-firestore";

const ANALYSIS_ID = "ana_00000000000000000000000001";

function note(id: string, sectionKey: string, createdAt: string) {
  return {
    id,
    analysisId: ANALYSIS_ID,
    sectionKey,
    text: "A note.",
    createdAt,
  };
}

describe("NoteRepo", () => {
  it("creates a note and lists it back", async () => {
    const { db } = createFakeFirestore();
    const repo = new NoteRepo(db);
    const n = note("note_00000000000000000000000001", "founder-team", "2026-10-01T00:00:00.000Z");

    await repo.create(n);

    await expect(repo.listByAnalysis(ANALYSIS_ID)).resolves.toEqual([n]);
  });

  it("lists every note for an analysis, oldest first", async () => {
    const { db } = createFakeFirestore();
    const repo = new NoteRepo(db);
    const first = note("note_00000000000000000000000001", "founder-team", "2026-10-01T00:00:00.000Z");
    const second = note("note_00000000000000000000000002", "market-opportunity", "2026-10-02T00:00:00.000Z");

    await repo.create(second);
    await repo.create(first);

    await expect(repo.listByAnalysis(ANALYSIS_ID)).resolves.toEqual([first, second]);
  });

  it("deletes a note", async () => {
    const { db } = createFakeFirestore();
    const repo = new NoteRepo(db);
    const n = note("note_00000000000000000000000001", "founder-team", "2026-10-01T00:00:00.000Z");
    await repo.create(n);

    await repo.delete(ANALYSIS_ID, n.id);

    await expect(repo.listByAnalysis(ANALYSIS_ID)).resolves.toEqual([]);
  });
});
