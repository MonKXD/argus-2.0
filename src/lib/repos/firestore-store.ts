import type { EvidenceStore } from "@/lib/analysis/store/evidence-store";
import { zodConverter } from "@/lib/repos/converter";
import { DimensionAnalysis } from "@/lib/schema/claims";
import { Evidence, Fact, Source } from "@/lib/schema/evidence";
import { Report } from "@/lib/schema/report";
import { Run } from "@/lib/schema/run";

import type { CollectionReference, Firestore } from "firebase-admin/firestore";
import type { ZodType } from "zod";

/** Firestore's own per-batch write cap (stable platform limit). */
const MAX_BATCH_WRITES = 500;

/**
 * Backs `EvidenceStore` with the real Firestore model (SCHEMA.md section 6,
 * R-ARC-04: all writes server-side through the Admin SDK):
 *
 * analyses/{analysisId}/sources/{id}
 * analyses/{analysisId}/evidence/{id}
 * analyses/{analysisId}/facts/{id}
 * analyses/{analysisId}/runs/{runId}
 * analyses/{analysisId}/reports/{reportId}
 * analyses/{analysisId}/reports/{reportId}/dimensions/{dimensionKey}
 *
 * Mirrors `FileStore`'s layout and upsert-by-id semantics (R-ARC-03: steps
 * are idempotent, a re-run overwrites rather than duplicates) but as real
 * Firestore documents rather than JSON files, batched per R-DAT-03 ("Batch
 * writes. Never load all evidence for list views" — that second half is a
 * caller responsibility outside this class, which only implements the
 * engine-facing write/read surface `EvidenceStore` declares).
 */
export class FirestoreStore implements EvidenceStore {
  constructor(private readonly db: Firestore) {}

  async putSources(analysisId: string, sources: Source[]): Promise<void> {
    await this.batchSet(this.collection(analysisId, "sources", Source), sources);
  }

  async putEvidence(analysisId: string, items: Evidence[]): Promise<void> {
    await this.batchSet(this.collection(analysisId, "evidence", Evidence), items);
  }

  async listEvidence(analysisId: string): Promise<Evidence[]> {
    const snapshot = await this.collection(analysisId, "evidence", Evidence).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async putFacts(analysisId: string, facts: Fact[]): Promise<void> {
    await this.batchSet(this.collection(analysisId, "facts", Fact), facts);
  }

  async listFacts(analysisId: string): Promise<Fact[]> {
    const snapshot = await this.collection(analysisId, "facts", Fact).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async saveDimension(analysisId: string, reportId: string, d: DimensionAnalysis): Promise<void> {
    await this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("reports")
      .doc(reportId)
      .collection("dimensions")
      .doc(d.dimension)
      .withConverter(zodConverter(DimensionAnalysis))
      .set(d);
  }

  async saveReport(analysisId: string, report: Report): Promise<void> {
    await this.collection(analysisId, "reports", Report).doc(report.id).set(report);
  }

  async updateRun(analysisId: string, runId: string, patch: Partial<Run>): Promise<void> {
    // Firestore's field-level merge does the read-modify-write atomically
    // server-side — no read-then-write race the way FileStore needs one.
    await this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("runs")
      .doc(runId)
      .set(patch, { merge: true });
  }

  private collection<T extends { id: string }>(
    analysisId: string,
    name: string,
    schema: ZodType<T>,
  ) {
    return this.db
      .collection("analyses")
      .doc(analysisId)
      .collection(name)
      .withConverter(zodConverter(schema));
  }

  private async batchSet<T extends { id: string }>(
    collection: CollectionReference<T>,
    items: T[],
  ): Promise<void> {
    for (let start = 0; start < items.length; start += MAX_BATCH_WRITES) {
      const batch = this.db.batch();
      for (const item of items.slice(start, start + MAX_BATCH_WRITES)) {
        batch.set(collection.doc(item.id), item);
      }
      await batch.commit();
    }
  }
}
