import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";

import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "../mocks/server";

const getUser = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ getUser }),
}));

const { verifyIdTokenManually, IdTokenVerificationError } = await import("@/lib/firebase/verify-id-token");

const JWKS_URL = "https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com";
const PROJECT_ID = "test-project"; // matches vitest.config.ts's FIREBASE_PROJECT_ID
const KID = "test-key-id";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" };

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signToken(claims: Record<string, unknown>, options: { kid?: string; alg?: string } = {}): string {
  const header = { alg: options.alg ?? "RS256", kid: options.kid ?? KID, typ: "JWT" };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(claims));
  const signature = cryptoSign("RSA-SHA256", Buffer.from(`${headerB64}.${payloadB64}`), privateKey);
  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

function realClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    auth_time: now,
    user_id: "user_1",
    sub: "user_1",
    iat: now,
    exp: now + 3600,
    email: "founder@example.com",
    ...overrides,
  };
}

describe("verifyIdTokenManually", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(http.get(JWKS_URL, () => HttpResponse.json({ keys: [jwk] })));
    getUser.mockResolvedValue({ disabled: false, tokensValidAfterTime: undefined });
  });

  it("verifies a real, correctly signed token and returns its claims", async () => {
    const token = signToken(realClaims());
    const result = await verifyIdTokenManually(token);
    expect(result).toEqual({ uid: "user_1", authTime: expect.any(Number), email: "founder@example.com" });
  });

  it("rejects a token whose signature was produced by a different key", async () => {
    const { privateKey: otherKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const claims = realClaims();
    const header = { alg: "RS256", kid: KID, typ: "JWT" };
    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(claims));
    const wrongSignature = cryptoSign("RSA-SHA256", Buffer.from(`${headerB64}.${payloadB64}`), otherKey);
    const token = `${headerB64}.${payloadB64}.${base64url(wrongSignature)}`;

    await expect(verifyIdTokenManually(token)).rejects.toThrow(IdTokenVerificationError);
  });

  it("rejects a token whose payload was tampered with after signing", async () => {
    const token = signToken(realClaims());
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    const tamperedPayload = base64url(JSON.stringify(realClaims({ email: "attacker@example.com" })));
    await expect(verifyIdTokenManually(`${headerB64}.${tamperedPayload}.${signatureB64}`)).rejects.toThrow(
      IdTokenVerificationError,
    );
  });

  it("rejects a non-RS256 token outright", async () => {
    const token = signToken(realClaims(), { alg: "none" });
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/algorithm/);
  });

  it("rejects an expired token", async () => {
    const token = signToken(realClaims({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/expired/);
  });

  it("rejects a token issued in the future beyond clock-skew tolerance", async () => {
    const token = signToken(realClaims({ iat: Math.floor(Date.now() / 1000) + 3600 }));
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/before issued/);
  });

  it("rejects a token with the wrong audience", async () => {
    const token = signToken(realClaims({ aud: "some-other-project" }));
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/audience/);
  });

  it("rejects a token with the wrong issuer", async () => {
    const token = signToken(realClaims({ iss: "https://securetoken.google.com/some-other-project" }));
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/issuer/);
  });

  it("rejects a token whose kid matches no fetched signing key", async () => {
    const token = signToken(realClaims(), { kid: "unknown-kid" });
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/key ID/);
  });

  it("rejects when the user account is disabled", async () => {
    getUser.mockResolvedValue({ disabled: true });
    const token = signToken(realClaims());
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/disabled/);
  });

  it("rejects a token issued before the user's tokens-valid-after time (revoked)", async () => {
    const authTime = Math.floor(Date.now() / 1000) - 120;
    getUser.mockResolvedValue({ disabled: false, tokensValidAfterTime: new Date().toISOString() });
    const token = signToken(realClaims({ auth_time: authTime, iat: authTime }));
    await expect(verifyIdTokenManually(token)).rejects.toThrow(/revoked/);
  });

  it("accepts a token issued after the user's tokens-valid-after time", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    getUser.mockResolvedValue({ disabled: false, tokensValidAfterTime: past });
    const token = signToken(realClaims());
    await expect(verifyIdTokenManually(token)).resolves.toMatchObject({ uid: "user_1" });
  });

  it("rejects a malformed (non-3-segment) token", async () => {
    await expect(verifyIdTokenManually("not-a-jwt")).rejects.toThrow(IdTokenVerificationError);
  });

  it("caches fetched signing keys instead of re-fetching on every call", async () => {
    // The module-level cache is shared across every other test in this
    // file, so verifying "does it actually cache" needs its own fresh
    // module instance rather than reusing the already-warmed one above.
    vi.resetModules();
    const fresh = await import("@/lib/firebase/verify-id-token");
    let fetchCount = 0;
    server.use(
      http.get(JWKS_URL, () => {
        fetchCount += 1;
        return HttpResponse.json({ keys: [jwk] }, { headers: { "cache-control": "max-age=3600" } });
      }),
    );
    await fresh.verifyIdTokenManually(signToken(realClaims()));
    await fresh.verifyIdTokenManually(signToken(realClaims()));
    expect(fetchCount).toBe(1);
  });
});
