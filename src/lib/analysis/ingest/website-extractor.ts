import type { ExtractedPage } from "@/lib/analysis/ingest/extractor";
import { extractLinks, htmlToText } from "@/lib/analysis/ingest/html-to-text";
import { isPathAllowed, parseRobotsTxt } from "@/lib/analysis/ingest/robots";
import type { RobotsRules } from "@/lib/analysis/ingest/robots";
import { safeFetch, SsrfError } from "@/lib/analysis/ingest/safe-fetch";
import type { SafeFetchResult } from "@/lib/analysis/ingest/safe-fetch";

const BOT_NAME = "ArgusAI-Bot";
const MAX_PAGES = 8;
const PRIORITY_PATH_HINTS = ["about", "team", "product", "pricing", "customers"];

export class RobotsDisallowedError extends Error {
  constructor(url: string) {
    super(`robots.txt disallows crawling ${url}`);
    this.name = "RobotsDisallowedError";
  }
}

export interface WebsiteExtractorOptions {
  maxPages?: number;
  /** Same test-only escape hatch as safeFetch — never set by production callers. */
  unsafeAllowPrivateNetworksForTests?: boolean;
}

function priorityScore(url: string): number {
  const lower = url.toLowerCase();
  return PRIORITY_PATH_HINTS.some((hint) => lower.includes(hint)) ? 1 : 0;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Same-origin crawl of a company's own website (TRD section 9), starting
 * from the URL the user submitted as a source. Not the `Extractor`
 * interface — that's for buffer-based file extraction, and this starts
 * from a URL — and not `ResearchProvider` either (T-2.14's independent
 * web research for the RESEARCH step): this is specifically "the founder
 * gave us their website as a source."
 *
 * The start page's own fetch (and a robots.txt disallow on it) propagate
 * as real errors — the user's own submitted source being unreachable or
 * off-limits is actionable. Pages found only by following links are
 * best-effort: any of them failing (blocked, broken, disallowed) is
 * silently skipped rather than failing the whole crawl.
 */
export class WebsiteExtractor {
  private readonly maxPages: number;
  private readonly allowPrivate: boolean;

  constructor(options: WebsiteExtractorOptions = {}) {
    this.maxPages = options.maxPages ?? MAX_PAGES;
    this.allowPrivate = options.unsafeAllowPrivateNetworksForTests ?? false;
  }

  async extract(startUrl: string): Promise<ExtractedPage[]> {
    const origin = new URL(startUrl);
    const robotsRules = await this.fetchRobotsRules(origin);

    if (!isPathAllowed(robotsRules, origin.pathname)) {
      throw new RobotsDisallowedError(startUrl);
    }

    const visited = new Set<string>([normalizeUrl(startUrl)]);
    const pages: ExtractedPage[] = [];
    const queue: string[] = [];

    const first = await safeFetch(startUrl, {
      unsafeAllowPrivateNetworksForTests: this.allowPrivate,
    });
    this.consumePage(first, origin, pages, queue, visited);

    while (queue.length > 0 && visited.size < this.maxPages) {
      queue.sort((a, b) => priorityScore(b) - priorityScore(a));
      const next = queue.shift()!;
      const key = normalizeUrl(next);
      if (visited.has(key)) continue;
      visited.add(key);

      let url: URL;
      try {
        url = new URL(next);
      } catch {
        continue;
      }
      if (!isPathAllowed(robotsRules, url.pathname)) continue;

      let result: SafeFetchResult;
      try {
        result = await safeFetch(next, { unsafeAllowPrivateNetworksForTests: this.allowPrivate });
      } catch (err) {
        if (err instanceof SsrfError) continue;
        throw err;
      }
      this.consumePage(result, origin, pages, queue, visited);
    }

    return pages;
  }

  private consumePage(
    result: SafeFetchResult,
    origin: URL,
    pages: ExtractedPage[],
    queue: string[],
    visited: Set<string>,
  ): void {
    const text = htmlToText(result.body);
    if (text) {
      pages.push({ locator: { kind: "url", url: result.finalUrl }, text, needsVision: false });
    }

    if (result.contentType !== "text/html") return;

    for (const href of extractLinks(result.body)) {
      try {
        const linked = new URL(href, result.finalUrl);
        const key = normalizeUrl(linked.toString());
        if (linked.origin === origin.origin && !visited.has(key)) {
          queue.push(linked.toString());
        }
      } catch {
        // ignore unparseable hrefs (mailto:, javascript:, etc.)
      }
    }
  }

  private async fetchRobotsRules(origin: URL): Promise<RobotsRules> {
    const robotsUrl = new URL("/robots.txt", origin.origin).toString();
    try {
      const result = await safeFetch(robotsUrl, {
        unsafeAllowPrivateNetworksForTests: this.allowPrivate,
      });
      return parseRobotsTxt(result.body, BOT_NAME);
    } catch {
      return { disallowedPaths: [], allowedPaths: [] }; // no robots.txt, or unreadable: nothing restricted
    }
  }
}
