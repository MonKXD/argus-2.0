import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const assertLimits = vi.fn();
const afterMock = vi.fn();
const registerRun = vi.fn();
const unregisterRun = vi.fn();
const executeRun = vi.fn();
const analysisUpdate = vi.fn();

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

const idempotencyDocGet = vi.fn();
const idempotencyDocSet = vi.fn();
const runDocSet = vi.fn();

vi.mock("@/lib/repos/admin-firestore", () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: (name: string) =>
          name === "runIdempotency"
            ? { doc: () => ({ get: idempotencyDocGet, set: idempotencyDocSet }) }
            : {
                doc: () => ({
                  withConverter: () => ({ set: runDocSet }),
                }),
              },
      }),
    }),
  }),
}));

const { POST } = await import("@/app/api/analyses/[id]/runs/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };

function context() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id }) };
}

function postRequest(headers: Record<string, string> = {}): Request {
  const h = new Headers({ origin: APP_ORIGIN, ...headers });
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/runs`, {
    method: "POST",
    headers: h,
  });
}

describe("POST /api/analyses/[id]/runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    assertLimits.mockResolvedValue(undefined);
    idempotencyDocGet.mockResolvedValue({ exists: false });
    idempotencyDocSet.mockResolvedValue(undefined);
    runDocSet.mockResolvedValue(undefined);
    analysisUpdate.mockResolvedValue(undefined);
    registerRun.mockReturnValue(new AbortController());
    executeRun.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(postRequest({ origin: "https://evil.example" }), context());
    expect(response.status).toBe(403);
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
  });

  it("creates a run, marks the analysis PROCESSING, and schedules execution via after()", async () => {
    const response = await POST(postRequest(), context());

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.runId).toMatch(/^run_/);
    expect(runDocSet).toHaveBeenCalledTimes(1);
    expect(analysisUpdate).toHaveBeenCalledWith(
      loopwellAnalysis.id,
      expect.objectContaining({ status: "PROCESSING", currentRunId: body.runId }),
    );
    expect(registerRun).toHaveBeenCalledWith(body.runId);
    expect(afterMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 LIMIT_EXCEEDED when over the concurrency or daily cap", async () => {
    const { LimitExceededError } = await import("@/lib/api/errors");
    assertLimits.mockRejectedValue(new LimitExceededError("too many runs"));

    const response = await POST(postRequest(), context());
    expect(response.status).toBe(429);
    expect(runDocSet).not.toHaveBeenCalled();
  });

  it("returns the existing runId for a repeated Idempotency-Key without creating a new run", async () => {
    idempotencyDocGet.mockResolvedValue({ exists: true, data: () => ({ runId: "run_existing" }) });

    const response = await POST(postRequest({ "Idempotency-Key": "key-1" }), context());

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.runId).toBe("run_existing");
    expect(runDocSet).not.toHaveBeenCalled();
    expect(assertLimits).not.toHaveBeenCalled();
  });
});
