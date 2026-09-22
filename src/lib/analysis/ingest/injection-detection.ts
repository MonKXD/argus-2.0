/**
 * AI_SPEC section 3.1: detect — but never remove — instruction-like
 * patterns in evidence text, so INGEST can record `INJECTION_SUSPECTED`
 * and raise a `SOURCE_INTEGRITY` flag (severity MEDIUM, informational;
 * R-AI-06). Deliberately over-inclusive: a false positive only adds an
 * informational flag a reviewer can dismiss, while a false negative lets
 * a real injection attempt through with no signal at all. Not exhaustive
 * — this is a first line of defence, not the whole one (R-AI-06's other
 * defences — delimited evidence blocks, no tools but the output tool on
 * analysis calls — do the actual containment).
 */
const INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "ignore previous instructions",
    pattern: /\bignore\s+(the\s+)?(previous|prior|above|all)\s+instructions?\b/i,
  },
  { name: "you are now", pattern: /\byou\s+are\s+now\b/i },
  { name: "system prompt", pattern: /\bsystem\s+prompt\b/i },
  {
    name: "rate this company",
    pattern: /\brate\s+(this|our|my)\s+(company|startup|business)\b/i,
  },
  { name: "new instructions", pattern: /\b(new|updated)\s+instructions?\s*:/i },
  { name: "disregard previous", pattern: /\bdisregard\s+(the\s+)?(previous|prior|above|all)\b/i },
  { name: "act as", pattern: /\bact\s+as\s+(a|an|if)\b/i },
  {
    name: "reveal your prompt",
    pattern: /\b(reveal|show|print)\s+(your\s+)?(system\s+)?prompt\b/i,
  },
];

/** Returns the name of the first matched pattern, or null if none match. */
export function detectInjectionPattern(text: string): string | null {
  for (const { name, pattern } of INJECTION_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  return null;
}
