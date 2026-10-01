import { describe, expect, it } from "vitest";

import { loopwellAnalysis, loopwellDimensions, loopwellReport, loopwellSources } from "@/demo/loopwell";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { buildReportExportPayload } from "@/lib/export/report-export-data";
import { renderReportMarkdown } from "@/lib/export/report-markdown";

function payload() {
  return buildReportExportPayload({
    analysis: loopwellAnalysis,
    report: loopwellReport,
    dimensions: loopwellDimensions,
    sources: loopwellSources,
    disclaimer: DISCLAIMER_TEXT,
  });
}

describe("buildReportExportPayload", () => {
  it("carries the report's real version, scoring version and generation time", () => {
    const result = payload();
    expect(result.version).toBe(loopwellReport.version);
    expect(result.scoringVersion).toBe(loopwellReport.scoringVersion);
    expect(result.promptVersion).toBe(loopwellReport.promptVersion);
    expect(result.generatedAt).toBe(loopwellReport.generatedAt);
  });

  it("includes the disclaimer verbatim", () => {
    expect(payload().disclaimer).toBe(DISCLAIMER_TEXT);
  });

  it("carries every dimension's real claims, not a copy", () => {
    const result = payload();
    expect(result.dimensions).toEqual(loopwellDimensions);
  });

  it("projects sources down to title/type/reliability/status only", () => {
    const result = payload();
    expect(result.sources).toHaveLength(loopwellSources.length);
    expect(result.sources[0]).toEqual({
      title: loopwellSources[0]!.title,
      type: loopwellSources[0]!.type,
      reliability: loopwellSources[0]!.reliability,
      status: loopwellSources[0]!.status,
    });
  });
});

describe("renderReportMarkdown", () => {
  it("includes the startup name, version info and disclaimer", () => {
    const md = renderReportMarkdown(payload());
    expect(md).toContain(`# ${loopwellAnalysis.startup.name}`);
    expect(md).toContain(`Report version ${loopwellReport.version}`);
    expect(md).toContain(`Scoring version ${loopwellReport.scoringVersion}`);
    expect(md).toContain(DISCLAIMER_TEXT);
  });

  it("renders every dimension's claims with a status marker", () => {
    const md = renderReportMarkdown(payload());
    const founderDimension = loopwellDimensions.find((d) => d.dimension === "founder")!;
    const firstClaim = founderDimension.claims[0]!;
    expect(md).toContain(firstClaim.text);
    expect(md).toContain("## Founder");
  });

  it("renders a VERIFIED claim's exact quote", () => {
    const md = renderReportMarkdown(payload());
    const verifiedClaim = loopwellDimensions
      .flatMap((d) => d.claims)
      .find((c) => c.status === "VERIFIED");
    expect(verifiedClaim).toBeDefined();
    if (verifiedClaim && verifiedClaim.status === "VERIFIED") {
      expect(md).toContain(verifiedClaim.quotes[0]!.quote);
    }
  });

  it("lists every source with its reliability", () => {
    const md = renderReportMarkdown(payload());
    for (const source of loopwellSources) {
      expect(md).toContain(source.title);
    }
  });

  it("renders a dimension with no saved data as 'Not analysed'", () => {
    const partial = buildReportExportPayload({
      analysis: loopwellAnalysis,
      report: loopwellReport,
      dimensions: loopwellDimensions.filter((d) => d.dimension !== "risk"),
      sources: loopwellSources,
      disclaimer: DISCLAIMER_TEXT,
    });
    const md = renderReportMarkdown(partial);
    const riskSection = md.split("## Risk")[1]!.split("## ")[0]!;
    expect(riskSection).toContain("_Not analysed._");
  });
});
