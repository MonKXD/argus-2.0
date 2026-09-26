import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LiveInProgressPanel } from "@/components/dashboard/live-in-progress-panel";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { demoAnalyses } from "@/demo";

const useRunProgress = vi.fn();
vi.mock("@/hooks/use-run-progress", () => ({
  useRunProgress: (...args: unknown[]) => useRunProgress(...args),
}));

describe("LiveInProgressPanel", () => {
  it("shows a designed empty state when nothing is running", () => {
    render(<LiveInProgressPanel analyses={[]} />);
    expect(screen.getByText("Nothing is running right now.")).toBeInTheDocument();
  });

  it("shows the in-progress analysis with its run's live step progress", () => {
    useRunProgress.mockReturnValue({
      run: {
        id: "run_1",
        status: "RUNNING",
        cancelRequested: false,
        steps: { INGEST: { status: "DONE", attempt: 1 }, CONSISTENCY: { status: "PENDING", attempt: 0 } },
      },
      loading: false,
      error: null,
    });
    render(
      <LiveInProgressPanel
        analyses={[{ ...demoAnalyses[0], status: "PROCESSING", currentRunId: "run_1" }]}
      />,
    );
    expect(screen.getByText(demoAnalyses[0].startup.name)).toBeInTheDocument();
    expect(screen.getByText("Analysing your sources.")).toBeInTheDocument();
  });
});

describe("WatchlistPanel", () => {
  it("shows only watchlisted analyses", () => {
    render(<WatchlistPanel analyses={demoAnalyses} />);
    expect(screen.getByText("Loopwell")).toBeInTheDocument();
    expect(screen.queryByText("Verdant Grid")).not.toBeInTheDocument();
  });

  it("shows a designed empty state when nothing is watchlisted", () => {
    const noneWatchlisted = demoAnalyses.map((a) => ({ ...a, isWatchlisted: false }));
    render(<WatchlistPanel analyses={noneWatchlisted} />);
    expect(screen.getByText("Nothing watchlisted yet.")).toBeInTheDocument();
  });
});
