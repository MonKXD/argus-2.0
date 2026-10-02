import { describe, expect, it } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";
import { ActivityRepo } from "@/lib/repos/activity-repo";
import type { Activity } from "@/lib/schema/activity";

import { createFakeFirestore } from "../helpers/fake-firestore";

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act_00000000000000000000000001",
    ownerId: loopwellAnalysis.ownerId,
    type: "ANALYSIS_CREATED",
    analysisId: loopwellAnalysis.id,
    message: "Created Loopwell.",
    createdAt: "2026-09-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("ActivityRepo", () => {
  it("lists only the owner's activity, newest first", async () => {
    const { db } = createFakeFirestore();
    const repo = new ActivityRepo(db);
    const mine1 = activity({ id: "act_00000000000000000000000001", createdAt: "2026-09-20T00:00:00.000Z" });
    const mine2 = activity({ id: "act_00000000000000000000000002", createdAt: "2026-09-25T00:00:00.000Z" });
    const someoneElses = activity({
      id: "act_00000000000000000000000003",
      ownerId: "someone-else",
      createdAt: "2026-09-26T00:00:00.000Z",
    });
    await repo.create(mine1);
    await repo.create(mine2);
    await repo.create(someoneElses);

    const result = await repo.listByOwner(loopwellAnalysis.ownerId);

    expect(result.map((a) => a.id)).toEqual([mine2.id, mine1.id]);
  });

  it("caps the feed to the given limit", async () => {
    const { db } = createFakeFirestore();
    const repo = new ActivityRepo(db);
    for (let i = 0; i < 15; i++) {
      await repo.create(
        activity({
          id: `act_0000000000000000000000${String(i).padStart(4, "0")}`,
          createdAt: `2026-09-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
        }),
      );
    }

    const result = await repo.listByOwner(loopwellAnalysis.ownerId, 5);

    expect(result).toHaveLength(5);
  });

  it("lists nothing for an owner with no activity", async () => {
    const { db } = createFakeFirestore();
    const repo = new ActivityRepo(db);

    await expect(repo.listByOwner("nobody")).resolves.toEqual([]);
  });
});
