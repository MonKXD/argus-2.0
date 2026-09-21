import { describe, expect, it } from "vitest";

import { formatDate, formatDuration, formatMoney, formatNumber, formatPercent } from "@/lib/format";

describe("formatMoney", () => {
  it("converts base units (cents) to major units for a 2-decimal currency", () => {
    expect(formatMoney(150_000, "USD")).toBe("$1,500.00");
  });

  it("handles a zero-decimal currency without dividing", () => {
    expect(formatMoney(1500, "JPY")).toBe("¥1,500");
  });
});

describe("formatPercent", () => {
  it("treats the input as 0 to 100, not a 0-to-1 fraction", () => {
    expect(formatPercent(42)).toBe("42%");
  });

  it("supports fraction digits", () => {
    expect(formatPercent(42.5, { maximumFractionDigits: 1 })).toBe("42.5%");
  });
});

describe("formatNumber", () => {
  it("formats with grouping", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatDate", () => {
  it("formats a date with the default medium style", () => {
    expect(formatDate("2026-01-15T00:00:00.000Z")).toBe("Jan 15, 2026");
  });
});

describe("formatDuration", () => {
  it("formats sub-minute durations in seconds", () => {
    expect(formatDuration(45_000)).toBe("45 sec");
  });

  it("formats longer durations in minutes", () => {
    expect(formatDuration(150_000)).toBe("3 min");
  });
});
