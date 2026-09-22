import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sparkline } from "@/components/charts/sparkline";

describe("Sparkline", () => {
  it("renders a decorative polyline and a text-alternative summary", () => {
    const { container, getByText } = render(
      <Sparkline values={[10, 20, 15, 40]} label="Average score, last 4 runs" />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("polyline")).toBeInTheDocument();
    expect(getByText("Average score, last 4 runs: up, from 10 to 40")).toBeInTheDocument();
  });

  it("reports a down trend when the last value is lower than the first", () => {
    const { getByText } = render(<Sparkline values={[40, 10]} label="Trend" />);
    expect(getByText("Trend: down, from 40 to 10")).toBeInTheDocument();
  });

  it("reports a flat trend when the first and last values match", () => {
    const { getByText } = render(<Sparkline values={[20, 20, 20]} label="Trend" />);
    expect(getByText("Trend: flat, from 20 to 20")).toBeInTheDocument();
  });

  it("handles an all-equal series without dividing by zero", () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} label="Trend" />);
    expect(container.querySelector("polyline")).toHaveAttribute("points");
  });

  it("handles a single-value series", () => {
    const { getByText } = render(<Sparkline values={[7]} label="Trend" />);
    expect(getByText("Trend: flat, from 7 to 7")).toBeInTheDocument();
  });

  it("shows a 'no data' alternative for an empty series", () => {
    const { getByText } = render(<Sparkline values={[]} label="Trend" />);
    expect(getByText("Trend: no data")).toBeInTheDocument();
  });
});
