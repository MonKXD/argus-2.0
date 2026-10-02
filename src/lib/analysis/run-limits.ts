import { z } from "zod";

import { LimitExceededError } from "@/lib/api/errors";
import { env } from "@/lib/env";
import { Run } from "@/lib/schema/run";

import type { Firestore } from "firebase-admin/firestore";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface RunUsage {
  runningCount: number;
  dailyCount: number;
}

// R-COD-02: validate at the Firestore-read boundary, but only the fields
// this view actually uses — a full `Run.parse()` would require every other
// pipeline-internal field (steps, modelIds, promptVersion, ...) to be
// present too, which is true of every real run document but makes this a
// narrower, more honest boundary contract for a read-only dashboard.
const RecentRunShape = Run.pick({
  id: true,
  analysisId: true,
  status: true,
  startedAt: true,
  finishedAt: true,
  usage: true,
});
export type RecentRun = z.infer<typeof RecentRunShape>;

/**
 * T-6.08 (observability, NFR-08/09: "cost estimate recorded per run"). Reuses
 * the same owner-scoped `collectionGroup("runs")` shape as `getRunUsage()`,
 * newest first, capped (same bounded-small-read trade-off as
 * `ActivityRepo.listByOwner`, D-089) — this is a dashboard for one owner's
 * own runs, not a full archive. `Run.usage`/`startedAt`/`finishedAt` already
 * exist on every run document (duration = finishedAt - startedAt; cost =
 * usage.estimatedCostUsd) — no schema change needed, just a read.
 */
export async function listRecentRuns(db: Firestore, ownerId: string, limit = 20): Promise<RecentRun[]> {
  const snapshot = await db
    .collectionGroup("runs")
    .where("ownerId", "==", ownerId)
    .orderBy("startedAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => RecentRunShape.parse(doc.data()));
}

/**
 * The two `collectionGroup("runs")` queries `assertWithinRunLimits` checks
 * against, extracted so T-5.13's usage view (`GET /api/usage`) can show the
 * same real counts rather than a second, possibly-drifting computation.
 * `Run` documents live in `analyses/{id}/runs/{runId}` subcollections, so
 * both queries are scoped by `ownerId` (server-side Admin SDK reads, not
 * subject to the owner-scoped client rules) — see
 * `firebase/firestore.indexes.json` for the composite indexes these need.
 */
export async function getRunUsage(db: Firestore, ownerId: string): Promise<RunUsage> {
  const runs = db.collectionGroup("runs");
  const since = new Date(Date.now() - ONE_DAY_MS).toISOString();

  const [runningSnapshot, todaySnapshot] = await Promise.all([
    runs.where("ownerId", "==", ownerId).where("status", "==", "RUNNING").get(),
    runs.where("ownerId", "==", ownerId).where("startedAt", ">=", since).get(),
  ]);

  return { runningCount: runningSnapshot.size, dailyCount: todaySnapshot.size };
}

/**
 * TRD section 7: "at most 2 concurrent runs per user; daily analysis limit
 * from DAILY_ANALYSIS_LIMIT; both return LIMIT_EXCEEDED."
 *
 * Best-effort, not transactional: a race between two concurrent requests
 * from the same user can both pass the check before either run is created,
 * exceeding the limit by at most one. Accepted for T-3.08 — a strict
 * cross-collectionGroup atomic guarantee isn't worth the complexity for a
 * soft usage cap enforced against a single user's own concurrent requests.
 */
export async function assertWithinRunLimits(db: Firestore, ownerId: string): Promise<void> {
  const { runningCount, dailyCount } = await getRunUsage(db, ownerId);

  if (runningCount >= env.MAX_CONCURRENT_RUNS) {
    throw new LimitExceededError(
      `You have ${env.MAX_CONCURRENT_RUNS} analyses running already. Wait for one to finish before starting another.`,
    );
  }

  if (dailyCount >= env.DAILY_ANALYSIS_LIMIT) {
    throw new LimitExceededError(
      `You've reached today's limit of ${env.DAILY_ANALYSIS_LIMIT} analysis runs. Try again tomorrow.`,
    );
  }
}
