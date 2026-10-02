import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getRunUsage = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

const { UnauthenticatedError } = await import("@/lib/api/errors");

vi.mock("@/lib/analysis/run-limits", () => ({
  getRunUsage: (...args: unknown[]) => getRunUsage(...args),
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

    const response = await GET();
    const body = (await response.json()) as Record<string, number>;

    expect(response.status).toBe(200);
    expect(body.runningCount).toBe(1);
    expect(body.dailyCount).toBe(3);
    expect(typeof body.maxConcurrentRuns).toBe("number");
    expect(typeof body.dailyAnalysisLimit).toBe("number");
    expect(getRunUsage).toHaveBeenCalledWith({}, "user_1");
  });
});
