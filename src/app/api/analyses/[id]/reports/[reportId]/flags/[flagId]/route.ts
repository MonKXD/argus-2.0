import { NextResponse } from "next/server";
import { z } from "zod";

import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import { FlagStatus } from "@/lib/schema/claims";

interface RouteContext {
  params: Promise<{ id: string; reportId: string; flagId: string }>;
}

const UpdateFlagBody = z.object({ status: FlagStatus });

/** TRD section 7 / FR-RPT-21: "Acknowledge or dismiss a flag." `status` is
 * required (unlike the checklist route's optional fields) — this endpoint
 * exists for exactly one thing, setting a flag's status. */
export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id: analysisId, reportId, flagId } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const { status } = UpdateFlagBody.parse(await request.json());

    const updated = await new ReportRepo(getAdminFirestore()).updateFlagStatus(
      analysisId,
      reportId,
      flagId,
      status,
    );
    if (!updated) throw new NotFoundError("Flag not found.");

    return NextResponse.json({ flag: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
