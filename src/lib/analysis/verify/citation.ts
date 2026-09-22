/**
 * V1 citation validity (AI_SPEC section 6): "Each quote must be a contiguous
 * substring of its evidence text after normalisation (case, whitespace,
 * quotes, dashes, markdown). If no exact match, accept a windowed fuzzy
 * match with similarity of at least 0.92 and replace the quote with the
 * matched original text."
 *
 * Both paths return a slice of the ORIGINAL (non-normalised) evidence text,
 * never the model's own copy of the quote — R-AI-03 needs the stored quote
 * to be a real, byte-exact substring of the evidence it cites.
 */

const FUZZY_SIMILARITY_THRESHOLD = 0.92;

const CURLY_QUOTES: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "′": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "″": '"',
};
const DASHES: Record<string, string> = {
  "–": "-",
  "—": "-",
  "−": "-",
};
const STRIPPED_MARKDOWN_CHARS = new Set(["*", "_", "`"]);

function foldChar(ch: string): string {
  return CURLY_QUOTES[ch] ?? DASHES[ch] ?? ch.toLowerCase();
}

export interface QuoteValidation {
  valid: boolean;
  /** A real substring of the evidence text; present only when valid. */
  matchedText?: string;
  method?: "exact" | "fuzzy";
  similarity?: number;
}

export function validateQuote(quote: string, evidenceText: string): QuoteValidation {
  const exact = findExactMatch(quote, evidenceText);
  if (exact !== null) {
    return { valid: true, matchedText: exact, method: "exact", similarity: 1 };
  }

  const fuzzy = findFuzzyMatch(quote, evidenceText);
  if (fuzzy) {
    return { valid: true, matchedText: fuzzy.text, method: "fuzzy", similarity: fuzzy.similarity };
  }

  return { valid: false };
}

interface NormSpan {
  origStart: number;
  length: number;
}

/** Case/whitespace/quote/dash/markdown-folded text, plus a per-char map back to the original span it came from. */
function normalizeForMatch(text: string): { normalized: string; spans: NormSpan[] } {
  const chars: string[] = [];
  const spans: NormSpan[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (/\s/.test(ch)) {
      let j = i;
      while (j < text.length && /\s/.test(text[j]!)) j++;
      chars.push(" ");
      spans.push({ origStart: i, length: j - i });
      i = j;
      continue;
    }
    if (STRIPPED_MARKDOWN_CHARS.has(ch)) {
      i++;
      continue;
    }
    chars.push(foldChar(ch));
    spans.push({ origStart: i, length: 1 });
    i++;
  }
  return { normalized: chars.join(""), spans };
}

function findExactMatch(quote: string, evidenceText: string): string | null {
  const trimmedQuote = normalizeForMatch(quote).normalized.trim();
  if (!trimmedQuote) return null;

  const { normalized: normEvidence, spans } = normalizeForMatch(evidenceText);
  const idx = normEvidence.indexOf(trimmedQuote);
  if (idx === -1) return null;

  const startSpan = spans[idx]!;
  const endSpan = spans[idx + trimmedQuote.length - 1]!;
  return evidenceText.slice(startSpan.origStart, endSpan.origStart + endSpan.length);
}

interface Token {
  normalized: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const raw = match[0];
    const normalized = normalizeToken(raw);
    if (normalized) tokens.push({ normalized, start: match.index, end: match.index + raw.length });
  }
  return tokens;
}

function normalizeToken(raw: string): string {
  let out = "";
  for (const ch of raw) {
    if (STRIPPED_MARKDOWN_CHARS.has(ch)) continue;
    out += foldChar(ch);
  }
  return out;
}

function findFuzzyMatch(quote: string, evidenceText: string): { text: string; similarity: number } | null {
  const quoteTokens = tokenize(quote);
  if (quoteTokens.length === 0) return null;
  const quoteNorm = quoteTokens.map((t) => t.normalized).join(" ");

  const evidenceTokens = tokenize(evidenceText);
  if (evidenceTokens.length < quoteTokens.length) return null;

  let best: { similarity: number; start: number; end: number } | null = null;
  for (let i = 0; i + quoteTokens.length <= evidenceTokens.length; i++) {
    const window = evidenceTokens.slice(i, i + quoteTokens.length);
    const windowNorm = window.map((t) => t.normalized).join(" ");
    const sim = similarity(quoteNorm, windowNorm);
    if (!best || sim > best.similarity) {
      best = { similarity: sim, start: window[0]!.start, end: window[window.length - 1]!.end };
    }
  }

  if (!best || best.similarity < FUZZY_SIMILARITY_THRESHOLD) return null;
  return { text: evidenceText.slice(best.start, best.end), similarity: best.similarity };
}

/** Normalised edit-distance similarity: 1 - levenshtein(a, b) / max(a.length, b.length). */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n]!;
}
