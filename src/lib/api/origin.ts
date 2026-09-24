import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

import { ForbiddenError } from "./errors";

/**
 * R-SEC-07: every mutating route checks the Origin header matches APP_URL,
 * defence in depth alongside the session cookie's SameSite=Lax. Shared here
 * since every mutating route from T-3.04 onward needs the same check.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const expected = new URL(env.APP_URL).origin;
  if (!origin || origin !== expected) {
    // Both sides are public hostnames (never a secret or document content),
    // and this is the one place a mismatched APP_URL vs. actual deployment
    // domain would otherwise fail silently as a generic 403 — R-SEC-04
    // doesn't cover logging them.
    logger.warn({ origin, expected }, "assertSameOrigin: origin mismatch");
    throw new ForbiddenError("Request origin not allowed.");
  }
}
