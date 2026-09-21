import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws a clear, per-field error on first property read when a required var is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.resetModules();
    const { env } = await import("@/lib/env");

    expect(() => env.APP_URL).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("does not parse server env just from importing the module (only clientEnv touched)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.resetModules();

    const { clientEnv } = await import("@/lib/env");

    expect(clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID).toBe("1:123:web:abc");
  });

  it("requires Firebase Admin credentials unless USE_FIREBASE_EMULATORS=true", async () => {
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", undefined);
    vi.stubEnv("FIREBASE_PRIVATE_KEY", undefined);
    vi.stubEnv("USE_FIREBASE_EMULATORS", "false");
    vi.resetModules();
    const { env } = await import("@/lib/env");

    expect(() => env.FIREBASE_PROJECT_ID).toThrow(/FIREBASE_CLIENT_EMAIL/);
  });

  it("allows missing Firebase Admin credentials when USE_FIREBASE_EMULATORS=true", async () => {
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", undefined);
    vi.stubEnv("FIREBASE_PRIVATE_KEY", undefined);
    vi.stubEnv("USE_FIREBASE_EMULATORS", "true");
    vi.resetModules();
    const { env } = await import("@/lib/env");

    expect(env.USE_FIREBASE_EMULATORS).toBe(true);
    expect(env.FIREBASE_CLIENT_EMAIL).toBeUndefined();
  });

  it("parses successfully with the test env's complete, valid values", async () => {
    vi.resetModules();
    const { env, clientEnv } = await import("@/lib/env");

    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID).toBe("1:123:web:abc");
  });
});
