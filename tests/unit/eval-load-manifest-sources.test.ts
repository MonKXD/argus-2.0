import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadManifestSources } from "../../evals/load-fixture";
import { FixtureManifest } from "../../evals/types";

describe("loadManifestSources: url-type sources (pnpm analyze CLI)", () => {
  it("passes a real url through untouched, with no private-network bypass", async () => {
    const manifest = FixtureManifest.parse({
      slug: "test",
      trap: "n/a",
      startupName: "Test Co",
      stage: "SEED",
      sources: [{ id: "site", type: "WEBSITE", origin: "URL", title: "Website", url: "https://example.com/" }],
    });

    const { sources, cleanup } = await loadManifestSources("/tmp", manifest);
    try {
      expect(sources).toEqual([
        {
          id: "site",
          type: "WEBSITE",
          origin: "URL",
          title: "Website",
          url: "https://example.com/",
          companyDomain: undefined,
        },
      ]);
      expect(sources[0]!.unsafeAllowPrivateNetworksForTests).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  it("does not set unsafeAllowPrivateNetworksForTests for an html-served source unless the caller asks", async () => {
    const manifest = FixtureManifest.parse({
      slug: "test",
      trap: "n/a",
      startupName: "Test Co",
      stage: "SEED",
      sources: [{ id: "site", type: "WEBSITE", origin: "URL", title: "Website", html: "site.html" }],
    });

    // Reuse an already-served fixture's html file so this test doesn't need its own file.
    const dir = path.join(import.meta.dirname, "..", "..", "evals", "fixtures", "website-only", "sources");
    const { sources, cleanup } = await loadManifestSources(dir, {
      ...manifest,
      sources: [{ id: "site", type: "WEBSITE", origin: "URL", title: "Website", html: "site.html" }],
    });
    try {
      expect(sources[0]!.unsafeAllowPrivateNetworksForTests).toBeUndefined();
    } finally {
      await cleanup();
    }
  });
});
