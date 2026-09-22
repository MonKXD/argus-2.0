import type { Extractor, ExtractedPage } from "@/lib/analysis/ingest/extractor";

/**
 * Backs both `.txt` and `.md`: neither format has a structural boundary
 * beyond the blank-line-separated paragraph (this deliberately doesn't
 * parse Markdown block syntax — headings, lists and code fences all still
 * sit between blank lines, so the same split works for both formats
 * without a Markdown parser).
 */
export class TextExtractor implements Extractor {
  async extract(buffer: Buffer): Promise<ExtractedPage[]> {
    const text = buffer.toString("utf-8").replace(/\r\n/g, "\n");
    const blocks = text.split(/\n\s*\n/).map((block) => block.trim());

    const pages: ExtractedPage[] = [];
    let paragraph = 0;

    for (const block of blocks) {
      if (!block) continue;
      paragraph++;
      pages.push({ locator: { kind: "paragraph", paragraph }, text: block, needsVision: false });
    }

    return pages;
  }
}
