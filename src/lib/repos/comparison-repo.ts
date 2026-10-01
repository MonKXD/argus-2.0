import { zodConverter } from "@/lib/repos/converter";
import { Comparison } from "@/lib/schema/comparison";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed repository for the top-level `comparisons/{id}`
 * collection (SCHEMA.md section 6), used by the Comparisons API (T-5.01).
 * Same shape as `AnalysisRepo` — a small, server-only summary collection,
 * not the engine's own read/write surface.
 */
export class ComparisonRepo {
  constructor(private readonly db: Firestore) {}

  private collection() {
    return this.db.collection("comparisons").withConverter(zodConverter(Comparison));
  }

  async create(comparison: Comparison): Promise<void> {
    await this.collection().doc(comparison.id).set(comparison);
  }

  async get(id: string): Promise<Comparison | null> {
    const snapshot = await this.collection().doc(id).get();
    return snapshot.exists ? snapshot.data()! : null;
  }

  async delete(id: string): Promise<void> {
    await this.collection().doc(id).delete();
  }

  /** All of the owner's saved comparisons, newest first (FR-CMP-06:
   * "save, revisit and delete"). Same small-bounded-collection reasoning
   * as `AnalysisRepo.listByOwner` (D-059) — a composite index already
   * exists for this exact query (`firestore.indexes.json`). */
  async listByOwner(ownerId: string): Promise<Comparison[]> {
    const snapshot = await this.collection()
      .where("ownerId", "==", ownerId)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
