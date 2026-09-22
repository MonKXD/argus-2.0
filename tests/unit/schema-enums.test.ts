import { describe, expect, it } from "vitest";

import { ClaimStatus, Reliability } from "@/lib/schema/enums";

// Guards against enums.ts drifting from docs/SCHEMA.md section 2, which it
// must match verbatim (R-DAT-01: SCHEMA.md is the source of truth).
describe("schema enums", () => {
  it("ClaimStatus matches docs/SCHEMA.md section 2", () => {
    expect(ClaimStatus.options).toEqual(["VERIFIED", "AI_ANALYSIS", "ASSUMPTION", "MISSING"]);
  });

  it("Reliability matches docs/SCHEMA.md section 2", () => {
    expect(Reliability.options).toEqual(["INDEPENDENT", "FIRST_PARTY", "PROVIDED"]);
  });
});
