import { describe, expect, it } from "vitest";

import { CsvExtractor, parseCsv } from "@/lib/analysis/ingest/csv-extractor";

describe("parseCsv", () => {
  it("parses plain comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles a quoted field with an embedded comma", () => {
    expect(parseCsv('name,note\nLoopwell,"Series A, seed-led"\n')).toEqual([
      ["name", "note"],
      ["Loopwell", "Series A, seed-led"],
    ]);
  });

  it("handles a quoted field with an embedded newline", () => {
    expect(parseCsv('name,note\nLoopwell,"line one\nline two"\n')).toEqual([
      ["name", "note"],
      ["Loopwell", "line one\nline two"],
    ]);
  });

  it("handles an escaped quote inside a quoted field", () => {
    expect(parseCsv('name,quote\nLoopwell,"she said ""hi"""\n')).toEqual([
      ["name", "quote"],
      ["Loopwell", 'she said "hi"'],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles a trailing row with no final newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("CsvExtractor", () => {
  it("extracts one page for the whole file, rows rendered as pipe-separated cells", async () => {
    const csv = Buffer.from("Startup,ARR\nLoopwell,2000000\n", "utf-8");
    const pages = await new CsvExtractor().extract(csv);

    expect(pages).toHaveLength(1);
    expect(pages[0]!.locator).toMatchObject({ kind: "sheet", cell: "rows 1-2" });
    expect(pages[0]!.text).toBe("Startup | ARR\nLoopwell | 2000000");
  });

  it("returns no pages for an empty file", async () => {
    const pages = await new CsvExtractor().extract(Buffer.from("", "utf-8"));
    expect(pages).toEqual([]);
  });
});
