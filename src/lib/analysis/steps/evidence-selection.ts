import type { Evidence } from "@/lib/schema/evidence";
import type { Rubric } from "@/lib/schema/rubrics";

/**
 * TRD 5.3: "If total evidence text fits the per-call budget, include all of
 * it. Otherwise rank evidence for the dimension using fact keys and simple
 * lexical scoring, include top items until the budget is reached, and
 * record `evidenceTruncated: true`."
 *
 * No numeric budget is specified anywhere in the docs. 60,000 characters
 * (~15k tokens) is a chosen default generous enough to include most or all
 * evidence for a typical analysis while bounding call cost/latency — a
 * tunable, revisit-with-real-usage-data constant, same class as D-008's
 * scoring-policy assumptions.
 */
export const EVIDENCE_BUDGET_CHARS = 60_000;

export interface EvidenceSelection {
  selected: Evidence[];
  truncated: boolean;
}

export function selectEvidenceForDimension(
  evidence: Evidence[],
  rubric: Rubric,
  budgetChars: number = EVIDENCE_BUDGET_CHARS,
): EvidenceSelection {
  const totalChars = evidence.reduce((sum, e) => sum + e.text.length, 0);
  if (totalChars <= budgetChars) return { selected: evidence, truncated: false };

  const keywords = rubricKeywords(rubric);
  const ranked = evidence
    .map((e) => ({ evidence: e, score: lexicalScore(e.text, keywords) }))
    .sort((a, b) => b.score - a.score);

  const selected: Evidence[] = [];
  let used = 0;
  for (const { evidence: item } of ranked) {
    if (selected.length > 0 && used + item.text.length > budgetChars) break;
    selected.push(item);
    used += item.text.length;
  }
  return { selected, truncated: true };
}

function rubricKeywords(rubric: Rubric): string[] {
  const words = new Set<string>();
  for (const criterion of rubric.criteria) {
    for (const word of criterion.label.toLowerCase().split(/\W+/)) {
      if (word.length > 3) words.add(word);
    }
  }
  return [...words];
}

function lexicalScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const keyword of keywords) score += countOccurrences(lower, keyword);
  return score;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}
