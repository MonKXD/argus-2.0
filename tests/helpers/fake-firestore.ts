/**
 * A minimal in-memory fake of the Admin SDK's Firestore surface, shared by
 * repo unit tests (FirestoreStore, AnalysisRepo, and future repos). Exercises
 * each repo's own logic (paths, batching, upsert-by-id, converter wiring,
 * simple query filters) against real demo fixtures and the real
 * zodConverter — not the Firestore service itself, which real-emulator
 * tests (see T-3.02/T-3.03's PROJECT_MEMORY entries) cover separately.
 */
import type { Firestore } from "firebase-admin/firestore";

export interface FakeConverter {
  toFirestore(data: unknown): unknown;
  fromFirestore(snapshot: { data(): unknown }): unknown;
}

interface WhereClause {
  field: string;
  value: unknown;
}

interface OrderByClause {
  field: string;
  direction: "asc" | "desc";
}

function readField(record: unknown, field: string): unknown {
  return (record as Record<string, unknown>)[field];
}

export class FakeDocRef {
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

  async get(): Promise<{ exists: boolean; data(): unknown }> {
    const raw = this.store.get(this.path);
    return {
      exists: raw !== undefined,
      data: () =>
        raw === undefined
          ? undefined
          : this.converter
            ? this.converter.fromFirestore({ data: () => raw })
            : raw,
    };
  }
}

export class FakeCollectionRef {
  constructor(
    private readonly store: Map<string, unknown>,
    private readonly path: string,
    private readonly converter: FakeConverter | undefined,
    private readonly wheres: WhereClause[] = [],
    private readonly orderBys: OrderByClause[] = [],
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
    return new FakeCollectionRef(this.store, this.path, converter, this.wheres, this.orderBys);
  }

  where(field: string, _op: "==", value: unknown): FakeCollectionRef {
    return new FakeCollectionRef(
      this.store,
      this.path,
      this.converter,
      [...this.wheres, { field, value }],
      this.orderBys,
    );
  }

  orderBy(field: string, direction: "asc" | "desc" = "asc"): FakeCollectionRef {
    return new FakeCollectionRef(this.store, this.path, this.converter, this.wheres, [
      ...this.orderBys,
      { field, direction },
    ]);
  }

  async get(): Promise<{ docs: { data(): unknown }[] }> {
    const prefix = `${this.path}/`;
    let entries = [...this.store.entries()].filter(
      ([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"),
    );

    for (const clause of this.wheres) {
      entries = entries.filter(([, value]) => readField(value, clause.field) === clause.value);
    }

    for (const clause of this.orderBys) {
      entries = [...entries].sort((a, b) => {
        const av = readField(a[1], clause.field);
        const bv = readField(b[1], clause.field);
        const cmp = av! < bv! ? -1 : av! > bv! ? 1 : 0;
        return clause.direction === "desc" ? -cmp : cmp;
      });
    }

    const docs = entries.map(([, value]) => ({
      data: () => (this.converter ? this.converter.fromFirestore({ data: () => value }) : value),
    }));
    return { docs };
  }
}

export class FakeBatch {
  private readonly ops: (() => Promise<void>)[] = [];

  set(docRef: FakeDocRef, data: unknown): void {
    this.ops.push(() => docRef.set(data));
  }

  async commit(): Promise<void> {
    for (const op of this.ops) await op();
  }
}

export function createFakeFirestore(): { db: Firestore; store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  const db = {
    collection: (name: string) => new FakeCollectionRef(store, name, undefined),
    batch: () => new FakeBatch(),
  };
  return { db: db as unknown as Firestore, store };
}
