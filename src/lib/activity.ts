import { logger } from "@/lib/logger";
import { ActivityRepo } from "@/lib/repos/activity-repo";
import type { Activity } from "@/lib/schema/activity";
import { newId } from "@/lib/schema/ids";

import type { Firestore } from "firebase-admin/firestore";

interface RecordActivityInput {
  ownerId: string;
  type: Activity["type"];
  analysisId?: string;
  message: string;
}

/**
 * FR-DSH-07: writes one `Activity` record for the dashboard's recent-
 * activity feed. Takes `db` explicitly rather than resolving
 * `getAdminFirestore()` itself — every call site already has a `db` handle
 * (a route's own `getAdminFirestore()` call, or `executeRun`'s own `db`
 * parameter), the same constructor-injection pattern every repo in this
 * codebase already follows (`AnalysisRepo`/`ComparisonRepo`/etc.), and it
 * keeps this function testable against the fake-Firestore double instead of
 * silently talking to a real, unconfigured Admin SDK singleton in tests.
 * Every call site awaits this (serverless route handlers can be suspended
 * the moment the response is sent — TRD section 3/D-070 — so a
 * fire-and-forget write here could silently never happen), but it never
 * throws: this is always a side effect of an already-succeeded primary
 * write (an analysis created, a source registered, a run finished), and a
 * feed entry failing to save must never fail or roll back that primary
 * action. Still logged on failure (R-COD-11: never silently swallow), with
 * only the error's reason, never `message`/document content (R-SEC-04).
 */
export async function recordActivity(db: Firestore, input: RecordActivityInput): Promise<void> {
  const activity: Activity = {
    id: newId("act"),
    ownerId: input.ownerId,
    type: input.type,
    analysisId: input.analysisId,
    message: input.message,
    createdAt: new Date().toISOString(),
  };
  try {
    await new ActivityRepo(db).create(activity);
  } catch (error) {
    logger.warn(
      { reason: error instanceof Error ? error.name : "unknown", type: input.type },
      "recordActivity: failed to write",
    );
  }
}
