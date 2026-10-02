import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";
import type { Analysis } from "@/lib/schema/analysis";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const reportGetReport = vi.fn();
const comparisonCreate = vi.fn();
const comparisonListByOwner = vi.fn();
const recordActivity = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/activity", () => ({ recordActivity: (...args: unknown[]) => recordActivity(...args) }));

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    get = analysisGet;
  },
}));

vi.mock("@/lib/repos/report-repo", () => ({
  ReportRepo: class {
    getReport = reportGetReport;
  },
}));

vi.mock("@/lib/repos/comparison-repo", () => ({
  ComparisonRepo: class {
    create = comparisonCreate;
    listByOwner = comparisonListByOwner;
  },
}));

const { POST, GET } = await import("@/app/api/comparisons/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };

const OTHER_ANALYSIS: Analysis = {
  ...loopwellAnalysis,
  id: "ana_00000000000000000000000002",
  startup: { ...loopwellAnalysis.startup, name: "Another Startup" },
};

function postRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request("http://localhost:3000/api/comparisons", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockImplementation((id: string) =>
      Promise.resolve(id === loopwellAnalysis.id ? loopwellAnalysis : OTHER_ANALYSIS),
    );
    reportGetReport.mockResolvedValue({ scoringVersion: "2026.1" });
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(
      postRequest({ name: "Compare", analysisIds: [loopwellAnalysis.id, OTHER_ANALYSIS.id] }, "https://evil.example"),
    );
    expect(response.status).toBe(403);
    expect(comparisonCreate).not.toHaveBeenCalled();
  });

  it("rejects fewer than two analyses", async () => {
    const response = await POST(postRequest({ name: "Compare", analysisIds: [loopwellAnalysis.id] }));
    expect(response.status).toBe(400);
    expect(comparisonCreate).not.toHaveBeenCalled();
  });

  it("rejects more than four analyses", async () => {
    const response = await POST(
      postRequest({
        name: "Compare",
        analysisIds: ["ana_00000000000000000000000001", "ana_00000000000000000000000002", "ana_00000000000000000000000003", "ana_00000000000000000000000004", "ana_00000000000000000000000005"],
      }),
    );
    expect(response.status).toBe(400);
    expect(comparisonCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate analysis ids", async () => {
    const response = await POST(
      postRequest({ name: "Compare", analysisIds: [loopwellAnalysis.id, loopwellAnalysis.id] }),
    );
    expect(response.status).toBe(400);
    expect(comparisonCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when an analysis isn't owned by the caller", async () => {
    analysisGet.mockImplementation((id: string) =>
      Promise.resolve(id === loopwellAnalysis.id ? loopwellAnalysis : { ...OTHER_ANALYSIS, ownerId: "someone-else" }),
    );
    const response = await POST(
      postRequest({ name: "Compare", analysisIds: [loopwellAnalysis.id, OTHER_ANALYSIS.id] }),
    );
    expect(response.status).toBe(404);
    expect(comparisonCreate).not.toHaveBeenCalled();
  });

  it("rejects an analysis with no completed report", async () => {
    analysisGet.mockImplementation((id: string) =>
      Promise.resolve(id === loopwellAnalysis.id ? loopwellAnalysis : { ...OTHER_ANALYSIS, latest: null }),
    );
    const response = await POST(
      postRequest({ name: "Compare", analysisIds: [loopwellAnalysis.id, OTHER_ANALYSIS.id] }),
    );
    expect(response.status).toBe(400);
    expect(comparisonCreate).not.toHaveBeenCalled();
  });

  it("creates a comparison from 2-4 analyses and returns it", async () => {
    const response = await POST(
      postRequest({ name: "Seed-stage fintech", analysisIds: [loopwellAnalysis.id, OTHER_ANALYSIS.id] }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.comparison.name).toBe("Seed-stage fintech");
    expect(body.comparison.ownerId).toBe(OWNER.uid);
    expect(body.comparison.items).toHaveLength(2);
    expect(body.comparison.items[0]).toMatchObject({
      analysisId: loopwellAnalysis.id,
      label: loopwellAnalysis.startup.name,
      deleted: false,
    });
    expect(body.comparison.scoringVersions).toEqual(["2026.1"]);
    expect(comparisonCreate).toHaveBeenCalledOnce();
    expect(recordActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ownerId: OWNER.uid, type: "COMPARISON_CREATED" }),
    );
  });
});

describe("GET /api/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
  });

  it("lists the signed-in owner's comparisons", async () => {
    comparisonListByOwner.mockResolvedValue([{ id: "cmp_00000000000000000000000001" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comparisons).toEqual([{ id: "cmp_00000000000000000000000001" }]);
    expect(comparisonListByOwner).toHaveBeenCalledWith(OWNER.uid);
  });
});
