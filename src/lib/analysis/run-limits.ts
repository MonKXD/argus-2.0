import { LimitExceededError } from "@/lib/api/errors";
import { env } from "@/lib/env";

import type { Firestore } from "firebase-admin/firestore";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * TRD section 7: "at most 2 concurrent runs per user; daily analysis limit
 * from DAILY_ANALYSIS_LIMIT; both return LIMIT_EXCEEDED." `Run` documents
 * live in `analyses/{id}/runs/{runId}` subcollections, so both checks are
 * `collectionGroup("runs")` queries scoped by `ownerId` (server-side Admin
 * SDK reads, not subject to the owner-scoped client rules) — see
 * `firebase/firestore.indexes.json` for the composite indexes these need.
 *
 * Best-effort, not transactional: a race between two concurrent requests
 * from the same user can both pass the check before either run is created,
 * exceeding the limit by at most one. Accepted for T-3.08 — a strict
 * cross-collectionGroup atomic guarantee isn't worth the complexity for a
 * soft usage cap enforced against a single user's own concurrent requests.
 */
export async function assertWithinRunLimits(db: Firestore, ownerId: string): Promise<void> {
  const runs = db.collectionGroup("runs");

  const runningSnapshot = await runs.where("ownerId", "==", ownerId).where("status", "==", "RUNNING").get();
  if (runningSnapshot.size >= env.MAX_CONCURRENT_RUNS) {
    throw new LimitExceededError(
      `You have ${env.MAX_CONCURRENT_RUNS} analyses running already. Wait for one to finish before starting another.`,
    );
  }

  const since = new Date(Date.now() - ONE_DAY_MS).toISOString();
  const todaySnapshot = await runs.where("ownerId", "==", ownerId).where("startedAt", ">=", since).get();
  if (todaySnapshot.size >= env.DAILY_ANALYSIS_LIMIT) {
    throw new LimitExceededError(
      `You've reached today's limit of ${env.DAILY_ANALYSIS_LIMIT} analysis runs. Try again tomorrow.`,
    );
  }
}
