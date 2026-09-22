import { describe, expect, it } from "vitest";

import { sanitizeText } from "@/lib/analysis/ingest/sanitize";

describe("sanitizeText", () => {
  it("leaves normal text untouched", () => {
    expect(sanitizeText("ARR reached $2.0M in Q2.")).toBe("ARR reached $2.0M in Q2.");
  });

  it("strips control characters", () => {
    expect(sanitizeText("Loop\u0000well \u007Fpitch\u0001 deck")).toBe("Loopwell pitch deck");
  });

  it("strips zero-width and invisible formatting characters", () => {
    expect(sanitizeText("Loop​well﻿ pitch‍ deck")).toBe("Loopwell pitch deck");
  });

  it("normalises CRLF and bare CR to LF", () => {
    expect(sanitizeText("line one\r\nline two\rline three")).toBe("line one\nline two\nline three");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitizeText("  Loopwell pitch deck  \n")).toBe("Loopwell pitch deck");
  });

  it("preserves internal spacing for exact quote matching", () => {
    expect(sanitizeText("ARR  reached   $2.0M")).toBe("ARR  reached   $2.0M");
  });

  it("preserves tabs and newlines (legitimate whitespace, not control chars)", () => {
    expect(sanitizeText("a\tb\nc")).toBe("a\tb\nc");
  });
});
