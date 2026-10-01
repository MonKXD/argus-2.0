import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DimensionRadarOverlay, type RadarSeries } from "@/components/charts/dimension-radar-overlay";
import type { DimensionKey } from "@/lib/schema/enums";

function scores(
  overrides: Partial<Record<DimensionKey, { score: number | null; confidence: number }>>,
): Partial<Record<DimensionKey, { score: number | null; confidence: number }>> {
  return {
    founder: { score: 70, confidence: 0.7 },
    market: { score: 60, confidence: 0.6 },
    product: { score: 50, confidence: 0.5 },
    traction: { score: 40, confidence: 0.4 },
    competitive: { score: 65, confidence: 0.6 },
    business_model: { score: 55, confidence: 0.5 },
    financial: { score: 45, confidence: 0.4 },
    risk: { score: 60, confidence: 0.6 },
    ...overrides,
  };
}

const TWO_SERIES: RadarSeries[] = [
  { label: "Loopwell", scores: scores({}) },
  { label: "Other Startup", scores: scores({ traction: { score: null, confidence: 0 } }) },
];

describe("DimensionRadarOverlay", () => {
  it("renders the chart as decorative", () => {
    const { container } = render(<DimensionRadarOverlay series={TWO_SERIES} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("lists every series in the legend", () => {
    render(<DimensionRadarOverlay series={TWO_SERIES} />);
    const legend = document.querySelector("ul")!;
    expect(within(legend).getByText("Loopwell")).toBeInTheDocument();
    expect(within(legend).getByText("Other Startup")).toBeInTheDocument();
  });

  it("gives each series a distinct stroke-dasharray so colour isn't the only distinction", () => {
    const { container } = render(<DimensionRadarOverlay series={TWO_SERIES} />);
    const seriesPaths = Array.from(container.querySelectorAll("path.stroke-paper"));
    expect(seriesPaths).toHaveLength(2);
    const patterns = seriesPaths.map((p) => p.getAttribute("stroke-dasharray"));
    expect(new Set(patterns).size).toBe(2);
  });

  it("draws a vertex only for a scored dimension in each series (8 + 7 here)", () => {
    const { container } = render(<DimensionRadarOverlay series={TWO_SERIES} />);
    expect(container.querySelectorAll("circle")).toHaveLength(15);
  });

  it("has a per-series data table inside a native disclosure", () => {
    render(<DimensionRadarOverlay series={TWO_SERIES} />);
    const details = document.querySelector("details");
    expect(details).toBeInTheDocument();
    const table = within(details!).getByRole("table");
    const tractionRow = within(table).getByText("Traction").closest("tr")!;
    expect(within(tractionRow).getByText("40")).toBeInTheDocument();
    expect(within(tractionRow).getByText("Not scored")).toBeInTheDocument();
  });

  it("caps at 4 plotted series even if more are passed", () => {
    const five: RadarSeries[] = Array.from({ length: 5 }, (_, i) => ({
      label: `Startup ${i}`,
      scores: scores({}),
    }));
    render(<DimensionRadarOverlay series={five} />);
    const legend = document.querySelector("ul")!;
    expect(within(legend).queryByText("Startup 4")).not.toBeInTheDocument();
    expect(within(legend).getByText("Startup 3")).toBeInTheDocument();
  });
});
