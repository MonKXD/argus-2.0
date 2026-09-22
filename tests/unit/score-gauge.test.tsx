import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreGauge } from "@/components/charts/score-gauge";

describe("ScoreGauge", () => {
  it("shows the score, 'of 100', and a confidence label", () => {
    render(<ScoreGauge score={71} confidence={0.6} />);

    expect(screen.getByText("71")).toBeInTheDocument();
    expect(screen.getByText("of 100")).toBeInTheDocument();
    expect(screen.getByText("Confidence: Medium")).toBeInTheDocument();
  });

  it.each([
    [0.2, "Low"],
    [0.35, "Medium"],
    [0.5, "Medium"],
    [0.65, "Medium"],
    [0.9, "High"],
  ])("labels confidence %s as %s", (confidence, label) => {
    render(<ScoreGauge score={50} confidence={confidence} />);
    expect(screen.getByText(`Confidence: ${label}`)).toBeInTheDocument();
  });

  it("shows a not-scored state instead of a number when notScoredReason is set", () => {
    render(<ScoreGauge notScoredReason="Coverage below 0.5" />);

    expect(screen.getByText("Not scored")).toBeInTheDocument();
    expect(screen.getByText("Coverage below 0.5")).toBeInTheDocument();
    expect(screen.queryByText("of 100")).not.toBeInTheDocument();
  });

  it("shows the capped reason instead of the confidence meter when capped", () => {
    render(<ScoreGauge score={60} confidence={0.5} cappedReason="open critical flag" />);

    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("Capped at 60: open critical flag")).toBeInTheDocument();
    expect(screen.queryByText(/Confidence:/)).not.toBeInTheDocument();
  });

  it("renders the arc as decorative (aria-hidden), leaving real text as the accessible content", () => {
    const { container } = render(<ScoreGauge score={71} confidence={0.6} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
