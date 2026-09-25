import { beforeEach, describe, expect, it, vi } from "vitest";

const createSessionCookie = vi.fn();
const verifySessionCookie = vi.fn();
const revokeRefreshTokens = vi.fn();
const cookiesGet = vi.fn();
const verifyIdTokenManually = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ createSessionCookie, verifySessionCookie, revokeRefreshTokens }),
}));

vi.mock("@/lib/firebase/verify-id-token", () => ({
  verifyIdTokenManually,
  IdTokenVerificationError: class IdTokenVerificationError extends Error {},
}));

const { POST, DELETE } = await import("@/app/api/auth/session/route");

const APP_ORIGIN = "http://localhost:3000";

function postRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request("http://localhost:3000/api/auth/session", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function deleteRequest(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request("http://localhost:3000/api/auth/session", { method: "DELETE", headers });
}

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(postRequest({ idToken: "tok" }, "https://evil.example"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(verifyIdTokenManually).not.toHaveBeenCalled();
  });

  it("rejects a request with no origin header", async () => {
    const response = await POST(postRequest({ idToken: "tok" }, null));
    expect(response.status).toBe(403);
  });

  it("rejects an invalid body", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("rejects when the ID token fails verification", async () => {
    verifyIdTokenManually.mockRejectedValue(new Error("invalid token"));
    const response = await POST(postRequest({ idToken: "bad" }));
    expect(response.status).toBe(401);
  });

  it("rejects an ID token issued too long ago", async () => {
    verifyIdTokenManually.mockResolvedValue({ uid: "user_1", authTime: Date.now() / 1000 - 60 * 60 });
    const response = await POST(postRequest({ idToken: "stale" }));
    expect(response.status).toBe(401);
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it("mints and sets a session cookie for a fresh, valid ID token", async () => {
    verifyIdTokenManually.mockResolvedValue({ uid: "user_1", authTime: Date.now() / 1000 });
    createSessionCookie.mockResolvedValue("signed-session-cookie");

    const response = await POST(postRequest({ idToken: "fresh" }));

    expect(response.status).toBe(200);
    expect(createSessionCookie).toHaveBeenCalledWith("fresh", { expiresIn: expect.any(Number) });
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("argus_session=signed-session-cookie");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
  });

  it("clamps expiresIn between 5 minutes and 14 days", async () => {
    verifyIdTokenManually.mockResolvedValue({ uid: "user_1", authTime: Date.now() / 1000 });
    createSessionCookie.mockResolvedValue("cookie");

    await POST(postRequest({ idToken: "fresh" }));

    const [, options] = createSessionCookie.mock.calls[0] as [string, { expiresIn: number }];
    expect(options.expiresIn).toBeGreaterThanOrEqual(5 * 60 * 1000);
    expect(options.expiresIn).toBeLessThanOrEqual(14 * 24 * 60 * 60 * 1000);
  });
});

describe("DELETE /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a request from a different origin", async () => {
    const response = await DELETE(deleteRequest("https://evil.example"));
    expect(response.status).toBe(403);
  });

  it("revokes refresh tokens and clears the cookie when a session exists", async () => {
    cookiesGet.mockReturnValue({ value: "existing-cookie" });
    verifySessionCookie.mockResolvedValue({ uid: "user_1" });

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(200);
    expect(revokeRefreshTokens).toHaveBeenCalledWith("user_1");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("argus_session=;");
  });

  it("still clears the cookie when no session cookie is present", async () => {
    cookiesGet.mockReturnValue(undefined);

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(200);
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });

  it("still succeeds (and clears the cookie) when the existing cookie is already invalid", async () => {
    cookiesGet.mockReturnValue({ value: "stale-cookie" });
    verifySessionCookie.mockRejectedValue(new Error("expired"));

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(200);
    expect(revokeRefreshTokens).not.toHaveBeenCalled();
  });
});
