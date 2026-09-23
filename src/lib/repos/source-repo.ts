import { zodConverter } from "@/lib/repos/converter";
import { Evidence, Source } from "@/lib/schema/evidence";

import type { CollectionReference, Firestore } from "firebase-admin/firestore";

/** Firestore's own per-batch write cap (stable platform limit). */
const MAX_BATCH_WRITES = 500;

/**
 * Firestore-backed repository for `analyses/{id}/sources` and the subset of
 * `analyses/{id}/evidence` that belongs to one source (SCHEMA.md section 6),
 * used by the sources API (T-3.06). `FirestoreStore`/`EvidenceStore`
 * (T-3.02) only exposes `putSources`/`putEvidence`/`listEvidence` — the
 * engine's own write/list surface — with no `get`, per-source `list`, or
 * `delete`, because nothing needed them yet (D-038/D-057's "don't build
 * ahead of need"). The sources API is that real need: it has to show a
 * user their already-registered sources when they return to the wizard,
 * and remove one (with its evidence) on request.
 */
export class SourceRepo {
  constructor(private readonly db: Firestore) {}

  private sources(analysisId: string): CollectionReference<Source> {
    return this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("sources")
      .withConverter(zodConverter(Source));
  }

  private evidence(analysisId: string): CollectionReference<Evidence> {
    return this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("evidence")
      .withConverter(zodConverter(Evidence));
  }

  /** Registers a source and its already-extracted evidence together (T-3.06's own INGEST-at-registration design). */
  async create(source: Source, evidence: Evidence[]): Promise<void> {
    await this.sources(source.analysisId).doc(source.id).set(source);

    const collection = this.evidence(source.analysisId);
    for (let start = 0; start < evidence.length; start += MAX_BATCH_WRITES) {
      const batch = this.db.batch();
      for (const item of evidence.slice(start, start + MAX_BATCH_WRITES)) {
        batch.set(collection.doc(item.id), item);
      }
      await batch.commit();
    }
  }

  /** All sources for an analysis, in the order they were added. */
  async list(analysisId: string): Promise<Source[]> {
    const snapshot = await this.sources(analysisId).orderBy("addedAt", "asc").get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async get(analysisId: string, sourceId: string): Promise<Source | null> {
    const snapshot = await this.sources(analysisId).doc(sourceId).get();
    return snapshot.exists ? snapshot.data()! : null;
  }

  /** Deletes a source and every evidence item derived from it (R-DAT-05's cascade principle, applied per-source). */
  async delete(analysisId: string, sourceId: string): Promise<void> {
    const evidenceSnapshot = await this.evidence(analysisId)
      .where("sourceId", "==", sourceId)
      .get();
    const refs = [
      this.sources(analysisId).doc(sourceId),
      ...evidenceSnapshot.docs.map((doc) => doc.ref),
    ];

    for (let start = 0; start < refs.length; start += MAX_BATCH_WRITES) {
      const batch = this.db.batch();
      for (const ref of refs.slice(start, start + MAX_BATCH_WRITES)) {
        batch.delete(ref);
      }
      await batch.commit();
    }
  }
}
