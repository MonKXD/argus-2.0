import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import type { ZodType } from "zod";

/**
 * A generic Zod-validated Firestore converter (R-COD-02/R-COD-03: types are
 * z.infer of the schemas in src/lib/schema; Firestore reads are a named
 * validation boundary). Reads are validated: Firestore does not enforce a
 * schema, so a document written by an older app version or a manual console
 * edit must not be trusted as-is. Writes are not re-validated here — the
 * caller's TypeScript types (the same z.infer<Schema> the read side
 * produces) already guarantee shape, and Firestore's own WithFieldValue/
 * PartialWithFieldValue types allow FieldValue sentinels (e.g. serverTimestamp())
 * that aren't valid Zod input in the first place.
 */
export function zodConverter<T extends DocumentData>(schema: ZodType<T>): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject) {
      return modelObject as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return schema.parse(snapshot.data());
    },
  };
}
