import { NextResponse } from "next/server";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { buildReportExportPayload } from "@/lib/export/report-export-data";
import { renderReportMarkdown } from "@/lib/export/report-markdown";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import { SourceRepo } from "@/lib/repos/source-repo";

interface RouteContext {
  params: Promise<{ id: string; reportId: string }>;
}

const Format = z.enum(["md", "json"]);

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report";
}

/**
 * FR-EXP-01/FR-EXP-04: a read-only download, not a mutation, so no
 * `assertSameOrigin` (R-SEC-07 scopes that to mutating routes) — a plain
 * `<a href>` navigation carries the session cookie and triggers the
 * browser's own download via `Content-Disposition`, with no client JS
 * needed. D-011's own "Markdown and JSON first" export order; a
 * server-rendered PDF is Phase 6's FR-EXP-03.
 */
export async function GET(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id, reportId } = await params;
    const { searchParams } = new URL(request.url);
    const format = Format.parse(searchParams.get("format") ?? "md");
    const user = await requireUser();

    const db = getAdminFirestore();
    const analysis = await new AnalysisRepo(db).get(id);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const reportRepo = new ReportRepo(db);
    const report = await reportRepo.getReport(id, reportId);
    if (!report) throw new NotFoundError("Report not found.");

    const [dimensions, sources] = await Promise.all([
      reportRepo.listDimensions(id, reportId),
      new SourceRepo(db).list(id),
    ]);

    const payload = buildReportExportPayload({
      analysis,
      report,
      dimensions,
      sources,
      disclaimer: DISCLAIMER_TEXT,
    });

    await recordActivity(db, {
      ownerId: user.uid,
      type: "REPORT_EXPORTED",
      analysisId: id,
      message: `Exported ${analysis.startup.name}'s report as ${format === "json" ? "JSON" : "Markdown"}.`,
    });

    const slug = slugify(analysis.startup.name);
    if (format === "json") {
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${slug}-v${report.version}.json"`,
        },
      });
    }

    return new NextResponse(renderReportMarkdown(payload), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${slug}-v${report.version}.md"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return handleApiError(new ValidationError("Invalid export format."));
    return handleApiError(error);
  }
}
