import { htmlToText } from "@/lib/analysis/ingest/html-to-text";
import { isPathAllowed, parseRobotsTxt } from "@/lib/analysis/ingest/robots";
import { safeFetch } from "@/lib/analysis/ingest/safe-fetch";
import { RobotsDisallowedError } from "@/lib/analysis/ingest/website-extractor";
import type { FetchedPage } from "@/lib/analysis/research/research-provider";

const BOT_NAME = "ArgusAI-Bot";

export interface FetchResearchPageOptions {
  /** Same test-only escape hatch as safeFetch/WebsiteExtractor — never set by production callers. */
  unsafeAllowPrivateNetworksForTests?: boolean;
}

/**
 * `ResearchProvider.fetchPage()` (TRD 5.1): fetches one specific
 * research-result URL through the same SSRF-safe fetcher and robots.txt
 * check already built for `WebsiteExtractor` (T-2.05, D-041). A single
 * external page fetch doesn't need a second guard, and reusing our own
 * already-verified fetcher instead of Anthropic's separate `web_fetch`
 * server tool costs nothing extra per fetch (T-2.14/D-052) — unlike
 * `search()`, which genuinely needs a real search backend ours can't
 * replicate, "fetch this one URL's readable text safely" is exactly what
 * `safeFetch` already does.
 */
export async function fetchResearchPage(url: string, options: FetchResearchPageOptions = {}): Promise<FetchedPage> {
  const origin = new URL(url);
  const robotsRules = await fetchRobotsRules(origin, options);
  if (!isPathAllowed(robotsRules, origin.pathname)) {
    throw new RobotsDisallowedError(url);
  }

  const result = await safeFetch(url, options);
  const text = result.contentType === "text/html" ? htmlToText(result.body) : result.body;
  return { url: result.finalUrl, text, contentType: result.contentType };
}

async function fetchRobotsRules(origin: URL, options: FetchResearchPageOptions) {
  const robotsUrl = new URL("/robots.txt", origin.origin).toString();
  try {
    const result = await safeFetch(robotsUrl, options);
    return parseRobotsTxt(result.body, BOT_NAME);
  } catch {
    return { disallowedPaths: [], allowedPaths: [] }; // no robots.txt, or unreadable: nothing restricted
  }
}
