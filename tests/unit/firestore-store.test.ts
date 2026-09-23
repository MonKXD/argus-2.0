import { describe, expect, it } from "vitest";

import {
  loopwellDimensions,
  loopwellEvidence,
  loopwellFacts,
  loopwellReport,
  loopwellSources,
} from "@/demo/loopwell";
import { fernwayHealthRun } from "@/demo/portfolio";
import { FirestoreStore } from "@/lib/repos/firestore-store";

import { createFakeFirestore } from "../helpers/fake-firestore";

describe("FirestoreStore", () => {
  it("putSources / putEvidence / putFacts upsert by id under the analysis document", async () => {
    const { db, store } = createFakeFirestore();
    const analysisId = loopwellSources[0]!.analysisId;
    const firestoreStore = new FirestoreStore(db);

    await firestoreStore.putSources(analysisId, loopwellSources);
    await firestoreStore.putEvidence(analysisId, loopwellEvidence);
    await firestoreStore.putFacts(analysisId, loopwellFacts);

    for (const source of loopwellSources) {
      expect(store.get(`analyses/${analysisId}/sources/${source.id}`)).toBeDefined();
    }
    for (const evidence of loopwellEvidence) {
      expect(store.get(`analyses/${analysisId}/evidence/${evidence.id}`)).toEqual(evidence);
    }
    for (const fact of loopwellFacts) {
      expect(store.get(`analyses/${analysisId}/facts/${fact.id}`)).toEqual(fact);
    }
  });

  it("re-running put* overwrites rather than duplicates (R-ARC-03 idempotency)", async () => {
    const { db, store } = createFakeFirestore();
    const analysisId = loopwellSources[0]!.analysisId;
    const firestoreStore = new FirestoreStore(db);

    await firestoreStore.putSources(analysisId, loopwellSources);
    await firestoreStore.putSources(analysisId, loopwellSources);

    const sourceKeys = [...store.keys()].filter((key) =>
      key.startsWith(`analyses/${analysisId}/sources/`),
    );
    expect(sourceKeys).toHaveLength(loopwellSources.length);
  });

  it("listEvidence and listFacts read back exactly what was written, validated through the real Zod schema", async () => {
    const { db } = createFakeFirestore();
    const analysisId = loopwellSources[0]!.analysisId;
    const firestoreStore = new FirestoreStore(db);

    await firestoreStore.putEvidence(analysisId, loopwellEvidence);
    await firestoreStore.putFacts(analysisId, loopwellFacts);

    const readEvidence = await firestoreStore.listEvidence(analysisId);
    const readFacts = await firestoreStore.listFacts(analysisId);

    expect(readEvidence).toHaveLength(loopwellEvidence.length);
    expect(readFacts).toHaveLength(loopwellFacts.length);
    expect(new Set(readEvidence.map((e) => e.id))).toEqual(
      new Set(loopwellEvidence.map((e) => e.id)),
    );
  });

  it("listEvidence throws if a stored document no longer matches the schema (the read boundary actually validates)", async () => {
    const { db, store } = createFakeFirestore();
    const analysisId = loopwellSources[0]!.analysisId;
    const firestoreStore = new FirestoreStore(db);

    await firestoreStore.putEvidence(analysisId, [loopwellEvidence[0]!]);
    store.set(`analyses/${analysisId}/evidence/${loopwellEvidence[0]!.id}`, { not: "valid" });

    await expect(firestoreStore.listEvidence(analysisId)).rejects.toThrow();
  });

  it("saveDimension writes under reports/{reportId}/dimensions/{dimensionKey}", async () => {
    const { db, store } = createFakeFirestore();
    const analysisId = loopwellReport.analysisId;
    const firestoreStore = new FirestoreStore(db);
    const dimension = loopwellDimensions[0]!;

    await firestoreStore.saveDimension(analysisId, loopwellReport.id, dimension);

    expect(
      store.get(
        `analyses/${analysisId}/reports/${loopwellReport.id}/dimensions/${dimension.dimension}`,
      ),
    ).toEqual(dimension);
  });

  it("saveReport writes under reports/{reportId}", async () => {
    const { db, store } = createFakeFirestore();
    const analysisId = loopwellReport.analysisId;
    const firestoreStore = new FirestoreStore(db);

    await firestoreStore.saveReport(analysisId, loopwellReport);

    expect(store.get(`analyses/${analysisId}/reports/${loopwellReport.id}`)).toEqual(
      loopwellReport,
    );
  });

  it("updateRun merges a partial patch into the existing run document", async () => {
    const { db, store } = createFakeFirestore();
    const firestoreStore = new FirestoreStore(db);
    const path = `analyses/${fernwayHealthRun.analysisId}/runs/${fernwayHealthRun.id}`;
    store.set(path, fernwayHealthRun);

    await firestoreStore.updateRun(fernwayHealthRun.analysisId, fernwayHealthRun.id, {
      status: "SUCCEEDED",
    });

    expect(store.get(path)).toEqual({ ...fernwayHealthRun, status: "SUCCEEDED" });
  });

  it("chunks a large putEvidence call across multiple batch commits at Firestore's 500-write cap", async () => {
    const { db, store } = createFakeFirestore();
    const analysisId = loopwellEvidence[0]!.analysisId;
    const firestoreStore = new FirestoreStore(db);
    const template = loopwellEvidence[0]!;
    const many = Array.from({ length: 501 }, (_, i) => ({
      ...template,
      id: `ev_${String(i).padStart(26, "0")}`,
    }));

    await firestoreStore.putEvidence(analysisId, many);

    const written = [...store.keys()].filter((key) =>
      key.startsWith(`analyses/${analysisId}/evidence/`),
    );
    expect(written).toHaveLength(501);
  });
});
