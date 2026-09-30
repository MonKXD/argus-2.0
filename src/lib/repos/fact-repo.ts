import { zodConverter } from "@/lib/repos/converter";
import { Fact } from "@/lib/schema/evidence";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed read repository for `analyses/{id}/facts` (SCHEMA.md
 * section 6), used by the evidence rail (T-4.08) to resolve an
 * `AI_ANALYSIS` claim's `basedOn` fact references. `FirestoreStore`/
 * `EvidenceStore` (T-3.02) only exposes `putFacts`/`listFacts` — the
 * engine's own write/list surface — with no app-specific read method until
 * now (D-038/D-057's "don't build ahead of need").
 */
export class FactRepo {
  constructor(private readonly db: Firestore) {}

  async list(analysisId: string): Promise<Fact[]> {
    const snapshot = await this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("facts")
      .withConverter(zodConverter(Fact))
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
