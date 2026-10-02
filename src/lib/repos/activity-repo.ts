import { zodConverter } from "@/lib/repos/converter";
import { Activity } from "@/lib/schema/activity";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed repository for the top-level `activity/{id}` collection
 * (SCHEMA.md section 6), used by the dashboard's recent-activity feed
 * (FR-DSH-07, T-5.08). Same small-summary-collection shape as
 * `ComparisonRepo`/`AnalysisRepo` (D-057/D-082) — not the engine's own
 * `EvidenceStore` surface.
 */
export class ActivityRepo {
  constructor(private readonly db: Firestore) {}

  private collection() {
    return this.db.collection("activity").withConverter(zodConverter(Activity));
  }

  async create(activity: Activity): Promise<void> {
    await this.collection().doc(activity.id).set(activity);
  }

  /** Most recent activity first, capped so the feed stays a short,
   * bounded read rather than an ever-growing list query (D-059's own
   * bounded-collection reasoning, applied with an explicit cap since this
   * collection — unlike `analyses`/`comparisons` — has no natural ceiling
   * on how many records a long-lived owner accumulates). */
  async listByOwner(ownerId: string, limit = 10): Promise<Activity[]> {
    const snapshot = await this.collection()
      .where("ownerId", "==", ownerId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
