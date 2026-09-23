import { env } from "@/lib/env";

/**
 * Model roles (TRD section 6): ANALYSIS extracts facts and analyses
 * dimensions, SYNTHESIS writes the report narrative, FAST handles
 * classification and dedupe. R-AI-10: model IDs come only from env config,
 * never hard-coded.
 */
export type ModelRole = "ANALYSIS" | "SYNTHESIS" | "FAST";

export function modelForRole(role: ModelRole): string {
  switch (role) {
    case "ANALYSIS":
      return requireEnv(env.ANTHROPIC_MODEL_ANALYSIS, "ANTHROPIC_MODEL_ANALYSIS");
    case "SYNTHESIS":
      return requireEnv(env.ANTHROPIC_MODEL_SYNTHESIS, "ANTHROPIC_MODEL_SYNTHESIS");
    case "FAST":
      return requireEnv(env.ANTHROPIC_MODEL_FAST, "ANTHROPIC_MODEL_FAST");
  }
}

/** Same role mapping, for the Gemini provider (D-064). */
export function geminiModelForRole(role: ModelRole): string {
  switch (role) {
    case "ANALYSIS":
      return requireEnv(env.GEMINI_MODEL_ANALYSIS, "GEMINI_MODEL_ANALYSIS");
    case "SYNTHESIS":
      return requireEnv(env.GEMINI_MODEL_SYNTHESIS, "GEMINI_MODEL_SYNTHESIS");
    case "FAST":
      return requireEnv(env.GEMINI_MODEL_FAST, "GEMINI_MODEL_FAST");
  }
}

/**
 * Both providers' model-id vars are optional in the Zod schema (only one
 * provider's set is required, enforced by env.ts's own `.superRefine`), so
 * TypeScript sees `string | undefined` here even though a correctly
 * configured deployment always has the active provider's vars set. This
 * throws instead of silently returning `undefined` to the SDK if that
 * invariant is somehow violated (env.ts's own refinement is bypassed only
 * by a bug, not a legitimate config).
 */
function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required but was not set`);
  return value;
}
