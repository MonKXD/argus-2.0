import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import { authErrorMessage } from "@/lib/firebase/client-auth";

describe("authErrorMessage", () => {
  it("maps a known Firebase Auth error code to a plain, specific message", () => {
    const error = new FirebaseError("auth/email-already-in-use", "boom");
    expect(authErrorMessage(error)).toBe("An account with that email already exists.");
  });

  it("falls back to a generic message for an unmapped Firebase error code", () => {
    const error = new FirebaseError("auth/some-new-code-not-in-the-table", "boom");
    expect(authErrorMessage(error)).toBe("Sign-in failed. Try again.");
  });

  it("falls back to a generic message for a non-Firebase error", () => {
    expect(authErrorMessage(new Error("network down"))).toBe("Sign-in failed. Try again.");
  });

  it("never echoes the raw error message (R-UI-11: plain, no apology, no internals)", () => {
    const error = new FirebaseError("auth/wrong-password", "INVALID_LOGIN_CREDENTIALS internal detail");
    expect(authErrorMessage(error)).not.toContain("INVALID_LOGIN_CREDENTIALS");
  });
});
