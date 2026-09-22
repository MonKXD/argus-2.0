import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketIntelligencePanel } from "@/components/dashboard/market-intelligence-panel";
import { demoAnalyses } from "@/demo";

describe("MarketIntelligencePanel", () => {
  it("aggregates sector counts across the demo analyses", () => {
    render(<MarketIntelligencePanel analyses={demoAnalyses} />);
    expect(screen.getByText("Fintech")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Climate")).toBeInTheDocument();
    expect(screen.getByText("Healthtech")).toBeInTheDocument();
  });

  it("labels the panel as derived, not external market data (FR-DSH-08)", () => {
    render(<MarketIntelligencePanel analyses={demoAnalyses} />);
    expect(screen.getByText("Derived from your analyses.")).toBeInTheDocument();
  });

  it("groups analyses with no sector under 'Unspecified'", () => {
    const noSector = [
      { ...demoAnalyses[0]!, startup: { ...demoAnalyses[0]!.startup, sector: undefined } },
    ];
    render(<MarketIntelligencePanel analyses={noSector} />);
    expect(screen.getByText("Unspecified")).toBeInTheDocument();
  });
});
