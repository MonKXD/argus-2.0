import { NextResponse } from "next/server";
import { z } from "zod";

import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import { ChecklistItem, ChecklistStatus } from "@/lib/schema/claims";

interface RouteContext {
  params: Promise<{ id: string; reportId: string; itemId: string }>;
}

const UpdateChecklistBody = z
  .object({
    status: ChecklistStatus.optional(),
    userNote: ChecklistItem.shape.userNote,
  })
  .refine((body) => body.status !== undefined || body.userNote !== undefined, {
    message: "Provide status or userNote to update.",
  });

/** TRD section 7 / FR-RPT-21: "Update checklist status or note." Ownership
 * is checked against the analysis, not the report (reports carry no
 * client-facing `ownerId` of their own — the analysis is the resource the
 * user actually owns, same pattern as every other `:id`-scoped route). */
export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id: analysisId, reportId, itemId } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const body = UpdateChecklistBody.parse(await request.json());

    const updated = await new ReportRepo(getAdminFirestore()).updateChecklistItem(
      analysisId,
      reportId,
      itemId,
      body,
    );
    if (!updated) throw new NotFoundError("Checklist item not found.");

    return NextResponse.json({ item: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
