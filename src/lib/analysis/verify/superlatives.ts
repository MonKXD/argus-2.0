/**
 * V5 / AI_SPEC 3.4's "Unverifiable superlatives": absolute or superlative
 * claims ("first", "only", "no competitors", "#1", "best") supported only
 * by `PROVIDED` evidence generate an `UNVERIFIABLE_CLAIM` flag.
 *
 * Scoped to phrases that assert competitive superiority or uniqueness, not
 * bare occurrences of these words — "first quarter", "her first engineer"
 * and "first round of funding" are common, entirely mundane phrasings that
 * must never trigger this; verified against real fixtures before trusting,
 * same precision-favouring approach as V6's sensitive-attribute scan.
 */
const SUPERLATIVE_PATTERNS: RegExp[] = [
  /\bthe first (company|startup|platform|solution|product|team) to\b/i,
  /\bworld'?s first\b/i,
  /\bfirst[- ]to[- ]market\b/i,
  /\b(the )?only (company|startup|platform|solution|provider|team|one)\b/i,
  /\bno (direct )?competitors\b/i,
  /#\s?1\b/,
  /\b(the )?best (in|on) the market\b/i,
  /\bbest[- ]in[- ]class\b/i,
  /\b(the )?market leader\b/i,
  /\bunmatched\b/i,
  /\bunparalleled\b/i,
];

export function containsSuperlative(text: string): boolean {
  return SUPERLATIVE_PATTERNS.some((pattern) => pattern.test(text));
}
