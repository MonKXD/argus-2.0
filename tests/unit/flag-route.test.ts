import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis, loopwellFlags, loopwellReport } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const updateFlagStatus = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    get = analysisGet;
  },
}));

vi.mock("@/lib/repos/report-repo", () => ({
  ReportRepo: class {
    updateFlagStatus = updateFlagStatus;
  },
}));

const { PATCH } = await import("@/app/api/analyses/[id]/reports/[reportId]/flags/[flagId]/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };
const FLAG = loopwellFlags[0]!;

function context(flagId = FLAG.id) {
  return { params: Promise.resolve({ id: loopwellAnalysis.id, reportId: loopwellReport.id, flagId }) };
}

function patchRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request(
    `http://localhost:3000/api/analyses/${loopwellAnalysis.id}/reports/${loopwellReport.id}/flags/${FLAG.id}`,
    { method: "PATCH", headers, body: JSON.stringify(body) },
  );
}

describe("PATCH /api/analyses/[id]/reports/[reportId]/flags/[flagId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
  });

  it("rejects a request from a different origin", async () => {
    const response = await PATCH(
      patchRequest({ status: "ACKNOWLEDGED" }, "https://evil.example"),
      context(),
    );
    expect(response.status).toBe(403);
    expect(updateFlagStatus).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await PATCH(patchRequest({ status: "ACKNOWLEDGED" }), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await PATCH(patchRequest({ status: "ACKNOWLEDGED" }), context());
    expect(response.status).toBe(403);
    expect(updateFlagStatus).not.toHaveBeenCalled();
  });

  it("rejects a missing status", async () => {
    const response = await PATCH(patchRequest({}), context());
    expect(response.status).toBe(400);
    expect(updateFlagStatus).not.toHaveBeenCalled();
  });

  it("rejects an invalid status value", async () => {
    const response = await PATCH(patchRequest({ status: "IGNORED" }), context());
    expect(response.status).toBe(400);
    expect(updateFlagStatus).not.toHaveBeenCalled();
  });

  it("returns 404 when the flag doesn't exist", async () => {
    updateFlagStatus.mockResolvedValue(null);
    const response = await PATCH(patchRequest({ status: "ACKNOWLEDGED" }), context());
    expect(response.status).toBe(404);
  });

  it("acknowledges a flag and returns it", async () => {
    const updated = { ...FLAG, status: "ACKNOWLEDGED" as const };
    updateFlagStatus.mockResolvedValue(updated);

    const response = await PATCH(patchRequest({ status: "ACKNOWLEDGED" }), context());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.flag).toEqual(updated);
    expect(updateFlagStatus).toHaveBeenCalledWith(
      loopwellAnalysis.id,
      loopwellReport.id,
      FLAG.id,
      "ACKNOWLEDGED",
    );
  });

  it("dismisses a flag", async () => {
    const updated = { ...FLAG, status: "DISMISSED" as const };
    updateFlagStatus.mockResolvedValue(updated);

    const response = await PATCH(patchRequest({ status: "DISMISSED" }), context());

    expect(response.status).toBe(200);
    expect(updateFlagStatus).toHaveBeenCalledWith(
      loopwellAnalysis.id,
      loopwellReport.id,
      FLAG.id,
      "DISMISSED",
    );
  });
});
