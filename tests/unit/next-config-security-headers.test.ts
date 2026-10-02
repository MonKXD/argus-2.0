import { describe, expect, it, vi } from "vitest";

import nextConfig from "../../next.config";

describe("next.config.ts security headers (T-6.05, TRD section 11)", () => {
  it("sets CSP, X-Content-Type-Options, X-Frame-Options and Referrer-Policy on every route", async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find((r) => r.source === "/(.*)");
    expect(rule).toBeTruthy();

    const byKey = Object.fromEntries(rule!.headers.map((h) => [h.key, h.value]));
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");

    const csp = byKey["Content-Security-Policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("includes HSTS in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      vi.resetModules();
      const prodConfig = (await import("../../next.config")).default;
      const rules = await prodConfig.headers!();
      const byKey = Object.fromEntries(rules[0]!.headers.map((h) => [h.key, h.value]));
      expect(byKey["Strict-Transport-Security"]).toContain("max-age=");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
