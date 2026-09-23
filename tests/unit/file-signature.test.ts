import { describe, expect, it } from "vitest";

import { FileSignatureError, sniffFileKind } from "@/lib/analysis/ingest/file-signature";

import { buildMinimalZip } from "../helpers/build-minimal-zip";

const MAX_DECOMPRESSED_BYTES = 25 * 1024 * 1024 * 40;

function buildMinimalDocx(): Buffer {
  return buildMinimalZip({
    "[Content_Types].xml": "<Types/>",
    "word/document.xml": "<w:document/>",
  });
}

function buildMinimalXlsx(): Buffer {
  return buildMinimalZip({
    "[Content_Types].xml": "<Types/>",
    "xl/workbook.xml": "<workbook/>",
  });
}

describe("sniffFileKind", () => {
  it("accepts a real PDF signature", () => {
    const buffer = Buffer.from("%PDF-1.4\n...rest of file...");
    expect(sniffFileKind("deck.pdf", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES })).toBe(
      "pdf",
    );
  });

  it("rejects a file claiming .pdf without the PDF magic bytes", () => {
    const buffer = Buffer.from("not actually a pdf");
    expect(() =>
      sniffFileKind("deck.pdf", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES }),
    ).toThrow(FileSignatureError);
  });

  it("accepts a real DOCX (zip containing word/document.xml)", () => {
    const buffer = buildMinimalDocx();
    expect(sniffFileKind("notes.docx", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES })).toBe(
      "docx",
    );
  });

  it("accepts a real XLSX (zip containing xl/workbook.xml)", () => {
    const buffer = buildMinimalXlsx();
    expect(sniffFileKind("financials.xlsx", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES })).toBe(
      "xlsx",
    );
  });

  it("rejects a .docx upload that is actually an xlsx zip", () => {
    const buffer = buildMinimalXlsx();
    expect(() =>
      sniffFileKind("notes.docx", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES }),
    ).toThrow(FileSignatureError);
  });

  it("rejects a .xlsx upload that is a plain zip with neither part", () => {
    const buffer = buildMinimalZip({ "readme.txt": "hello" });
    expect(() =>
      sniffFileKind("financials.xlsx", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES }),
    ).toThrow(FileSignatureError);
  });

  it("rejects a .docx claim that isn't a zip at all", () => {
    const buffer = Buffer.from("plain text, not a zip");
    expect(() =>
      sniffFileKind("notes.docx", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES }),
    ).toThrow(FileSignatureError);
  });

  it("rejects a zip whose declared uncompressed size exceeds the decompressed cap", () => {
    const buffer = buildMinimalDocx();
    expect(() => sniffFileKind("notes.docx", buffer, { maxDecompressedBytes: 5 })).toThrow(
      FileSignatureError,
    );
  });

  it("accepts real plain text for csv/txt/md", () => {
    const buffer = Buffer.from("name,arr\nLoopwell,2000000\n");
    expect(sniffFileKind("financials.csv", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES })).toBe(
      "text",
    );
    expect(
      sniffFileKind("notes.txt", Buffer.from("plain notes"), {
        maxDecompressedBytes: MAX_DECOMPRESSED_BYTES,
      }),
    ).toBe("text");
    expect(
      sniffFileKind("readme.md", Buffer.from("# Heading"), {
        maxDecompressedBytes: MAX_DECOMPRESSED_BYTES,
      }),
    ).toBe("text");
  });

  it("rejects binary content claiming a text extension", () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00, 0x00]);
    expect(() =>
      sniffFileKind("notes.txt", buffer, { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES }),
    ).toThrow(FileSignatureError);
  });

  it("rejects an unsupported extension outright", () => {
    expect(() =>
      sniffFileKind("script.exe", Buffer.from("MZ..."), {
        maxDecompressedBytes: MAX_DECOMPRESSED_BYTES,
      }),
    ).toThrow(FileSignatureError);
  });

  it("rejects a file with no extension", () => {
    expect(() =>
      sniffFileKind("noext", Buffer.from("hello"), { maxDecompressedBytes: MAX_DECOMPRESSED_BYTES }),
    ).toThrow(FileSignatureError);
  });
});
