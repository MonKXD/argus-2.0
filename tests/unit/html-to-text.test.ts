import { describe, expect, it } from "vitest";

import { extractLinks, htmlToText } from "@/lib/analysis/ingest/html-to-text";

describe("htmlToText", () => {
  it("strips tags and separates block elements into paragraphs", () => {
    const html = "<html><body><p>Loopwell pitch deck</p><p>ARR reached $2.0M</p></body></html>";
    expect(htmlToText(html)).toBe("Loopwell pitch deck\n\nARR reached $2.0M");
  });

  it("drops script and style content entirely", () => {
    const html = "<p>Real text</p><script>alert('x')</script><style>.a{color:red}</style>";
    expect(htmlToText(html)).toBe("Real text");
  });

  it("decodes HTML entities", () => {
    const html = "<p>Fish &amp; chips &mdash; &quot;great&quot;</p>".replace("&mdash;", "&#8212;");
    expect(htmlToText(html)).toContain("Fish & chips");
    expect(htmlToText(html)).toContain('"great"');
  });

  it("keeps inline formatting text without fragmenting it onto new lines", () => {
    const html = "<p>Loopwell has <strong>strong</strong> <em>unit economics</em>.</p>";
    expect(htmlToText(html)).toBe("Loopwell has strong unit economics.");
  });

  it("returns an empty string for a page with no text", () => {
    expect(htmlToText("<html><head></head><body></body></html>")).toBe("");
  });
});

describe("extractLinks", () => {
  it("extracts href values in document order", () => {
    const html = '<a href="/about">About</a><a href="https://example.com/team">Team</a>';
    expect(extractLinks(html)).toEqual(["/about", "https://example.com/team"]);
  });

  it("returns an empty array when there are no links", () => {
    expect(extractLinks("<p>No links here</p>")).toEqual([]);
  });
});
