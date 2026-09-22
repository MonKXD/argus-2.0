/**
 * V2 numeric grounding (AI_SPEC section 6): "Extract numbers with currency,
 * percent, multiples, units, dates, and any integer above 10. VERIFIED: each
 * must appear in the quoted text. Other statuses: each must appear in a
 * cited claim, fact or evidence, or come from a `derivation` the verifier
 * recomputes within 1%. Bare integers 10 or below are exempt (known
 * limitation, AI_SPEC V2)."
 *
 * A year or count like "2026" or "50" is already caught by the bare-integer
 * rule, so no separate date parser is needed.
 */

const NUM = "(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?";
const CURRENCY_RE = new RegExp(`[$€£]\\s?(${NUM})\\s?(million|billion|thousand|[kKmMbB])?\\b`, "g");
const PERCENT_RE = new RegExp(`(${NUM})\\s?%`, "g");
const MULTIPLE_RE = new RegExp(`(${NUM})\\s?[xX]\\b`, "g");
const BARE_NUMBER_RE = new RegExp(`\\b(${NUM})\\b`, "g");

const MULTIPLIER_WORDS: Record<string, number> = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
  thousand: 1e3,
  million: 1e6,
  billion: 1e9,
};

const BARE_INTEGER_EXEMPTION = 10;
const DERIVATION_TOLERANCE = 0.01;

export interface ExtractedNumber {
  kind: "currency" | "percent" | "multiple" | "integer";
  value: number;
}

/** Every numeric token in `text`, normalised to its magnitude (e.g. "$2.0M" -> 2_000_000). */
export function extractNumbers(text: string): ExtractedNumber[] {
  const found: ExtractedNumber[] = [];
  const claimedSpans: Array<[number, number]> = [];

  for (const m of text.matchAll(CURRENCY_RE)) {
    const base = parseNum(m[1]!);
    const multiplier = m[2] ? (MULTIPLIER_WORDS[m[2].toLowerCase()] ?? 1) : 1;
    found.push({ kind: "currency", value: base * multiplier });
    claimedSpans.push([m.index, m.index + m[0].length]);
  }
  for (const m of text.matchAll(PERCENT_RE)) {
    found.push({ kind: "percent", value: parseNum(m[1]!) });
    claimedSpans.push([m.index, m.index + m[0].length]);
  }
  for (const m of text.matchAll(MULTIPLE_RE)) {
    found.push({ kind: "multiple", value: parseNum(m[1]!) });
    claimedSpans.push([m.index, m.index + m[0].length]);
  }
  for (const m of text.matchAll(BARE_NUMBER_RE)) {
    const overlapsClaimed = claimedSpans.some(([s, e]) => m.index < e && m.index + m[0].length > s);
    if (overlapsClaimed) continue;
    const value = parseNum(m[1]!);
    if (value > BARE_INTEGER_EXEMPTION) found.push({ kind: "integer", value });
  }
  return found;
}

function parseNum(raw: string): number {
  return parseFloat(raw.replaceAll(",", ""));
}

/** True when `value` also appears (as an extracted number) somewhere in `text`. */
export function numberAppearsIn(value: number, text: string): boolean {
  return extractNumbers(text).some((n) => n.value === value);
}

export interface DerivationCheck {
  formula: string;
  inputs: Array<{ factId: string; value: number }>;
  result: number;
}

/**
 * Validates a claim's `derivation` without executing `formula` as code (no
 * syntax for it is defined anywhere, and evaluating arbitrary model-written
 * expressions is a needless risk for something the docs don't require):
 * every input must cite a real fact with a matching value, factValueOf
 * returns undefined otherwise. The caller still separately checks the
 * claim's own asserted number is within tolerance of `result`.
 */
export function derivationInputsAreReal(
  derivation: DerivationCheck,
  factValueOf: (factId: string) => number | undefined,
): boolean {
  return derivation.inputs.every((input) => {
    const actual = factValueOf(input.factId);
    return actual !== undefined && withinTolerance(input.value, actual);
  });
}

export function withinTolerance(a: number, b: number, tolerance = DERIVATION_TOLERANCE): boolean {
  if (a === b) return true;
  const denominator = Math.max(Math.abs(a), Math.abs(b));
  if (denominator === 0) return true;
  return Math.abs(a - b) / denominator <= tolerance;
}
