/**
 * V4 status integrity (AI_SPEC section 6): "Structure matches status
 * (schema). `AI_ANALYSIS.basedOn` IDs exist and are not the claim itself."
 *
 * The discriminated-union *shape* (quotes required for VERIFIED, basedOn for
 * AI_ANALYSIS, etc.) is already enforced by Zod when the LLM response is
 * validated, so the only check left for code to do is referential: does
 * every basedOn ID actually exist among this call's facts/claims, and does
 * none of them point back at the claim itself.
 */
export function invalidBasedOnRefs(
  claimId: string,
  basedOn: string[],
  knownIds: ReadonlySet<string>,
): string[] {
  return basedOn.filter((ref) => ref === claimId || !knownIds.has(ref));
}
