import { NextResponse } from "next/server";

import { env } from "@/lib/env";

import type { NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (same runtime, same
 * `config.matcher` mechanism — file and export renamed only). TRD section 8
 * still calls this "middleware"; that's this project's pre-16 vocabulary; the
 * behaviour it describes (cookie presence only, fast redirect, no
 * cryptographic verification) is what this file does.
 *
 * Presence-only by design: this is a fast, cooperative redirect, not the
 * authorization boundary. requireUser() (src/lib/api/auth.ts) verifies the
 * cookie cryptographically against the Admin SDK in every protected server
 * component and route handler — that's the real boundary, per Next's own
 * guidance that a route excluded from Proxy's matcher must still authorize
 * itself.
 */
const PROTECTED_PREFIX = "/app";
const AUTH_ONLY_PATHS = new Set(["/login", "/signup"]);

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(env.SESSION_COOKIE_NAME);

  if (pathname.startsWith(PROTECTED_PREFIX) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_ONLY_PATHS.has(pathname) && hasSession) {
    return NextResponse.redirect(new URL(PROTECTED_PREFIX, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
