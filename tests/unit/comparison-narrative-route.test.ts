import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis, loopwellDimensions, loopwellFacts, loopwellReport } from "@/demo/loopwell";
import type { Comparison } from "@/lib/schema/comparison";

const requireUser = vi.fn();
const comparisonGet = vi.fn();
const comparisonUpdate = vi.fn();
const getReport = vi.fn();
const listDimensions = vi.fn();
const factList = vi.fn();
const runComparisonNarrative = vi.fn();
const createLlm = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/comparison-repo", () => ({
  ComparisonRepo: class {
    get = comparisonGet;
    update = comparisonUpdate;
  },
}));

vi.mock("@/lib/repos/report-repo", () => ({
  ReportRepo: class {
    getReport = getReport;
    listDimensions = listDimensions;
  },
}));

vi.mock("@/lib/repos/fact-repo", () => ({
  FactRepo: class {
    list = factList;
  },
}));

vi.mock("@/lib/analysis/steps/comparison-narrative", () => ({
  runComparisonNarrative: (...args: unknown[]) => runComparisonNarrative(...args),
}));

vi.mock("@/lib/ai/create-llm", () => ({ createLlm: () => createLlm() }));

const { POST } = await import("@/app/api/comparisons/[id]/narrative/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };
const COMPARISON_ID = "cmp_00000000000000000000000001";

const COMPARISON: Comparison = {
  id: COMPARISON_ID,
  ownerId: OWNER.uid,
  name: "Compare",
  items: [
    { analysisId: loopwellAnalysis.id, reportId: loopwellReport.id, label: "Loopwell", deleted: false },
    { analysisId: "ana_00000000000000000000000002", reportId: "rpt_00000000000000000000000002", label: "Other", deleted: false },
  ],
  scoringVersions: ["1.0.0"],
  createdAt: "2026-09-25T00:00:00.000Z",
};

function request(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/comparisons/${COMPARISON_ID}/narrative`, {
    method: "POST",
    headers,
  });
}

function context() {
  return { params: Promise.resolve({ id: COMPARISON_ID }) };
}

describe("POST /api/comparisons/[id]/narrative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    comparisonGet.mockResolvedValue(COMPARISON);
    getReport.mockResolvedValue(loopwellReport);
    listDimensions.mockResolvedValue(loopwellDimensions);
    factList.mockResolvedValue(loopwellFacts);
    runComparisonNarrative.mockResolvedValue({
      narrative: [{ id: "clm_00000000000000000000000099", status: "MISSING" }],
      droppedCount: 0,
      usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0 },
    });
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(request("https://evil.example"), context());
    expect(response.status).toBe(403);
    expect(runComparisonNarrative).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing comparison", async () => {
    comparisonGet.mockResolvedValue(null);
    const response = await POST(request(), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await POST(request(), context());
    expect(response.status).toBe(403);
    expect(runComparisonNarrative).not.toHaveBeenCalled();
  });

  it("rejects when fewer than two items have a loadable report", async () => {
    getReport.mockResolvedValueOnce(loopwellReport).mockResolvedValueOnce(null);
    const response = await POST(request(), context());
    expect(response.status).toBe(400);
    expect(runComparisonNarrative).not.toHaveBeenCalled();
  });

  it("generates and saves the narrative", async () => {
    const response = await POST(request(), context());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.narrative).toHaveLength(1);
    expect(comparisonUpdate).toHaveBeenCalledWith(COMPARISON_ID, { narrative: body.narrative });
  });
});
