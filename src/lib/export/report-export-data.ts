import type { Analysis } from "@/lib/schema/analysis";
import type { DimensionAnalysis } from "@/lib/schema/claims";
import type { Stage } from "@/lib/schema/enums";
import type { Source } from "@/lib/schema/evidence";
import type { Report } from "@/lib/schema/report";

/**
 * FR-EXP-01/FR-EXP-04: the one payload both the Markdown and JSON
 * exporters render from, so neither can drift from the other or from what
 * the report page itself shows. Every field is already-validated data the
 * report already carries — no new computation, no fabrication (R-AI-01).
 */
export interface ReportExportPayload {
  disclaimer: string;
  startup: {
    name: string;
    stage: Stage;
    sector: string | undefined;
  };
  version: number;
  scoringVersion: string;
  promptVersion: string;
  generatedAt: string;
  overall: Report["overall"];
  dimensions: DimensionAnalysis[];
  narrative: Report["narrative"];
  flags: Report["flags"];
  checklist: Report["checklist"];
  evidenceStats: Report["evidenceStats"];
  sources: Pick<Source, "title" | "type" | "reliability" | "status">[];
}

export function buildReportExportPayload(args: {
  analysis: Analysis;
  report: Report;
  dimensions: DimensionAnalysis[];
  sources: Source[];
  disclaimer: string;
}): ReportExportPayload {
  const { analysis, report, dimensions, sources, disclaimer } = args;
  return {
    disclaimer,
    startup: { name: analysis.startup.name, stage: analysis.startup.stage, sector: analysis.startup.sector },
    version: report.version,
    scoringVersion: report.scoringVersion,
    promptVersion: report.promptVersion,
    generatedAt: report.generatedAt,
    overall: report.overall,
    dimensions,
    narrative: report.narrative,
    flags: report.flags,
    checklist: report.checklist,
    evidenceStats: report.evidenceStats,
    sources: sources.map((s) => ({ title: s.title, type: s.type, reliability: s.reliability, status: s.status })),
  };
}
