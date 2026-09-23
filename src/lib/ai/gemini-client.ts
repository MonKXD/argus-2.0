import { GoogleGenAI } from "@google/genai";

import { env } from "@/lib/env";

/**
 * Lazy singleton, same pattern as `client.ts`'s `getAnthropicClient()`:
 * importing this module must not require `GEMINI_API_KEY` to be set until
 * something actually calls `getGeminiClient()` (R-ARC-06: the model is
 * called only from server code through `src/lib/ai`).
 */
let cachedClient: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  cachedClient ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return cachedClient;
}
