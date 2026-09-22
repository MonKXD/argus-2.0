import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

/**
 * Lazy singleton, same pattern as src/lib/env.ts's own `env` proxy: importing
 * this module must not require ANTHROPIC_API_KEY to be set until something
 * actually calls getAnthropicClient() (R-ARC-06: the model is called only
 * from server code through src/lib/ai).
 */
let cachedClient: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  cachedClient ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cachedClient;
}
