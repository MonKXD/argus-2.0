import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InProgressPanel } from "@/components/dashboard/in-progress-panel";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { demoAnalyses, demoRuns } from "@/demo";

describe("InProgressPanel", () => {
  it("shows the in-progress analysis with its run's step progress", () => {
    render(<InProgressPanel analyses={demoAnalyses} runs={demoRuns} />);
    expect(screen.getByText("Fernway Health")).toBeInTheDocument();
    expect(screen.getByText("Check consistency")).toBeInTheDocument();
  });

  it("shows a designed empty state when nothing is running", () => {
    const noneProcessing = demoAnalyses.map((a) => ({ ...a, status: "COMPLETE" as const }));
    render(<InProgressPanel analyses={noneProcessing} runs={demoRuns} />);
    expect(screen.getByText("Nothing is running right now.")).toBeInTheDocument();
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
