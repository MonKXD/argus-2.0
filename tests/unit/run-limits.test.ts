import { describe, expect, it, vi } from "vitest";

import { LimitExceededError } from "@/lib/api/errors";

import { createFakeFirestore } from "../helpers/fake-firestore";

vi.mock("@/lib/env", () => ({
  env: { MAX_CONCURRENT_RUNS: 2, DAILY_ANALYSIS_LIMIT: 3, LOG_LEVEL: "silent", NODE_ENV: "test" },
}));

const { assertWithinRunLimits } = await import("@/lib/analysis/run-limits");

function run(overrides: Partial<{ ownerId: string; status: string; startedAt: string }>) {
  return {
    ownerId: "user_1",
    status: "SUCCEEDED",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("assertWithinRunLimits", () => {
  it("passes when the owner is under both limits", async () => {
    const { db } = createFakeFirestore();
    await expect(assertWithinRunLimits(db, "user_1")).resolves.toBeUndefined();
  });

  it("throws LIMIT_EXCEEDED at the concurrent-run cap", async () => {
    const { db, store } = createFakeFirestore();
    store.set("analyses/ana_1/runs/run_1", run({ status: "RUNNING" }));
    store.set("analyses/ana_2/runs/run_2", run({ status: "RUNNING" }));

    await expect(assertWithinRunLimits(db, "user_1")).rejects.toThrow(LimitExceededError);
  });

  it("ignores another owner's RUNNING runs for the concurrency check", async () => {
    const { db, store } = createFakeFirestore();
    store.set("analyses/ana_1/runs/run_1", run({ ownerId: "someone-else", status: "RUNNING" }));
    store.set("analyses/ana_2/runs/run_2", run({ ownerId: "someone-else", status: "RUNNING" }));

    await expect(assertWithinRunLimits(db, "user_1")).resolves.toBeUndefined();
  });

  it("throws LIMIT_EXCEEDED at the daily-run cap", async () => {
    const { db, store } = createFakeFirestore();
    const now = new Date().toISOString();
    store.set("analyses/ana_1/runs/run_1", run({ status: "SUCCEEDED", startedAt: now }));
    store.set("analyses/ana_1/runs/run_2", run({ status: "SUCCEEDED", startedAt: now }));
    store.set("analyses/ana_1/runs/run_3", run({ status: "SUCCEEDED", startedAt: now }));

    await expect(assertWithinRunLimits(db, "user_1")).rejects.toThrow(LimitExceededError);
  });

  it("ignores runs older than 24h for the daily cap", async () => {
    const { db, store } = createFakeFirestore();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    store.set("analyses/ana_1/runs/run_1", run({ status: "SUCCEEDED", startedAt: twoDaysAgo }));
    store.set("analyses/ana_1/runs/run_2", run({ status: "SUCCEEDED", startedAt: twoDaysAgo }));
    store.set("analyses/ana_1/runs/run_3", run({ status: "SUCCEEDED", startedAt: twoDaysAgo }));

    await expect(assertWithinRunLimits(db, "user_1")).resolves.toBeUndefined();
  });

  it("ignores documents in unrelated collections via the parent-name match", async () => {
    const { db, store } = createFakeFirestore();
    store.set("analyses/ana_1/sources/src_1", { ownerId: "user_1", status: "RUNNING" });
    await expect(assertWithinRunLimits(db, "user_1")).resolves.toBeUndefined();
  });
});
