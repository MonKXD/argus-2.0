import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const analysisUpdate = vi.fn();
const runDocGet = vi.fn();
const runDocSet = vi.fn();
const assertLimits = vi.fn();
const afterMock = vi.fn();
const registerRun = vi.fn();
const unregisterRun = vi.fn();
const executeRun = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    get = analysisGet;
    update = analysisUpdate;
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

vi.mock("@/lib/analysis/run-limits", () => ({ assertWithinRunLimits: (...args: unknown[]) => assertLimits(...args) }));
vi.mock("@/lib/analysis/run-pipeline", () => ({ executeRun: (...args: unknown[]) => executeRun(...args) }));
vi.mock("@/lib/analysis/run-registry", () => ({
  registerRun: (...args: unknown[]) => registerRun(...args),
  unregisterRun: (...args: unknown[]) => unregisterRun(...args),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => afterMock(cb) };
});

const { POST } = await import("@/app/api/analyses/[id]/runs/[runId]/resume/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const RUN_ID = "run_00000000000000000000000001";

function context() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id, runId: RUN_ID }) };
}

function postRequest(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/runs/${RUN_ID}/resume`, {
    method: "POST",
    headers,
  });
}

describe("POST /api/analyses/[id]/runs/[runId]/resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    analysisUpdate.mockResolvedValue(undefined);
    runDocSet.mockResolvedValue(undefined);
    assertLimits.mockResolvedValue(undefined);
    registerRun.mockReturnValue(new AbortController());
    executeRun.mockResolvedValue(undefined);
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

  it("returns 409 CONFLICT when the run is still RUNNING", async () => {
    runDocGet.mockResolvedValue({ exists: true, data: () => ({ status: "RUNNING" }) });
    const response = await POST(postRequest(), context());
    expect(response.status).toBe(409);
    expect(runDocSet).not.toHaveBeenCalled();
  });

  it("returns 409 CONFLICT when the run already succeeded", async () => {
    runDocGet.mockResolvedValue({ exists: true, data: () => ({ status: "SUCCEEDED" }) });
    const response = await POST(postRequest(), context());
    expect(response.status).toBe(409);
  });

  it("resets the run and re-schedules execution for a FAILED run", async () => {
    runDocGet.mockResolvedValue({ exists: true, data: () => ({ status: "FAILED" }) });

    const response = await POST(postRequest(), context());

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.runId).toBe(RUN_ID);
    expect(runDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "RUNNING", cancelRequested: false }),
      { merge: true },
    );
    expect(analysisUpdate).toHaveBeenCalledWith(
      loopwellAnalysis.id,
      expect.objectContaining({ status: "PROCESSING", currentRunId: RUN_ID }),
    );
    expect(registerRun).toHaveBeenCalledWith(RUN_ID);
    expect(afterMock).toHaveBeenCalledTimes(1);
  });

  it("allows resuming a PARTIAL or CANCELLED run", async () => {
    for (const status of ["PARTIAL", "CANCELLED"]) {
      vi.clearAllMocks();
      requireUser.mockResolvedValue(OWNER);
      analysisGet.mockResolvedValue(loopwellAnalysis);
      analysisUpdate.mockResolvedValue(undefined);
      runDocSet.mockResolvedValue(undefined);
      assertLimits.mockResolvedValue(undefined);
      registerRun.mockReturnValue(new AbortController());
      runDocGet.mockResolvedValue({ exists: true, data: () => ({ status }) });

      const response = await POST(postRequest(), context());
      expect(response.status).toBe(202);
    }
  });

  it("returns 429 LIMIT_EXCEEDED when over the run limits", async () => {
    runDocGet.mockResolvedValue({ exists: true, data: () => ({ status: "FAILED" }) });
    const { LimitExceededError } = await import("@/lib/api/errors");
    assertLimits.mockRejectedValue(new LimitExceededError("too many runs"));

    const response = await POST(postRequest(), context());
    expect(response.status).toBe(429);
    expect(runDocSet).not.toHaveBeenCalled();
  });
});
