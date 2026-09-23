import { CsvExtractor } from "@/lib/analysis/ingest/csv-extractor";
import { DocxExtractor } from "@/lib/analysis/ingest/docx-extractor";
import type { Extractor } from "@/lib/analysis/ingest/extractor";
import { PdfExtractor } from "@/lib/analysis/ingest/pdf-extractor";
import { TextExtractor } from "@/lib/analysis/ingest/text-extractor";
import { XlsxExtractor } from "@/lib/analysis/ingest/xlsx-extractor";

export class UnsupportedFileTypeError extends Error {
  constructor(filename: string) {
    super(`No extractor registered for file "${filename}"`);
    this.name = "UnsupportedFileTypeError";
  }
}

/**
 * File-extension dispatch to the right `Extractor` (T-2.03/T-2.04). The
 * real upload flow's actual content-type allowlist (magic bytes, not
 * extension — R-SEC-05) is T-3.06's job (file-signature.ts, run before
 * this); this is the simpler "which library parses this file" lookup the
 * CLI/eval pipeline (T-2.16/T-2.17) and the sources API both need.
 */
export function extractorForFilename(
  filename: string,
  options?: { maxPdfPages?: number },
): Extractor {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return options?.maxPdfPages !== undefined
        ? new PdfExtractor(options.maxPdfPages)
        : new PdfExtractor();
    case "docx":
      return new DocxExtractor();
    case "xlsx":
      return new XlsxExtractor();
    case "csv":
      return new CsvExtractor();
    case "txt":
    case "md":
      return new TextExtractor();
    default:
      throw new UnsupportedFileTypeError(filename);
  }
}
