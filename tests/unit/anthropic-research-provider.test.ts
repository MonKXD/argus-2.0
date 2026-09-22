import { createServer, type Server } from "node:http";

import Anthropic from "@anthropic-ai/sdk";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AnthropicResearchProvider } from "@/lib/analysis/research/anthropic-research-provider";

import { server as mswServer } from "../mocks/server";

import type { AddressInfo } from "node:net";

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";

function fakeSearchMessage() {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5-20251001",
    content: [
      { type: "server_tool_use", id: "srvtoolu_1", caller: { type: "direct" }, name: "web_search", input: { query: "Loopwell" } },
      {
        type: "web_search_tool_result",
        tool_use_id: "srvtoolu_1",
        caller: { type: "direct" },
        content: [{ type: "web_search_result", url: "https://example.com/loopwell", title: "Loopwell", page_age: null, encrypted_content: "enc" }],
      },
    ],
    stop_reason: "end_turn",
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
    },
  };
}

describe("AnthropicResearchProvider.search", () => {
  it("returns hits from the web_search tool and reports usage via onUsage", async () => {
    mswServer.use(http.post(MESSAGES_URL, () => HttpResponse.json(fakeSearchMessage())));

    const reported: number[] = [];
    const provider = new AnthropicResearchProvider({
      client: new Anthropic({ apiKey: "test-key", dangerouslyAllowBrowser: true }),
      model: "claude-haiku-4-5-20251001",
      onUsage: (usage) => reported.push(usage.estimatedCostUsd),
    });

    const hits = await provider.search("Loopwell funding");

    expect(hits).toEqual([{ url: "https://example.com/loopwell", title: "Loopwell", pageAge: undefined }]);
    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeGreaterThan(0);
  });
});

describe("AnthropicResearchProvider.fetchPage", () => {
  let httpServer: Server;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/robots.txt") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("");
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body><p>Fetched research page.</p></body></html>");
    });
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(() => {
    httpServer.close();
  });

  it("fetches a page through the SSRF-safe fetcher, not another model call", async () => {
    const provider = new AnthropicResearchProvider({
      client: new Anthropic({ apiKey: "test-key", dangerouslyAllowBrowser: true }),
      model: "claude-haiku-4-5-20251001",
      unsafeAllowPrivateNetworksForTests: true,
    });

    // No MSW handler registered for /v1/messages in this block; if fetchPage
    // ever called the model instead of the SSRF-safe fetcher, MSW's default
    // "no handler" error would fail this test.
    const page = await provider.fetchPage(`${baseUrl}/article`);

    expect(page.text).toContain("Fetched research page.");
  });
});
