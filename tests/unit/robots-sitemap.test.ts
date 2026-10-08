import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("robots.ts (T-6.15)", () => {
  it("disallows the private app, API and print surfaces, allows everything else", () => {
    const result = robots();
    expect(result.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/api/", "/print/"],
    });
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});

describe("sitemap.ts (T-6.15)", () => {
  it("lists every public page and excludes /app", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/sample"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/legal/terms"))).toBe(true);
    expect(urls.some((u) => u.includes("/app"))).toBe(false);
  });

  it("gives the home page the highest priority", () => {
    const entries = sitemap();
    expect(entries[0]).toMatchObject({ url: "http://localhost:3000", priority: 1 });
  });
});
