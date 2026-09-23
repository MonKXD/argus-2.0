import { env } from "@/lib/env";

import { ForbiddenError } from "./errors";

/**
 * R-SEC-07: every mutating route checks the Origin header matches APP_URL,
 * defence in depth alongside the session cookie's SameSite=Lax. Shared here
 * since every mutating route from T-3.04 onward needs the same check.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(env.APP_URL).origin) {
    throw new ForbiddenError("Request origin not allowed.");
  }
}
