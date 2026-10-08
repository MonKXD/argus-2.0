import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { demoAnalyses } from "@/demo";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("AnalysesTable", () => {
  it("shows name, stage, sector, score+confidence and status for every analysis", () => {
    render(<AnalysesTable analyses={demoAnalyses} />);

    expect(screen.getByRole("link", { name: "Loopwell" })).toHaveAttribute(
      "href",
      expect.stringContaining("/app/analyses/"),
    );
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByText("(Medium)")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("shows an em dash for a score-less (insufficient-evidence) analysis", () => {
    render(<AnalysesTable analyses={demoAnalyses} />);
    const nimbusRow = screen.getByRole("link", { name: "Nimbus Ledger" }).closest("tr");
    expect(nimbusRow).toHaveTextContent("—");
  });

  it("shows the empty message when there are no analyses", () => {
    render(<AnalysesTable analyses={[]} />);
    expect(screen.getByText("No analyses yet.")).toBeInTheDocument();
  });

  it("renders a watchlist toggle for every row, reflecting its current state (FR-WCH-01)", () => {
    render(<AnalysesTable analyses={demoAnalyses} />);
    const watchlisted = demoAnalyses.find((a) => a.isWatchlisted)!;
    const notWatchlisted = demoAnalyses.find((a) => !a.isWatchlisted)!;
    const watchlistedRow = screen.getByRole("link", { name: watchlisted.startup.name }).closest("tr")!;
    const notWatchlistedRow = screen.getByRole("link", { name: notWatchlisted.startup.name }).closest("tr")!;
    expect(
      within(watchlistedRow).getByRole("button", { name: "Remove from watchlist" }),
    ).toBeInTheDocument();
    expect(
      within(notWatchlistedRow).getByRole("button", { name: "Add to watchlist" }),
    ).toBeInTheDocument();
  });

  it("renders a duplicate action for every row (T-6.13)", () => {
    render(<AnalysesTable analyses={demoAnalyses} />);
    expect(screen.getAllByRole("button", { name: "Duplicate analysis" })).toHaveLength(
      demoAnalyses.length,
    );
  });
});
