import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminStorageBucket } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { SourceRepo } from "@/lib/repos/source-repo";
import type { Analysis } from "@/lib/schema/analysis";
import type { Evidence, Source } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * FR-INT-08 ("duplicate an analysis"). Scope call, reasoned not asked (a
 * contained implementation-shape decision): copies the startup info,
 * options and every successfully-`PARSED` source (with its evidence) into
 * a fresh `DRAFT` analysis, so the duplicate is immediately ready to run
 * without re-uploading or re-ingesting anything. A `FAILED` source is
 * never copied — duplicating a broken source carries nothing forward.
 * Deliberately not copied: `tags`/`isWatchlisted` (a user's own
 * organisation of the *original* entry, not implied for a fresh one) and
 * every run/report (those are this analysis's own history — the
 * duplicate hasn't run yet, so `latest`/`currentRunId` start `null`, same
 * as any new analysis). The startup name gets a " (copy)" suffix: APP_FLOW
 * already allows duplicate startup names generally (the list disambiguates
 * by date/website), but a batch-duplicate producing an immediate, same-
 * instant twin is exactly the case worth a visible marker for.
 */
export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const user = await requireUser();
    const db = getAdminFirestore();

    const analysisRepo = new AnalysisRepo(db);
    const sourceRepo = new SourceRepo(db);

    const original = await analysisRepo.get(id);
    if (!original) throw new NotFoundError("Analysis not found.");
    assertOwns(original.ownerId, user);

    const [sources, evidence] = await Promise.all([
      sourceRepo.list(id),
      sourceRepo.listEvidence(id),
    ]);

    const newAnalysisId = newId("ana");
    const now = new Date().toISOString();

    const duplicate: Analysis = {
      ...original,
      id: newAnalysisId,
      startup: { ...original.startup, name: `${original.startup.name} (copy)` },
      status: "DRAFT",
      latest: null,
      currentRunId: null,
      tags: [],
      isWatchlisted: false,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    const bucket = getAdminStorageBucket();
    const copies: { source: Source; evidence: Evidence[] }[] = [];

    for (const source of sources) {
      if (source.status !== "PARSED") continue;

      const newSourceId = newId("src");
      let storagePath = source.storagePath;

      if (source.origin === "UPLOAD" && source.storagePath) {
        storagePath = `uploads/${user.uid}/${newAnalysisId}/${newSourceId}/${source.filename}`;
        await bucket.file(source.storagePath).copy(bucket.file(storagePath));
      }

      const newSource: Source = {
        ...source,
        id: newSourceId,
        analysisId: newAnalysisId,
        storagePath,
        addedAt: now,
        parsedAt: now,
      };

      const newEvidenceForSource: Evidence[] = evidence
        .filter((e) => e.sourceId === source.id)
        .map((item) => ({
          ...item,
          id: newId("ev"),
          analysisId: newAnalysisId,
          sourceId: newSourceId,
        }));

      copies.push({ source: newSource, evidence: newEvidenceForSource });
    }

    await analysisRepo.create(duplicate);
    for (const copy of copies) {
      await sourceRepo.create(copy.source, copy.evidence);
    }

    await recordActivity(db, {
      ownerId: user.uid,
      type: "ANALYSIS_CREATED",
      analysisId: newAnalysisId,
      message: `Duplicated ${original.startup.name} as ${duplicate.startup.name}.`,
    });

    return NextResponse.json({ analysis: duplicate }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
