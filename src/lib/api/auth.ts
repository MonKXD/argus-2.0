import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { getAdminAuth } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";

import { ForbiddenError, UnauthenticatedError } from "./errors";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
}

/**
 * TRD section 8 / R-SEC-01: every route handler and every protected server
 * component starts with this. Verifies the session cookie cryptographically
 * against the Admin SDK (unlike src/proxy.ts, which only checks presence for
 * a fast redirect) and checks it hasn't been revoked (sign-out, password
 * change). Never logs the cookie value itself (R-SEC-04) — only outcome.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    throw new UnauthenticatedError();
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch (error) {
    logger.info({ reason: error instanceof Error ? error.name : "unknown" }, "session cookie rejected");
    throw new UnauthenticatedError();
  }
}

/** R-SEC-01: any route touching a resource with an ownerId calls this. */
export function assertOwns(ownerId: string, user: AuthenticatedUser): void {
  if (ownerId !== user.uid) {
    throw new ForbiddenError();
  }
}
