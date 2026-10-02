import { describe, expect, it, vi } from "vitest";

import { LimitExceededError } from "@/lib/api/errors";

import { createFakeFirestore } from "../helpers/fake-firestore";

vi.mock("@/lib/env", () => ({
  env: { MAX_CONCURRENT_RUNS: 2, DAILY_ANALYSIS_LIMIT: 3, LOG_LEVEL: "silent", NODE_ENV: "test" },
}));

const { assertWithinRunLimits, getRunUsage, listRecentRuns } = await import("@/lib/analysis/run-limits");

function run(overrides: Partial<{ ownerId: string; status: string; startedAt: string }>) {
  return {
    ownerId: "user_1",
    status: "SUCCEEDED",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

const USAGE = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 };

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

describe("getRunUsage (T-5.13)", () => {
  it("returns the same real running/daily counts assertWithinRunLimits checks against", async () => {
    const { db, store } = createFakeFirestore();
    const now = new Date().toISOString();
    store.set("analyses/ana_1/runs/run_1", run({ status: "RUNNING", startedAt: now }));
    store.set("analyses/ana_1/runs/run_2", run({ status: "SUCCEEDED", startedAt: now }));

    await expect(getRunUsage(db, "user_1")).resolves.toEqual({ runningCount: 1, dailyCount: 2 });
  });
});

describe("listRecentRuns (T-6.08)", () => {
  it("returns the owner's own runs, newest first, with duration/cost fields", async () => {
    const { db, store } = createFakeFirestore();
    const older = new Date(Date.now() - 60_000).toISOString();
    const newer = new Date().toISOString();
    store.set("analyses/ana_1/runs/run_old", {
      ...run({ status: "SUCCEEDED", startedAt: older }),
      id: "run_00000000000000000000000001",
      analysisId: "ana_00000000000000000000000001",
      finishedAt: older,
      usage: USAGE,
    });
    store.set("analyses/ana_1/runs/run_new", {
      ...run({ status: "FAILED", startedAt: newer }),
      id: "run_00000000000000000000000002",
      analysisId: "ana_00000000000000000000000001",
      finishedAt: newer,
      usage: USAGE,
    });

    const result = await listRecentRuns(db, "user_1");
    expect(result.map((r) => r.id)).toEqual([
      "run_00000000000000000000000002",
      "run_00000000000000000000000001",
    ]);
    expect(result[0]?.usage.estimatedCostUsd).toBe(0.001);
  });

  it("ignores another owner's runs", async () => {
    const { db, store } = createFakeFirestore();
    store.set("analyses/ana_1/runs/run_1", {
      ...run({ ownerId: "someone-else" }),
      id: "run_00000000000000000000000001",
      analysisId: "ana_00000000000000000000000001",
      usage: USAGE,
    });

    await expect(listRecentRuns(db, "user_1")).resolves.toEqual([]);
  });
});
