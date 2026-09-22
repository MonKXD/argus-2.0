import { describe, expect, it } from "vitest";

import { listFixtureSlugs, loadFixture } from "../../evals/load-fixture";

describe("evals fixtures: manifest.json and expected.json are all valid", () => {
  it("lists every fixture directory under evals/fixtures/", async () => {
    const slugs = await listFixtureSlugs();
    expect(slugs.sort()).toEqual(
      [
        "clean-seed-saas",
        "conflicting-numbers",
        "no-financials",
        "numeric-bait",
        "prompt-injection",
        "unverifiable-superlatives",
        "website-only",
      ].sort(),
    );
  });

  it.each([
    "clean-seed-saas",
    "no-financials",
    "conflicting-numbers",
    "prompt-injection",
    "unverifiable-superlatives",
    "numeric-bait",
  ])("loads the %s fixture's file-based sources with real bytes", async (slug) => {
    const cleanups: Array<() => Promise<void>> = [];
    try {
      const fixture = await loadFixture(slug);
      cleanups.push(fixture.cleanup);
      expect(fixture.manifest.slug).toBe(slug);
      expect(fixture.sources.length).toBeGreaterThan(0);
      for (const source of fixture.sources) {
        expect(source.file?.buffer.length).toBeGreaterThan(0);
      }
    } finally {
      await Promise.all(cleanups.map((c) => c()));
    }
  });

  it("loads the website-only fixture by starting a local server and reaching it through the real WebsiteExtractor", async () => {
    const fixture = await loadFixture("website-only");
    try {
      expect(fixture.sources).toHaveLength(1);
      expect(fixture.sources[0]!.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
      expect(fixture.sources[0]!.unsafeAllowPrivateNetworksForTests).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });
});
