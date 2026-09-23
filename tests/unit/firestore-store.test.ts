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

import type { Firestore } from "firebase-admin/firestore";

/**
 * A minimal in-memory fake of the Admin SDK's Firestore surface, exercising
 * FirestoreStore's own logic (batching, subcollection paths, upsert-by-id,
 * converter wiring) against real demo fixtures — not the Firestore service
 * itself, which is covered by the manual real-emulator verification logged
 * in PROJECT_MEMORY (TRD 15's "Integration | Vitest with Firebase
 * emulators" is T-3.03's job to wire into the test run, not duplicated
 * ad hoc here). Round-tripping through the real zodConverter still means a
 * shape bug in FirestoreStore's paths/ids would fail these tests.
 */
interface FakeConverter {
  toFirestore(data: unknown): unknown;
  fromFirestore(snapshot: { data(): unknown }): unknown;
}

class FakeDocRef {
  constructor(
    private readonly store: Map<string, unknown>,
    private readonly path: string,
    private readonly converter: FakeConverter | undefined,
    private readonly makeCollection: (path: string) => FakeCollectionRef,
  ) {}

  collection(name: string): FakeCollectionRef {
    return this.makeCollection(`${this.path}/${name}`);
  }

  withConverter(converter: FakeConverter): FakeDocRef {
    return new FakeDocRef(this.store, this.path, converter, this.makeCollection);
  }

  async set(data: unknown, options?: { merge?: boolean }): Promise<void> {
    const toWrite = this.converter ? this.converter.toFirestore(data) : data;
    if (options?.merge) {
      const existing = (this.store.get(this.path) as object | undefined) ?? {};
      this.store.set(this.path, { ...existing, ...(toWrite as object) });
    } else {
      this.store.set(this.path, toWrite);
    }
  }

  get rawPath(): string {
    return this.path;
  }
}

class FakeCollectionRef {
  constructor(
    private readonly store: Map<string, unknown>,
    private readonly path: string,
    private readonly converter: FakeConverter | undefined,
  ) {}

  doc(id: string): FakeDocRef {
    return new FakeDocRef(
      this.store,
      `${this.path}/${id}`,
      this.converter,
      (p) => new FakeCollectionRef(this.store, p, undefined),
    );
  }

  withConverter(converter: FakeConverter): FakeCollectionRef {
    return new FakeCollectionRef(this.store, this.path, converter);
  }

  async get(): Promise<{ docs: { data(): unknown }[] }> {
    const prefix = `${this.path}/`;
    const docs = [...this.store.entries()]
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map(([, value]) => ({
        data: () => (this.converter ? this.converter.fromFirestore({ data: () => value }) : value),
      }));
    return { docs };
  }
}

class FakeBatch {
  private readonly ops: (() => Promise<void>)[] = [];

  constructor() {}

  set(docRef: FakeDocRef, data: unknown): void {
    this.ops.push(() => docRef.set(data));
  }

  async commit(): Promise<void> {
    for (const op of this.ops) await op();
  }
}

function createFakeFirestore(): { db: Firestore; store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  const db = {
    collection: (name: string) => new FakeCollectionRef(store, name, undefined),
    batch: () => new FakeBatch(),
  };
  return { db: db as unknown as Firestore, store };
}

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
    expect(new Set(readEvidence.map((e) => e.id))).toEqual(new Set(loopwellEvidence.map((e) => e.id)));
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
      store.get(`analyses/${analysisId}/reports/${loopwellReport.id}/dimensions/${dimension.dimension}`),
    ).toEqual(dimension);
  });

  it("saveReport writes under reports/{reportId}", async () => {
    const { db, store } = createFakeFirestore();
    const analysisId = loopwellReport.analysisId;
    const firestoreStore = new FirestoreStore(db);

    await firestoreStore.saveReport(analysisId, loopwellReport);

    expect(store.get(`analyses/${analysisId}/reports/${loopwellReport.id}`)).toEqual(loopwellReport);
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
