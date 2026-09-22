import { WebSearchError } from "@/lib/ai/errors";
import { estimateCostUsd, estimateWebSearchCostUsd } from "@/lib/ai/pricing";
import type { Usage } from "@/lib/schema/run";

import type Anthropic from "@anthropic-ai/sdk";

/**
 * RESEARCH's `ResearchProvider.search()` (TRD 5.1), backed by Anthropic's
 * `web_search` server tool (T-2.14/D-052; TRD section 6 already named this
 * as the default). Unlike `AnthropicLLM.structured()`, this isn't a forced
 * client tool call the model fills in — `web_search` is *server*-executed:
 * forcing `tool_choice` only guarantees the model uses it at least once,
 * the model still writes its own `query` input from the prompt. This
 * function asks for one exact query and returns whatever the model
 * actually searched for (`query` on the result) alongside the results, so
 * callers can see — not assume — what ran.
 */
const MAX_OUTPUT_TOKENS = 1024;
const WEB_SEARCH_TOOL_TYPE = "web_search_20250305";
const WEB_SEARCH_TOOL_NAME = "web_search";

export interface WebSearchHit {
  url: string;
  title: string;
  pageAge?: string;
}

export interface WebSearchArgs {
  client: Anthropic;
  model: string;
  query: string;
  maxResults?: number;
  signal?: AbortSignal;
}

export interface WebSearchResult {
  /** The query the model actually issued to the tool — may not be byte-identical to `args.query`. */
  query: string;
  hits: WebSearchHit[];
  usage: Usage;
}

export async function searchWeb(args: WebSearchArgs): Promise<WebSearchResult> {
  const tool: Anthropic.WebSearchTool20250305 = {
    type: WEB_SEARCH_TOOL_TYPE,
    name: WEB_SEARCH_TOOL_NAME,
    max_uses: 1,
  };
  const toolChoice: Anthropic.ToolChoiceTool = {
    type: "tool",
    name: WEB_SEARCH_TOOL_NAME,
    disable_parallel_tool_use: true,
  };

  const response = await args.client.messages.create(
    {
      model: args.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `Search the web for exactly this query and report only the raw results, no commentary or analysis: "${args.query}"`,
        },
      ],
      tools: [tool],
      tool_choice: toolChoice,
    },
    { signal: args.signal },
  );

  const toolUse = response.content.find(
    (b): b is Anthropic.ServerToolUseBlock => b.type === "server_tool_use" && b.name === WEB_SEARCH_TOOL_NAME,
  );
  const resultBlock = response.content.find(
    (b): b is Anthropic.WebSearchToolResultBlock => b.type === "web_search_tool_result",
  );

  if (!resultBlock) {
    throw new WebSearchError(
      `No web_search_tool_result block in response (stop_reason "${response.stop_reason}")`,
    );
  }
  if (!Array.isArray(resultBlock.content)) {
    throw new WebSearchError(`Web search failed: ${resultBlock.content.error_code}`);
  }

  const allHits: WebSearchHit[] = resultBlock.content.map((r) => ({
    url: r.url,
    title: r.title,
    pageAge: r.page_age ?? undefined,
  }));
  const hits = args.maxResults ? allHits.slice(0, args.maxResults) : allHits;

  const searchCount = response.usage.server_tool_use?.web_search_requests ?? 0;
  const query =
    toolUse && typeof toolUse.input === "object" && toolUse.input !== null && "query" in toolUse.input
      ? String((toolUse.input as { query: unknown }).query)
      : args.query;

  return { query, hits, usage: toUsage(args.model, response.usage, searchCount) };
}

function toUsage(model: string, usage: Anthropic.Usage, searchCount: number): Usage {
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const tokenCost = estimateCostUsd(model, { inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens });
  return {
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    estimatedCostUsd: tokenCost + estimateWebSearchCostUsd(searchCount),
  };
}
