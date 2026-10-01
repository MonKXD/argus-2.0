import type { CandidateNarrativeClaim } from "@/lib/analysis/prompts/synthesis";
import { computeClaimConfidence } from "@/lib/analysis/scoring/claim-confidence";
import { heuristicUndeclaredNames, undeclaredEntities } from "@/lib/analysis/verify/entity-grounding";
import { extractNumbers, numberAppearsIn } from "@/lib/analysis/verify/numeric-grounding";
import { sensitiveAttributeMatches } from "@/lib/analysis/verify/sensitive-attributes";
import { invalidBasedOnRefs } from "@/lib/analysis/verify/status-integrity";
import type { Claim } from "@/lib/schema/claims";
import type { StepName } from "@/lib/schema/enums";
import type { Fact, Quote } from "@/lib/schema/evidence";
import type { RunWarning } from "@/lib/schema/report";

export interface FinalizeContext {
  dimensionClaimsById: ReadonlyMap<string, Claim>;
  factsById: ReadonlyMap<string, Fact>;
  knownRefIds: ReadonlySet<string>;
  corpusText: string;
  /** Which step produced this claim, for `RunWarning.step` — omitted (and
   * the warnings never persisted) by a caller outside the `Run` step
   * machinery, e.g. T-5.04's comparison-narrative generation, which isn't
   * one of `StepName`'s nine per-analysis pipeline steps. */
  step?: StepName;
}

export interface FinalizeOutcome {
  claim: Claim | undefined;
  warnings: RunWarning[];
}

interface Restatement {
  quotes: Quote[];
  confidence: number;
}

/**
 * Resolves a `restatesId` to the quotes and confidence to reuse: either an
 * already-`VERIFIED` dimension claim, or a canonical fact (facts are
 * inherently evidence-grounded — extract-facts.ts only ever creates one
 * from quotes that already passed V1 — so any fact id resolves, with no
 * separate status check the way a claim needs one).
 */
function resolveRestatement(id: string, ctx: FinalizeContext): Restatement | undefined {
  const claim = ctx.dimensionClaimsById.get(id);
  if (claim) return claim.status === "VERIFIED" ? { quotes: claim.quotes, confidence: claim.confidence } : undefined;
  const fact = ctx.factsById.get(id);
  if (fact) return { quotes: fact.quotes, confidence: fact.confidence };
  return undefined;
}

/**
 * Runs V6, V3, V4 (AI_ANALYSIS only) and V2 on a narrative claim — shared by
 * SYNTHESIZE (`synthesize.ts`, AI_SPEC 3.7) and T-5.04's comparison
 * narrative, since both produce the same `CandidateNarrativeClaim` shape
 * over the same kind of already-validated material (no raw evidence, so no
 * V1 — see `resolveRestatement`'s own comment). Previously duplicated
 * inline in `synthesize.ts` until T-5.04 needed the identical logic for a
 * second caller.
 */
export function finalizeNarrativeClaim(
  candidate: CandidateNarrativeClaim,
  realId: string,
  ctx: FinalizeContext,
): FinalizeOutcome {
  const warnings: RunWarning[] = [];

  const sensitiveHits = sensitiveAttributeMatches(candidate.text);
  if (sensitiveHits.length > 0) {
    warnings.push({
      code: "SENSITIVE_ATTRIBUTE",
      message: `Dropped narrative claim: matched sensitive-attribute pattern(s) [${sensitiveHits.map((h) => h.category).join(", ")}]`,
      step: ctx.step,
    });
    return { claim: undefined, warnings };
  }

  const missingEntities = undeclaredEntities(candidate.entities, ctx.corpusText);
  if (missingEntities.length > 0) {
    warnings.push({
      code: "ENTITY_UNGROUNDED",
      message: `Dropped narrative claim: declared entities not in evidence [${missingEntities.join(", ")}]`,
      step: ctx.step,
    });
    return { claim: undefined, warnings };
  }
  const heuristicHits = heuristicUndeclaredNames(candidate.text, candidate.entities, ctx.corpusText);
  if (heuristicHits.length > 0) {
    warnings.push({
      code: "ENTITY_UNGROUNDED",
      message: `Possible ungrounded name(s) [${heuristicHits.join(", ")}]`,
      step: ctx.step,
      refId: realId,
    });
  }

  if (candidate.status === "AI_ANALYSIS") {
    const invalid = invalidBasedOnRefs(realId, candidate.basedOn, ctx.knownRefIds);
    if (invalid.length > 0) {
      warnings.push({
        code: "INVALID_REFERENCE",
        message: `Dropped narrative claim: invalid basedOn reference(s) [${invalid.join(", ")}]`,
        step: ctx.step,
      });
      return { claim: undefined, warnings };
    }
  }

  let restated: Restatement | undefined;
  if (candidate.status === "VERIFIED") {
    restated = resolveRestatement(candidate.restatesId, ctx);
    if (!restated) {
      warnings.push({
        code: "CITATION_INVALID",
        message: `Dropped narrative claim: restatesId "${candidate.restatesId}" does not resolve to a VERIFIED claim or fact`,
        step: ctx.step,
      });
      return { claim: undefined, warnings };
    }
  }

  const groundingText = restated ? restated.quotes.map((q) => q.quote).join(" ") : ctx.corpusText;
  const ungrounded = extractNumbers(candidate.text).filter((n) => !numberAppearsIn(n.value, groundingText));
  if (ungrounded.length > 0) {
    warnings.push({
      code: "UNGROUNDED_NUMBER",
      message: `Dropped narrative claim: ungrounded number(s) [${ungrounded.map((n) => n.value).join(", ")}]`,
      step: ctx.step,
    });
    return { claim: undefined, warnings };
  }

  const confidence = restated ? restated.confidence : computeClaimConfidence({ status: candidate.status }, () => undefined);
  const base = { id: realId, text: candidate.text, entities: candidate.entities, confidence };

  switch (candidate.status) {
    case "VERIFIED":
      return { claim: { ...base, status: "VERIFIED", quotes: restated!.quotes }, warnings };
    case "AI_ANALYSIS":
      return { claim: { ...base, status: "AI_ANALYSIS", basedOn: candidate.basedOn }, warnings };
    case "ASSUMPTION":
      return { claim: { ...base, status: "ASSUMPTION", assumption: candidate.assumption }, warnings };
    case "MISSING":
      return { claim: { ...base, status: "MISSING", missing: candidate.missing }, warnings };
  }
}
