import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getAdminApp } from "@/lib/firebase/admin";

/**
 * Server-only Firestore singleton (R-ARC-04, R-ARC-06). Reuses the shared
 * Admin app from src/lib/firebase/admin.ts. Like Auth, the emulator is
 * picked up automatically: @google-cloud/firestore reads
 * FIRESTORE_EMULATOR_HOST from process.env itself (verified in
 * @google-cloud/firestore's own build/src/index.js), so no explicit
 * settings() call is needed here.
 */
let cachedFirestore: Firestore | undefined;

export function getAdminFirestore(): Firestore {
  cachedFirestore ??= getFirestore(getAdminApp());
  return cachedFirestore;
}
