import { escapeForPromptBlock } from "@/lib/analysis/prompts/preamble";
import type { Claim, DimensionAnalysis, Flag } from "@/lib/schema/claims";

/**
 * Shared `<dimension>`/`<claim>`/`<flag>` block rendering for any prompt
 * that shows the model a set of already-validated dimension claims and
 * flags as its only material (SYNTHESIZE, AI_SPEC 7.6; T-5.04's comparison
 * narrative) — extracted once both needed the identical rendering, rather
 * than duplicated a second time.
 */

export function renderDimensionBlock(dimension: DimensionAnalysis): string {
  const claims = dimension.claims.map(renderClaimForPrompt).join("\n");
  return `<dimension key="${dimension.dimension}" score="${dimension.score ?? "null"}" confidence="${dimension.confidence}">\n${claims}\n</dimension>`;
}

export function renderClaimForPrompt(claim: Claim): string {
  const text = escapeForPromptBlock(claim.text);
  const detail = claimDetail(claim);
  return `<claim id="${claim.id}" status="${claim.status}">${text}${detail ? ` (${escapeForPromptBlock(detail)})` : ""}</claim>`;
}

function claimDetail(claim: Claim): string | undefined {
  switch (claim.status) {
    case "VERIFIED":
      return `quote: "${claim.quotes.map((q) => q.quote).join('" / "')}"`;
    case "MISSING":
      return `needed: ${claim.missing.whatIsNeeded}`;
    default:
      return undefined;
  }
}

export function renderFlagBlock(flag: Flag): string {
  const title = escapeForPromptBlock(flag.title);
  const description = escapeForPromptBlock(flag.description);
  return `<flag id="${flag.id}" category="${flag.category}" severity="${flag.severity}" status="${flag.status}">${title} — ${description}</flag>`;
}
