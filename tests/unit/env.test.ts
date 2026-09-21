import { afterEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws a clear, per-field error when a required var is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.resetModules();

    await expect(import("@/lib/env")).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("parses successfully with the test env's complete, valid values", async () => {
    vi.resetModules();
    const { env, clientEnv } = await import("@/lib/env");

    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID).toBe("1:123:web:abc");
  });
});
