import { beforeEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.fn();
const registerRun = vi.fn();
const unregisterRun = vi.fn();
const executeRun = vi.fn();
const publishRunStep = vi.fn();

vi.mock("@/lib/analysis/run-pipeline", () => ({ executeRun: (...args: unknown[]) => executeRun(...args) }));
vi.mock("@/lib/analysis/run-registry", () => ({
  registerRun: (...args: unknown[]) => registerRun(...args),
  unregisterRun: (...args: unknown[]) => unregisterRun(...args),
}));
vi.mock("@/lib/queue/qstash-client", () => ({
  publishRunStep: (...args: unknown[]) => publishRunStep(...args),
}));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => unknown) => afterMock(cb) };
});

let orchestrationMode: "inline" | "queue" = "inline";
vi.mock("@/lib/env", () => ({
  get env() {
    return { ORCHESTRATION_MODE: orchestrationMode, APP_URL: "http://localhost:3000", LOG_LEVEL: "silent" };
  },
}));

const { triggerRun } = await import("@/lib/api/trigger-run");

describe("triggerRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orchestrationMode = "inline";
  });

  it("inline mode: registers the run and schedules executeRun via after()", async () => {
    registerRun.mockReturnValue(new AbortController());
    await triggerRun({} as never, { analysisId: "ana_1", runId: "run_1" });

    expect(registerRun).toHaveBeenCalledWith("run_1");
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(publishRunStep).not.toHaveBeenCalled();
  });

  it("queue mode: publishes a run-step message instead of using after()", async () => {
    orchestrationMode = "queue";
    await triggerRun({} as never, { analysisId: "ana_1", runId: "run_1" });

    expect(publishRunStep).toHaveBeenCalledWith({ analysisId: "ana_1", runId: "run_1" });
    expect(afterMock).not.toHaveBeenCalled();
    expect(registerRun).not.toHaveBeenCalled();
  });
});
