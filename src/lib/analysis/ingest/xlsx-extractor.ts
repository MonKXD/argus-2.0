import ExcelJS from "exceljs";

import type { Extractor, ExtractedPage } from "@/lib/analysis/ingest/extractor";

/**
 * AI_SPEC 3.1's natural boundary for spreadsheets is "sheet range", so one
 * `ExtractedPage` per worksheet, rows rendered as `cell | cell | cell`
 * lines (readable evidence text, not a data structure) using exceljs's own
 * `cell.text` rendering so numbers, dates and formula results all come out
 * as sensible strings.
 */
export class XlsxExtractor implements Extractor {
  async extract(buffer: Buffer): Promise<ExtractedPage[]> {
    const workbook = new ExcelJS.Workbook();
    // exceljs's own .d.ts declares a local `Buffer extends ArrayBuffer {}`
    // that shadows Node's real Buffer type and doesn't structurally match
    // it, so a real Buffer needs this cast through the exact parameter
    // type `load()` expects (not `any` — R-COD-01).
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const pages: ExtractedPage[] = [];

    workbook.eachSheet((worksheet) => {
      const lines: string[] = [];

      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          const text = cell.text.trim();
          if (text) cells.push(text);
        });
        if (cells.length > 0) lines.push(cells.join(" | "));
      });

      const text = lines.join("\n");
      if (!text) return;

      pages.push({
        locator: { kind: "sheet", sheet: worksheet.name, cell: worksheet.dimensions?.range },
        text,
        needsVision: false,
      });
    });

    return pages;
  }
}
