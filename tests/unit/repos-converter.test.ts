import { describe, expect, it } from "vitest";
import { z } from "zod";

import { zodConverter } from "@/lib/repos/converter";

const Widget = z.object({ id: z.string(), count: z.number() });

describe("zodConverter", () => {
  it("passes toFirestore data through unchanged", () => {
    const converter = zodConverter(Widget);
    const widget = { id: "w1", count: 3 };
    expect(converter.toFirestore(widget)).toEqual(widget);
  });

  it("validates on fromFirestore and returns the parsed value", () => {
    const converter = zodConverter(Widget);
    const snapshot = { data: () => ({ id: "w1", count: 3 }) } as unknown as Parameters<
      typeof converter.fromFirestore
    >[0];
    expect(converter.fromFirestore(snapshot)).toEqual({ id: "w1", count: 3 });
  });

  it("throws when the stored document no longer matches the schema", () => {
    const converter = zodConverter(Widget);
    const snapshot = { data: () => ({ id: "w1", count: "not-a-number" }) } as unknown as Parameters<
      typeof converter.fromFirestore
    >[0];
    expect(() => converter.fromFirestore(snapshot)).toThrow();
  });
});
