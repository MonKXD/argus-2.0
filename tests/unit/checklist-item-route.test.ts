import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis, loopwellChecklist, loopwellReport } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const updateChecklistItem = vi.fn();

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
    updateChecklistItem = updateChecklistItem;
  },
}));

const { PATCH } = await import(
  "@/app/api/analyses/[id]/reports/[reportId]/checklist/[itemId]/route"
);

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };
const ITEM = loopwellChecklist[0]!;

function context(itemId = ITEM.id) {
  return { params: Promise.resolve({ id: loopwellAnalysis.id, reportId: loopwellReport.id, itemId }) };
}

function patchRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request(
    `http://localhost:3000/api/analyses/${loopwellAnalysis.id}/reports/${loopwellReport.id}/checklist/${ITEM.id}`,
    { method: "PATCH", headers, body: JSON.stringify(body) },
  );
}

describe("PATCH /api/analyses/[id]/reports/[reportId]/checklist/[itemId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
  });

  it("rejects a request from a different origin", async () => {
    const response = await PATCH(patchRequest({ status: "RECEIVED" }, "https://evil.example"), context());
    expect(response.status).toBe(403);
    expect(updateChecklistItem).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await PATCH(patchRequest({ status: "RECEIVED" }), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await PATCH(patchRequest({ status: "RECEIVED" }), context());
    expect(response.status).toBe(403);
    expect(updateChecklistItem).not.toHaveBeenCalled();
  });

  it("rejects an empty patch body", async () => {
    const response = await PATCH(patchRequest({}), context());
    expect(response.status).toBe(400);
    expect(updateChecklistItem).not.toHaveBeenCalled();
  });

  it("rejects an invalid status value", async () => {
    const response = await PATCH(patchRequest({ status: "DONE" }), context());
    expect(response.status).toBe(400);
    expect(updateChecklistItem).not.toHaveBeenCalled();
  });

  it("returns 404 when the checklist item doesn't exist", async () => {
    updateChecklistItem.mockResolvedValue(null);
    const response = await PATCH(patchRequest({ status: "RECEIVED" }), context());
    expect(response.status).toBe(404);
  });

  it("updates the status and returns the updated item", async () => {
    const updated = { ...ITEM, status: "RECEIVED" as const };
    updateChecklistItem.mockResolvedValue(updated);

    const response = await PATCH(patchRequest({ status: "RECEIVED" }), context());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.item).toEqual(updated);
    expect(updateChecklistItem).toHaveBeenCalledWith(
      loopwellAnalysis.id,
      loopwellReport.id,
      ITEM.id,
      { status: "RECEIVED" },
    );
  });

  it("updates a note without touching status", async () => {
    const updated = { ...ITEM, userNote: "Waiting on the founder." };
    updateChecklistItem.mockResolvedValue(updated);

    const response = await PATCH(patchRequest({ userNote: "Waiting on the founder." }), context());

    expect(response.status).toBe(200);
    expect(updateChecklistItem).toHaveBeenCalledWith(
      loopwellAnalysis.id,
      loopwellReport.id,
      ITEM.id,
      { userNote: "Waiting on the founder." },
    );
  });
});
