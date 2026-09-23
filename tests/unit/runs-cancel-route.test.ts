import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const runDocGet = vi.fn();
const runDocSet = vi.fn();
const abortRun = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    get = analysisGet;
  },
}));

vi.mock("@/lib/repos/converter", () => ({ zodConverter: () => undefined }));

vi.mock("@/lib/repos/admin-firestore", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({ withConverter: () => ({ get: runDocGet, set: runDocSet }) }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/analysis/run-registry", () => ({ abortRun: (...args: unknown[]) => abortRun(...args) }));

const { POST } = await import("@/app/api/analyses/[id]/runs/[runId]/cancel/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const RUN_ID = "run_00000000000000000000000001";

function context() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id, runId: RUN_ID }) };
}

function postRequest(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/runs/${RUN_ID}/cancel`, {
    method: "POST",
    headers,
  });
}

describe("POST /api/analyses/[id]/runs/[runId]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    runDocSet.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(postRequest("https://evil.example"), context());
    expect(response.status).toBe(403);
  });

  it("returns 404 when the run doesn't exist", async () => {
    runDocGet.mockResolvedValue({ exists: false });
    const response = await POST(postRequest(), context());
    expect(response.status).toBe(404);
  });

  it("sets cancelRequested and aborts the in-process controller for a RUNNING run", async () => {
    runDocGet.mockResolvedValue({ exists: true, data: () => ({ status: "RUNNING" }) });
    abortRun.mockReturnValue(true);

    const response = await POST(postRequest(), context());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.aborted).toBe(true);
    expect(runDocSet).toHaveBeenCalledWith({ cancelRequested: true }, { merge: true });
    expect(abortRun).toHaveBeenCalledWith(RUN_ID);
  });

  it("is a no-op for an already-terminal run", async () => {
    runDocGet.mockResolvedValue({ exists: true, data: () => ({ status: "SUCCEEDED" }) });

    const response = await POST(postRequest(), context());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.aborted).toBe(false);
    expect(runDocSet).not.toHaveBeenCalled();
    expect(abortRun).not.toHaveBeenCalled();
  });
});
