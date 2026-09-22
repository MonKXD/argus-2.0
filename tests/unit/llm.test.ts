import Anthropic from "@anthropic-ai/sdk";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { LlmResponseError, LlmSchemaError } from "@/lib/ai/errors";
import { AnthropicLLM } from "@/lib/ai/llm";

import { server } from "../mocks/server";

const MESSAGES_URL = "https://api.anthropic.com/v1/messages";

const testSchema = z.object({ name: z.string(), value: z.number() });

function makeLlm(): AnthropicLLM {
  return new AnthropicLLM({
    // dangerouslyAllowBrowser is test-only: vitest's jsdom environment (vitest.config.ts)
    // looks browser-like to the SDK's own guard. Production wiring (src/lib/ai/client.ts,
    // R-ARC-06) never sets this — the real client only ever runs in server code.
    client: new Anthropic({ apiKey: "test-key", dangerouslyAllowBrowser: true }),
    modelIds: { ANALYSIS: "claude-sonnet-5", SYNTHESIS: "claude-sonnet-5", FAST: "claude-haiku-4-5-20251001" },
  });
}

function fakeMessage(overrides: {
  content: unknown[];
  stop_reason?: string;
  usage?: Partial<{
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number | null;
    cache_read_input_tokens: number | null;
  }>;
}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5",
    content: overrides.content,
    stop_reason: overrides.stop_reason ?? "tool_use",
    stop_sequence: null,
    container: null,
    stop_details: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      cache_creation: null,
      inference_geo: null,
      output_tokens_details: null,
      server_tool_use: null,
      ...overrides.usage,
    },
  };
}

function toolUseBlock(input: unknown, name = "submit_test") {
  return { type: "tool_use", id: "toolu_1", name, input };
}

