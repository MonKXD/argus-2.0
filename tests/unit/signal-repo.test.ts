import { describe, expect, it } from "vitest";

import { SignalRepo } from "@/lib/repos/signal-repo";
import type { Signal } from "@/lib/schema/signal";

import { createFakeFirestore } from "../helpers/fake-firestore";

function signal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "sig_00000000000000000000000001",
    analysisId: "ana_00000000000000000000000001",
    title: "Testco raises $5M",
    url: "https://news.example/testco",
    summary: "Testco raised a new round.",
    impact: "POSITIVE",
    evidenceId: "ev_00000000000000000000000001",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("SignalRepo", () => {
  it("creates and lists signals for an analysis, newest first", async () => {
    const { db } = createFakeFirestore();
    const repo = new SignalRepo(db);
    const older = signal({ id: "sig_00000000000000000000000001", retrievedAt: "2026-01-01T00:00:00.000Z" });
    const newer = signal({
      id: "sig_00000000000000000000000002",
      url: "https://news.example/testco-2",
      retrievedAt: "2026-01-02T00:00:00.000Z",
    });

    await repo.create(older);
    await repo.create(newer);

    const list = await repo.listByAnalysis("ana_00000000000000000000000001");
    expect(list.map((s) => s.id)).toEqual([newer.id, older.id]);
  });

  it("returns an empty array for an analysis with no signals", async () => {
    const { db } = createFakeFirestore();
    const repo = new SignalRepo(db);

    await expect(repo.listByAnalysis("ana_00000000000000000000000099")).resolves.toEqual([]);
  });
});
