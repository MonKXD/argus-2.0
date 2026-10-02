import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LiveInProgressPanel } from "@/components/dashboard/live-in-progress-panel";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { demoAnalyses } from "@/demo";
import type { Activity } from "@/lib/schema/activity";

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

  it("links to the full watchlist page only when something is watchlisted", () => {
    const { rerender } = render(<WatchlistPanel analyses={demoAnalyses} />);
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/app/watchlist");

    const noneWatchlisted = demoAnalyses.map((a) => ({ ...a, isWatchlisted: false }));
    rerender(<WatchlistPanel analyses={noneWatchlisted} />);
    expect(screen.queryByRole("link", { name: "View all" })).not.toBeInTheDocument();
  });
});

describe("RecentActivityPanel", () => {
  const activity: Activity[] = [
    {
      id: "act_00000000000000000000000001",
      ownerId: demoAnalyses[0]!.ownerId,
      type: "ANALYSIS_CREATED",
      analysisId: demoAnalyses[0]!.id,
      message: `Started an analysis for ${demoAnalyses[0]!.startup.name}.`,
      createdAt: "2026-09-25T00:00:00.000Z",
    },
    {
      id: "act_00000000000000000000000002",
      ownerId: demoAnalyses[0]!.ownerId,
      type: "COMPARISON_CREATED",
      message: "Created a comparison: Seed-stage fintech.",
      createdAt: "2026-09-26T00:00:00.000Z",
    },
  ];

  it("shows a designed empty state when nothing has happened yet", () => {
    render(<RecentActivityPanel activity={[]} />);
    expect(screen.getByText("Nothing has happened yet.")).toBeInTheDocument();
  });

  it("renders each activity's message, linking to its analysis when it has one", () => {
    render(<RecentActivityPanel activity={activity} />);

    const link = screen.getByRole("link", {
      name: `Started an analysis for ${demoAnalyses[0]!.startup.name}.`,
    });
    expect(link).toHaveAttribute("href", `/app/analyses/${demoAnalyses[0]!.id}`);
    expect(screen.getByText("Created a comparison: Seed-stage fintech.")).toBeInTheDocument();
  });
});
