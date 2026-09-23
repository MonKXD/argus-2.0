import { describe, expect, it } from "vitest";

import { inspectZip } from "@/lib/analysis/ingest/zip-inspect";

import { buildMinimalZip } from "../helpers/build-minimal-zip";

describe("inspectZip", () => {
  it("reads entry names and declared uncompressed sizes from a real zip", () => {
    const zip = buildMinimalZip({
      "word/document.xml": "<w:document/>",
      "[Content_Types].xml": "<Types/>",
    });

    const info = inspectZip(zip);

    expect(info).not.toBeNull();
    expect(info!.entries).toHaveLength(2);
    const doc = info!.entries.find((e) => e.name === "word/document.xml");
    expect(doc?.uncompressedSize).toBe(Buffer.from("<w:document/>", "utf-8").length);
  });

  it("returns null for a non-zip buffer", () => {
    expect(inspectZip(Buffer.from("not a zip file at all"))).toBeNull();
  });

  it("returns null for an empty buffer", () => {
    expect(inspectZip(Buffer.alloc(0))).toBeNull();
  });

  it("returns null when the central directory offset is out of range", () => {
    const zip = buildMinimalZip({ "a.xml": "x" });
    // Corrupt the EOCD's central-directory-offset field (bytes 16-19 of the
    // 22-byte EOCD record at the very end) to point past the buffer.
    const corrupted = Buffer.from(zip);
    corrupted.writeUInt32LE(0xffffffff, corrupted.length - 22 + 16);
    expect(inspectZip(corrupted)).toBeNull();
  });
});
