import { createPublicKey, verify as cryptoVerify, type JsonWebKeyInput } from "node:crypto";

import { env } from "@/lib/env";

import { getAdminAuth } from "./admin";

/**
 * Replaces `firebase-admin`'s own `Auth.verifyIdToken()` for signature and
 * claim verification. `verifyIdToken()` is broken on Vercel's production
 * runtime: `jwks-rsa@4.1.0` (the only version `firebase-admin@14.4.0`
 * accepts) declares a dependency on `jose@^6.1.3`, which is pure ESM, while
 * `jwks-rsa` itself loads it via CommonJS `require()` — that alone crashes
 * outright (`ERR_REQUIRE_ESM`), which an earlier fix worked around with a
 * scoped `jose@4` pnpm override for `jwks-rsa`'s own resolution. That
 * masks the crash but not a second, deeper problem: proven live, on the
 * exact same runtime, in the exact same request, with a real ID token from
 * the real project — an independent signature check using nothing but
 * Node's own `crypto` module reports the signature VALID, while
 * `firebase-admin`'s `verifyIdToken()` reports it INVALID
 * (`auth/argument-error`, "invalid signature") for that identical token.
 * The bug is conclusively inside the `jwks-rsa`/`jose` pipeline on this
 * runtime, not the token, the project config, or Node itself.
 *
 * `verifySessionCookie()` (used by `requireUser()` on every subsequent
 * request) is a *different* code path in `firebase-admin` — it fetches
 * plain X.509 certificates from a different Google endpoint
 * (`UrlKeyFetcher`) and never touches `jose`/`jwks-rsa` at all, so it is
 * not affected and stays as-is. Likewise `createSessionCookie()` and
 * `getUser()` are authenticated REST calls signed via `google-auth-library`,
 * an unrelated dependency. Only ID-token signature verification is broken,
 * so only that one piece is replaced here.
 */

const JWKS_URL = "https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com";
const DEFAULT_JWKS_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_TOLERANCE_S = 5 * 60;

interface GoogleJwk {
  kid: string;
  [key: string]: unknown;
}

interface CachedJwks {
  keys: GoogleJwk[];
  expiresAt: number;
}

let cachedJwks: CachedJwks | undefined;

function parseMaxAgeMs(cacheControl: string | null): number | undefined {
  if (!cacheControl) return undefined;
  const match = /max-age=(\d+)/.exec(cacheControl);
  return match ? Number(match[1]) * 1000 : undefined;
}

async function fetchGoogleSigningKeys(): Promise<GoogleJwk[]> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) {
    return cachedJwks.keys;
  }
  const res = await fetch(JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google's signing keys: ${res.status}`);
  }
  const body = (await res.json()) as { keys?: GoogleJwk[] };
  if (!Array.isArray(body.keys)) {
    throw new Error("Google's signing-keys response had no keys array.");
  }
  const ttl = parseMaxAgeMs(res.headers.get("cache-control")) ?? DEFAULT_JWKS_TTL_MS;
  cachedJwks = { keys: body.keys, expiresAt: Date.now() + ttl };
  return body.keys;
}

function base64UrlJsonSegment(segment: string | undefined): Record<string, unknown> {
  if (!segment) throw new Error("Token is missing a JWT segment.");
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
}

export interface VerifiedIdToken {
  uid: string;
  authTime: number;
  email: string | undefined;
}

export class IdTokenVerificationError extends Error {}

/**
 * Verifies a Firebase ID token's signature and standard claims (exp, iat,
 * aud, iss) using only `node:crypto` against Google's own published
 * signing keys, then replicates `verifyIdToken(idToken, true)`'s
 * revocation/disabled check via `getAdminAuth().getUser()` (unaffected by
 * the bug this works around — see the module doc comment).
 */
export async function verifyIdTokenManually(idToken: string): Promise<VerifiedIdToken> {
  const [headerB64, payloadB64, signatureB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new IdTokenVerificationError("Token is not a well-formed JWT.");
  }

  const header = base64UrlJsonSegment(headerB64);
  const payload = base64UrlJsonSegment(payloadB64);

  if (header.alg !== "RS256") {
    throw new IdTokenVerificationError(`Unexpected token algorithm "${String(header.alg)}".`);
  }

  const keys = await fetchGoogleSigningKeys();
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw new IdTokenVerificationError("No signing key matches this token's key ID.");
  }

  const publicKey = createPublicKey({ key: jwk, format: "jwk" } as JsonWebKeyInput);
  const signedData = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(signatureB64, "base64url");
  if (!cryptoVerify("RSA-SHA256", signedData, publicKey, signature)) {
    throw new IdTokenVerificationError("Token signature is invalid.");
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp;
  const iat = payload.iat;
  const authTime = payload.auth_time;
  const sub = payload.sub;
  if (typeof exp !== "number" || exp + CLOCK_SKEW_TOLERANCE_S < now) {
    throw new IdTokenVerificationError("Token has expired.");
  }
  if (typeof iat !== "number" || iat - CLOCK_SKEW_TOLERANCE_S > now) {
    throw new IdTokenVerificationError("Token used before issued.");
  }
  if (payload.aud !== env.FIREBASE_PROJECT_ID) {
    throw new IdTokenVerificationError('Token has an incorrect "aud" (audience) claim.');
  }
  if (payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) {
    throw new IdTokenVerificationError('Token has an incorrect "iss" (issuer) claim.');
  }
  if (typeof sub !== "string" || sub.length === 0) {
    throw new IdTokenVerificationError('Token has no "sub" (subject) claim.');
  }
  if (typeof authTime !== "number") {
    throw new IdTokenVerificationError('Token has no "auth_time" claim.');
  }

  const user = await getAdminAuth().getUser(sub);
  if (user.disabled) {
    throw new IdTokenVerificationError("The user record is disabled.");
  }
  if (user.tokensValidAfterTime) {
    const authTimeUtcMs = authTime * 1000;
    const validSinceUtcMs = new Date(user.tokensValidAfterTime).getTime();
    if (authTimeUtcMs < validSinceUtcMs) {
      throw new IdTokenVerificationError("Token has been revoked.");
    }
  }

  return { uid: sub, authTime, email: typeof payload.email === "string" ? payload.email : undefined };
}
