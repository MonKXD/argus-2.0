import { reliabilityWeight } from "@/lib/analysis/scoring/reliability-weight";
import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import type { Claim } from "@/lib/schema/claims";

/**
 * `Claim.confidence` (0-1) has no formula anywhere in AI_SPEC, same gap as
 * `Fact.confidence` (D-044) — the model never outputs it (section 5), so
 * code must. Extends D-044's resolution rather than inventing unrelated
 * numbers: VERIFIED reuses the same reliability-weight table (strongest
 * cited evidence); AI_ANALYSIS reuses 5.2's own 0.25 constant for
 * "no VERIFIED support"; ASSUMPTION (weaker than an inference — it's an
 * unconfirmed premise) and MISSING (asserts nothing to have confidence in)
 * are new fixed values, asked and confirmed with the user (D-045).
 */
const AI_ANALYSIS_CONFIDENCE = 0.25;
const ASSUMPTION_CONFIDENCE = 0.1;
const MISSING_CONFIDENCE = 0;

export function computeClaimConfidence(
  claim: Pick<Claim, "status"> & { quotes?: Array<{ evidenceId: string }> },
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined,
): number {
  switch (claim.status) {
    case "VERIFIED": {
      const infos = (claim.quotes ?? [])
        .map((q) => evidenceInfoOf(q.evidenceId))
        .filter((i): i is EvidenceInfo => i !== undefined);
      if (infos.length === 0) return AI_ANALYSIS_CONFIDENCE;
      return Math.max(...infos.map((i) => reliabilityWeight(i.reliability)));
    }
    case "AI_ANALYSIS":
      return AI_ANALYSIS_CONFIDENCE;
    case "ASSUMPTION":
      return ASSUMPTION_CONFIDENCE;
    case "MISSING":
      return MISSING_CONFIDENCE;
  }
}
