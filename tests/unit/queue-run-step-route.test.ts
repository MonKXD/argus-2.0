import { beforeEach, describe, expect, it, vi } from "vitest";

const executeRunChunk = vi.fn();
const publishRunStep = vi.fn();
const verify = vi.fn();

vi.mock("@/lib/analysis/run-pipeline-queue", () => ({
  executeRunChunk: (...args: unknown[]) => executeRunChunk(...args),
}));
vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));
vi.mock("@/lib/queue/qstash-client", () => ({
  publishRunStep: (...args: unknown[]) => publishRunStep(...args),
  getQstashReceiver: () => ({ verify: (...args: unknown[]) => verify(...args) }),
}));
vi.mock("@/lib/env", () => ({
  env: { APP_URL: "http://localhost:3000", LOG_LEVEL: "silent", NODE_ENV: "test" },
}));

const { POST } = await import("@/app/api/queue/run-step/route");

function request(body: unknown, signature: string | null = "sig"): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("upstash-signature", signature);
  return new Request("http://localhost:3000/api/queue/run-step", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/queue/run-step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a request with no upstash-signature header", async () => {
    const response = await POST(request({ analysisId: "ana_1", runId: "run_1" }, null));
    expect(response.status).toBe(401);
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects a request whose signature fails verification", async () => {
    verify.mockResolvedValue(false);
    const response = await POST(request({ analysisId: "ana_1", runId: "run_1" }));
    expect(response.status).toBe(401);
    expect(executeRunChunk).not.toHaveBeenCalled();
  });

  it("runs the chunk and publishes a continuation when not done", async () => {
    verify.mockResolvedValue(true);
    executeRunChunk.mockResolvedValue({ done: false });

    const response = await POST(request({ analysisId: "ana_1", runId: "run_1" }));
    const body = (await response.json()) as { done: boolean };

    expect(response.status).toBe(200);
    expect(body.done).toBe(false);
    expect(executeRunChunk).toHaveBeenCalledWith({}, expect.objectContaining({ analysisId: "ana_1", runId: "run_1" }));
    expect(publishRunStep).toHaveBeenCalledWith({ analysisId: "ana_1", runId: "run_1" });
  });

  it("does not publish a continuation once the run is done", async () => {
    verify.mockResolvedValue(true);
    executeRunChunk.mockResolvedValue({ done: true });

    const response = await POST(request({ analysisId: "ana_1", runId: "run_1" }));

    expect(response.status).toBe(200);
    expect(publishRunStep).not.toHaveBeenCalled();
  });
});
