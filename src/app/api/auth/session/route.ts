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

    // One-time diagnostic: a real ID token from the real project verifies
    // successfully every time when tested directly against this exact
    // dependency set outside Vercel (both a REST-API-issued token and a
    // real firebase/auth SDK-issued token), so something about *this*
    // request in *this* runtime must differ. The JWT header (alg, kid) and
    // structural claims (aud, iss, exp, iat) are not secrets — logging them
    // plus the token's own length is the only way left to see whether the
    // token is arriving intact and whether this runtime really is what it
    // claims to be.
    try {
      const [headerB64, payloadB64] = body.data.idToken.split(".");
      const header = JSON.parse(Buffer.from(headerB64 ?? "", "base64url").toString());
      const payload = JSON.parse(Buffer.from(payloadB64 ?? "", "base64url").toString());
      logger.warn(
        {
          tokenLength: body.data.idToken.length,
          tokenSegments: body.data.idToken.split(".").length,
          header,
          aud: payload.aud,
          iss: payload.iss,
          exp: payload.exp,
          iat: payload.iat,
          nodeVersion: process.version,
          configuredProjectId: env.FIREBASE_PROJECT_ID,
        },
        "verifyIdToken diagnostic",
      );
    } catch (decodeError) {
      logger.warn(
        { errorName: decodeError instanceof Error ? decodeError.name : "unknown" },
        "verifyIdToken diagnostic: could not decode token for inspection",
      );
    }

    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(body.data.idToken, true).catch((error: unknown) => {
      // Firebase Admin's own error code/name/message is operational status,
      // not document content or a credential — R-SEC-04 doesn't cover it,
      // and without this the real cause (expired token vs. a misconfigured
      // service account vs. a project mismatch) is otherwise unrecoverable
      // from logs. `auth/argument-error` alone (the code) covers several
      // distinct failures — the message is what actually distinguishes them.
      logger.warn(
        {
          errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined,
          errorName: error instanceof Error ? error.name : "unknown",
          errorMessage: error instanceof Error ? error.message : undefined,
        },
        "verifyIdToken failed",
      );
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
