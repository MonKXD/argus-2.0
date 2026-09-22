import { distinctSourceCount, evidenceInfoForClaims, verifiedClaims, type EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import type { Claim } from "@/lib/schema/claims";

/**
 * AI_SPEC 5.1, code-enforced:
 * - A criterion with no VERIFIED claim is capped at 2.
 * - A criterion whose only supporting evidence is PROVIDED is capped at 3.
 * - A score of 4 also requires at least two distinct sources among its VERIFIED claims.
 * - A criterion with no claims at all becomes null.
 */
export function clampCriterionScore(
  rawScore: number | null,
  claims: Claim[],
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined,
): number | null {
  if (claims.length === 0) return null;
  if (rawScore === null) return null;

  const verified = verifiedClaims(claims);
  if (verified.length === 0) return Math.min(rawScore, 2);

  const infos = evidenceInfoForClaims(verified, evidenceInfoOf);
  let score = rawScore;

  const onlyProvided = infos.length > 0 && infos.every((i) => i.reliability === "PROVIDED");
  if (onlyProvided) score = Math.min(score, 3);

  if (score >= 4 && distinctSourceCount(infos) < 2) score = Math.min(score, 3);

  return score;
}
