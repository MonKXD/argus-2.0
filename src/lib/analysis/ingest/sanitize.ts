/**
 * AI_SPEC section 3.1: "Strip control and zero-width characters.
 * Normalise whitespace but keep original text for quote matching."
 * Control characters (C0 excluding tab/newline, C1, DEL) and
 * zero-width/invisible Unicode formatting characters are stripped
 * outright — they're never meaningfully part of a quote. Whitespace
 * normalisation is deliberately light (line endings, trim) rather than
 * collapsing internal spacing, so a verbatim quote copied from this text
 * still matches it exactly (R-AI-03).
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const ZERO_WIDTH_CHARS = /[​-‏‪-‮⁠-⁤﻿]/g;

export function sanitizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(ZERO_WIDTH_CHARS, "")
    .trim();
}
