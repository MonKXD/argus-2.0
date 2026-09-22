const SCRIPT_STYLE_PATTERN = /<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi;
const BLOCK_TAG_OPEN_PATTERN =
  /<(p|div|h[1-6]|li|tr|section|article|header|footer|blockquote|br)(?:\s[^>]*)?>/gi;
const TAG_PATTERN = /<[^>]+>/g;

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    );
}

/**
 * A minimal HTML→readable-text conversion (TRD section 9's "readable
 * text"): drops script/style content, inserts a paragraph break at each
 * block-level element, strips remaining tags, decodes entities. Not a
 * full "readability" extraction — it doesn't detect and drop
 * nav/header/footer boilerplate, since that needs real layout heuristics
 * a regex can't do reliably; T-2.06's downstream sanitisation is where
 * that kind of cleanup, if ever added, belongs.
 */
export function htmlToText(html: string): string {
  const withoutScripts = html.replace(SCRIPT_STYLE_PATTERN, " ");
  const withBoundaries = withoutScripts.replace(BLOCK_TAG_OPEN_PATTERN, "\n");
  const withoutTags = withBoundaries.replace(TAG_PATTERN, "");
  const decoded = decodeEntities(withoutTags);

  return decoded
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

const LINK_PATTERN = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** Every `href` in the page, in document order, for the crawler's same-origin link discovery. */
export function extractLinks(html: string): string[] {
  return Array.from(html.matchAll(LINK_PATTERN), (match) => match[1]!);
}
