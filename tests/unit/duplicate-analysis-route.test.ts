import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis, loopwellSources } from "@/demo/loopwell";
import type { Source } from "@/lib/schema/evidence";

const UPLOAD_PATH = `uploads/${loopwellAnalysis.ownerId}/${loopwellAnalysis.id}/src_deck/deck.pdf`;

const testSources: Source[] = [
  { ...loopwellSources[0]!, origin: "UPLOAD", status: "PARSED", storagePath: UPLOAD_PATH },
  { ...loopwellSources[1]!, status: "PARSED" },
  {
    id: "src_00000000000000000000000099",
    analysisId: loopwellAnalysis.id,
    type: "WEBSITE",
    origin: "URL",
    title: "a broken link",
    status: "FAILED",
    reliability: "FIRST_PARTY",
    error: { code: "FETCH_FAILED", message: "nope" },
    addedAt: new Date().toISOString(),
  },
];

const requireUser = vi.fn();
const analysisGet = vi.fn();
const analysisCreate = vi.fn();
const sourceList = vi.fn();
const sourceListEvidence = vi.fn();
const sourceCreate = vi.fn();
const recordActivity = vi.fn();
const bucketFileCopy = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/activity", () => ({ recordActivity: (...args: unknown[]) => recordActivity(...args) }));

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    get = analysisGet;
    create = analysisCreate;
  },
}));

vi.mock("@/lib/repos/source-repo", () => ({
  SourceRepo: class {
    list = sourceList;
    listEvidence = sourceListEvidence;
    create = sourceCreate;
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorageBucket: () => ({
    file: (path: string) => ({ copy: (dest: { toString(): string }) => bucketFileCopy(path, dest) }),
  }),
}));

const { POST } = await import("@/app/api/analyses/[id]/duplicate/route");

const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };

function context() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id }) };
}

function postRequest(origin: string | null = "http://localhost:3000"): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/duplicate`, {
    method: "POST",
    headers,
  });
}

describe("POST /api/analyses/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    sourceList.mockResolvedValue(testSources);
    sourceListEvidence.mockResolvedValue([]);
    analysisCreate.mockResolvedValue(undefined);
    sourceCreate.mockResolvedValue(undefined);
    bucketFileCopy.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(postRequest("https://evil.example"), context());
    expect(response.status).toBe(403);
    expect(analysisCreate).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await POST(postRequest(), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await POST(postRequest(), context());
    expect(response.status).toBe(403);
    expect(analysisCreate).not.toHaveBeenCalled();
  });

  it("creates a fresh draft analysis with a (copy) name suffix and no run history", async () => {
    const response = await POST(postRequest(), context());

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.analysis.id).not.toBe(loopwellAnalysis.id);
    expect(body.analysis.startup.name).toBe(`${loopwellAnalysis.startup.name} (copy)`);
    expect(body.analysis.status).toBe("DRAFT");
    expect(body.analysis.latest).toBeNull();
    expect(body.analysis.currentRunId).toBeNull();
    expect(body.analysis.isWatchlisted).toBe(false);
    expect(body.analysis.tags).toEqual([]);
    expect(analysisCreate).toHaveBeenCalledOnce();
  });

  it("only copies parsed sources, each under the new analysis id, skipping the failed one", async () => {
    await POST(postRequest(), context());

    expect(sourceCreate).toHaveBeenCalledTimes(2);
    for (const [source] of sourceCreate.mock.calls) {
      expect(source.analysisId).not.toBe(loopwellAnalysis.id);
      expect(source.status).toBe("PARSED");
    }
  });

  it("copies an upload source's Storage object to a path under the new analysis", async () => {
    await POST(postRequest(), context());

    expect(bucketFileCopy).toHaveBeenCalledWith(UPLOAD_PATH, expect.anything());
  });

  it("records an ANALYSIS_CREATED activity entry naming both startups", async () => {
    await POST(postRequest(), context());
    expect(recordActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ownerId: OWNER.uid,
        type: "ANALYSIS_CREATED",
        message: expect.stringContaining(loopwellAnalysis.startup.name),
      }),
    );
  });
});
