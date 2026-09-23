import { inspectZip } from "@/lib/analysis/ingest/zip-inspect";

export type SniffedFileKind = "pdf" | "docx" | "xlsx" | "text";

export class FileSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileSignatureError";
  }
}

const EXTENSION_KINDS: Record<string, SniffedFileKind> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  csv: "text",
  txt: "text",
  md: "text",
};

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Zip-bomb guard (R-SEC-05's "decompressed-size cap"): a reasoned, fixed
 * ratio of the upload cap rather than a new env var — this is a security
 * constant, not something an operator needs to tune per deployment (same
 * class of call as D-047's evidence-selection budget).
 */
export const MAX_DECOMPRESSED_MULTIPLIER = 40;

function looksLikeText(buffer: Buffer): boolean {
  // A mislabeled binary file (PDF, image, renamed .exe, ...) almost always
  // contains a NUL byte or another non-printable control byte within the
  // first few KB; genuine CSV/TXT/MD never does. There is no magic-byte
  // signature for plain text, so this is the closest available check.
  // Sampled, not scanned in full, so a large legitimate text file is cheap
  // to check.
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  for (const byte of sample) {
    if (byte === 0x00) return false;
    if (byte < 0x09) return false; // control chars below tab (0x09)
  }
  return true;
}

/**
 * R-SEC-05: extension allowlist plus magic-byte sniffing. Never trusts the
 * client-declared extension or content type — inspects the actual bytes.
 * DOCX and XLSX share the same outer ZIP signature (`PK\x03\x04`), so
 * they're told apart by a required internal part (`word/document.xml` /
 * `xl/workbook.xml`) via `inspectZip`, which also sums declared
 * uncompressed sizes so a zip bomb is rejected before ever reaching
 * mammoth/exceljs.
 */
export function sniffFileKind(
  filename: string,
  buffer: Buffer,
  options: { maxDecompressedBytes: number },
): SniffedFileKind {
  const ext = filename.split(".").pop()?.toLowerCase();
  const claimedKind = ext ? EXTENSION_KINDS[ext] : undefined;
  if (!claimedKind) {
    throw new FileSignatureError(`"${filename}" is not an accepted file type.`);
  }

  if (claimedKind === "pdf") {
    if (!buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
      throw new FileSignatureError(`"${filename}" is not a valid PDF file.`);
    }
    return "pdf";
  }

  if (claimedKind === "docx" || claimedKind === "xlsx") {
    if (!buffer.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC)) {
      throw new FileSignatureError(
        `"${filename}" is not a valid ${claimedKind.toUpperCase()} file.`,
      );
    }
    const zip = inspectZip(buffer);
    if (!zip) {
      throw new FileSignatureError(
        `"${filename}" is not a valid ${claimedKind.toUpperCase()} file.`,
      );
    }
    const names = new Set(zip.entries.map((entry) => entry.name));
    const matchesClaim =
      claimedKind === "docx" ? names.has("word/document.xml") : names.has("xl/workbook.xml");
    if (!matchesClaim) {
      throw new FileSignatureError(
        `"${filename}" is not a valid ${claimedKind.toUpperCase()} file.`,
      );
    }

    const totalUncompressed = zip.entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
    if (totalUncompressed > options.maxDecompressedBytes) {
      throw new FileSignatureError(`"${filename}" is too large once decompressed.`);
    }
    return claimedKind;
  }

  // claimedKind === "text" (csv/txt/md): no reliable magic bytes exist, so
  // accept anything that doesn't look like binary content.
  if (!looksLikeText(buffer)) {
    throw new FileSignatureError(`"${filename}" does not look like a text file.`);
  }
  return "text";
}
