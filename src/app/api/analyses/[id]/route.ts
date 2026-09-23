import { NextResponse } from "next/server";
import { z } from "zod";

import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { Analysis } from "@/lib/schema/analysis";
import { StageProfile } from "@/lib/schema/enums";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(id);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    return NextResponse.json({ analysis });
  } catch (error) {
    return handleApiError(error);
  }
}

const UpdateAnalysisBody = z.object({
  startup: Analysis.shape.startup.partial().optional(),
  options: z
    .object({
      webResearch: z.boolean().optional(),
      stageProfile: StageProfile.optional(),
      analystFocus: z.string().max(500).optional(),
    })
    .optional(),
  tags: z.array(z.string().max(32)).max(10).optional(),
  isWatchlisted: z.boolean().optional(),
});

/** Basics, options, tags and watchlist flag only (TRD section 7) — status,
 * ownerId, latest and currentRunId are orchestrator/server-owned. */
export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const user = await requireUser();

    const repo = new AnalysisRepo(getAdminFirestore());
    const existing = await repo.get(id);
    if (!existing) throw new NotFoundError("Analysis not found.");
    assertOwns(existing.ownerId, user);

    const body = UpdateAnalysisBody.parse(await request.json());

    const patch: Partial<Analysis> = {
      updatedAt: new Date().toISOString(),
      ...(body.startup && { startup: { ...existing.startup, ...body.startup } }),
      ...(body.options && { options: { ...existing.options, ...body.options } }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.isWatchlisted !== undefined && { isWatchlisted: body.isWatchlisted }),
    };

    await repo.update(id, patch);
    return NextResponse.json({ analysis: { ...existing, ...patch } });
  } catch (error) {
    return handleApiError(error);
  }
}
