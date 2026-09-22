import { describe, expect, it } from "vitest";

import { XlsxExtractor } from "@/lib/analysis/ingest/xlsx-extractor";

import { buildMinimalZip } from "../helpers/build-minimal-zip";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Loopwell" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

function buildMinimalXlsx(rows: string[][]): Buffer {
  const rowsXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const cellRef = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
          return `<c r="${cellRef}" t="inlineStr"><is><t>${value}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;

  return buildMinimalZip({
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "xl/workbook.xml": WORKBOOK_XML,
    "xl/_rels/workbook.xml.rels": WORKBOOK_RELS,
    "xl/worksheets/sheet1.xml": sheetXml,
  });
}

describe("XlsxExtractor", () => {
  it("extracts one page per sheet, rows rendered as pipe-separated cells", async () => {
    const xlsx = buildMinimalXlsx([
      ["Startup", "ARR"],
      ["Loopwell", "2000000"],
    ]);
    const pages = await new XlsxExtractor().extract(xlsx);

    expect(pages).toHaveLength(1);
    expect(pages[0]!.locator).toMatchObject({ kind: "sheet", sheet: "Loopwell" });
    expect(pages[0]!.text).toBe("Startup | ARR\nLoopwell | 2000000");
    expect(pages[0]!.needsVision).toBe(false);
  });

  it("returns no pages for a sheet with no rows", async () => {
    const xlsx = buildMinimalXlsx([]);
    const pages = await new XlsxExtractor().extract(xlsx);

    expect(pages).toEqual([]);
  });
});
