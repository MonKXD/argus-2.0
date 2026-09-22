import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { EvidenceStore } from "@/lib/analysis/store/evidence-store";
import type { DimensionAnalysis } from "@/lib/schema/claims";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import type { Report } from "@/lib/schema/report";
import type { Run } from "@/lib/schema/run";

/**
 * Backs `EvidenceStore` with plain JSON files under `rootDir`, one
 * directory per analysis, mirroring the Firestore model's subcollections
 * (SCHEMA.md section 6) so the on-disk layout reads the same way:
 *
 * <rootDir>/<analysisId>/sources.json
 * <rootDir>/<analysisId>/evidence.json
 * <rootDir>/<analysisId>/facts.json
 * <rootDir>/<analysisId>/runs/<runId>.json
 * <rootDir>/<analysisId>/reports/<reportId>.json
 * <rootDir>/<analysisId>/reports/<reportId>/dimensions/<dimensionKey>.json
 *
 * `put*` methods upsert by id, so re-running a step (R-ARC-03: steps are
 * idempotent) overwrites rather than duplicates.
 */
export class FileStore implements EvidenceStore {
  constructor(private readonly rootDir: string) {}

  async putSources(analysisId: string, sources: Source[]): Promise<void> {
    await this.upsertCollection(analysisId, "sources.json", sources);
  }

  async putEvidence(analysisId: string, items: Evidence[]): Promise<void> {
    await this.upsertCollection(analysisId, "evidence.json", items);
  }

  async listEvidence(analysisId: string): Promise<Evidence[]> {
    return this.readCollection<Evidence>(analysisId, "evidence.json");
  }

  async putFacts(analysisId: string, facts: Fact[]): Promise<void> {
    await this.upsertCollection(analysisId, "facts.json", facts);
  }

  async listFacts(analysisId: string): Promise<Fact[]> {
    return this.readCollection<Fact>(analysisId, "facts.json");
  }

  async saveDimension(analysisId: string, reportId: string, d: DimensionAnalysis): Promise<void> {
    await this.writeJson(
      this.path(analysisId, "reports", reportId, "dimensions", `${d.dimension}.json`),
      d,
    );
  }

  async saveReport(analysisId: string, report: Report): Promise<void> {
    await this.writeJson(this.path(analysisId, "reports", `${report.id}.json`), report);
  }

  async updateRun(analysisId: string, runId: string, patch: Partial<Run>): Promise<void> {
    const filePath = this.path(analysisId, "runs", `${runId}.json`);
    const existing = await this.readJson<Run>(filePath);
    await this.writeJson(filePath, { ...existing, ...patch });
  }

  private path(analysisId: string, ...segments: string[]): string {
    return join(this.rootDir, analysisId, ...segments);
  }

  private async upsertCollection<T extends { id: string }>(
    analysisId: string,
    filename: string,
    items: T[],
  ): Promise<void> {
    const filePath = this.path(analysisId, filename);
    const existing = (await this.readJson<T[]>(filePath)) ?? [];
    const byId = new Map(existing.map((item) => [item.id, item]));
    for (const item of items) byId.set(item.id, item);
    await this.writeJson(filePath, Array.from(byId.values()));
  }

  private async readCollection<T>(analysisId: string, filename: string): Promise<T[]> {
    return (await this.readJson<T[]>(this.path(analysisId, filename))) ?? [];
  }

  private async readJson<T>(filePath: string): Promise<T | undefined> {
    try {
      return JSON.parse(await readFile(filePath, "utf-8")) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw err;
    }
  }

  private async writeJson(filePath: string, data: unknown): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }
}
