import { describe, expect, it } from "vitest";

import { TextExtractor } from "@/lib/analysis/ingest/text-extractor";

describe("TextExtractor", () => {
  it("splits on blank lines into one page per paragraph", async () => {
    const text = "Loopwell pitch deck\n\nARR reached two million dollars\n";
    const pages = await new TextExtractor().extract(Buffer.from(text, "utf-8"));

    expect(pages).toEqual([
      {
        locator: { kind: "paragraph", paragraph: 1 },
        text: "Loopwell pitch deck",
        needsVision: false,
      },
      {
        locator: { kind: "paragraph", paragraph: 2 },
        text: "ARR reached two million dollars",
        needsVision: false,
      },
    ]);
  });

  it("works the same for Markdown content (headings and lists are still paragraph blocks)", async () => {
    const md = "# Loopwell\n\n- ARR: $2.0M\n- Team: 4 engineers\n";
    const pages = await new TextExtractor().extract(Buffer.from(md, "utf-8"));

    expect(pages).toHaveLength(2);
    expect(pages[0]!.text).toBe("# Loopwell");
    expect(pages[1]!.text).toBe("- ARR: $2.0M\n- Team: 4 engineers");
  });

  it("handles CRLF line endings", async () => {
    const text = "First paragraph.\r\n\r\nSecond paragraph.\r\n";
    const pages = await new TextExtractor().extract(Buffer.from(text, "utf-8"));

    expect(pages.map((p) => p.text)).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("returns no pages for an empty or whitespace-only file", async () => {
    expect(await new TextExtractor().extract(Buffer.from("", "utf-8"))).toEqual([]);
    expect(await new TextExtractor().extract(Buffer.from("\n\n  \n", "utf-8"))).toEqual([]);
  });
});
