import { extractText, getDocumentProxy } from "unpdf";

import type { Extractor, ExtractedPage } from "@/lib/analysis/ingest/extractor";

/**
 * AI_SPEC section 3.1: a page with fewer than this many non-whitespace
 * characters has "almost no extractable text" and needs the vision
 * fallback. Set well above incidental text (a page number, a running
 * header) without being so low that a lightly-captioned image slide still
 * counts as having a text layer.
 */
const MIN_TEXT_CHARS_FOR_TEXT_LAYER = 20;

export class PdfPageLimitExceededError extends Error {
  constructor(
    public readonly totalPages: number,
    public readonly maxPages: number,
  ) {
    super(`PDF has ${totalPages} pages, exceeding the ${maxPages}-page cap`);
    this.name = "PdfPageLimitExceededError";
  }
}

/**
 * TQ-1 (D-039): backed by `unpdf`, which wraps `pdfjs-dist` with a small,
 * runtime-agnostic API. `maxPages` mirrors `MAX_PDF_PAGES` (`.env.example`,
 * `src/lib/env.ts`) — passed in explicitly rather than read from `env`
 * here, so this class stays a pure, easily-testable unit (same pattern as
 * `FileStore`'s `rootDir`, T-2.02).
 */
export class PdfExtractor implements Extractor {
  constructor(private readonly maxPages: number = 100) {}

  async extract(buffer: Buffer): Promise<ExtractedPage[]> {
    // unpdf/pdfjs-dist rejects a Node Buffer outright (it checks for a
    // plain Uint8Array), even though Buffer is technically a subclass.
    const pdf = await getDocumentProxy(new Uint8Array(buffer));

    if (pdf.numPages > this.maxPages) {
      throw new PdfPageLimitExceededError(pdf.numPages, this.maxPages);
    }

    const { text } = await extractText(pdf, { mergePages: false });

    return text.map((pageText, index) => ({
      locator: { kind: "page" as const, page: index + 1 },
      text: pageText,
      needsVision: pageText.replace(/\s+/g, "").length < MIN_TEXT_CHARS_FOR_TEXT_LAYER,
    }));
  }
}
