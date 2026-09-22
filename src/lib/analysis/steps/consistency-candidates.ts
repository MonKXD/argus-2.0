import type { ConsistencyCandidatePair } from "@/lib/analysis/prompts/consistency";
import { withinTolerance } from "@/lib/analysis/verify/numeric-grounding";
import type { Fact, FactValue } from "@/lib/schema/evidence";

const MATERIAL_DIFFERENCE_TOLERANCE = 0.05;

/**
 * AI_SPEC 3.4's deterministic pass: "group facts by `key`... numeric values
 * differing by more than 5% or textual values that differ are candidates."
 *
 * Grouped by `key` alone, not `(key, period)` — the model adjudication that
 * follows explicitly has a "differs only by period" verdict to give, which
 * would never be reachable if code had already filtered same-period pairs
 * out upstream. Code casts a wider net; the model narrows it.
 */
export function findConsistencyCandidates(facts: Fact[]): ConsistencyCandidatePair[] {
  const byKey = new Map<string, Fact[]>();
  for (const fact of facts) {
    const group = byKey.get(fact.key);
    if (group) group.push(fact);
    else byKey.set(fact.key, [fact]);
  }

  const candidates: ConsistencyCandidatePair[] = [];
  for (const group of byKey.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (valuesDiffer(group[i]!.value, group[j]!.value)) {
          candidates.push({ factA: group[i]!, factB: group[j]! });
        }
      }
    }
  }
  return candidates;
}

function valuesDiffer(a: FactValue, b: FactValue): boolean {
  if (a.kind !== b.kind) return true;
  switch (a.kind) {
    case "number":
      return !withinTolerance(a.value, (b as typeof a).value, MATERIAL_DIFFERENCE_TOLERANCE);
    case "money":
      return (
        a.currency !== (b as typeof a).currency ||
        !withinTolerance(a.amount, (b as typeof a).amount, MATERIAL_DIFFERENCE_TOLERANCE)
      );
    case "percent":
      return !withinTolerance(a.value, (b as typeof a).value, MATERIAL_DIFFERENCE_TOLERANCE);
    case "text":
      return a.value !== (b as typeof a).value;
    case "date":
      return a.value !== (b as typeof a).value;
    case "boolean":
      return a.value !== (b as typeof a).value;
    case "list":
      return JSON.stringify(a.values) !== JSON.stringify((b as typeof a).values);
  }
}
