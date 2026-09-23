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
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
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
    const firstPart = extractFunctionCallPart(first, args.toolName);
    const firstCall = firstPart.functionCall!;
    const firstParsed = args.schema.safeParse(firstCall.args);
    if (firstParsed.success) {
      return { data: firstParsed.data, usage: toUsage(first) };
    }

    this.log?.warn(
      { toolName: args.toolName, model, issueCount: firstParsed.error.issues.length },
      "gemini structured output failed schema validation; attempting one repair call",
    );

    // Echoing the function-call part back verbatim (not just its
    // `functionCall`) matters for Gemini's "thinking" models: they attach a
    // `thoughtSignature` to that part and reject the next turn with a 400
    // ("Function call is missing a thought_signature") if it's dropped —
    // found by reproducing this exact repair round-trip directly against
    // the live API (PROJECT_MEMORY D-064's live-verification follow-up).
    const repairContents: Content[] = [
      ...contents,
      { role: "model", parts: [firstPart] },
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
    const secondCall = extractFunctionCallPart(second, args.toolName).functionCall!;
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
              parametersJsonSchema: stripMaxItemsForGemini(toToolInputSchema(args.schema)),
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

/**
 * Gemini's `parametersJsonSchema` rejects the request outright (400
 * INVALID_ARGUMENT, no useful detail beyond that) once the `maxItems`
 * values across a schema cross an undocumented threshold — confirmed by
 * bisecting a real request against the live API: a single array's own
 * `maxItems: 20` works, `maxItems: 80` alone doesn't, and two arrays at
 * `maxItems: 20` each (sum 40) fail together even though each is fine
 * alone, so this reads as an aggregate cap somewhere between 30 and 50,
 * not a per-field one (PROJECT_MEMORY D-064's live-verification session).
 * Multiple `oneOf` branches, schema size, and duplicate sub-schemas were
 * all ruled out first as candidate causes before this one was isolated.
 * Stripping `maxItems` (keeping `minItems`) sidesteps the limit entirely
 * and costs nothing real: the upper bound still fully applies to the
 * actual response via the unmodified Zod schema (R-AI-02, R-AI-08) — this
 * only loosens the *hint* the model sees, never what's accepted.
 */
function stripMaxItemsForGemini(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripMaxItemsForGemini);
  if (node && typeof node === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "maxItems") continue;
      result[key] = stripMaxItemsForGemini(value);
    }
    return result;
  }
  return node;
}

function buildUserText(user: string, cachePrefix: string | undefined): string {
  return cachePrefix ? `${cachePrefix}\n\n${user}` : user;
}

/**
 * Returns the whole `Part` (not just its `FunctionCall`) so the caller can
 * echo `thoughtSignature` back verbatim on a repair turn — see the comment
 * at the repair call site.
 */
function extractFunctionCallPart(response: GenerateContentResponse, toolName: string): Part {
  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.functionCall?.name === toolName);
  if (!part) {
    const finishReason = response.candidates?.[0]?.finishReason ?? "unknown";
    throw new LlmResponseError(
      `Expected a "${toolName}" function call; got finishReason "${finishReason}" with no matching call`,
    );
  }
  return part;
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
