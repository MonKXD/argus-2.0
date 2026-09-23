import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getAdminApp } from "@/lib/firebase/admin";

/**
 * Server-only Firestore singleton (R-ARC-04, R-ARC-06). Reuses the shared
 * Admin app from src/lib/firebase/admin.ts. Like Auth, the emulator is
 * picked up automatically: @google-cloud/firestore reads
 * FIRESTORE_EMULATOR_HOST from process.env itself (verified in
 * @google-cloud/firestore's own build/src/index.js), so no explicit
 * settings() call is needed here for that.
 *
 * `ignoreUndefinedProperties: true` is required: the real Firestore client
 * throws on any `undefined` field value ("Cannot use undefined as a
 * Firestore value"), but every schema here has genuinely optional fields
 * (Source.url, Fact.period, ...) that a writer omits by setting them
 * `undefined`, not by leaving them off the object literal. T-3.02/T-3.04's
 * own real-emulator verification never wrote an object with an undefined
 * optional field, so this stayed latent until T-3.06's real upload
 * (`Source.url` undefined for a file source) hit it for real.
 *
 * `settings()` can only be called once per underlying `Firestore` instance,
 * before any other operation — but `getFirestore(app)` itself already
 * returns a shared instance keyed by `app` (firebase-admin's own registry,
 * not this module's `cachedFirestore`), and Next.js's per-route bundling
 * can load this module more than once (a real crash caught by driving the
 * actual app, not just unit tests, which each start a fresh module graph
 * and never see this): a second module instance's own `cachedFirestore` is
 * `undefined` again, so it calls `settings()` a second time on the same
 * already-configured underlying instance and throws "Firestore has already
 * been initialized." Swallowing exactly that one error is safe here since
 * every caller requests the identical settings.
 */
let cachedFirestore: Firestore | undefined;

export function getAdminFirestore(): Firestore {
  if (!cachedFirestore) {
    cachedFirestore = getFirestore(getAdminApp());
    try {
      cachedFirestore.settings({ ignoreUndefinedProperties: true });
    } catch (error) {
      const alreadyInitialized =
        error instanceof Error && error.message.includes("already been initialized");
      if (!alreadyInitialized) throw error;
    }
  }
  return cachedFirestore;
}
