import { getAnthropicClient } from "@/lib/ai/client";
import { modelForRole } from "@/lib/ai/models";
import { searchWeb } from "@/lib/ai/web-search";
import { fetchResearchPage } from "@/lib/analysis/research/fetch-page";
import type { FetchedPage, ResearchHit, ResearchProvider } from "@/lib/analysis/research/research-provider";
import type { Usage } from "@/lib/schema/run";

import type Anthropic from "@anthropic-ai/sdk";

export interface AnthropicResearchProviderOptions {
  client: Anthropic;
  model: string;
  /**
   * Reports each search call's usage/cost back to the caller — this class
   * has no `Budget` or store of its own (same "don't build ahead of need"
   * scoping as every other T-2.06 through T-2.13 step: RESEARCH's own
   * query planning and budget wiring are the real step runner's job,
   * T-3.08, which doesn't exist yet). `fetchPage` has no separate usage to
   * report — it never calls the model (see `fetch-page.ts`).
   */
  onUsage?: (usage: Usage) => void;
  signal?: AbortSignal;
  /** Same test-only escape hatch as safeFetch/WebsiteExtractor — never set by production callers. */
  unsafeAllowPrivateNetworksForTests?: boolean;
}

/**
 * Default `ResearchProvider` (TRD 5.1/6; T-2.14 resolves TQ-5 — D-052):
 * `search()` is backed by Anthropic's `web_search` server tool
 * (`src/lib/ai/web-search.ts`, R-ARC-06: the model is called only through
 * `src/lib/ai`); `fetchPage()` reuses T-2.05's already-built, already-
 * verified SSRF-safe fetcher rather than a second paid Anthropic tool.
 */
export class AnthropicResearchProvider implements ResearchProvider {
  constructor(private readonly options: AnthropicResearchProviderOptions) {}

  async search(query: string, opts?: { maxResults?: number }): Promise<ResearchHit[]> {
    const result = await searchWeb({
      client: this.options.client,
      model: this.options.model,
      query,
      maxResults: opts?.maxResults,
      signal: this.options.signal,
    });
    this.options.onUsage?.(result.usage);
    return result.hits;
  }

  fetchPage(url: string): Promise<FetchedPage> {
    return fetchResearchPage(url, {
      unsafeAllowPrivateNetworksForTests: this.options.unsafeAllowPrivateNetworksForTests,
    });
  }
}

/** Production wiring: real client, real env-configured FAST-role model (same tier as RESEARCH's own query planning, AI_SPEC step table). Not yet called anywhere — the step runner that will use it lands at T-3.08. */
export function createAnthropicResearchProvider(onUsage?: (usage: Usage) => void): AnthropicResearchProvider {
  return new AnthropicResearchProvider({
    client: getAnthropicClient(),
    model: modelForRole("FAST"),
    onUsage,
  });
}
