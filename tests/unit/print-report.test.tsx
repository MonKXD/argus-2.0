import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { STATUS_LABEL } from "@/components/argus/evidence-marker";
import { PrintReport } from "@/components/argus/print/print-report";
import { loopwellAnalysis, loopwellDimensions, loopwellReport, loopwellSources } from "@/demo/loopwell";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { buildReportExportPayload } from "@/lib/export/report-export-data";

function payload() {
  return buildReportExportPayload({
    analysis: loopwellAnalysis,
    report: loopwellReport,
    dimensions: loopwellDimensions,
    sources: loopwellSources,
    disclaimer: DISCLAIMER_TEXT,
  });
}

describe("PrintReport", () => {
  it("renders the startup name, version info and disclaimer", () => {
    const { container } = render(<PrintReport payload={payload()} />);
    expect(screen.getByRole("heading", { name: loopwellAnalysis.startup.name })).toBeInTheDocument();
    expect(container.textContent).toContain(`Report version ${loopwellReport.version}`);
    expect(container.textContent).toContain(DISCLAIMER_TEXT);
  });

  it("renders every dimension's claims with a bracketed status label, not an SVG marker", () => {
    const { container } = render(<PrintReport payload={payload()} />);
    const founderDimension = loopwellDimensions.find((d) => d.dimension === "founder")!;
    const firstClaim = founderDimension.claims[0]!;
    expect(container.textContent).toContain(firstClaim.text);
    expect(container.textContent).toContain(`[${STATUS_LABEL[firstClaim.status]}]`);
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("lists every source", () => {
    const { container } = render(<PrintReport payload={payload()} />);
    for (const source of loopwellSources) {
      expect(container.textContent).toContain(source.title);
    }
  });

  it("shows 'Not analysed' for a dimension with no saved data", () => {
    const partial = buildReportExportPayload({
      analysis: loopwellAnalysis,
      report: loopwellReport,
      dimensions: loopwellDimensions.filter((d) => d.dimension !== "risk"),
      sources: loopwellSources,
      disclaimer: DISCLAIMER_TEXT,
    });
    render(<PrintReport payload={partial} />);
    expect(screen.getByText("Not analysed.")).toBeInTheDocument();
  });
});
