import { describe, expect, it } from "vitest";

import { metadata as loginMetadata } from "@/app/login/page";
import { metadata as sampleMetadata } from "@/app/sample/page";
import { metadata as signupMetadata } from "@/app/signup/page";

// The root layout's own `metadata` export isn't imported here — it sits
// alongside `next/font/google` calls that only work inside Next's own
// build pipeline (the SWC font-loader plugin), not under plain Vitest.
// Its title template/OG/Twitter fields are verified by a real `pnpm build`
// and a real rendered page instead (R-PRC-08: verify against what the
// tool actually requires, not what's convenient to unit-test).
describe("T-6.15: SEO and social metadata", () => {
  it("login and signup opt out of indexing but stay followable", () => {
    expect(loginMetadata.robots).toEqual({ index: false, follow: true });
    expect(signupMetadata.robots).toEqual({ index: false, follow: true });
  });

  it("the sample report has its own distinct title and description", () => {
    expect(sampleMetadata.title).toBe("Sample report");
    expect(sampleMetadata.description).toBeTruthy();
  });
});
