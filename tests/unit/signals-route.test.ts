import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listByOwner = vi.fn();
const listByAnalysis = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

const { UnauthenticatedError } = await import("@/lib/api/errors");

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    listByOwner = listByOwner;
  },
}));

vi.mock("@/lib/repos/signal-repo", () => ({
  SignalRepo: class {
    listByAnalysis = listByAnalysis;
  },
}));

const { GET } = await import("@/app/api/signals/route");

describe("GET /api/signals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not signed in", async () => {
    requireUser.mockRejectedValue(new UnauthenticatedError());
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("flattens signals across the owner's watchlisted analyses, newest first, capped and labelled with the company name", async () => {
    requireUser.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });
    listByOwner.mockResolvedValue([
      { id: "ana_1", isWatchlisted: true, startup: { name: "Testco" } },
      { id: "ana_2", isWatchlisted: false, startup: { name: "Skipco" } },
    ]);
    listByAnalysis.mockImplementation((analysisId: string) =>
      analysisId === "ana_1"
        ? Promise.resolve([
            { id: "sig_1", analysisId: "ana_1", retrievedAt: "2026-01-01T00:00:00.000Z" },
            { id: "sig_2", analysisId: "ana_1", retrievedAt: "2026-02-01T00:00:00.000Z" },
          ])
        : Promise.resolve([]),
    );

    const response = await GET();
    const body = (await response.json()) as { signals: Array<{ id: string; companyName: string }> };

    expect(response.status).toBe(200);
    expect(listByAnalysis).toHaveBeenCalledTimes(1);
    expect(listByAnalysis).toHaveBeenCalledWith("ana_1");
    expect(body.signals.map((s) => s.id)).toEqual(["sig_2", "sig_1"]);
    expect(body.signals[0]!.companyName).toBe("Testco");
  });
});
