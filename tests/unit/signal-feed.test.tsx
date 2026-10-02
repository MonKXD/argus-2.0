import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignalFeed, type SignalWithCompany } from "@/components/argus/signal-feed";

function signal(overrides: Partial<SignalWithCompany> = {}): SignalWithCompany {
  return {
    id: "sig_1",
    analysisId: "ana_1",
    title: "Testco raises $5M",
    url: "https://news.example/testco-raises",
    summary: "Testco raised a new round.",
    impact: "POSITIVE",
    evidenceId: "ev_1",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    companyName: "Testco",
    ...overrides,
  };
}

describe("SignalFeed", () => {
  it("shows an empty state when there are no signals", () => {
    render(<SignalFeed signals={[]} />);
    expect(screen.getByText(/no signals yet/i)).toBeInTheDocument();
  });

  it("renders a signal's impact tag, title link, summary, company and a re-run link", () => {
    render(<SignalFeed signals={[signal()]} />);

    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Testco")).toBeInTheDocument();
    expect(screen.getByText("Testco raised a new round.")).toBeInTheDocument();

    const titleLink = screen.getByRole("link", { name: "Testco raises $5M" });
    expect(titleLink).toHaveAttribute("href", "https://news.example/testco-raises");

    const rerunLink = screen.getByRole("link", { name: "Re-run analysis" });
    expect(rerunLink).toHaveAttribute("href", "/app/analyses/ana_1/setup?step=review");
  });

  it("shows the related dimension when the detector named one", () => {
    render(<SignalFeed signals={[signal({ relatedDimension: "financial" })]} />);
    expect(screen.getByText("Financial")).toBeInTheDocument();
  });
});
