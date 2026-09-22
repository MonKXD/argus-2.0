import Anthropic from "@anthropic-ai/sdk";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { WebSearchError } from "@/lib/ai/errors";
import { searchWeb } from "@/lib/ai/web-search";

import { server } from "../mocks/server";

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";

function makeClient(): Anthropic {
  // dangerouslyAllowBrowser is test-only — see llm.test.ts's identical note.
  return new Anthropic({ apiKey: "test-key", dangerouslyAllowBrowser: true });
}

function fakeMessage(overrides: {
  content: unknown[];
  stop_reason?: string;
  usage?: Partial<{
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number | null;
    cache_read_input_tokens: number | null;
    server_tool_use: { web_search_requests: number; web_fetch_requests: number } | null;
  }>;
}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5-20251001",
    content: overrides.content,
    stop_reason: overrides.stop_reason ?? "end_turn",
    stop_sequence: null,
    container: null,
    stop_details: null,
    usage: {
      input_tokens: 500,
      output_tokens: 100,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      cache_creation: null,
      inference_geo: null,
      output_tokens_details: null,
      server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 },
      ...overrides.usage,
    },
  };
}

function serverToolUseBlock(query: string) {
  return { type: "server_tool_use", id: "srvtoolu_1", caller: { type: "direct" }, name: "web_search", input: { query } };
}

function searchResultBlock(hits: Array<{ url: string; title: string; page_age?: string | null }>) {
  return {
    type: "web_search_tool_result",
    tool_use_id: "srvtoolu_1",
    caller: { type: "direct" },
    content: hits.map((h) => ({ type: "web_search_result", url: h.url, title: h.title, page_age: h.page_age ?? null, encrypted_content: "enc" })),
  };
}

function searchErrorBlock(errorCode: string) {
  return {
    type: "web_search_tool_result",
    tool_use_id: "srvtoolu_1",
    caller: { type: "direct" },
    content: { type: "web_search_tool_result_error", error_code: errorCode },
  };
}

describe("searchWeb: happy path", () => {
  it("returns hits and the actual query the model issued, with token cost plus $0.01/search", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(
          fakeMessage({
            content: [
              serverToolUseBlock("loopwell logistics startup funding"),
              searchResultBlock([
                { url: "https://techcrunch.com/loopwell", title: "Loopwell raises seed", page_age: "2026-01-01" },
                { url: "https://loopwell.example/about", title: "About Loopwell" },
              ]),
              { type: "text", text: "Found two results." },
            ],
            usage: { input_tokens: 800, output_tokens: 150, server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 } },
          }),
        ),
      ),
    );

    const result = await searchWeb({ client: makeClient(), model: "claude-haiku-4-5-20251001", query: "Loopwell funding" });

    expect(result.query).toBe("loopwell logistics startup funding");
    expect(result.hits).toEqual([
      { url: "https://techcrunch.com/loopwell", title: "Loopwell raises seed", pageAge: "2026-01-01" },
      { url: "https://loopwell.example/about", title: "About Loopwell", pageAge: undefined },
    ]);
    expect(result.usage.inputTokens).toBe(800);
    expect(result.usage.outputTokens).toBe(150);
    // token cost (haiku family: 1/MTok in, 5/MTok out) + $0.01 for one search
    expect(result.usage.estimatedCostUsd).toBeCloseTo(800 * (1 / 1_000_000) + 150 * (5 / 1_000_000) + 0.01, 10);
  });

  it("returns an empty hit list for a successful search that matched nothing", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(fakeMessage({ content: [serverToolUseBlock("a very obscure query"), searchResultBlock([])] })),
      ),
    );

    const result = await searchWeb({ client: makeClient(), model: "claude-haiku-4-5-20251001", query: "obscure" });
    expect(result.hits).toEqual([]);
  });

  it("truncates hits to maxResults", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(
          fakeMessage({
            content: [
              serverToolUseBlock("q"),
              searchResultBlock([
                { url: "https://a.example", title: "A" },
                { url: "https://b.example", title: "B" },
                { url: "https://c.example", title: "C" },
              ]),
            ],
          }),
        ),
      ),
    );

    const result = await searchWeb({ client: makeClient(), model: "claude-haiku-4-5-20251001", query: "q", maxResults: 2 });
    expect(result.hits).toHaveLength(2);
  });
});

describe("searchWeb: request shape", () => {
  it("forces the web_search tool with max_uses 1 and no other tools", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(MESSAGES_URL, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(fakeMessage({ content: [serverToolUseBlock("q"), searchResultBlock([])] }));
      }),
    );

    await searchWeb({ client: makeClient(), model: "claude-haiku-4-5-20251001", query: "Loopwell" });

    expect(capturedBody?.tools).toEqual([{ type: "web_search_20250305", name: "web_search", max_uses: 1 }]);
    expect(capturedBody?.tool_choice).toEqual({ type: "tool", name: "web_search", disable_parallel_tool_use: true });
  });
});

describe("searchWeb: errors", () => {
  it("throws WebSearchError when no web_search_tool_result block is present", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(fakeMessage({ content: [{ type: "text", text: "I chose not to search." }] })),
      ),
    );

    await expect(searchWeb({ client: makeClient(), model: "claude-haiku-4-5-20251001", query: "q" })).rejects.toThrow(WebSearchError);
  });

  it("throws WebSearchError when the server tool itself reports an error", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(fakeMessage({ content: [serverToolUseBlock("q"), searchErrorBlock("max_uses_exceeded")] })),
      ),
    );

    await expect(searchWeb({ client: makeClient(), model: "claude-haiku-4-5-20251001", query: "q" })).rejects.toThrow(/max_uses_exceeded/);
  });
});
