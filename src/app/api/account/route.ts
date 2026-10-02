import { NextResponse } from "next/server";

import { requireUser } from "@/lib/api/auth";
import { ConflictError, handleApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { env } from "@/lib/env";
import { getAdminAuth, getAdminStorageBucket } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";

/**
 * FR-AUT-03: "Sign out; delete account and all associated data." Sign-out
 * already existed (`DELETE /api/auth/session`, `UserMenu`) — this is the
 * other half. Generalises T-3.12's per-analysis cascade
 * (`db.recursiveDelete()` + a Storage prefix) across every collection an
 * owner's data actually lives in, confirmed by reading SCHEMA.md's
 * Firestore-model listing rather than assumed: `analyses/{id}` (each one
 * `recursiveDelete`d, which already walks every subcollection —
 * sources/evidence/facts/runs/reports/dimensions), `comparisons/{id}`,
 * `activity/{id}`. `users/{uid}` and `exports/{exportId}` are both listed
 * in SCHEMA.md but neither is ever written anywhere in this codebase today
 * — usage limits are enforced via a `collectionGroup("runs")` query
 * instead (`run-limits.ts`), and exports are streamed, never persisted
 * (D-086) — so there is nothing under either to clean up.
 *
 * Rejects while any owned analysis is `PROCESSING`, same reasoning as the
 * per-analysis delete guard (D-068): the orchestrator's `after()` callback
 * could still be writing to that analysis's subcollections, racing a
 * `recursiveDelete`.
 *
 * `getAdminAuth().deleteUser()` runs last, after every Firestore/Storage
 * cascade succeeds — if the cascade fails partway, the account (and the
 * ability to retry) still exists; deleting the Auth user first would strand
 * data under a uid nobody could ever authenticate as again to retry the
 * cleanup.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const db = getAdminFirestore();

    const analysisRepo = new AnalysisRepo(db);
    const analyses = await analysisRepo.listByOwner(user.uid);
    if (analyses.some((analysis) => analysis.status === "PROCESSING")) {
      throw new ConflictError("Cancel every running analysis before deleting your account.");
    }

    await Promise.all(analyses.map((analysis) => db.recursiveDelete(db.collection("analyses").doc(analysis.id))));
    await getAdminStorageBucket().deleteFiles({ prefix: `uploads/${user.uid}/` });

    const comparisonRepo = new ComparisonRepo(db);
    const comparisons = await comparisonRepo.listByOwner(user.uid);
    await Promise.all(comparisons.map((comparison) => comparisonRepo.delete(comparison.id)));

    const activitySnapshot = await db.collection("activity").where("ownerId", "==", user.uid).get();
    await Promise.all(activitySnapshot.docs.map((doc) => doc.ref.delete()));

    await getAdminAuth().deleteUser(user.uid);

    const response = new NextResponse(null, { status: 204 });
    response.cookies.delete({ name: env.SESSION_COOKIE_NAME, path: "/" });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
