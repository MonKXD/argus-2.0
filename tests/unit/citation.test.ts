import { describe, expect, it } from "vitest";

import { validateQuote } from "@/lib/analysis/verify/citation";

describe("validateQuote: exact matches", () => {
  it("matches an identical substring", () => {
    const result = validateQuote("ARR reached $2.0M in Q2", "Our company: ARR reached $2.0M in Q2 2026.");
    expect(result.valid).toBe(true);
    expect(result.method).toBe("exact");
    expect(result.matchedText).toBe("ARR reached $2.0M in Q2");
    expect(result.similarity).toBe(1);
  });

  it("is case-insensitive", () => {
    const result = validateQuote("arr reached $2.0m", "ARR REACHED $2.0M in Q2.");
    expect(result.valid).toBe(true);
    expect(result.matchedText).toBe("ARR REACHED $2.0M");
  });

  it("ignores whitespace differences (a newline in evidence vs a space in the quote)", () => {
    const evidence = "Our team\nhas 4 engineers and 2 sales reps.";
    const result = validateQuote("Our team has 4 engineers", evidence);
    expect(result.valid).toBe(true);
    expect(result.matchedText).toBe("Our team\nhas 4 engineers");
  });

  it("treats curly quotes and straight quotes as equivalent", () => {
    const evidence = "The founder said “we are profitable” in the call.";
    const result = validateQuote('"we are profitable"', evidence);
    expect(result.valid).toBe(true);
    expect(result.matchedText).toBe("“we are profitable”");
  });

  it("treats em-dash and hyphen as equivalent", () => {
    const evidence = "Revenue grew year—over—year by 40%.";
    const result = validateQuote("grew year-over-year", evidence);
    expect(result.valid).toBe(true);
  });

  it("ignores markdown emphasis characters within the matched phrase", () => {
    const evidence = "Our revenue __grew 40%__ in the last quarter.";
    const result = validateQuote("revenue grew 40% in the last quarter", evidence);
    expect(result.valid).toBe(true);
    expect(result.matchedText).toBe("revenue __grew 40%__ in the last quarter");
  });

  it("returns invalid for a quote not present anywhere in the evidence", () => {
    const result = validateQuote("we are unstoppable", "ARR reached $2.0M in Q2.");
    expect(result.valid).toBe(false);
  });
});

describe("validateQuote: fuzzy fallback", () => {
  it("accepts a quote with one word substituted (well above the 0.92 threshold)", () => {
    const evidence =
      "The founding team has four engineers, two sales reps, one designer, and one product manager based in Austin.";
    const quote =
      "The founding team has four engineers, two sale reps, one designer, and one product manager based in Austin.";
    const result = validateQuote(quote, evidence);
    expect(result.valid).toBe(true);
    expect(result.method).toBe("fuzzy");
    expect(result.similarity).toBeGreaterThanOrEqual(0.92);
    expect(result.matchedText).toBe(
      "The founding team has four engineers, two sales reps, one designer, and one product manager based in Austin.",
    );
  });

  it("rejects a quote that is too different from any window (below 0.92)", () => {
    const evidence = "The founding team has four engineers and two sales reps based in Austin.";
    const quote = "The founding team has completely different unrelated people doing other things.";
    const result = validateQuote(quote, evidence);
    expect(result.valid).toBe(false);
  });

  it("returns no match when the evidence is shorter than the quote", () => {
    const result = validateQuote("this quote is longer than the evidence text itself", "short evidence");
    expect(result.valid).toBe(false);
  });
});

describe("validateQuote: edge cases", () => {
  it("returns invalid for an empty-after-normalisation quote", () => {
    const result = validateQuote("***", "Our revenue grew.");
    expect(result.valid).toBe(false);
  });

  it("the matched text is always a real substring of the original evidence", () => {
    const evidence = "Loopwell's ARR reached $2.0M in Q2 2026, up from $1.2M the prior year.";
    const result = validateQuote("ARR reached $2.0M in Q2 2026", evidence);
    expect(result.valid).toBe(true);
    expect(evidence.includes(result.matchedText!)).toBe(true);
  });
});
