import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComparisonView, type ComparisonItemView } from "@/components/argus/compare/comparison-view";
import { loopwellDimensions, loopwellFacts, loopwellReport } from "@/demo/loopwell";

const BASELINE: ComparisonItemView = {
  analysisId: "ana_00000000000000000000000001",
  label: "Loopwell",
  report: loopwellReport,
  dimensions: loopwellDimensions,
  facts: loopwellFacts,
};

const OTHER: ComparisonItemView = {
  analysisId: "ana_00000000000000000000000002",
  label: "Other Startup",
  report: {
    ...loopwellReport,
    overall: { ...loopwellReport.overall, score: 50 },
  },
  dimensions: loopwellDimensions.map((d) => ({ ...d, score: d.score != null ? d.score - 10 : null })),
  facts: [],
};

describe("ComparisonView", () => {
  it("renders a score gauge and confidence for each startup", () => {
    render(
      <ComparisonView
        name="Seed-stage fintech"
        createdAt="2026-09-25T00:00:00.000Z"
        items={[BASELINE, OTHER]}
        hasDeletedItems={false}
      />,
    );
    expect(screen.getByRole("heading", { name: "Seed-stage fintech" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Loopwell" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Other Startup" })).toBeInTheDocument();
  });

  it("marks the first item as the baseline and shows deltas for the rest", () => {
    render(
      <ComparisonView
        name="Compare"
        createdAt="2026-09-25T00:00:00.000Z"
        items={[BASELINE, OTHER]}
        hasDeletedItems={false}
      />,
    );
    const dimensionTable = screen.getAllByRole("table")[1]!;
    const founderRow = within(dimensionTable).getByText("Founder").closest("tr")!;
    const baselineScore = loopwellDimensions.find((d) => d.dimension === "founder")!.score!;
    expect(within(founderRow).getByText(String(baselineScore))).toBeInTheDocument();
    expect(within(founderRow).getByText("(-10)")).toBeInTheDocument();
  });

  it("shows 'Not available' in the metric matrix when a startup has no matching fact", () => {
    render(
      <ComparisonView
        name="Compare"
        createdAt="2026-09-25T00:00:00.000Z"
        items={[BASELINE, OTHER]}
        hasDeletedItems={false}
      />,
    );
    const metricTable = screen.getAllByRole("table").at(-1)!;
    const rows = within(metricTable).getAllByText("Not available");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows a deleted-startup notice only when the comparison has one", () => {
    const { rerender } = render(
      <ComparisonView name="Compare" createdAt="2026-09-25T00:00:00.000Z" items={[BASELINE]} hasDeletedItems={false} />,
    );
    expect(screen.queryByText(/have since been deleted/)).not.toBeInTheDocument();

    rerender(
      <ComparisonView name="Compare" createdAt="2026-09-25T00:00:00.000Z" items={[BASELINE]} hasDeletedItems={true} />,
    );
    expect(screen.getByText(/have since been deleted/)).toBeInTheDocument();
  });

  it("omits the radar overlay for a single-item comparison", () => {
    render(
      <ComparisonView name="Compare" createdAt="2026-09-25T00:00:00.000Z" items={[BASELINE]} hasDeletedItems={false} />,
    );
    expect(screen.queryByText("Dimension radar")).not.toBeInTheDocument();
  });

  it("shows no comparability warning when stage profile and scoring version match", () => {
    render(
      <ComparisonView
        name="Compare"
        createdAt="2026-09-25T00:00:00.000Z"
        items={[BASELINE, OTHER]}
        hasDeletedItems={false}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a comparability warning when stage profiles differ (FR-CMP-04)", () => {
    const differentProfile: ComparisonItemView = {
      ...OTHER,
      report: { ...OTHER.report, stageProfile: "GROWTH" },
    };
    render(
      <ComparisonView
        name="Compare"
        createdAt="2026-09-25T00:00:00.000Z"
        items={[BASELINE, differentProfile]}
        hasDeletedItems={false}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("stage profiles");
  });
});
