import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

// T-6.08 (observability, NFR-08): Edge runtime error tracking (src/proxy.ts,
// the auth-redirect middleware — the only Edge-runtime code in this app).
// Same no-DSN-means-no-op behaviour as instrumentation-node.ts.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
