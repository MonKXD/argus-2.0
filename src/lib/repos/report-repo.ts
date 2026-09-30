import { zodConverter } from "@/lib/repos/converter";
import { DimensionAnalysis } from "@/lib/schema/claims";
import { Report } from "@/lib/schema/report";
import { DIMENSION_KEYS } from "@/lib/schema/rubrics";

import type { Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed read repository for `analyses/{id}/reports/{id}` and its
 * `dimensions/{key}` subcollection (SCHEMA.md section 6), used by the
 * report page (T-4.01). `FirestoreStore`/`EvidenceStore` (T-3.02) only
 * exposes `saveReport`/`saveDimension` — the engine's own write surface —
 * with no read methods, since nothing needed one until the report page
 * itself (D-038/D-057's "don't build ahead of need").
 */
export class ReportRepo {
  constructor(private readonly db: Firestore) {}

  async getReport(analysisId: string, reportId: string): Promise<Report | null> {
    const snapshot = await this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("reports")
      .doc(reportId)
      .withConverter(zodConverter(Report))
      .get();
    return snapshot.exists ? snapshot.data()! : null;
  }

  /** Every version of this analysis's report, newest first (T-4.11: version
   * history / selector, FR-RPT-19). One document per run (R-DAT-04: a
   * re-run never mutates a prior report, it creates a new one), so this
   * collection stays small and bounded — reading full `Report` docs is fine
   * at this scale (same call as T-3.04's own list read, D-059). */
  async list(analysisId: string): Promise<Report[]> {
    const snapshot = await this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("reports")
      .withConverter(zodConverter(Report))
      .get();
    return snapshot.docs.map((doc) => doc.data()).sort((a, b) => b.version - a.version);
  }

  /** All 8 dimensions for a report, in `DIMENSION_KEYS`' canonical order — a
   * dimension that failed its run (`Run.dimensionStatus`) simply has no
   * document, so the result may have fewer than 8 entries. */
  async listDimensions(analysisId: string, reportId: string): Promise<DimensionAnalysis[]> {
    const collection = this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("reports")
      .doc(reportId)
      .collection("dimensions")
      .withConverter(zodConverter(DimensionAnalysis));
    const snapshot = await collection.get();
    // Keyed by the document's own `dimension` field, not the doc id — the
    // two happen to be equal (`saveDimension` uses `d.dimension` as the doc
    // id), but the data's own field is the one thing every `QueryDocumentSnapshot`-like object is guaranteed to carry.
    const byKey = new Map(snapshot.docs.map((doc) => [doc.data().dimension, doc.data()]));
    return DIMENSION_KEYS.map((key) => byKey.get(key)).filter((d) => d !== undefined);
  }
}
