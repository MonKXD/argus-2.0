import * as Sentry from "@sentry/nextjs";

import { clientEnv } from "@/lib/env";

// T-6.08 (observability, NFR-08): browser-side error tracking. Runs before
// hydration (Next's own instrumentation-client.ts convention, v15.3+). No
// DSN means Sentry.init is never called — capture calls elsewhere are then
// safe no-ops. The DSN is the one Sentry value R-SEC-03 names as safe to
// expose publicly (D-104) — everything else client code needs stays through
// the existing NEXT_PUBLIC_FIREBASE_* vars only.
if (clientEnv.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
