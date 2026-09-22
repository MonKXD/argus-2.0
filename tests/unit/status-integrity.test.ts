import { describe, expect, it } from "vitest";

import { invalidBasedOnRefs } from "@/lib/analysis/verify/status-integrity";

describe("invalidBasedOnRefs", () => {
  it("returns an empty array when every ref is known and none is self-referential", () => {
    const known = new Set(["fct_00000000000000000000000001", "clm_00000000000000000000000002"]);
    expect(invalidBasedOnRefs("clm_00000000000000000000000099", ["fct_00000000000000000000000001", "clm_00000000000000000000000002"], known)).toEqual([]);
  });

  it("flags a ref that doesn't exist among known facts/claims", () => {
    const known = new Set(["fct_00000000000000000000000001"]);
    expect(invalidBasedOnRefs("clm_00000000000000000000000099", ["fct_00000000000000000000000001", "fct_00000000000000000000000002"], known)).toEqual([
      "fct_00000000000000000000000002",
    ]);
  });

  it("flags a claim that cites itself in basedOn", () => {
    const known = new Set(["clm_00000000000000000000000099"]);
    expect(invalidBasedOnRefs("clm_00000000000000000000000099", ["clm_00000000000000000000000099"], known)).toEqual([
      "clm_00000000000000000000000099",
    ]);
  });
});
