import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarChart } from "@/components/charts/bar-chart";

describe("BarChart", () => {
  it("renders a label and formatted value per row", () => {
    const { getByText } = render(
      <BarChart
        data={[
          { label: "Fintech", value: 12 },
          { label: "Healthtech", value: 4 },
        ]}
      />,
    );

    expect(getByText("Fintech")).toBeInTheDocument();
    expect(getByText("12")).toBeInTheDocument();
    expect(getByText("Healthtech")).toBeInTheDocument();
    expect(getByText("4")).toBeInTheDocument();
  });

  it("sizes the largest bar to 100% and scales the rest relative to it", () => {
    const { container } = render(
      <BarChart
        data={[
          { label: "A", value: 10 },
          { label: "B", value: 5 },
        ]}
      />,
    );
    const bars = container.querySelectorAll("li > div > div");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "50%" });
  });

  it("renders a zero-value row as a zero-width bar", () => {
    const { container } = render(
      <BarChart
        data={[
          { label: "A", value: 10 },
          { label: "B", value: 0 },
        ]}
      />,
    );
    const bars = container.querySelectorAll("li > div > div");
    expect(bars[1]).toHaveStyle({ width: "0%" });
  });

  it("renders every bar at 0% when all values are 0, without dividing by zero", () => {
    const { container } = render(
      <BarChart
        data={[
          { label: "A", value: 0 },
          { label: "B", value: 0 },
        ]}
      />,
    );
    const bars = container.querySelectorAll("li > div > div");
    expect(bars[0]).toHaveStyle({ width: "0%" });
    expect(bars[1]).toHaveStyle({ width: "0%" });
  });

  it("floors a small nonzero value's bar width so it stays visible", () => {
    const { container } = render(
      <BarChart
        data={[
          { label: "A", value: 1000 },
          { label: "B", value: 1 },
        ]}
      />,
    );
    const bars = container.querySelectorAll("li > div > div");
    expect(bars[1]).toHaveStyle({ width: "2%" });
  });

  it("uses a custom value formatter when given one", () => {
    const { getByText } = render(
      <BarChart data={[{ label: "A", value: 50 }]} valueFormatter={(v) => `${v}%`} />,
    );
    expect(getByText("50%")).toBeInTheDocument();
  });

  it("shows a 'No data' message for an empty dataset", () => {
    const { getByText } = render(<BarChart data={[]} />);
    expect(getByText("No data")).toBeInTheDocument();
  });
});
