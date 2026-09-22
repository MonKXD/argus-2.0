import { describe, expect, it } from "vitest";

import { selectEvidenceForDimension } from "@/lib/analysis/steps/evidence-selection";
import type { Evidence } from "@/lib/schema/evidence";
import { RUBRICS } from "@/lib/schema/rubrics";

function makeEvidence(id: string, text: string): Evidence {
  return {
    id,
    analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    sourceId: "src_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    locator: { kind: "page", page: 1 },
    text,
    reliability: "PROVIDED",
    extraction: "text",
    retrievedAt: "2026-09-22T00:00:00Z",
    contentHash: "hash",
  };
}

describe("selectEvidenceForDimension", () => {
  it("returns all evidence untruncated when it fits the budget", () => {
    const evidence = [makeEvidence("ev1", "short text")];
    const result = selectEvidenceForDimension(evidence, RUBRICS.founder, 1000);
    expect(result.truncated).toBe(false);
    expect(result.selected).toEqual(evidence);
  });

  it("truncates and ranks by rubric-keyword relevance when over budget", () => {
    const relevant = makeEvidence("ev-relevant", "team commitment ownership equity alignment ".repeat(20));
    const irrelevant = makeEvidence("ev-irrelevant", "the weather was sunny yesterday afternoon ".repeat(20));
    const result = selectEvidenceForDimension([irrelevant, relevant], RUBRICS.founder, 500);

    expect(result.truncated).toBe(true);
    expect(result.selected[0]!.id).toBe("ev-relevant");
  });

  it("always includes at least the top-ranked item even if it alone exceeds the budget", () => {
    const huge = makeEvidence("ev1", "team commitment ".repeat(200));
    const result = selectEvidenceForDimension([huge], RUBRICS.founder, 10);
    expect(result.truncated).toBe(true);
    expect(result.selected).toHaveLength(1);
  });
});
