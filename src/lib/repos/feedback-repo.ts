import { zodConverter } from "@/lib/repos/converter";
import { Feedback } from "@/lib/schema/feedback";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed repository for the top-level `feedback/{id}` collection
 * (SCHEMA.md section 6, T-6.11). Create-only: nothing in the app reads
 * feedback back — the project owner reads it directly during the beta.
 */
export class FeedbackRepo {
  constructor(private readonly db: Firestore) {}

  private collection() {
    return this.db.collection("feedback").withConverter(zodConverter(Feedback));
  }

  async create(feedback: Feedback): Promise<void> {
    await this.collection().doc(feedback.id).set(feedback);
  }
}
