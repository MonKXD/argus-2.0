export interface TextChunk {
  text: string;
  startChar: number;
  endChar: number;
}

const MAX_CHUNK_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 150;

/**
 * AI_SPEC section 3.1: "split into evidence items of up to 2,000
 * characters on natural boundaries... with a small overlap." The
 * extractors already chunk at the natural page/paragraph/sheet/URL
 * boundary; this handles the case where one of those units is itself
 * still too long — preferring to break at a paragraph, then a sentence,
 * then a word boundary before falling back to a hard cut, so a chunk
 * boundary doesn't land mid-word or mid-sentence when it doesn't have to.
 */
export function chunkText(
  text: string,
  maxChars: number = MAX_CHUNK_CHARS,
  overlap: number = CHUNK_OVERLAP_CHARS,
): TextChunk[] {
  if (text.length <= maxChars) {
    return [{ text, startChar: 0, endChar: text.length }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const hardEnd = Math.min(start + maxChars, text.length);
    const end = hardEnd < text.length ? findBoundary(text, start, hardEnd) : hardEnd;

    chunks.push({ text: text.slice(start, end), startChar: start, endChar: end });

    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1); // always make forward progress
  }

  return chunks;
}

/**
 * Looks backward from `hardEnd` within `[start, hardEnd]` for the latest
 * paragraph break, then sentence end, then space — each accepted only if
 * it doesn't shrink the chunk below half of the window, to avoid
 * pathologically tiny chunks. Falls back to the hard character cut.
 */
function findBoundary(text: string, start: number, hardEnd: number): number {
  const window = text.slice(start, hardEnd);
  const minAcceptable = Math.floor(window.length / 2);

  const paragraphBreak = window.lastIndexOf("\n\n");
  if (paragraphBreak >= minAcceptable) return start + paragraphBreak; // stop before the blank line itself

  const sentenceEnd = lastSentenceEnd(window);
  if (sentenceEnd !== -1 && sentenceEnd >= minAcceptable) return start + sentenceEnd;

  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace >= minAcceptable) return start + lastSpace + 1;

  return hardEnd;
}

function lastSentenceEnd(window: string): number {
  let last = -1;
  for (const match of window.matchAll(/[.!?](\s|$)/g)) {
    last = match.index! + 1; // just past the punctuation
  }
  return last;
}
