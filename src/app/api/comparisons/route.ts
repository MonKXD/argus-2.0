import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import type { Comparison } from "@/lib/schema/comparison";
import { idOf, newId } from "@/lib/schema/ids";

const CreateComparisonBody = z.object({
  name: z.string().min(1).max(120),
  analysisIds: z.array(idOf("ana")).min(2).max(4),
});

/**
 * FR-CMP-01/FR-CMP-06 (TRD section 7): create a comparison from 2 to 4
 * completed analyses, snapshotting each one's current latest report at
 * creation time (R-DAT-04: a comparison is never silently updated by a
 * later re-run — `items[].reportId` stays pinned to whichever report
 * version was latest the moment this comparison was made).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();

    const body = CreateComparisonBody.parse(await request.json());
    if (new Set(body.analysisIds).size !== body.analysisIds.length) {
      throw new ValidationError("Choose each analysis only once.");
    }

    const db = getAdminFirestore();
    const analysisRepo = new AnalysisRepo(db);
    const reportRepo = new ReportRepo(db);

    const items: Comparison["items"] = [];
    const scoringVersions = new Set<string>();
    for (const analysisId of body.analysisIds) {
      const analysis = await analysisRepo.get(analysisId);
      if (!analysis || analysis.ownerId !== user.uid) {
        throw new NotFoundError(`Analysis ${analysisId} not found.`);
      }
      if (!analysis.latest) {
        throw new ValidationError(`"${analysis.startup.name}" has no completed report yet.`);
      }

      const report = await reportRepo.getReport(analysisId, analysis.latest.reportId);
      if (!report) throw new NotFoundError(`Report for "${analysis.startup.name}" not found.`);

      items.push({
        analysisId,
        reportId: analysis.latest.reportId,
        label: analysis.startup.name,
        deleted: false,
      });
      scoringVersions.add(report.scoringVersion);
    }

    const comparison: Comparison = {
      id: newId("cmp"),
      ownerId: user.uid,
      name: body.name,
      items,
      scoringVersions: [...scoringVersions],
      createdAt: new Date().toISOString(),
    };

    await new ComparisonRepo(db).create(comparison);
    return NextResponse.json({ comparison }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** FR-CMP-06's "revisit": every comparison this user has saved, newest
 * first. Absent from TRD's own API table, same as T-4.11's report-version
 * `list()` — that table is illustrative, not exhaustive, and "revisit"
 * needs somewhere to list from. */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const comparisons = await new ComparisonRepo(getAdminFirestore()).listByOwner(user.uid);
    return NextResponse.json({ comparisons });
  } catch (error) {
    return handleApiError(error);
  }
}
