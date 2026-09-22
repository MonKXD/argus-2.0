import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { demoAnalyses } from "@/demo";

describe("KpiStrip", () => {
  it("computes analyses count, average score (scored only), in-progress and watchlisted counts", () => {
    render(<KpiStrip analyses={demoAnalyses} />);

    expect(screen.getByText("Analyses")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    // Loopwell 62 + Verdant Grid 84, averaged over the 2 scored analyses (not 4).
    expect(screen.getByText("73")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Watchlisted")).toBeInTheDocument();
  });

  it("shows an em dash for average score when nothing is scored", () => {
    const unscored = demoAnalyses.map((a) => ({ ...a, latest: null }));
    render(<KpiStrip analyses={unscored} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
