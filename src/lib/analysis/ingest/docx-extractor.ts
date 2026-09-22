import mammoth from "mammoth";

import type { Extractor, ExtractedPage } from "@/lib/analysis/ingest/extractor";

const BLOCK_TAG_PATTERN = /<(p|h[1-6]|li)[^>]*>([\s\S]*?)<\/\1>/g;

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .trim();
}

/**
 * `mammoth` converts DOCX to simple block-level HTML (`<p>`, `<h1>`-`<h6>`,
 * `<li>`), one element per paragraph — exactly the granularity our
 * `Locator`'s `paragraph` field wants. Splitting that HTML with a regex
 * rather than pulling in a full DOM parser is safe here because mammoth's
 * own output is plain, predictable markup, not arbitrary untrusted HTML.
 */
export class DocxExtractor implements Extractor {
  async extract(buffer: Buffer): Promise<ExtractedPage[]> {
    const { value: html } = await mammoth.convertToHtml(
      { buffer },
      { ignoreEmptyParagraphs: true },
    );

    const pages: ExtractedPage[] = [];
    let paragraph = 0;

    for (const match of html.matchAll(BLOCK_TAG_PATTERN)) {
      const text = stripTags(match[2]!);
      if (!text) continue;
      paragraph++;
      pages.push({ locator: { kind: "paragraph", paragraph }, text, needsVision: false });
    }

    return pages;
  }
}
