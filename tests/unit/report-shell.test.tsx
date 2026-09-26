import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportShell } from "@/components/argus/report/report-shell";
import { demoDimensions, demoReport, loopwellAnalysis } from "@/demo";
import { DIMENSION_LABEL } from "@/lib/dimension-labels";

// ReportHeader renders DeleteAnalysisButton, which needs a router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("ReportShell", () => {
  it("renders the header with the startup name and report version", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    expect(screen.getByRole("heading", { level: 1, name: loopwellAnalysis.startup.name })).toBeInTheDocument();
    expect(screen.getByText(`Version ${demoReport.version}`, { exact: false })).toBeInTheDocument();
  });

  it("renders every one of the 16 sections with its number and title", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    expect(screen.getByRole("heading", { name: /1\. Executive summary/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /16\. Missing information/ })).toBeInTheDocument();
  });

  it("renders real executive-summary claim text", () => {
    const { container } = render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const claim = demoReport.narrative.executiveSummary[0]!;
    expect(container.textContent).toContain(claim.text);
  });

  it("shows the overall score", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    if (demoReport.overall.score !== null) {
      expect(screen.getByText(String(demoReport.overall.score))).toBeInTheDocument();
    }
  });

  it("renders real flags with their severity in the risks section", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    const flag = demoReport.flags[0]!;
    const section = screen.getByRole("heading", { name: /11\. Risks/ }).closest("section")!;
    expect(within(section).getByText(flag.title)).toBeInTheDocument();
    expect(within(section).getByText(flag.severity)).toBeInTheDocument();
  });

  it("renders the checklist questions in the missing-information section", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    const item = demoReport.checklist[0]!;
    const section = screen.getByRole("heading", { name: /16\. Missing information/ }).closest("section")!;
    expect(within(section).getByText(item.question)).toBeInTheDocument();
  });

  it("resolves strength and weakness claim ids into real claim text", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    const dimensionWithStrength = demoDimensions.find((d) => d.strengthIds.length > 0);
    if (dimensionWithStrength) {
      const claim = dimensionWithStrength.claims.find((c) => c.id === dimensionWithStrength.strengthIds[0]);
      const section = screen.getByRole("heading", { name: /12\. Strengths/ }).closest("section")!;
      expect(within(section).getByText(new RegExp(claim!.text.slice(0, 20)))).toBeInTheDocument();
    }
  });

  it("shows a defensive empty state when a dimension is missing from the run", () => {
    const withoutFounder = demoDimensions.filter((d) => d.dimension !== "founder");
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={withoutFounder} />);

    const section = screen.getByRole("heading", { name: /4\. Founder/ }).closest("section")!;
    expect(within(section).getByText("This dimension could not be analysed in this run.")).toBeInTheDocument();
  });

  it("shows an explain-the-score panel with every dimension's weight and contribution", async () => {
    const user = userEvent.setup();
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    await user.click(screen.getByText("Explain this score"));

    const scoreSection = screen.getByRole("heading", { name: /3\. Investment score/ }).closest("section")!;
    for (const dim of demoDimensions) {
      expect(within(scoreSection).getAllByText(DIMENSION_LABEL[dim.dimension]).length).toBeGreaterThan(0);
    }
  });

  it("shows the founder dimension's own criterion breakdown in section 4", async () => {
    const user = userEvent.setup();
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    const section = screen.getByRole("heading", { name: /4\. Founder/ }).closest("section")!;
    await user.click(within(section).getByText("Show criteria"));

    const founder = demoDimensions.find((d) => d.dimension === "founder")!;
    expect(within(section).getByText(`${founder.criteria[0]!.label}:`, { exact: false })).toBeInTheDocument();
  });

  it("shows product and business-model criterion breakdowns in section 5", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    const section = screen.getByRole("heading", { name: /5\. Product/ }).closest("section")!;
    const toggles = within(section).getAllByText("Show criteria");
    expect(toggles).toHaveLength(2);
  });

  it("shows the market dimension's own criterion breakdown in section 6", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    const section = screen.getByRole("heading", { name: /6\. Market opportunity/ }).closest("section")!;
    expect(within(section).getByText("Show criteria")).toBeInTheDocument();
  });

  it("shows the competitive dimension's own criterion breakdown in section 8", () => {
    render(<ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />);

    const section = screen.getByRole("heading", { name: /8\. Competitive landscape/ }).closest("section")!;
    expect(within(section).getByText("Show criteria")).toBeInTheDocument();
  });

  it("renders a partial notice when one is passed", () => {
    render(
      <ReportShell
        analysis={loopwellAnalysis}
        report={demoReport}
        dimensions={demoDimensions}
        partialNotice={<p>This report is partial.</p>}
      />,
    );

    expect(screen.getByText("This report is partial.")).toBeInTheDocument();
  });
});
