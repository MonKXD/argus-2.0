import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { IngestSourceInput } from "@/lib/analysis/ingest/ingest-source";

import { serveLocalHtml, type LocalHtmlServer } from "./serve-local-html";
import { FixtureExpectation, FixtureManifest, type FixtureManifest as FixtureManifestType } from "./types";

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");

export async function listFixtureSlugs(): Promise<string[]> {
  const entries = await readdir(FIXTURES_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

export interface LoadedManifestSources {
  sources: IngestSourceInput[];
  /** Any local HTML servers this manifest started (WEBSITE sources) — call to release them after the run. */
  cleanup: () => Promise<void>;
}

/**
 * Turns a manifest's declared sources into `IngestSourceInput[]`, resolving
 * each relative to `dir`. Shared by the eval harness's `loadFixture()` and
 * the `pnpm analyze` CLI's own manifest loader — the only difference
 * between them is `unsafeAllowPrivateNetworksForTests`, which the CLI must
 * never set (a real analysis fetching a real external URL needs the real
 * SSRF guard; only fixtures deliberately point at a throwaway local
 * server).
 */
export async function loadManifestSources(
  dir: string,
  manifest: FixtureManifestType,
  options: { unsafeAllowPrivateNetworksForTests?: boolean } = {},
): Promise<LoadedManifestSources> {
  const servers: LocalHtmlServer[] = [];
  const sources: IngestSourceInput[] = [];

  for (const sourceFile of manifest.sources) {
    if (sourceFile.file) {
      const buffer = await readFile(path.join(dir, sourceFile.file));
      sources.push({
        id: sourceFile.id,
        type: sourceFile.type,
        origin: "UPLOAD",
        title: sourceFile.title,
        file: { filename: path.basename(sourceFile.file), buffer },
      });
    } else if (sourceFile.html) {
      const server = await serveLocalHtml(path.join(dir, sourceFile.html));
      servers.push(server);
      sources.push({
        id: sourceFile.id,
        type: sourceFile.type,
        origin: "URL",
        title: sourceFile.title,
        url: server.url,
        companyDomain: manifest.companyDomain,
        unsafeAllowPrivateNetworksForTests: options.unsafeAllowPrivateNetworksForTests,
      });
    } else if (sourceFile.url) {
      sources.push({
        id: sourceFile.id,
        type: sourceFile.type,
        origin: "URL",
        title: sourceFile.title,
        url: sourceFile.url,
        companyDomain: manifest.companyDomain,
      });
    } else {
      throw new Error(`Manifest source "${sourceFile.id}" has none of "file", "html" or "url"`);
    }
  }

  return {
    sources,
    cleanup: async () => {
      await Promise.all(servers.map((s) => s.stop()));
    },
  };
}

export interface LoadedFixture {
  manifest: FixtureManifestType;
  expected: FixtureExpectation;
  sources: IngestSourceInput[];
  cleanup: () => Promise<void>;
}

export async function loadFixture(slug: string): Promise<LoadedFixture> {
  const dir = path.join(FIXTURES_DIR, slug);
  const manifest = FixtureManifest.parse(JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf-8")));
  const expected = FixtureExpectation.parse(JSON.parse(await readFile(path.join(dir, "expected.json"), "utf-8")));
  const { sources, cleanup } = await loadManifestSources(dir, manifest, { unsafeAllowPrivateNetworksForTests: true });
  return { manifest, expected, sources, cleanup };
}
