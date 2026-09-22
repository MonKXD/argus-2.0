import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DimensionRadar } from "@/components/charts/dimension-radar";
import type { DimensionKey } from "@/lib/schema/enums";

const FULL_SCORES: Partial<Record<DimensionKey, { score: number | null; confidence: number }>> = {
  founder: { score: 80, confidence: 0.8 },
  market: { score: 60, confidence: 0.5 },
  product: { score: 40, confidence: 0.2 }, // low confidence
  traction: { score: null, confidence: 0 }, // unscored
  competitive: { score: 70, confidence: 0.7 },
  business_model: { score: 55, confidence: 0.45 },
  financial: { score: 30, confidence: 0.6 },
  risk: { score: 65, confidence: 0.9 },
};

function dataTable() {
  return screen.getByRole("table");
}

describe("DimensionRadar", () => {
  it("renders the arc as decorative", () => {
    const { container } = render(<DimensionRadar scores={FULL_SCORES} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("has a data table alternative inside a native disclosure", () => {
    render(<DimensionRadar scores={FULL_SCORES} />);
    const details = document.querySelector("details");
    expect(details).toBeInTheDocument();
    expect(within(details!).getByText("Show data table")).toBeInTheDocument();
  });

  it("lists every dimension's score and confidence label in the table", () => {
    render(<DimensionRadar scores={FULL_SCORES} />);
    const table = dataTable();

    expect(within(table).getByText("Founder")).toBeInTheDocument();
    const founderRow = within(table).getByText("Founder").closest("tr")!;
    expect(within(founderRow).getByText("80")).toBeInTheDocument();
    expect(within(founderRow).getByText("High")).toBeInTheDocument();
  });

  it("shows 'Not scored' for an unscored dimension, not a score of 0", () => {
    render(<DimensionRadar scores={FULL_SCORES} />);
    const table = dataTable();
    const tractionRow = within(table).getByText("Traction").closest("tr")!;

    expect(within(tractionRow).getByText("Not scored")).toBeInTheDocument();
    expect(within(tractionRow).queryByText("0")).not.toBeInTheDocument();
  });

  it("draws a vertex circle only for scored dimensions (7 of 8 here)", () => {
    const { container } = render(<DimensionRadar scores={FULL_SCORES} />);
    expect(container.querySelectorAll("circle")).toHaveLength(7);
  });

  it("dashes exactly the edges touching a low-confidence or unscored vertex", () => {
    const { container } = render(<DimensionRadar scores={FULL_SCORES} />);
    const lines = Array.from(container.querySelectorAll("line[stroke-dasharray]"));
    // Axis order: founder, market, product(low-conf), traction(unscored),
    // competitive, business_model, financial, risk. product and traction
    // are adjacent, so they share one edge: market-product, product-traction,
    // traction-competitive — 3 dashed edges, not 4.
    expect(lines).toHaveLength(3);
  });

  it("renders all 8 axis labels, using dimension names or 'Not scored'", () => {
    const { container } = render(<DimensionRadar scores={FULL_SCORES} />);
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts).toHaveLength(8);
    expect(texts).toContain("Not scored");
    expect(texts).toContain("Founder");
  });
});
