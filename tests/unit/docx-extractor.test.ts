import { describe, expect, it } from "vitest";

import { DocxExtractor } from "@/lib/analysis/ingest/docx-extractor";

import { buildMinimalZip } from "../helpers/build-minimal-zip";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function buildMinimalDocx(paragraphs: string[]): Buffer {
  const body = paragraphs.map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;

  return buildMinimalZip({
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "word/document.xml": documentXml,
  });
}

describe("DocxExtractor", () => {
  it("extracts one page per paragraph with a paragraph locator", async () => {
    const docx = buildMinimalDocx(["Loopwell pitch deck", "ARR reached two million dollars"]);
    const pages = await new DocxExtractor().extract(docx);

    expect(pages).toHaveLength(2);
    expect(pages[0]).toMatchObject({
      locator: { kind: "paragraph", paragraph: 1 },
      text: "Loopwell pitch deck",
      needsVision: false,
    });
    expect(pages[1]).toMatchObject({
      locator: { kind: "paragraph", paragraph: 2 },
      text: "ARR reached two million dollars",
    });
  });

  it("skips empty paragraphs", async () => {
    const docx = buildMinimalDocx(["Loopwell pitch deck", "", "Page two"]);
    const pages = await new DocxExtractor().extract(docx);

    expect(pages.map((p) => p.text)).toEqual(["Loopwell pitch deck", "Page two"]);
  });
});
