import { GoogleGenAI } from "@google/genai";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { LlmResponseError, LlmSchemaError } from "@/lib/ai/errors";
import { GeminiLLM } from "@/lib/ai/gemini-llm";

import { server } from "../mocks/server";

const GENERATE_CONTENT_URL =
  /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/[^/]+:generateContent/;

const testSchema = z.object({ name: z.string(), value: z.number() });

function makeLlm(): GeminiLLM {
  return new GeminiLLM({
    client: new GoogleGenAI({ apiKey: "test-key" }),
    modelIds: { ANALYSIS: "gemini-flash-latest", SYNTHESIS: "gemini-flash-latest", FAST: "gemini-flash-lite-latest" },
  });
}

function fakeResponse(overrides: {
  functionCalls?: { name: string; args: unknown }[];
  finishReason?: string;
  usageMetadata?: Partial<{
    promptTokenCount: number;
    candidatesTokenCount: number;
    cachedContentTokenCount: number;
    totalTokenCount: number;
  }>;
}) {
  const parts = (overrides.functionCalls ?? []).map((call) => ({ functionCall: call }));
  return {
    candidates: [
      {
        content: { role: "model", parts },
        finishReason: overrides.finishReason ?? "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 1000,
      candidatesTokenCount: 200,
      totalTokenCount: 1200,
      ...overrides.usageMetadata,
    },
  };
}

describe("GeminiLLM.structured", () => {
  it("returns validated data and zero-cost usage on a clean first call", async () => {
    server.use(
      http.post(GENERATE_CONTENT_URL, () =>
        HttpResponse.json(
          fakeResponse({
            functionCalls: [{ name: "submit_test", args: { name: "Loopwell", value: 3 } }],
            usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 },
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
      maxOutputTokens: 500,
    });

    expect(data).toEqual({ name: "Loopwell", value: 3 });
    expect(usage).toEqual({
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      estimatedCostUsd: 0,
    });
  });

  it("repairs once when the first call's args fail Zod validation, and sums usage across both calls", async () => {
    let callCount = 0;
    server.use(
      http.post(GENERATE_CONTENT_URL, () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json(
            fakeResponse({
              functionCalls: [{ name: "submit_test", args: { name: "Loopwell", value: "not-a-number" } }],
            }),
          );
        }
        return HttpResponse.json(
          fakeResponse({ functionCalls: [{ name: "submit_test", args: { name: "Loopwell", value: 3 } }] }),
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
      maxOutputTokens: 500,
    });

    expect(data).toEqual({ name: "Loopwell", value: 3 });
    expect(callCount).toBe(2);
    expect(usage.inputTokens).toBe(2000);
    expect(usage.outputTokens).toBe(400);
  });

  it("throws LlmSchemaError when the repair call also fails validation", async () => {
    server.use(
      http.post(GENERATE_CONTENT_URL, () =>
        HttpResponse.json(
          fakeResponse({ functionCalls: [{ name: "submit_test", args: { name: "Loopwell" } }] }),
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
        maxOutputTokens: 500,
      }),
    ).rejects.toThrow(LlmSchemaError);
  });

  it("throws LlmResponseError when no matching function call is returned", async () => {
    server.use(
      http.post(GENERATE_CONTENT_URL, () => HttpResponse.json(fakeResponse({ finishReason: "STOP" }))),
    );

    const llm = makeLlm();
    await expect(
      llm.structured({
        role: "ANALYSIS",
        system: "system prompt",
        user: "user prompt",
        toolName: "submit_test",
        schema: testSchema,
        maxOutputTokens: 500,
      }),
    ).rejects.toThrow(LlmResponseError);
  });

  it("maps cachedContentTokenCount to cacheReadTokens and never charges a cost", async () => {
    server.use(
      http.post(GENERATE_CONTENT_URL, () =>
        HttpResponse.json(
          fakeResponse({
            functionCalls: [{ name: "submit_test", args: { name: "Loopwell", value: 3 } }],
            usageMetadata: { promptTokenCount: 5000, candidatesTokenCount: 100, cachedContentTokenCount: 4000 },
          }),
        ),
      ),
    );

    const llm = makeLlm();
    const { usage } = await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "user prompt",
      cachePrefix: "shared evidence block",
      toolName: "submit_test",
      schema: testSchema,
      maxOutputTokens: 500,
    });

    expect(usage.cacheReadTokens).toBe(4000);
    expect(usage.estimatedCostUsd).toBe(0);
  });

  it("strips maxItems from the outgoing parametersJsonSchema (Gemini rejects schemas whose aggregate maxItems crosses an undocumented threshold, verified live — see the comment on stripMaxItemsForGemini)", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(GENERATE_CONTENT_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          fakeResponse({
            functionCalls: [{ name: "submit_test", args: { name: "Loopwell", value: 3, items: ["a"] } }],
          }),
        );
      }),
    );

    const schemaWithMaxItems = z.object({
      name: z.string(),
      value: z.number(),
      items: z.array(z.string()).max(80),
    });
    const llm = makeLlm();
    await llm.structured({
      role: "ANALYSIS",
      system: "system prompt",
      user: "user prompt",
      toolName: "submit_test",
      schema: schemaWithMaxItems,
      maxOutputTokens: 500,
    });

    const sentSchema = (
      capturedBody as {
        tools: { functionDeclarations: { parametersJsonSchema: unknown }[] }[];
      }
    ).tools[0]!.functionDeclarations[0]!.parametersJsonSchema;
    expect(JSON.stringify(sentSchema)).not.toContain("maxItems");
    // minItems (when present) and every other constraint stay — only maxItems is stripped.
    expect(JSON.stringify(sentSchema)).toContain('"items"');
  });
});
