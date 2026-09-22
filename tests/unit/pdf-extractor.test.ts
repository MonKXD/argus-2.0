import { describe, expect, it } from "vitest";

import { PdfExtractor, PdfPageLimitExceededError } from "@/lib/analysis/ingest/pdf-extractor";

/**
 * Builds a minimal, valid, uncompressed PDF 1.4 file with one text line
 * per page (an empty string draws nothing, useful for a no-text-layer
 * page) — real bytes fed through the real `unpdf`/`pdfjs-dist` parser,
 * not a mock, so this exercises the actual library integration. Byte
 * offsets in the xref table are computed, not hand-counted, so the file
 * is always structurally correct.
 */
function buildMinimalPdf(pageTexts: string[]): Buffer {
  const escapeText = (text: string) => text.replace(/[\\()]/g, (c) => `\\${c}`);

  const n = pageTexts.length;
  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const fontObjNum = 3;
  const pageObjNums = Array.from({ length: n }, (_, i) => 4 + i);
  const contentObjNums = Array.from({ length: n }, (_, i) => 4 + n + i);
  const totalObjs = 3 + 2 * n;

  const parts: string[] = [`%PDF-1.4\n`];
  const offsets: number[] = new Array(totalObjs + 1);
  let pos = Buffer.byteLength(parts[0]!);

  function addObject(num: number, body: string) {
    const str = `${num} 0 obj\n${body}\nendobj\n`;
    offsets[num] = pos;
    parts.push(str);
    pos += Buffer.byteLength(str);
  }

  addObject(catalogObjNum, `<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`);
  addObject(
    pagesObjNum,
    `<< /Type /Pages /Kids [${pageObjNums.map((p) => `${p} 0 R`).join(" ")}] /Count ${n} >>`,
  );
  addObject(fontObjNum, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  pageObjNums.forEach((pageNum, i) => {
    addObject(
      pageNum,
      `<< /Type /Page /Parent ${pagesObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentObjNums[i]} 0 R >>`,
    );
  });

  contentObjNums.forEach((contentNum, i) => {
    const stream = `BT /F1 18 Tf 72 700 Td (${escapeText(pageTexts[i]!)}) Tj ET`;
    addObject(
      contentNum,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  });

  const xrefOffset = pos;
  let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= totalObjs; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  parts.push(xref);
  parts.push(
    `trailer\n<< /Size ${totalObjs + 1} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  );

  return Buffer.from(parts.join(""), "utf-8");
}

describe("PdfExtractor", () => {
  it("extracts text per page with a page locator", async () => {
    const pdf = buildMinimalPdf(["Loopwell pitch deck", "ARR reached two million dollars"]);
    const pages = await new PdfExtractor().extract(pdf);

    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({ locator: { kind: "page", page: 1 } });
    expect(pages[0]!.text).toContain("Loopwell pitch deck");
    expect(pages[1]).toMatchObject({ locator: { kind: "page", page: 2 } });
    expect(pages[1]!.text).toContain("ARR reached two million dollars");
  });

  it("flags a page with a real text layer as not needing vision", async () => {
    const pdf = buildMinimalPdf(["Loopwell pitch deck, page one of the fictional deck"]);
    const [page] = await new PdfExtractor().extract(pdf);

    expect(page!.needsVision).toBe(false);
  });

  it("flags a page with no extractable text as needing vision", async () => {
    const pdf = buildMinimalPdf(["Loopwell pitch deck", ""]);
    const [, blankPage] = await new PdfExtractor().extract(pdf);

    expect(blankPage!.needsVision).toBe(true);
  });

  it("throws a typed error when the page count exceeds the cap", async () => {
    const pdf = buildMinimalPdf(["one", "two", "three"]);

    await expect(new PdfExtractor(2).extract(pdf)).rejects.toBeInstanceOf(
      PdfPageLimitExceededError,
    );
  });
});
