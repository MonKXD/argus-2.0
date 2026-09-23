export interface ZipEntry {
  name: string;
  uncompressedSize: number;
}

export interface ZipInfo {
  entries: ZipEntry[];
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
/** Guards a maliciously huge central directory claim, not a real document's entry count. */
const MAX_ENTRIES = 20_000;

/**
 * Minimal ZIP central-directory reader — no dependency, never inflates
 * entry data. DOCX/XLSX are both ZIP-of-XML packages, so R-SEC-05's
 * magic-byte check (file-signature.ts) needs to look inside past their
 * shared outer `PK\x03\x04` signature, and summing each entry's declared
 * uncompressed size here is what lets a caller reject a zip bomb before
 * ever handing the buffer to mammoth/exceljs. Returns `null` for anything
 * that isn't a well-formed ZIP (missing/short end-of-central-directory
 * record, an out-of-range offset, or a central-directory entry whose
 * signature doesn't match) rather than throwing — the caller decides what
 * an unparseable file means.
 */
export function inspectZip(buffer: Buffer): ZipInfo | null {
  const searchStart = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
  let eocdOffset = -1;
  for (let i = buffer.length - EOCD_MIN_SIZE; i >= searchStart; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return null;

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (totalEntries > MAX_ENTRIES || centralDirOffset >= buffer.length) return null;

  const entries: ZipEntry[] = [];
  let offset = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (offset + 46 > buffer.length) return null;
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIR_SIGNATURE) return null;

    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);

    const nameStart = offset + 46;
    if (nameStart + nameLength > buffer.length) return null;
    const name = buffer.toString("utf-8", nameStart, nameStart + nameLength);

    entries.push({ name, uncompressedSize });
    offset = nameStart + nameLength + extraLength + commentLength;
  }

  return { entries };
}
