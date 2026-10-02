import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getRunUsage = vi.fn();
const listRecentRuns = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

const { UnauthenticatedError } = await import("@/lib/api/errors");

vi.mock("@/lib/analysis/run-limits", () => ({
  getRunUsage: (...args: unknown[]) => getRunUsage(...args),
  listRecentRuns: (...args: unknown[]) => listRecentRuns(...args),
}));

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

const { GET } = await import("@/app/api/usage/route");

describe("GET /api/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not signed in", async () => {
    requireUser.mockRejectedValue(new UnauthenticatedError());
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the real running/daily counts alongside the configured limits", async () => {
    requireUser.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });
    getRunUsage.mockResolvedValue({ runningCount: 1, dailyCount: 3 });
    listRecentRuns.mockResolvedValue([]);

    const response = await GET();
    const body = (await response.json()) as Record<string, number>;

    expect(response.status).toBe(200);
    expect(body.runningCount).toBe(1);
    expect(body.dailyCount).toBe(3);
    expect(typeof body.maxConcurrentRuns).toBe("number");
    expect(typeof body.dailyAnalysisLimit).toBe("number");
    expect(getRunUsage).toHaveBeenCalledWith({}, "user_1");
  });

  it("includes the owner's recent runs for the T-6.08 run/cost dashboard", async () => {
    requireUser.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });
    getRunUsage.mockResolvedValue({ runningCount: 0, dailyCount: 1 });
    const recentRuns = [
      {
        id: "run_00000000000000000000000001",
        analysisId: "ana_00000000000000000000000001",
        status: "DONE",
        startedAt: "2026-10-02T00:00:00.000Z",
        finishedAt: "2026-10-02T00:00:05.000Z",
        usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.01 },
      },
    ];
    listRecentRuns.mockResolvedValue(recentRuns);

    const response = await GET();
    const body = (await response.json()) as { recentRuns: unknown };

    expect(response.status).toBe(200);
    expect(body.recentRuns).toEqual(recentRuns);
    expect(listRecentRuns).toHaveBeenCalledWith({}, "user_1");
  });
});
