import type { Claim } from "@/lib/schema/claims";
import type { Reliability } from "@/lib/schema/enums";

/** Shared by criterion-clamps.ts (5.1) and dimension-score.ts (5.2), both of which reason about a criterion's VERIFIED claims. */

export interface EvidenceInfo {
  sourceId: string;
  reliability: Reliability;
}

export type VerifiedClaim = Extract<Claim, { status: "VERIFIED" }>;

export function verifiedClaims(claims: Claim[]): VerifiedClaim[] {
  return claims.filter((c): c is VerifiedClaim => c.status === "VERIFIED");
}

export function evidenceInfoForClaims(
  claims: VerifiedClaim[],
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined,
): EvidenceInfo[] {
  return claims
    .flatMap((c) => c.quotes.map((q) => evidenceInfoOf(q.evidenceId)))
    .filter((i): i is EvidenceInfo => i !== undefined);
}

export function distinctSourceCount(infos: EvidenceInfo[]): number {
  return new Set(infos.map((i) => i.sourceId)).size;
}
