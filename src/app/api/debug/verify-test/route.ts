import { createPublicKey, verify as cryptoVerify, type JsonWebKeyInput } from "node:crypto";

import { NextResponse } from "next/server";

import { getAdminAuth } from "@/lib/firebase/admin";

/**
 * TEMPORARY diagnostic route, to be deleted once the "invalid signature"
 * bug is found. GET-only so it can be fetched through Vercel's own
 * infrastructure (web_fetch_vercel_url) without needing a real browser or
 * this sandbox's own blocked network path to the deployment domain. Takes
 * a real, short-lived ID token as a query param and reports both
 * firebase-admin's verifyIdToken result and an independent node:crypto-only
 * signature check side by side, plus runtime facts. No side effects, no
 * cookies, nothing persisted.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const idToken = new URL(request.url).searchParams.get("token");
  if (!idToken) {
    return NextResponse.json({ error: "missing ?token=" }, { status: 400 });
  }

  const [headerB64, payloadB64, signatureB64] = idToken.split(".");
  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(Buffer.from(headerB64 ?? "", "base64url").toString());
    payload = JSON.parse(Buffer.from(payloadB64 ?? "", "base64url").toString());
  } catch (e) {
    return NextResponse.json({ error: "could not decode token", detail: String(e) }, { status: 400 });
  }

  let manualCheck: { ok: boolean; detail: string };
  try {
    const kid = (header as { kid?: string }).kid;
    const res = await fetch("https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com");
    const jwks = (await res.json()) as { keys: { kid: string }[] };
    const jwk = jwks.keys.find((k) => k.kid === kid);
    if (!jwk) {
      manualCheck = { ok: false, detail: `no matching kid among ${jwks.keys.length} keys; wanted ${kid}` };
    } else {
      const publicKey = createPublicKey({ key: jwk, format: "jwk" } as JsonWebKeyInput);
      const signedData = Buffer.from(`${headerB64}.${payloadB64}`);
      const signature = Buffer.from(signatureB64 ?? "", "base64url");
      const valid = cryptoVerify("RSA-SHA256", signedData, publicKey, signature);
      manualCheck = { ok: valid, detail: valid ? "signature valid" : "signature INVALID via native crypto" };
    }
  } catch (e) {
    manualCheck = { ok: false, detail: `threw: ${e instanceof Error ? e.message : String(e)}` };
  }

  let adminCheck: { ok: boolean; code?: string; message?: string };
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    adminCheck = { ok: true, message: `uid=${decoded.uid}` };
  } catch (e) {
    adminCheck = {
      ok: false,
      code: e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : undefined,
      message: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json({
    tokenLength: idToken.length,
    tokenSegments: idToken.split(".").length,
    header,
    payload,
    nodeVersion: process.version,
    manualCheck,
    adminCheck,
  });
}
