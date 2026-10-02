import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";
import { REDACTED_FIELDS } from "@/lib/logger";

// T-6.08 (observability, NFR-08): Node.js runtime error tracking (route
// handlers, the run pipeline, cron/queue routes). No DSN configured means
// `Sentry.init` is simply never called — every capture call elsewhere is
// then a safe no-op (the SDK's own documented behaviour with no active
// client), not an error.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
    // R-SEC-04/R-AI-06: never send document text, quotes, prompts or model
    // output. Sentry's default scope never includes request bodies or our
    // own structured-log fields, but this is defence in depth matching the
    // logger's own redaction list (src/lib/logger.ts) for anything that
    // ends up in `extra`/`contexts` via a manually captured exception.
    beforeSend(event) {
      for (const field of REDACTED_FIELDS) {
        if (event.extra && field in event.extra) event.extra[field] = "[REDACTED]";
        if (event.contexts) {
          for (const context of Object.values(event.contexts)) {
            if (context && typeof context === "object" && field in context) {
              (context as Record<string, unknown>)[field] = "[REDACTED]";
            }
          }
        }
      }
      return event;
    },
  });
}
