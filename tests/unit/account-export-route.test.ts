import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const buildAccountExportPayload = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/export/account-export-data", () => ({
  buildAccountExportPayload: (...args: unknown[]) => buildAccountExportPayload(...args),
}));

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));
vi.mock("@/lib/repos/analysis-repo", () => ({ AnalysisRepo: class {} }));
vi.mock("@/lib/repos/source-repo", () => ({ SourceRepo: class {} }));
vi.mock("@/lib/repos/report-repo", () => ({ ReportRepo: class {} }));
vi.mock("@/lib/repos/comparison-repo", () => ({ ComparisonRepo: class {} }));
vi.mock("@/lib/repos/activity-repo", () => ({ ActivityRepo: class {} }));
vi.mock("@/lib/repos/feedback-repo", () => ({ FeedbackRepo: class {} }));
vi.mock("@/lib/repos/note-repo", () => ({ NoteRepo: class {} }));

const { UnauthenticatedError } = await import("@/lib/api/errors");
const { GET } = await import("@/app/api/account/export/route");

describe("GET /api/account/export (T-6.12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not signed in", async () => {
    requireUser.mockRejectedValue(new UnauthenticatedError());
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("streams the owner's full data export as a downloadable JSON file", async () => {
    requireUser.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });
    const payload = { exportedAt: "2026-10-02T00:00:00.000Z", ownerId: "user_1", analyses: [], comparisons: [], activity: [], feedback: [] };
    buildAccountExportPayload.mockResolvedValue(payload);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(await response.json()).toEqual(payload);
    expect(buildAccountExportPayload).toHaveBeenCalledWith({}, "user_1", expect.any(Object));
  });
});
