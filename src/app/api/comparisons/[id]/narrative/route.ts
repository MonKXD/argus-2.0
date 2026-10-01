import { NextResponse } from "next/server";

import { createLlm } from "@/lib/ai/create-llm";
import type { ComparisonNarrativeItem } from "@/lib/analysis/prompts/comparison-narrative";
import { runComparisonNarrative } from "@/lib/analysis/steps/comparison-narrative";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { logger } from "@/lib/logger";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";
import { FactRepo } from "@/lib/repos/fact-repo";
import { ReportRepo } from "@/lib/repos/report-repo";

/** A single `structured()` call, not the multi-step pipeline — well under
 * the Hobby-plan ceiling T-3.14/D-070 found for a full run, but still set
 * explicitly rather than inherit an undocumented platform default. */
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * FR-CMP-05 (P2): generates (or regenerates) a comparison's narrative —
 * user-triggered, synchronous, not part of the per-analysis `Run` step
 * machinery (a comparison has no `Run` of its own). `Comparison.items`
 * with `deleted: true` are skipped, same as `/app/compare/[id]`'s own
 * view page.
 */
export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const user = await requireUser();

    const db = getAdminFirestore();
    const comparisonRepo = new ComparisonRepo(db);
    const comparison = await comparisonRepo.get(id);
    if (!comparison) throw new NotFoundError("Comparison not found.");
    assertOwns(comparison.ownerId, user);

    const reportRepo = new ReportRepo(db);
    const factRepo = new FactRepo(db);

    const items: ComparisonNarrativeItem[] = [];
    for (const item of comparison.items) {
      if (item.deleted) continue;
      const report = await reportRepo.getReport(item.analysisId, item.reportId);
      if (!report) continue;
      const [dimensions, facts] = await Promise.all([
        reportRepo.listDimensions(item.analysisId, item.reportId),
        factRepo.list(item.analysisId),
      ]);
      items.push({ label: item.label, overall: report.overall, dimensions, flags: report.flags, facts });
    }
    if (items.length < 2) {
      throw new ValidationError("Need at least two startups with a saved report to generate a narrative.");
    }

    const { narrative, droppedCount, usage } = await runComparisonNarrative({ items, llm: createLlm() });
    await comparisonRepo.update(id, { narrative });

    logger.info(
      { comparisonId: id, itemCount: items.length, claimCount: narrative.length, droppedCount, usage },
      "comparison narrative generated",
    );

    return NextResponse.json({ narrative });
  } catch (error) {
    return handleApiError(error);
  }
}
