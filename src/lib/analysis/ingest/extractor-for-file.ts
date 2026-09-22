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

const EXTENSION_EXTRACTORS: Record<string, () => Extractor> = {
  pdf: () => new PdfExtractor(),
  docx: () => new DocxExtractor(),
  xlsx: () => new XlsxExtractor(),
  csv: () => new CsvExtractor(),
  txt: () => new TextExtractor(),
  md: () => new TextExtractor(),
};

/**
 * File-extension dispatch to the right `Extractor` (T-2.03/T-2.04). The
 * real upload flow's actual content-type allowlist (magic bytes, not
 * extension — R-SEC-05) is T-3.06's job; this is the simpler "which
 * library parses this file" lookup the CLI/eval pipeline (T-2.16/T-2.17)
 * needs for already-trusted local fixture/CLI-argument files.
 */
export function extractorForFilename(filename: string): Extractor {
  const ext = filename.split(".").pop()?.toLowerCase();
  const factory = ext ? EXTENSION_EXTRACTORS[ext] : undefined;
  if (!factory) throw new UnsupportedFileTypeError(filename);
  return factory();
}
