import { describe, expect, it } from "vitest";

import { chunkText } from "@/lib/analysis/ingest/chunk-text";

describe("chunkText", () => {
  it("returns a single chunk when the text already fits", () => {
    const text = "Loopwell pitch deck.";
    expect(chunkText(text)).toEqual([{ text, startChar: 0, endChar: text.length }]);
  });

  it("splits long text into chunks no longer than maxChars", () => {
    const text = "word ".repeat(1000); // 5000 chars
    const chunks = chunkText(text, 2000, 150);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(2000);
    }
  });

  it("chunks cover the full input, offsets consistent with slice(startChar, endChar)", () => {
    const text = "word ".repeat(1000);
    const chunks = chunkText(text, 2000, 150);

    for (const chunk of chunks) {
      expect(text.slice(chunk.startChar, chunk.endChar)).toBe(chunk.text);
    }
    expect(chunks[chunks.length - 1]!.endChar).toBe(text.length);
  });

  it("prefers a paragraph boundary over a hard cut", () => {
    const paragraph1 = "A".repeat(900);
    const paragraph2 = "B".repeat(900);
    const text = `${paragraph1}\n\n${paragraph2}`;

    const chunks = chunkText(text, 1000, 50);
    expect(chunks[0]!.text).toBe(paragraph1);
  });

  it("prefers a sentence boundary when there is no paragraph break", () => {
    const text = "A".repeat(900) + ". " + "B".repeat(900);
    const chunks = chunkText(text, 1000, 50);

    expect(chunks[0]!.text.endsWith(".")).toBe(true);
  });

  it("falls back to a hard cut when there is no usable boundary", () => {
    const text = "x".repeat(3000); // no spaces, no sentence ends
    const chunks = chunkText(text, 1000, 50);

    expect(chunks[0]!.text).toHaveLength(1000);
  });

  it("always makes forward progress even when overlap exceeds the chunk size", () => {
    const text = "x".repeat(3000);
    const chunks = chunkText(text, 100, 10_000);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[chunks.length - 1]!.endChar).toBe(text.length);
  });
});
