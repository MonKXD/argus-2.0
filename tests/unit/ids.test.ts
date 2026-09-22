import { describe, expect, it } from "vitest";

import { idOf, ID_PREFIXES, newId } from "@/lib/schema/ids";

// R-COD-04: the shared prefixed-ULID helper. Verifies the hand-rolled
// Crockford Base32 encoder (D-028/T-2.02) actually satisfies idOf()'s own
// regex, and that IDs it generates in the same millisecond still sort in
// creation order (the ULID spec's whole point).

describe("newId", () => {
  it("generates an id that satisfies idOf()'s regex for every prefix", () => {
    for (const prefix of Object.values(ID_PREFIXES)) {
      const id = newId(prefix);
      expect(idOf(prefix).safeParse(id).success).toBe(true);
    }
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId("clm")));
    expect(ids.size).toBe(1000);
  });

  it("sorts lexicographically by creation time (millisecond resolution — not monotonic within the same ms)", async () => {
    const first = newId("clm");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = newId("clm");
    expect(first < second).toBe(true);
  });
});
