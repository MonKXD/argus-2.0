import type { DimensionAnalysis } from "@/lib/schema/claims";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import type { Report } from "@/lib/schema/report";
import type { Run } from "@/lib/schema/run";

/**
 * TRD section 5.1 ("shapes, not final signatures"). The engine reads and
 * writes only through this interface (R-ARC-02) — never directly to
 * Firestore or the filesystem. Two implementations: `FileStore` (this
 * directory — CLI, evals, tests) and `FirestoreStore` (Phase 3,
 * `src/lib/repos`, Admin SDK, app-only).
 */
export interface EvidenceStore {
  putSources(analysisId: string, sources: Source[]): Promise<void>;
  putEvidence(analysisId: string, items: Evidence[]): Promise<void>;
  listEvidence(analysisId: string): Promise<Evidence[]>;
  putFacts(analysisId: string, facts: Fact[]): Promise<void>;
  listFacts(analysisId: string): Promise<Fact[]>;
  saveDimension(analysisId: string, reportId: string, d: DimensionAnalysis): Promise<void>;
  saveReport(analysisId: string, report: Report): Promise<void>;
  updateRun(analysisId: string, runId: string, patch: Partial<Run>): Promise<void>;
}
