import { zodConverter } from "@/lib/repos/converter";
import { Signal } from "@/lib/schema/signal";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed repository for `analyses/{id}/signals` (SCHEMA.md
 * section 6), used by the scheduled signals job (T-6.01) and the future
 * signal-feed UI (T-6.02).
 */
export class SignalRepo {
  constructor(private readonly db: Firestore) {}

  private collection(analysisId: string) {
    return this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("signals")
      .withConverter(zodConverter(Signal));
  }

  async create(signal: Signal): Promise<void> {
    await this.collection(signal.analysisId).doc(signal.id).set(signal);
  }

  /** Every signal for an analysis, newest first — also used to dedupe
   * against a URL already surfaced as a signal. */
  async listByAnalysis(analysisId: string): Promise<Signal[]> {
    const snapshot = await this.collection(analysisId).orderBy("retrievedAt", "desc").get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
