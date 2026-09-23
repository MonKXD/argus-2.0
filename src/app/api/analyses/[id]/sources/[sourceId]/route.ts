import { NextResponse } from "next/server";

import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminStorageBucket } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { SourceRepo } from "@/lib/repos/source-repo";

interface RouteContext {
  params: Promise<{ id: string; sourceId: string }>;
}

/** Removes a source and its evidence, plus its Storage object if it has one (R-DAT-05, applied per-source ahead of the full analysis-delete cascade). */
export async function DELETE(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id: analysisId, sourceId } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const sourceRepo = new SourceRepo(getAdminFirestore());
    const source = await sourceRepo.get(analysisId, sourceId);
    if (!source) throw new NotFoundError("Source not found.");

    await sourceRepo.delete(analysisId, sourceId);

    if (source.storagePath) {
      await getAdminStorageBucket().file(source.storagePath).delete({ ignoreNotFound: true });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
