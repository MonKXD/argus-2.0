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
      return env.ANTHROPIC_MODEL_ANALYSIS;
    case "SYNTHESIS":
      return env.ANTHROPIC_MODEL_SYNTHESIS;
    case "FAST":
      return env.ANTHROPIC_MODEL_FAST;
  }
}
