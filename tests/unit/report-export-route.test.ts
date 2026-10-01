import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis, loopwellDimensions, loopwellReport, loopwellSources } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const getReport = vi.fn();
const listDimensions = vi.fn();
const sourceList = vi.fn();

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
    getReport = getReport;
    listDimensions = listDimensions;
  },
}));

vi.mock("@/lib/repos/source-repo", () => ({
  SourceRepo: class {
    list = sourceList;
  },
}));

const { GET } = await import("@/app/api/analyses/[id]/reports/[reportId]/export/route");

const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };

function request(format?: string): Request {
  const url = new URL(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/reports/${loopwellReport.id}/export`);
  if (format) url.searchParams.set("format", format);
  return new Request(url);
}

function context() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id, reportId: loopwellReport.id }) };
}

describe("GET /api/analyses/[id]/reports/[reportId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    getReport.mockResolvedValue(loopwellReport);
    listDimensions.mockResolvedValue(loopwellDimensions);
    sourceList.mockResolvedValue(loopwellSources);
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await GET(request(), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await GET(request(), context());
    expect(response.status).toBe(403);
  });

  it("returns 404 for a missing report", async () => {
    getReport.mockResolvedValue(null);
    const response = await GET(request(), context());
    expect(response.status).toBe(404);
  });

  it("rejects an invalid format", async () => {
    const response = await GET(request("pdf"), context());
    expect(response.status).toBe(400);
  });

  it("defaults to Markdown with a downloadable filename", async () => {
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain(".md");
    const body = await response.text();
    expect(body).toContain(loopwellAnalysis.startup.name);
  });

  it("returns JSON with the full export payload when format=json", async () => {
    const response = await GET(request("json"), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain(".json");
    const body = await response.json();
    expect(body.version).toBe(loopwellReport.version);
    expect(body.scoringVersion).toBe(loopwellReport.scoringVersion);
    expect(body.sources).toHaveLength(loopwellSources.length);
  });
});
