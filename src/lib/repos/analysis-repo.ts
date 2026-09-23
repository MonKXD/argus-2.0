import { zodConverter } from "@/lib/repos/converter";
import { Analysis } from "@/lib/schema/analysis";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed repository for `analyses/{id}` (SCHEMA.md section 6),
 * used by the Analyses API (T-3.04). `EvidenceStore`/`FirestoreStore`
 * (T-3.02) doesn't cover this — that interface is the engine's own
 * evidence/report/run surface, not the analysis summary document the
 * dashboard, wizard and API routes read and write (D-057).
 */
export class AnalysisRepo {
  constructor(private readonly db: Firestore) {}

  private collection() {
    return this.db.collection("analyses").withConverter(zodConverter(Analysis));
  }

  async create(analysis: Analysis): Promise<void> {
    await this.collection().doc(analysis.id).set(analysis);
  }

  async get(id: string): Promise<Analysis | null> {
    const snapshot = await this.collection().doc(id).get();
    return snapshot.exists ? snapshot.data()! : null;
  }

  async update(id: string, patch: Partial<Analysis>): Promise<void> {
    await this.collection().doc(id).set(patch, { merge: true });
  }

  /**
   * All of the owner's analyses, newest-updated first. Filtering, sorting
   * to a different order and pagination happen in the caller (the route
   * handler) over this in-memory list rather than as Firestore query
   * clauses — see D-059: free-text `q` search has no Firestore-native
   * answer without new infrastructure or a schema change, and one owner's
   * own analysis-summary documents are a small, bounded set, so loading
   * them all is an acceptable, documented trade-off rather than premature
   * search infrastructure.
   */
  async listByOwner(ownerId: string): Promise<Analysis[]> {
    const snapshot = await this.collection()
      .where("ownerId", "==", ownerId)
      .orderBy("updatedAt", "desc")
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
