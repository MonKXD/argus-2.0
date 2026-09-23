import { FunctionCallingConfigMode } from "@google/genai";

import { LlmResponseError, LlmSchemaError } from "@/lib/ai/errors";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import { geminiModelForRole, type ModelRole } from "@/lib/ai/models";
import { logger } from "@/lib/logger";
import type { Usage } from "@/lib/schema/run";
import { toToolInputSchema } from "@/lib/schema/to-json-schema";

import type {
  Content,
  FunctionCall,
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
} from "@google/genai";
import type { Logger } from "pino";
import type { ZodError } from "zod";

/**
 * `LLM` implementation for the Gemini Developer API (D-064): the free-tier
 * default alongside the already-existing `AnthropicLLM`, both behind the
 * same provider-agnostic interface (R-ARC-08). Structured output still goes
 * only through a forced function call (R-AI-08): `FunctionCallingConfigMode.ANY`
 * with `allowedFunctionNames` restricted to the one tool, mirroring
 * Anthropic's `tool_choice: {type: "tool", ...}`. One repair attempt on a
 * validation failure, same as `AnthropicLLM` — sent back as a
 * `functionResponse` with an `error` key (the SDK's own documented
 * "error details" convention, README's counterpart to Anthropic's
 * `is_error: true` tool_result).
 *
 * No prompt-caching equivalent is used: Gemini's context-caching feature
 * (`CachedContent`) is a separate, explicitly-managed resource with its own
 * minimum-token requirements, not an automatic per-call breakpoint the way
 * Anthropic's `cache_control` is — not worth building for a free-tier
 * default. `cachePrefix` and `user` are just concatenated into one text
 * part instead.
 *
 * `estimatedCostUsd` is always 0: this provider exists specifically to run
 * on Gemini's free tier, so real billing never applies here. If this
 * project is ever configured with a paid Gemini plan, that would need a
 * real price table the way `pricing.ts` already has one for Anthropic —
 * out of scope for this decision.
 */
export interface GeminiLLMOptions {
  client: GoogleGenAI;
  modelIds: Record<ModelRole, string>;
  log?: Logger;
}

const TEMPERATURE = 0;

export class GeminiLLM implements LLM {
  private readonly client: GoogleGenAI;
  private readonly modelIds: Record<ModelRole, string>;
  private readonly log: Logger | undefined;

  constructor(options: GeminiLLMOptions) {
    this.client = options.client;
    this.modelIds = options.modelIds;
    this.log = options.log;
  }

  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    const model = this.modelIds[args.role];
    const config = this.baseConfig(args);

    const contents: Content[] = [{ role: "user", parts: [{ text: buildUserText(args.user, args.cachePrefix) }] }];

    const first = await this.call(model, config, contents, args.signal);
    const firstCall = extractFunctionCall(first, args.toolName);
    const firstParsed = args.schema.safeParse(firstCall.args);
    if (firstParsed.success) {
      return { data: firstParsed.data, usage: toUsage(first) };
    }

    this.log?.warn(
      { toolName: args.toolName, model, issueCount: firstParsed.error.issues.length },
      "gemini structured output failed schema validation; attempting one repair call",
    );

    const repairContents: Content[] = [
      ...contents,
      { role: "model", parts: [{ functionCall: firstCall }] },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: firstCall.id,
              name: args.toolName,
              response: { error: formatValidationErrors(firstParsed.error) },
            },
          },
        ],
      },
    ];

    const second = await this.call(model, config, repairContents, args.signal);
    const secondCall = extractFunctionCall(second, args.toolName);
    const secondParsed = args.schema.safeParse(secondCall.args);
    const usage = sumUsage(toUsage(first), toUsage(second));

    if (!secondParsed.success) {
      throw new LlmSchemaError(
        `Structured output for tool "${args.toolName}" failed validation after one repair attempt`,
        formatValidationErrors(secondParsed.error),
      );
    }

    return { data: secondParsed.data, usage };
  }

  private baseConfig(args: StructuredArgs<unknown>): GenerateContentConfig {
    return {
      systemInstruction: args.system,
      maxOutputTokens: args.maxOutputTokens,
      temperature: TEMPERATURE,
      tools: [
        {
          functionDeclarations: [
            {
              name: args.toolName,
              parametersJsonSchema: toToolInputSchema(args.schema),
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: [args.toolName],
        },
      },
    };
  }

  private call(
    model: string,
    config: GenerateContentConfig,
    contents: Content[],
    signal: AbortSignal | undefined,
  ): Promise<GenerateContentResponse> {
    return this.client.models.generateContent({
      model,
      contents,
      config: { ...config, abortSignal: signal },
    });
  }
}

function buildUserText(user: string, cachePrefix: string | undefined): string {
  return cachePrefix ? `${cachePrefix}\n\n${user}` : user;
}

function extractFunctionCall(response: GenerateContentResponse, toolName: string): FunctionCall {
  const call = response.functionCalls?.find((c) => c.name === toolName);
  if (!call) {
    const finishReason = response.candidates?.[0]?.finishReason ?? "unknown";
    throw new LlmResponseError(
      `Expected a "${toolName}" function call; got finishReason "${finishReason}" with no matching call`,
    );
  }
  return call;
}

function formatValidationErrors(error: ZodError): string {
  return error.issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
}

function toUsage(response: GenerateContentResponse): Usage {
  const usage = response.usageMetadata;
  return {
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    cacheReadTokens: usage?.cachedContentTokenCount ?? 0,
    cacheWriteTokens: 0,
    estimatedCostUsd: 0,
  };
}

function sumUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    estimatedCostUsd: a.estimatedCostUsd + b.estimatedCostUsd,
  };
}

/** Production wiring: real client, real env-configured Gemini model IDs, shared logger. */
export function createGeminiLlm(): GeminiLLM {
  return new GeminiLLM({
    client: getGeminiClient(),
    modelIds: {
      ANALYSIS: geminiModelForRole("ANALYSIS"),
      SYNTHESIS: geminiModelForRole("SYNTHESIS"),
      FAST: geminiModelForRole("FAST"),
    },
    log: logger,
  });
}
