import type { Extractor, ExtractedPage } from "@/lib/analysis/ingest/extractor";

/**
 * Minimal RFC 4180 CSV parser (D-039/T-2.04): handles quoted fields,
 * embedded commas and newlines inside quotes, and escaped quotes (`""`).
 * Hand-rolled rather than a dependency — the same call as `newId`'s ULID
 * encoder (D-028/T-2.02): a small, well-specified, bounded algorithm.
 * Does not handle bare `\r` (classic pre-OS X Mac) line endings; LF and
 * CRLF both work.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // skip; the following \n (if any) closes the row
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * A CSV has no sub-file structural boundary (unlike a PDF's pages or an
 * XLSX's sheets), so the whole file is one `ExtractedPage` — T-2.06's
 * chunker splits it further if it's large.
 */
export class CsvExtractor implements Extractor {
  async extract(buffer: Buffer): Promise<ExtractedPage[]> {
    const rows = parseCsv(buffer.toString("utf-8"));
    const lines = rows
      .map((row) => row.map((cell) => cell.trim()).join(" | "))
      .filter((line) => line.replace(/\|/g, "").trim().length > 0);

    if (lines.length === 0) return [];

    return [
      {
        locator: { kind: "sheet", cell: `rows 1-${lines.length}` },
        text: lines.join("\n"),
        needsVision: false,
      },
    ];
  }
}
