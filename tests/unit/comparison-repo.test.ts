import { describe, expect, it } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";
import type { Comparison } from "@/lib/schema/comparison";

import { createFakeFirestore } from "../helpers/fake-firestore";

function comparison(overrides: Partial<Comparison> = {}): Comparison {
  return {
    id: "cmp_00000000000000000000000001",
    ownerId: loopwellAnalysis.ownerId,
    name: "Seed-stage fintech",
    items: [
      {
        analysisId: loopwellAnalysis.id,
        reportId: "rpt_00000000000000000000000001",
        label: loopwellAnalysis.startup.name,
        deleted: false,
      },
      {
        analysisId: "ana_00000000000000000000000002",
        reportId: "rpt_00000000000000000000000002",
        label: "Another Startup",
        deleted: false,
      },
    ],
    scoringVersions: ["2026.1"],
    createdAt: "2026-09-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("ComparisonRepo", () => {
  it("returns null for a comparison that was never saved", async () => {
    const { db } = createFakeFirestore();
    const repo = new ComparisonRepo(db);

    await expect(repo.get("cmp_00000000000000000000000001")).resolves.toBeNull();
  });

  it("gets a saved comparison back exactly", async () => {
    const { db } = createFakeFirestore();
    const repo = new ComparisonRepo(db);
    const saved = comparison();

    await repo.create(saved);

    await expect(repo.get(saved.id)).resolves.toEqual(saved);
  });

  it("updates only the given fields, leaving the rest untouched", async () => {
    const { db } = createFakeFirestore();
    const repo = new ComparisonRepo(db);
    const saved = comparison();
    await repo.create(saved);
    const narrative: Comparison["narrative"] = [
      {
        id: "clm_00000000000000000000000099",
        text: "Loopwell has a larger ARR than the other startup.",
        confidence: 0.8,
        entities: [],
        status: "VERIFIED",
        quotes: [{ evidenceId: "ev_00000000000000000000000001", quote: "ARR of $2,000,000" }],
      },
    ];

    await repo.update(saved.id, { narrative });

    const updated = await repo.get(saved.id);
    expect(updated?.narrative).toEqual(narrative);
    expect(updated?.name).toBe(saved.name);
  });

  it("deletes a comparison", async () => {
    const { db } = createFakeFirestore();
    const repo = new ComparisonRepo(db);
    const saved = comparison();
    await repo.create(saved);

    await repo.delete(saved.id);

    await expect(repo.get(saved.id)).resolves.toBeNull();
  });

  it("lists only the owner's comparisons, newest first", async () => {
    const { db } = createFakeFirestore();
    const repo = new ComparisonRepo(db);
    const mine1 = comparison({ id: "cmp_00000000000000000000000001", createdAt: "2026-09-20T00:00:00.000Z" });
    const mine2 = comparison({ id: "cmp_00000000000000000000000002", createdAt: "2026-09-25T00:00:00.000Z" });
    const someoneElses = comparison({
      id: "cmp_00000000000000000000000003",
      ownerId: "someone-else",
      createdAt: "2026-09-26T00:00:00.000Z",
    });
    await repo.create(mine1);
    await repo.create(mine2);
    await repo.create(someoneElses);

    const result = await repo.listByOwner(loopwellAnalysis.ownerId);

    expect(result.map((c) => c.id)).toEqual([mine2.id, mine1.id]);
  });

  it("lists nothing for an owner with no comparisons", async () => {
    const { db } = createFakeFirestore();
    const repo = new ComparisonRepo(db);

    await expect(repo.listByOwner("nobody")).resolves.toEqual([]);
  });
});
