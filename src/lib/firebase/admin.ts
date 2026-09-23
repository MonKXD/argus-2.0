import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

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

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  cachedApp = env.USE_FIREBASE_EMULATORS
    ? initializeApp({ projectId: env.FIREBASE_PROJECT_ID })
    : initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          // Service-account JSON stores newlines as literal "\n" sequences;
          // the SDK needs a real private key with actual newlines.
          privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        projectId: env.FIREBASE_PROJECT_ID,
      });

  return cachedApp;
}

let cachedAuth: Auth | undefined;

export function getAdminAuth(): Auth {
  cachedAuth ??= getAuth(getAdminApp());
  return cachedAuth;
}
