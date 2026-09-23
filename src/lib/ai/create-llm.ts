import { createGeminiLlm } from "@/lib/ai/gemini-llm";
import { createAnthropicLlm } from "@/lib/ai/llm";
import type { LLM } from "@/lib/ai/llm";
import { geminiModelForRole, modelForRole } from "@/lib/ai/models";
import { env } from "@/lib/env";


/**
 * Single switch point for which `LLM` implementation the production
 * orchestrator uses (D-064) — both providers are fully built behind the
 * same interface (R-ARC-08), so this is the only place that decides.
 */
export function createLlm(): LLM {
  switch (env.LLM_PROVIDER) {
    case "gemini":
      return createGeminiLlm();
    case "anthropic":
      return createAnthropicLlm();
  }
}

/** The active provider's real model ids, for recording on the `Run` document (R-AI-10). */
export function activeModelIds(): { analysis: string; synthesis: string; fast: string } {
  const forRole = env.LLM_PROVIDER === "gemini" ? geminiModelForRole : modelForRole;
  return { analysis: forRole("ANALYSIS"), synthesis: forRole("SYNTHESIS"), fast: forRole("FAST") };
}
