import type { EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import { containsSuperlative } from "@/lib/analysis/verify/superlatives";
import type { Claim, Flag } from "@/lib/schema/claims";
import { newId } from "@/lib/schema/ids";

/**
 * AI_SPEC 3.4's "Unverifiable superlatives" (documented under CONSISTENCY,
 * but stated to be "handled during ANALYZE" — T-2.09 shipped without it, so
 * it lands here instead of retrofitting already-shipped, tested code):
 * a VERIFIED claim containing an absolute/superlative statement, supported
 * only by PROVIDED evidence, gets an UNVERIFIABLE_CLAIM flag. Severity is
 * fixed at MEDIUM — AI_SPEC gives a "LOW to MEDIUM" range with no further
 * rule to pick within it, and this is the only category of unverifiable
 * claim this function looks at, so there's no second axis to vary on.
 */
export function detectUnverifiableClaims(
  claims: Claim[],
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined,
): Flag[] {
  const flags: Flag[] = [];

  for (const claim of claims) {
    if (claim.status !== "VERIFIED") continue;
    if (!containsSuperlative(claim.text)) continue;

    const infos = claim.quotes
      .map((q) => evidenceInfoOf(q.evidenceId))
      .filter((i): i is EvidenceInfo => i !== undefined);
    const onlyProvided = infos.length > 0 && infos.every((i) => i.reliability === "PROVIDED");
    if (!onlyProvided) continue;

    flags.push({
      id: newId("flg"),
      category: "UNVERIFIABLE_CLAIM",
      severity: "MEDIUM",
      title: "Unverifiable superlative claim",
      description: `Supported only by the founder's own material, not independently confirmed: "${claim.text}"`,
      evidenceIds: claim.quotes.map((q) => q.evidenceId),
      claimIds: [claim.id],
      detectedBy: "DIMENSION",
      status: "OPEN",
    });
  }

  return flags;
}
