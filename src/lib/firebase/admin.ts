import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

import { env } from "@/lib/env";

/**
 * Server-only Admin SDK singleton (R-ARC-06). In emulator mode no service
 * account is configured at all (env.ts only requires FIREBASE_CLIENT_EMAIL/
 * FIREBASE_PRIVATE_KEY when USE_FIREBASE_EMULATORS is false) — the Admin
 * SDK's auth module reads FIREBASE_AUTH_EMULATOR_HOST from process.env
 * itself (verified in node_modules/firebase-admin/lib/auth/auth-api-request.js)
 * and the emulator does not validate credentials, so no credential is
 * needed for that path.
 */
let cachedApp: App | undefined;

/** Shared across every Admin SDK service (Auth here, Firestore in
 * src/lib/repos/admin-firestore.ts) so they reuse one initialized app. */
export function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  cachedApp = env.USE_FIREBASE_EMULATORS
    ? initializeApp({
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
      })
    : initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          // Service-account JSON stores newlines as literal "\n" sequences;
          // the SDK needs a real private key with actual newlines.
          privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
      });

  return cachedApp;
}

let cachedAuth: Auth | undefined;

export function getAdminAuth(): Auth {
  cachedAuth ??= getAuth(getAdminApp());
  return cachedAuth;
}

// `Bucket` is @google-cloud/storage's type, a transitive dependency (pulled
// in by firebase-admin) that pnpm's strict node_modules doesn't expose for
// direct import — inferred via ReturnType instead of adding it as an
// explicit dependency just for this one type.
type Bucket = ReturnType<ReturnType<typeof getStorage>["bucket"]>;

let cachedBucket: Bucket | undefined;

export function getAdminStorageBucket(): Bucket {
  cachedBucket ??= getStorage(getAdminApp()).bucket();
  return cachedBucket;
}
