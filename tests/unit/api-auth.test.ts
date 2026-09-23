import { describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthenticatedError } from "@/lib/api/errors";

const verifySessionCookie = vi.fn();
const cookiesGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifySessionCookie }),
}));

const { requireUser, assertOwns } = await import("@/lib/api/auth");

describe("requireUser", () => {
  it("throws UnauthenticatedError when the session cookie is missing", async () => {
    cookiesGet.mockReturnValue(undefined);

    await expect(requireUser()).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });

  it("throws UnauthenticatedError when the cookie fails verification (expired, revoked, tampered)", async () => {
    cookiesGet.mockReturnValue({ value: "bad-cookie" });
    verifySessionCookie.mockRejectedValue(new Error("Firebase ID token has expired"));

    await expect(requireUser()).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(verifySessionCookie).toHaveBeenCalledWith("bad-cookie", true);
  });

  it("returns uid and email for a valid session cookie", async () => {
    cookiesGet.mockReturnValue({ value: "good-cookie" });
    verifySessionCookie.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });

    await expect(requireUser()).resolves.toEqual({ uid: "user_1", email: "founder@example.com" });
  });

  it("defaults email to null when the token carries none", async () => {
    cookiesGet.mockReturnValue({ value: "good-cookie" });
    verifySessionCookie.mockResolvedValue({ uid: "user_1" });

    await expect(requireUser()).resolves.toEqual({ uid: "user_1", email: null });
  });
});

describe("assertOwns", () => {
  it("passes when the resource's ownerId matches the authenticated user", () => {
    expect(() => assertOwns("user_1", { uid: "user_1", email: null })).not.toThrow();
  });

  it("throws ForbiddenError when ownerId does not match", () => {
    expect(() => assertOwns("user_2", { uid: "user_1", email: null })).toThrow(ForbiddenError);
  });
});
