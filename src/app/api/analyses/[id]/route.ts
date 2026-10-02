import { NextResponse } from "next/server";
import { z } from "zod";

import { recordActivity } from "@/lib/activity";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { ConflictError, handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminStorageBucket } from "@/lib/firebase/admin";
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

    const db = getAdminFirestore();
    const repo = new AnalysisRepo(db);
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

    if (body.isWatchlisted !== undefined && body.isWatchlisted !== existing.isWatchlisted) {
      await recordActivity(db, {
        ownerId: user.uid,
        type: body.isWatchlisted ? "WATCHLIST_ADDED" : "WATCHLIST_REMOVED",
        analysisId: id,
        message: body.isWatchlisted
          ? `Added ${existing.startup.name} to the watchlist.`
          : `Removed ${existing.startup.name} from the watchlist.`,
      });
    }

    return NextResponse.json({ analysis: { ...existing, ...patch } });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * FR-SET-02/SCHEMA.md "Deletion cascade": recursive delete of `analyses/{id}`
 * and every subcollection (sources, evidence, facts, runs, reports and its
 * `dimensions` subcollection — `recursiveDelete()` walks arbitrary depth, so
 * this needs no per-collection knowledge), then the Storage prefix
 * `uploads/{uid}/{id}/` a source's upload was written under (T-3.06).
 * Exports, comparisons and activity are the rest of the documented cascade,
 * but none of those collections exist yet (Phase 5/6) — nothing to clean up
 * there until a task actually creates them. `PROCESSING` is rejected
 * (APP_FLOW's own lifecycle diagram never draws a delete transition out of
 * it, only out of `DRAFT`/`COMPLETE`): the orchestrator's `after()`
 * callback (T-3.08) can still be mid-write to this analysis's subcollections
 * on another request, and a recursive delete racing those writes would
 * leave orphaned documents behind rather than a clean delete. Cancel first.
 */
export async function DELETE(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const user = await requireUser();
    const db = getAdminFirestore();

    const existing = await new AnalysisRepo(db).get(id);
    if (!existing) throw new NotFoundError("Analysis not found.");
    assertOwns(existing.ownerId, user);
    if (existing.status === "PROCESSING") {
      throw new ConflictError("Cancel the running analysis before deleting it.");
    }

    await db.recursiveDelete(db.collection("analyses").doc(id));
    await getAdminStorageBucket().deleteFiles({ prefix: `uploads/${user.uid}/${id}/` });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
