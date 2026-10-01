import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";
import type { Comparison } from "@/lib/schema/comparison";

const requireUser = vi.fn();
const comparisonGet = vi.fn();
const comparisonDelete = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/comparison-repo", () => ({
  ComparisonRepo: class {
    get = comparisonGet;
    delete = comparisonDelete;
  },
}));

const { GET, DELETE } = await import("@/app/api/comparisons/[id]/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };
const COMPARISON_ID = "cmp_00000000000000000000000001";

const COMPARISON: Comparison = {
  id: COMPARISON_ID,
  ownerId: OWNER.uid,
  name: "Seed-stage fintech",
  items: [
    { analysisId: loopwellAnalysis.id, reportId: "rpt_00000000000000000000000001", label: "Loopwell", deleted: false },
    { analysisId: "ana_00000000000000000000000002", reportId: "rpt_00000000000000000000000002", label: "Other", deleted: false },
  ],
  scoringVersions: ["2026.1"],
  createdAt: "2026-09-25T00:00:00.000Z",
};

function context(id = COMPARISON_ID) {
  return { params: Promise.resolve({ id }) };
}

function deleteRequest(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/comparisons/${COMPARISON_ID}`, {
    method: "DELETE",
    headers,
  });
}

describe("GET /api/comparisons/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    comparisonGet.mockResolvedValue(COMPARISON);
  });

  it("returns 404 for a missing comparison", async () => {
    comparisonGet.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost:3000/api/comparisons/" + COMPARISON_ID), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await GET(new Request("http://localhost:3000/api/comparisons/" + COMPARISON_ID), context());
    expect(response.status).toBe(403);
  });

  it("returns the comparison for its owner", async () => {
    const response = await GET(new Request("http://localhost:3000/api/comparisons/" + COMPARISON_ID), context());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comparison).toEqual(COMPARISON);
  });
});

describe("DELETE /api/comparisons/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    comparisonGet.mockResolvedValue(COMPARISON);
  });

  it("rejects a request from a different origin", async () => {
    const response = await DELETE(deleteRequest("https://evil.example"), context());
    expect(response.status).toBe(403);
    expect(comparisonDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing comparison", async () => {
    comparisonGet.mockResolvedValue(null);
    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(comparisonDelete).not.toHaveBeenCalled();
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(403);
    expect(comparisonDelete).not.toHaveBeenCalled();
  });

  it("deletes the comparison for its owner", async () => {
    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(204);
    expect(comparisonDelete).toHaveBeenCalledWith(COMPARISON_ID);
  });
});