describe("AnthropicLLM.structured", () => {
  it("returns validated data and usage (with cost) on a clean first call", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(
          fakeMessage({
            content: [toolUseBlock({ name: "Loopwell", value: 3 })],
            usage: { input_tokens: 1000, output_tokens: 200 },
          }),
        ),
      ),
    );

    const llm = makeLlm();
    const { data, usage } = await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "user prompt",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 512,
    });

    expect(data).toEqual({ name: "Loopwell", value: 3 });
    expect(usage.inputTokens).toBe(1000);
    expect(usage.outputTokens).toBe(200);
    expect(usage.cacheReadTokens).toBe(0);
    expect(usage.cacheWriteTokens).toBe(0);
    expect(usage.estimatedCostUsd).toBeCloseTo(1000 * (2 / 1_000_000) + 200 * (10 / 1_000_000), 10);
  });

  it("forces the named tool and sends no other tools", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(MESSAGES_URL, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          fakeMessage({ content: [toolUseBlock({ name: "a", value: 1 })] }),
        );
      }),
    );

    const llm = makeLlm();
    await llm.structured({
      role: "FAST",
      system: "system prompt",
      user: "user prompt",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 512,
    });

    expect(capturedBody?.tools).toHaveLength(1);
    expect((capturedBody?.tools as Array<{ name: string }>)[0]?.name).toBe("submit_test");
    expect(capturedBody?.tool_choice).toEqual({
      type: "tool",
      name: "submit_test",
      disable_parallel_tool_use: true,
    });
    expect(capturedBody?.model).toBe("claude-haiku-4-5-20251001");
    expect(capturedBody?.temperature).toBe(0);
  });

  it("splits cachePrefix into its own cache_control breakpoint ahead of the user text", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(MESSAGES_URL, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          fakeMessage({ content: [toolUseBlock({ name: "a", value: 1 })] }),
        );
      }),
    );

    const llm = makeLlm();
    await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "dimension-specific instructions",
      cachePrefix: "shared evidence block",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 512,
    });

    const messages = capturedBody?.messages as Array<{ content: unknown }>;
    expect(messages[0]?.content).toEqual([
      { type: "text", text: "shared evidence block", cache_control: { type: "ephemeral" } },
      { type: "text", text: "dimension-specific instructions" },
    ]);
  });

  it("sends a plain string user message when there is no cachePrefix", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(MESSAGES_URL, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          fakeMessage({ content: [toolUseBlock({ name: "a", value: 1 })] }),
        );
      }),
    );

    const llm = makeLlm();
    await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "plain instructions",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 512,
    });

    const messages = capturedBody?.messages as Array<{ content: unknown }>;
    expect(messages[0]?.content).toBe("plain instructions");
  });

  it("repairs once on a schema validation failure and returns the corrected data", async () => {
    let callCount = 0;
    server.use(
      http.post(MESSAGES_URL, () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json(
            fakeMessage({
              content: [toolUseBlock({ name: "Loopwell", value: "not-a-number" })],
              usage: { input_tokens: 500, output_tokens: 80 },
            }),
          );
        }
        return HttpResponse.json(
          fakeMessage({
            content: [toolUseBlock({ name: "Loopwell", value: 3 })],
            usage: { input_tokens: 600, output_tokens: 40 },
          }),
        );
      }),
    );

    const llm = makeLlm();
    const { data, usage } = await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "user prompt",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 512,
    });

    expect(callCount).toBe(2);
    expect(data).toEqual({ name: "Loopwell", value: 3 });
    // Usage sums both calls.
    expect(usage.inputTokens).toBe(1100);
    expect(usage.outputTokens).toBe(120);
  });

  it("sends the validation errors back as an is_error tool_result on repair", async () => {
    let secondBody: Record<string, unknown> | undefined;
    let callCount = 0;
    server.use(
      http.post(MESSAGES_URL, async ({ request }) => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json(
            fakeMessage({ content: [toolUseBlock({ name: "Loopwell", value: "nope" })] }),
          );
        }
        secondBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(fakeMessage({ content: [toolUseBlock({ name: "Loopwell", value: 3 })] }));
      }),
    );

    const llm = makeLlm();
    await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "user prompt",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 512,
    });

    const messages = secondBody?.messages as Array<{ role: string; content: unknown }>;
    expect(messages).toHaveLength(3);
    expect(messages[1]?.role).toBe("assistant");
    const repairTurn = messages[2]?.content as Array<{
      type: string;
      tool_use_id: string;
      is_error: boolean;
      content: string;
    }>;
    expect(repairTurn[0]?.type).toBe("tool_result");
    expect(repairTurn[0]?.tool_use_id).toBe("toolu_1");
    expect(repairTurn[0]?.is_error).toBe(true);
    expect(repairTurn[0]?.content).toContain("value");
  });

  it("throws LlmSchemaError when the repair call still fails validation", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(fakeMessage({ content: [toolUseBlock({ name: "Loopwell", value: "nope" })] })),
      ),
    );

    const llm = makeLlm();
    await expect(
      llm.structured({
        role: "ANALYSIS",
        system: "system prompt",
        user: "user prompt",
        toolName: "submit_test",
        schema: testSchema,
        maxOutputTokens: 512,
      }),
    ).rejects.toThrow(LlmSchemaError);
  });

  it("throws LlmResponseError when the response has no matching tool_use block", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(
          fakeMessage({ content: [{ type: "text", text: "I refuse to call a tool." }], stop_reason: "end_turn" }),
        ),
      ),
    );

    const llm = makeLlm();
    await expect(
      llm.structured({
        role: "ANALYSIS",
        system: "system prompt",
        user: "user prompt",
        toolName: "submit_test",
        schema: testSchema,
        maxOutputTokens: 512,
      }),
    ).rejects.toThrow(LlmResponseError);
  });

  it("propagates an already-aborted signal instead of making the request", async () => {
    let called = false;
    server.use(
      http.post(MESSAGES_URL, () => {
        called = true;
        return HttpResponse.json(fakeMessage({ content: [toolUseBlock({ name: "a", value: 1 })] }));
      }),
    );

    const controller = new AbortController();
    controller.abort();

    const llm = makeLlm();
    await expect(
      llm.structured({
        role: "ANALYSIS",
        system: "system prompt",
        user: "user prompt",
        toolName: "submit_test",
        schema: testSchema,
        maxOutputTokens: 512,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(called).toBe(false);
  });

  it("computes cache-aware cost when the response reports cache write and read tokens", async () => {
    server.use(
      http.post(MESSAGES_URL, () =>
        HttpResponse.json(
          fakeMessage({
            content: [toolUseBlock({ name: "a", value: 1 })],
            usage: {
              input_tokens: 100,
              output_tokens: 50,
              cache_creation_input_tokens: 2000,
              cache_read_input_tokens: 3000,
            },
          }),
        ),
      ),
    );

    const llm = makeLlm();
    const { usage } = await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "user prompt",
      cachePrefix: "evidence",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 512,
    });

    expect(usage.cacheWriteTokens).toBe(2000);
    expect(usage.cacheReadTokens).toBe(3000);
    const expectedCost =
      100 * (2 / 1_000_000) + 50 * (10 / 1_000_000) + 2000 * (2.5 / 1_000_000) + 3000 * (0.2 / 1_000_000);
    expect(usage.estimatedCostUsd).toBeCloseTo(expectedCost, 10);
  });
});
