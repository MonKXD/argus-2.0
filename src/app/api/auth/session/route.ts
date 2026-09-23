import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { env } from "@/lib/env";
import { getAdminAuth } from "@/lib/firebase/admin";
import { logger } from "@/lib/logger";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const SessionRequestBody = z.object({ idToken: z.string().min(1) });

/**
 * TRD section 8: exchange a client-side Firebase ID token for a server-set,
 * httpOnly session cookie. Requires the ID token to have been issued very
 * recently (Firebase's own "Manage Session Cookies" guidance) so an old,
 * possibly-leaked ID token can't be replayed to mint a fresh long-lived
 * session cookie.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);

    const body = SessionRequestBody.safeParse(await request.json());
    if (!body.success) {
      throw new ApiError("VALIDATION_FAILED", "A Firebase ID token is required.");
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(body.data.idToken, true).catch(() => {
      throw new ApiError("UNAUTHENTICATED", "Sign-in failed. Try again.");
    });

    if (Date.now() - decoded.auth_time * 1000 > FIVE_MINUTES_MS) {
      throw new ApiError("UNAUTHENTICATED", "Sign-in expired. Try again.");
    }

    const expiresIn = Math.min(
      Math.max(env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000, FIVE_MINUTES_MS),
      TWO_WEEKS_MS,
    );
    const sessionCookie = await auth.createSessionCookie(body.data.idToken, { expiresIn });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(env.SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

/** Sign-out: revoke the user's refresh tokens (closes any other live session
 * cookies immediately, not just this one) and clear the cookie. */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

    if (sessionCookie) {
      const auth = getAdminAuth();
      await auth
        .verifySessionCookie(sessionCookie)
        .then((decoded) => auth.revokeRefreshTokens(decoded.uid))
        .catch((error: unknown) => {
          // Already invalid/expired: nothing to revoke, still clear the cookie.
          logger.info({ reason: error instanceof Error ? error.name : "unknown" }, "sign-out: cookie already invalid");
        });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete({ name: env.SESSION_COOKIE_NAME, path: "/" });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
