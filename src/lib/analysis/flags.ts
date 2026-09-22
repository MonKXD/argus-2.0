import type { Severity } from "@/lib/schema/enums";

/**
 * AI_SPEC 3.4: "severity by materiality: revenue, funding, team size and
 * customer counts are HIGH; others MEDIUM." Matched against canonical fact
 * keys (SCHEMA section 8); a `custom.*` key always falls through to MEDIUM.
 */
const HIGH_MATERIALITY_KEY_PATTERNS: RegExp[] = [
  /^traction\.(arr|mrr|revenue)/,
  /^financial\.(total_raised|last_round_size|valuation_post)/,
  /^team\.size$/,
  /^company\.employee_count$/,
  /^traction\.(customers|users|mau)$/,
];

export function materialitySeverity(factKey: string): Severity {
  return HIGH_MATERIALITY_KEY_PATTERNS.some((pattern) => pattern.test(factKey)) ? "HIGH" : "MEDIUM";
}
