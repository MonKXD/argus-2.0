import { beforeEach, describe, expect, it, vi } from "vitest";

const listWatchlisted = vi.fn();
const detectSignalsForAnalysis = vi.fn();
const createLlm = vi.fn();
const createAnthropicResearchProvider = vi.fn();

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    listWatchlisted = listWatchlisted;
  },
}));

vi.mock("@/lib/analysis/steps/detect-signals", () => ({
  detectSignalsForAnalysis: (...args: unknown[]) => detectSignalsForAnalysis(...args),
}));

vi.mock("@/lib/ai/create-llm", () => ({ createLlm: () => createLlm() }));
vi.mock("@/lib/analysis/research/anthropic-research-provider", () => ({
  createAnthropicResearchProvider: () => createAnthropicResearchProvider(),
}));

vi.mock("@/lib/env", () => ({
  env: { CRON_SECRET: "test-secret", FEATURE_MONITORING: true, LOG_LEVEL: "silent", NODE_ENV: "test" },
}));

const { GET } = await import("@/app/api/cron/signals/route");

function request(authHeader: string | null): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost:3000/api/cron/signals", { headers });
}

describe("GET /api/cron/signals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWatchlisted.mockResolvedValue([]);
    detectSignalsForAnalysis.mockResolvedValue({ signalsCreated: 0 });
  });

  it("rejects a request with no Authorization header", async () => {
    const response = await GET(request(null));
    expect(response.status).toBe(401);
    expect(listWatchlisted).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong bearer token", async () => {
    const response = await GET(request("Bearer wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("processes every watchlisted analysis, isolating one failure from the rest", async () => {
    listWatchlisted.mockResolvedValue([
      { id: "ana_1", ownerId: "user_1" },
      { id: "ana_2", ownerId: "user_2" },
    ]);
    detectSignalsForAnalysis.mockResolvedValueOnce({ signalsCreated: 1 }).mockRejectedValueOnce(new Error("boom"));

    const response = await GET(request("Bearer test-secret"));
    const body = (await response.json()) as { processed: number; succeeded: number; failed: number };

    expect(response.status).toBe(200);
    expect(body).toEqual({ processed: 2, succeeded: 1, failed: 1 });
  });
});
