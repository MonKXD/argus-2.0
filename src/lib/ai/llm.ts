
import { getAnthropicClient } from "@/lib/ai/client";
import { LlmResponseError, LlmSchemaError } from "@/lib/ai/errors";
import { modelForRole, type ModelRole } from "@/lib/ai/models";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { logger } from "@/lib/logger";
import type { Usage } from "@/lib/schema/run";
import { toToolInputSchema } from "@/lib/schema/to-json-schema";

import type Anthropic from "@anthropic-ai/sdk";
import type { Logger } from "pino";
import type { ZodError, ZodType } from "zod";

/**
 * LLM client (TRD 5.1's `LLM` interface, section 6 "LLM integration").
 * Every call is a forced single tool call, validated with Zod, with at most
 * one repair attempt (R-AI-08, AI_SPEC section 8) — this client never lets a
 * response through unvalidated, and it never gives the model any tool other
 * than the one it forces (R-AI-06: "analysis calls have no tools other than
 * the output tool").
 */
export interface StructuredArgs<T> {
  role: ModelRole;
  system: string;
  user: string;
  /** Shared evidence block; cached as a separate `cache_control` breakpoint ahead of `user` (TRD 5.3). */
  cachePrefix?: string;
  toolName: string;
  schema: ZodType<T>;
  maxOutputTokens: number;
  signal?: AbortSignal;
}

export interface LLM {
  structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }>;
}

export interface AnthropicLLMOptions {
  client: Anthropic;
  modelIds: Record<ModelRole, string>;
  log?: Logger;
}

/**
 * Fixed at 0: every call through this client is extraction or analysis
 * (TRD section 6: "Low temperature for extraction and analysis where the
 * model supports it"), never open-ended chat, so there is no case where a
 * higher temperature would be wanted.
 */
const TEMPERATURE = 0;

export class AnthropicLLM implements LLM {
  private readonly client: Anthropic;
  private readonly modelIds: Record<ModelRole, string>;
  private readonly log: Logger | undefined;

  constructor(options: AnthropicLLMOptions) {
    this.client = options.client;
    this.modelIds = options.modelIds;
    this.log = options.log;
  }

  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    const model = this.modelIds[args.role];
    const tool: Anthropic.Tool = {
      name: args.toolName,
      input_schema: toToolInputSchema(args.schema) as Anthropic.Tool.InputSchema,
    };
    const toolChoice: Anthropic.ToolChoice = {
      type: "tool",
      name: args.toolName,
      disable_parallel_tool_use: true,
    };
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: buildUserContent(args.user, args.cachePrefix) },
    ];

    const first = await this.call(model, args, tool, toolChoice, messages);
    const firstUse = extractToolUse(first, args.toolName);
    const firstParsed = args.schema.safeParse(firstUse.input);
    if (firstParsed.success) {
      return { data: firstParsed.data, usage: toUsage(model, first.usage) };
    }

    this.log?.warn(
      { toolName: args.toolName, model, issueCount: firstParsed.error.issues.length },
      "llm structured output failed schema validation; attempting one repair call",
    );

    const repairMessages: Anthropic.MessageParam[] = [
      ...messages,
      { role: "assistant", content: first.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: firstUse.id,
            is_error: true,
            content: formatValidationErrors(firstParsed.error),
          },
        ],
      },
    ];

    const second = await this.call(model, args, tool, toolChoice, repairMessages);
    const secondUse = extractToolUse(second, args.toolName);
    const secondParsed = args.schema.safeParse(secondUse.input);
    const usage = sumUsage(toUsage(model, first.usage), toUsage(model, second.usage));

    if (!secondParsed.success) {
      throw new LlmSchemaError(
        `Structured output for tool "${args.toolName}" failed validation after one repair attempt`,
        formatValidationErrors(secondParsed.error),
      );
    }

    return { data: secondParsed.data, usage };
  }

  private async call(
    model: string,
    args: Pick<StructuredArgs<unknown>, "system" | "maxOutputTokens" | "signal">,
    tool: Anthropic.Tool,
    toolChoice: Anthropic.ToolChoice,
    messages: Anthropic.MessageParam[],
  ): Promise<Anthropic.Message> {
    return this.client.messages.create(
      {
        model,
        system: args.system,
        messages,
        tools: [tool],
        tool_choice: toolChoice,
        max_tokens: args.maxOutputTokens,
        temperature: TEMPERATURE,
      },
      { signal: args.signal },
    );
  }
}

function buildUserContent(
  user: string,
  cachePrefix: string | undefined,
): string | Anthropic.TextBlockParam[] {
  if (!cachePrefix) return user;
  return [
    { type: "text", text: cachePrefix, cache_control: { type: "ephemeral" } },
    { type: "text", text: user },
  ];
}

function extractToolUse(message: Anthropic.Message, toolName: string): Anthropic.ToolUseBlock {
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === toolName,
  );
  if (!block) {
    const contentTypes = message.content.map((b) => b.type).join(", ");
    throw new LlmResponseError(
      `Expected a "${toolName}" tool_use block; got stop_reason "${message.stop_reason}" with content types [${contentTypes}]`,
    );
  }
  return block;
}

function formatValidationErrors(error: ZodError): string {
  return error.issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`).join("\n");
}

function toUsage(model: string, usage: Anthropic.Usage): Usage {
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    estimatedCostUsd: estimateCostUsd(model, {
      inputTokens,
      outputTokens,
      cacheWriteTokens,
      cacheReadTokens,
    }),
  };
}

function sumUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    estimatedCostUsd: a.estimatedCostUsd + b.estimatedCostUsd,
  };
}

/** Production wiring: real client, real env-configured model IDs, shared logger. Not yet called anywhere — the step runner that will use it lands at T-2.08+/T-3.08. */
export function createAnthropicLlm(): AnthropicLLM {
  return new AnthropicLLM({
    client: getAnthropicClient(),
    modelIds: {
      ANALYSIS: modelForRole("ANALYSIS"),
      SYNTHESIS: modelForRole("SYNTHESIS"),
      FAST: modelForRole("FAST"),
    },
    log: logger,
  });
}
