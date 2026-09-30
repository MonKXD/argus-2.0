import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportShell } from "@/components/argus/report/report-shell";
import {
  demoDimensions,
  demoEvidence,
  demoFacts,
  demoReport,
  demoSources,
  loopwellAnalysis,
} from "@/demo";
import { DIMENSION_LABEL } from "@/lib/dimension-labels";

// ReportHeader renders DeleteAnalysisButton, which needs a router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("ReportShell", () => {
  it("renders the header with the startup name and report version", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: loopwellAnalysis.startup.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(`Version ${demoReport.version}`, { exact: false })).toBeInTheDocument();
  });

  it("renders every one of the 16 sections with its number and title", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

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
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    if (demoReport.overall.score !== null) {
      expect(screen.getByText(String(demoReport.overall.score))).toBeInTheDocument();
    }
  });

  it("renders real flags with their severity in the risks section", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const flag = demoReport.flags[0]!;
    const section = screen.getByRole("heading", { name: /11\. Risks/ }).closest("section")!;
    expect(within(section).getByText(flag.title)).toBeInTheDocument();
    expect(within(section).getByText(flag.severity)).toBeInTheDocument();
  });

  it("shows the risk dimension's own criterion breakdown in section 11", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /11\. Risks/ }).closest("section")!;
    expect(within(section).getByText("Show criteria")).toBeInTheDocument();
  });

  it("renders the checklist questions in the missing-information section", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const item = demoReport.checklist[0]!;
    const section = screen
      .getByRole("heading", { name: /16\. Missing information/ })
      .closest("section")!;
    expect(within(section).getByText(item.question)).toBeInTheDocument();
  });

  it("shows the suggested source for a checklist item", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const item = demoReport.checklist.find((c) => c.suggestedSource)!;
    const section = screen
      .getByRole("heading", { name: /16\. Missing information/ })
      .closest("section")!;
    expect(within(section).getByText(item.suggestedSource, { exact: false })).toBeInTheDocument();
  });

  it("resolves strength and weakness claim ids into real claim text", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const dimensionWithStrength = demoDimensions.find((d) => d.strengthIds.length > 0);
    if (dimensionWithStrength) {
      const claim = dimensionWithStrength.claims.find(
        (c) => c.id === dimensionWithStrength.strengthIds[0],
      );
      const section = screen.getByRole("heading", { name: /12\. Strengths/ }).closest("section")!;
      expect(within(section).getByText(new RegExp(claim!.text.slice(0, 20)))).toBeInTheDocument();
    }
  });

  it("shows a defensive empty state when a dimension is missing from the run", () => {
    const withoutFounder = demoDimensions.filter((d) => d.dimension !== "founder");
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={withoutFounder} />,
    );

    const section = screen.getByRole("heading", { name: /4\. Founder/ }).closest("section")!;
    expect(
      within(section).getByText("This dimension could not be analysed in this run."),
    ).toBeInTheDocument();
  });

  it("shows an explain-the-score panel with every dimension's weight and contribution", async () => {
    const user = userEvent.setup();
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    await user.click(screen.getByText("Explain this score"));

    const scoreSection = screen
      .getByRole("heading", { name: /3\. Investment score/ })
      .closest("section")!;
    for (const dim of demoDimensions) {
      expect(
        within(scoreSection).getAllByText(DIMENSION_LABEL[dim.dimension]).length,
      ).toBeGreaterThan(0);
    }
  });

  it("shows the founder dimension's own criterion breakdown in section 4", async () => {
    const user = userEvent.setup();
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /4\. Founder/ }).closest("section")!;
    await user.click(within(section).getByText("Show criteria"));

    const founder = demoDimensions.find((d) => d.dimension === "founder")!;
    expect(
      within(section).getByText(`${founder.criteria[0]!.label}:`, { exact: false }),
    ).toBeInTheDocument();
  });

  it("shows product and business-model criterion breakdowns in section 5", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /5\. Product/ }).closest("section")!;
    const toggles = within(section).getAllByText("Show criteria");
    expect(toggles).toHaveLength(2);
  });

  it("shows the market dimension's own criterion breakdown in section 6", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen
      .getByRole("heading", { name: /6\. Market opportunity/ })
      .closest("section")!;
    expect(within(section).getByText("Show criteria")).toBeInTheDocument();
  });

  it("shows the competitive dimension's own criterion breakdown in section 8", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen
      .getByRole("heading", { name: /8\. Competitive landscape/ })
      .closest("section")!;
    expect(within(section).getByText("Show criteria")).toBeInTheDocument();
  });

  it("shows the traction dimension's own criterion breakdown in section 9", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /9\. Traction/ }).closest("section")!;
    expect(within(section).getByText("Show criteria")).toBeInTheDocument();
  });

  it("shows the financial dimension's own criterion breakdown in section 10", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen
      .getByRole("heading", { name: /10\. Financial signals/ })
      .closest("section")!;
    expect(within(section).getByText("Show criteria")).toBeInTheDocument();
  });

  it("shows the reliability mix in the evidence and sources section", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /15\. Evidence/ }).closest("section")!;
    expect(within(section).getByText("Independent evidence")).toBeInTheDocument();
    expect(within(section).getByText("Company evidence")).toBeInTheDocument();
    expect(within(section).getByText("Provided evidence")).toBeInTheDocument();
  });

  it("renders a real source list when sources are passed", () => {
    render(
      <ReportShell
        analysis={loopwellAnalysis}
        report={demoReport}
        dimensions={demoDimensions}
        sources={demoSources}
      />,
    );

    const section = screen.getByRole("heading", { name: /15\. Evidence/ }).closest("section")!;
    const source = demoSources[0]!;
    expect(within(section).getByText(source.title)).toBeInTheDocument();
  });

  it("omits the source list when no sources are passed", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /15\. Evidence/ }).closest("section")!;
    const source = demoSources[0]!;
    expect(within(section).queryByText(source.title)).not.toBeInTheDocument();
  });

  it("opens the evidence rail with the selected claim's quote when a claim is clicked", async () => {
    const user = userEvent.setup();
    // Report this as a desktop viewport so EvidencePanel uses the plain
    // docked aside, not the Sheet — jsdom has no real showModal(), so a
    // native <dialog> can't be meaningfully driven here (PROJECT_MEMORY
    // section 4); the responsive chrome itself is Playwright's job.
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    const { container } = render(
      <ReportShell
        analysis={loopwellAnalysis}
        report={demoReport}
        dimensions={demoDimensions}
        evidence={demoEvidence}
        sources={demoSources}
        facts={demoFacts}
      />,
    );

    const claimIndex = demoReport.narrative.executiveSummary.findIndex(
      (c) => c.status === "VERIFIED",
    );
    const claim = demoReport.narrative.executiveSummary[claimIndex] as Extract<
      (typeof demoReport.narrative.executiveSummary)[number],
      { status: "VERIFIED" }
    >;
    const aside = container.querySelector("aside")!;
    expect(within(aside).getByText("Select a claim to see its evidence.")).toBeInTheDocument();

    const execSummarySection = screen
      .getByRole("heading", { name: /1\. Executive summary/ })
      .closest("section")!;
    await user.click(within(execSummarySection).getAllByRole("button")[claimIndex]!);

    expect(
      within(aside).queryByText("Select a claim to see its evidence."),
    ).not.toBeInTheDocument();
    const quoteEl = aside.querySelector("p.font-serif");
    expect(quoteEl?.textContent).toContain(claim.quotes[0]!.quote);

    matchMediaSpy.mockRestore();
  });

  it("filters claims by status across the report when a filter tab is selected", async () => {
    const user = userEvent.setup();
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const nonVerified = demoReport.narrative.executiveSummary.find((c) => c.status !== "VERIFIED");
    const verified = demoReport.narrative.executiveSummary.find((c) => c.status === "VERIFIED");
    expect(nonVerified).toBeDefined();
    expect(verified).toBeDefined();

    await user.click(screen.getByRole("tab", { name: "Verified" }));

    expect(screen.queryByText(nonVerified!.text)).not.toBeInTheDocument();
    expect(screen.getByText(verified!.text, { exact: false })).toBeInTheDocument();
  });

  it("shows every claim again after switching the filter back to All", async () => {
    const user = userEvent.setup();
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const nonVerified = demoReport.narrative.executiveSummary.find((c) => c.status !== "VERIFIED")!;

    await user.click(screen.getByRole("tab", { name: "Verified" }));
    expect(screen.queryByText(nonVerified.text)).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getByText(nonVerified.text, { exact: false })).toBeInTheDocument();
  });

  it("shows an evidence-composition bar in a section with claims", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /1\. Executive summary/ }).closest("section")!;
    expect(within(section).getByRole("img", { name: /Evidence:/ })).toBeInTheDocument();
  });

  it("omits the evidence bar for a section with no claims of its own", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen
      .getByRole("heading", { name: /3\. Investment score/ })
      .closest("section")!;
    expect(within(section).queryByRole("img", { name: /Evidence:/ })).not.toBeInTheDocument();
  });

  it("shows a coverage note in a section with missing claims", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const missingCount = demoReport.evidenceStats.bySection.financial_signals!.MISSING;
    const section = screen
      .getByRole("heading", { name: /10\. Financial signals/ })
      .closest("section")!;
    expect(
      within(section).getByText(new RegExp(`${missingCount} of \\d+ claim`)),
    ).toBeInTheDocument();
  });

  it("omits the coverage note in a section with no missing claims", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    const section = screen.getByRole("heading", { name: /4\. Founder/ }).closest("section")!;
    expect(within(section).queryByText(/not found in the sources provided/)).not.toBeInTheDocument();
  });

  it("shows a plain version number with no selector for a single-version report", () => {
    render(
      <ReportShell analysis={loopwellAnalysis} report={demoReport} dimensions={demoDimensions} />,
    );

    expect(screen.getByText(`Version ${demoReport.version}`)).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Report version" })).not.toBeInTheDocument();
  });

  it("shows a version selector and no read-only notice when viewing the latest of several versions", () => {
    const versions = [
      { id: demoReport.id, version: 2, generatedAt: demoReport.generatedAt, score: 70 },
      { id: "rpt_00000000000000000000000002", version: 1, generatedAt: demoReport.generatedAt, score: 60 },
    ];
    render(
      <ReportShell
        analysis={loopwellAnalysis}
        report={{ ...demoReport, version: 2 }}
        dimensions={demoDimensions}
        versions={versions}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Report version" })).toBeInTheDocument();
    expect(screen.queryByText(/read-only historical report/)).not.toBeInTheDocument();
  });

  it("shows a read-only notice when viewing a historical (non-latest) version", () => {
    const versions = [
      { id: "rpt_00000000000000000000000002", version: 2, generatedAt: demoReport.generatedAt, score: 70 },
      { id: demoReport.id, version: 1, generatedAt: demoReport.generatedAt, score: 60 },
    ];
    render(
      <ReportShell
        analysis={loopwellAnalysis}
        report={{ ...demoReport, version: 1 }}
        dimensions={demoDimensions}
        versions={versions}
      />,
    );

    expect(screen.getByText(/read-only historical report/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the latest version" })).toBeInTheDocument();
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
