import { zodConverter } from "@/lib/repos/converter";
import { Feedback } from "@/lib/schema/feedback";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed repository for the top-level `feedback/{id}` collection
 * (SCHEMA.md section 6, T-6.11). Create-only in the app's own UI — nothing
 * reads feedback back there, the project owner reads it directly during the
 * beta. `listByOwner` exists for T-6.12's "export all my data" only: the
 * feedback someone submitted is their own authored content, unlike
 * Evidence/Facts (derived processing artifacts T-6.12 deliberately excludes,
 * see D-108) — this is the one real caller, not speculative.
 */
export class FeedbackRepo {
  constructor(private readonly db: Firestore) {}

  private collection() {
    return this.db.collection("feedback").withConverter(zodConverter(Feedback));
  }

  async create(feedback: Feedback): Promise<void> {
    await this.collection().doc(feedback.id).set(feedback);
  }

  async listByOwner(ownerId: string): Promise<Feedback[]> {
    const snapshot = await this.collection().where("ownerId", "==", ownerId).get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
