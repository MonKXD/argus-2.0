import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketIntelligencePanel } from "@/components/dashboard/market-intelligence-panel";
import { demoAnalyses, loopwellFlags } from "@/demo";

describe("MarketIntelligencePanel", () => {
  it("aggregates sector counts across the demo analyses", () => {
    render(<MarketIntelligencePanel analyses={demoAnalyses} openFlags={[]} />);
    const sectorMix = within(screen.getByText("Sector mix").parentElement!);
    expect(sectorMix.getByText("Fintech")).toBeInTheDocument();
    expect(sectorMix.getByText("2")).toBeInTheDocument();
    expect(sectorMix.getByText("Climate")).toBeInTheDocument();
    expect(sectorMix.getByText("Healthtech")).toBeInTheDocument();
  });

  it("labels the panel as derived, not external market data (FR-DSH-08)", () => {
    render(<MarketIntelligencePanel analyses={demoAnalyses} openFlags={[]} />);
    expect(
      screen.getByText("Derived from your own analyses, not external market data."),
    ).toBeInTheDocument();
  });

  it("groups analyses with no sector under 'Unspecified'", () => {
    const noSector = [
      { ...demoAnalyses[0]!, startup: { ...demoAnalyses[0]!.startup, sector: undefined } },
    ];
    render(<MarketIntelligencePanel analyses={noSector} openFlags={[]} />);
    expect(screen.getByText("Unspecified")).toBeInTheDocument();
  });

  it("buckets scores into ranges, with a separate bucket for analyses with no score yet", () => {
    render(<MarketIntelligencePanel analyses={demoAnalyses} openFlags={[]} />);
    // demoAnalyses has overallScore 62 (60-79), 84 (80-100) and at least one null.
    expect(screen.getByText("60-79")).toBeInTheDocument();
    expect(screen.getByText("80-100")).toBeInTheDocument();
    expect(screen.getByText("No score yet")).toBeInTheDocument();
  });

  it("shows the most common open-risk categories, by human-readable label", () => {
    render(<MarketIntelligencePanel analyses={demoAnalyses} openFlags={loopwellFlags} />);
    expect(screen.getByText("Financial")).toBeInTheDocument();
    expect(screen.getByText("Market")).toBeInTheDocument();
  });

  it("shows a no-risks message when there are no open flags", () => {
    render(<MarketIntelligencePanel analyses={demoAnalyses} openFlags={[]} />);
    expect(screen.getByText("No open risks.")).toBeInTheDocument();
  });
});
