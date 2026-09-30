import { zodConverter } from "@/lib/repos/converter";
import { ChecklistItem, DimensionAnalysis, Flag } from "@/lib/schema/claims";
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

  private reportDoc(analysisId: string, reportId: string) {
    return this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("reports")
      .doc(reportId)
      .withConverter(zodConverter(Report));
  }

  async getReport(analysisId: string, reportId: string): Promise<Report | null> {
    const snapshot = await this.reportDoc(analysisId, reportId).get();
    return snapshot.exists ? snapshot.data()! : null;
  }

  /**
   * T-4.12 (FR-RPT-21: "checklist tracking with notes"). `checklist` is an
   * array field on the `Report` document itself, not its own subcollection
   * (SCHEMA.md), so updating one item means replacing the whole array —
   * done inside a transaction (read, compute the new array, write) rather
   * than a plain read-then-write, since two concurrent PATCHes to
   * different items would otherwise race and silently drop one's change
   * (the same class of correctness concern as D-063's cancellation design).
   * Returns the updated item, or `null` if the report or the item doesn't
   * exist — the route handler turns either into a 404.
   */
  async updateChecklistItem(
    analysisId: string,
    reportId: string,
    itemId: string,
    patch: Partial<Pick<ChecklistItem, "status" | "userNote">>,
  ): Promise<ChecklistItem | null> {
    const docRef = this.reportDoc(analysisId, reportId);
    return this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      if (!snapshot.exists) return null;
      const report = snapshot.data()!;
      const index = report.checklist.findIndex((item) => item.id === itemId);
      if (index === -1) return null;

      const updated: ChecklistItem = { ...report.checklist[index]!, ...patch };
      const checklist = report.checklist.map((item, i) => (i === index ? updated : item));
      tx.set(docRef, { checklist }, { merge: true });
      return updated;
    });
  }

  /** T-4.12 (FR-RPT-21: "flag acknowledge"). Same array-field-on-`Report`,
   * same transaction reasoning as `updateChecklistItem`. */
  async updateFlagStatus(
    analysisId: string,
    reportId: string,
    flagId: string,
    status: Flag["status"],
  ): Promise<Flag | null> {
    const docRef = this.reportDoc(analysisId, reportId);
    return this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      if (!snapshot.exists) return null;
      const report = snapshot.data()!;
      const index = report.flags.findIndex((flag) => flag.id === flagId);
      if (index === -1) return null;

      const updated: Flag = { ...report.flags[index]!, status };
      const flags = report.flags.map((flag, i) => (i === index ? updated : flag));
      tx.set(docRef, { flags }, { merge: true });
      return updated;
    });
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
