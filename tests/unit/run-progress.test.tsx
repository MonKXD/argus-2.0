import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RunProgress } from "@/components/argus/run-progress";
import type { StepState } from "@/lib/schema/run";

const useRunProgress = vi.fn();
vi.mock("@/hooks/use-run-progress", () => ({
  useRunProgress: (...args: unknown[]) => useRunProgress(...args),
}));

const PENDING: StepState = { status: "PENDING", attempt: 0 };
const DONE: StepState = { status: "DONE", attempt: 1 };

function buildRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run_1",
    analysisId: "ana_1",
    ownerId: "user_1",
    status: "RUNNING",
    options: { webResearch: true },
    steps: {
      INGEST: DONE,
      EXTRACT_FACTS: PENDING,
      RESEARCH: PENDING,
      CONSISTENCY: PENDING,
      ANALYZE: PENDING,
      SCORE: PENDING,
      SYNTHESIZE: PENDING,
      VERIFY: PENDING,
      FINALIZE: PENDING,
    },
    cancelRequested: false,
    ...overrides,
  };
}

describe("RunProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading message while the listener hasn't resolved yet", () => {
    useRunProgress.mockReturnValue({ run: null, loading: true, error: null });
    render(<RunProgress analysisId="ana_1" runId="run_1" />);
    expect(screen.getByText(/loading run progress/i)).toBeInTheDocument();
  });

  it("shows an error when the run can't be read", () => {
    useRunProgress.mockReturnValue({ run: null, loading: false, error: "This run could not be found." });
    render(<RunProgress analysisId="ana_1" runId="run_1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("This run could not be found.");
  });

  it("shows the running status, the step list and a Cancel button while active", () => {
    useRunProgress.mockReturnValue({ run: buildRun(), loading: false, error: null });
    const { container } = render(<RunProgress analysisId="ana_1" runId="run_1" />);

    expect(screen.getByText("Analysing your sources.")).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    // EXTRACT_FACTS is the first PENDING step in execution order, so it
    // reads as the one actually running (a spinning glyph) even though
    // the Run document itself never marks a step RUNNING.
    expect(container.querySelectorAll(".animate-spin")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cancel run" })).toBeEnabled();
  });

  it("shows no Cancel button and no running glyph once the run is terminal", () => {
    useRunProgress.mockReturnValue({
      run: buildRun({
        status: "SUCCEEDED",
        steps: { ...buildRun().steps, EXTRACT_FACTS: DONE, ANALYZE: DONE, SCORE: DONE, SYNTHESIZE: DONE, VERIFY: DONE, FINALIZE: DONE },
      }),
      loading: false,
      error: null,
    });
    const { container } = render(<RunProgress analysisId="ana_1" runId="run_1" />);

    expect(screen.getByText("Analysis complete.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel run" })).not.toBeInTheDocument();
    // RESEARCH is unimplemented (D-054) and stays PENDING forever in the
    // stored document; once the run is terminal it should read as SKIPPED,
    // not as a perpetually-running or perpetually-upcoming step.
    expect(container.querySelectorAll(".animate-spin")).toHaveLength(0);
  });

  it("shows the run's own error message when FAILED", () => {
    useRunProgress.mockReturnValue({
      run: buildRun({ status: "FAILED", error: { code: "RUN_FAILED", message: "The run failed. Try again." } }),
      loading: false,
      error: null,
    });
    render(<RunProgress analysisId="ana_1" runId="run_1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("The run failed. Try again.");
  });

  it("posts to the cancel endpoint when Cancel run is clicked", async () => {
    useRunProgress.mockReturnValue({ run: buildRun(), loading: false, error: null });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "RUNNING" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<RunProgress analysisId="ana_1" runId="run_1" />);
    await user.click(screen.getByRole("button", { name: "Cancel run" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1/runs/run_1/cancel", { method: "POST" });

    vi.unstubAllGlobals();
  });

  it("shows an error when cancelling fails", async () => {
    useRunProgress.mockReturnValue({ run: buildRun(), loading: false, error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    const user = userEvent.setup();

    render(<RunProgress analysisId="ana_1" runId="run_1" />);
    await user.click(screen.getByRole("button", { name: "Cancel run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't cancel this run.");

    vi.unstubAllGlobals();
  });
});
