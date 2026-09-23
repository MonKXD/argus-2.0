import { describe, expect, it } from "vitest";

import { ingestSource } from "@/lib/analysis/ingest/ingest-source";

const ANALYSIS_ID = "ana_00000000000000000000000001";

describe("ingestSource (text input, T-3.07)", () => {
  it("splits pasted text into paragraphs via TextExtractor and builds real evidence", async () => {
    const result = await ingestSource(ANALYSIS_ID, {
      id: "src_00000000000000000000000001",
      type: "USER_NOTES",
      origin: "TEXT",
      title: "Founder notes",
      text: "Loopwell reached 2 million dollars ARR in Q4.\n\nThe team is fully remote.",
    });

    expect(result.source).toMatchObject({
      type: "USER_NOTES",
      origin: "TEXT",
      title: "Founder notes",
      status: "PARSED",
      reliability: "PROVIDED",
    });
    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0]!.text).toContain("2 million dollars ARR");
    expect(result.evidence[1]!.text).toContain("fully remote");
    expect(result.evidence.every((e) => e.locator.kind === "paragraph")).toBe(true);
  });

  it("produces no evidence for content that sanitizes to nothing (e.g. zero-width characters only)", async () => {
    const result = await ingestSource(ANALYSIS_ID, {
      id: "src_00000000000000000000000002",
      type: "USER_NOTES",
      origin: "TEXT",
      title: "Empty",
      text: "​​​",
    });

    expect(result.evidence).toHaveLength(0);
  });

  it("throws when neither file, url nor text is provided", async () => {
    await expect(
      ingestSource(ANALYSIS_ID, {
        id: "src_00000000000000000000000003",
        type: "USER_NOTES",
        origin: "TEXT",
        title: "Nothing",
      }),
    ).rejects.toThrow(/no file, url or text/);
  });
});
