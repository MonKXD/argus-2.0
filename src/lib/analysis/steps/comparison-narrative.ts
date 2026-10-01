import type { LLM } from "@/lib/ai/llm";
import {
  buildComparisonNarrativePrompt,
  COMPARISON_NARRATIVE_TOOL_NAME,
  SubmitComparisonNarrativeInput,
  type ComparisonNarrativeItem,
} from "@/lib/analysis/prompts/comparison-narrative";
import { finalizeNarrativeClaim } from "@/lib/analysis/steps/finalize-narrative-claim";
import type { Claim } from "@/lib/schema/claims";
import type { Fact } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";
import type { Usage } from "@/lib/schema/run";

const MAX_OUTPUT_TOKENS = 4096;

export interface RunComparisonNarrativeArgs {
  items: ComparisonNarrativeItem[];
  llm: LLM;
  signal?: AbortSignal;
}

export interface RunComparisonNarrativeResult {
  narrative: Claim[];
  /** Count only — individual warnings aren't persisted anywhere
   * (`Comparison` has no `warnings` field, unlike `Report`; adding one
   * would be a schema change this S/M addition doesn't need, R-PRC-07).
   * A caller that wants detail can log it itself. */
  droppedCount: number;
  usage: Usage;
}

/**
 * FR-CMP-05 (P2): one `submit_comparison_narrative` call over every
 * compared startup's already-validated material (overall, dimension
 * claims, flags, facts — no raw evidence, same as SYNTHESIZE), then the
 * same V2/V3/V4/V6 finalization SYNTHESIZE uses (`finalizeNarrativeClaim`,
 * shared rather than duplicated). Pools dimension claims and facts across
 * *all* items so a `restatesId`/`basedOn` reference can point at any
 * compared startup's material — ids are globally unique ULIDs, so no
 * per-startup disambiguation is needed. User-triggered and synchronous
 * (not part of the per-analysis `Run` step machinery — a comparison has no
 * `Run` of its own), matching the "optional narrative" framing in
 * APP_FLOW 5.6.
 */
export async function runComparisonNarrative(
  args: RunComparisonNarrativeArgs,
): Promise<RunComparisonNarrativeResult> {
  const prompt = buildComparisonNarrativePrompt(args.items);

  const { data, usage } = await args.llm.structured({
    role: "SYNTHESIS",
    system: prompt.system,
    user: prompt.user,
    cachePrefix: prompt.cachePrefix,
    toolName: COMPARISON_NARRATIVE_TOOL_NAME,
    schema: SubmitComparisonNarrativeInput,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    signal: args.signal,
  });

  const dimensionClaimsById = new Map<string, Claim>();
  const factsById = new Map<string, Fact>();
  for (const item of args.items) {
    for (const dimension of item.dimensions) {
      for (const claim of dimension.claims) dimensionClaimsById.set(claim.id, claim);
    }
    for (const fact of item.facts) factsById.set(fact.id, fact);
  }
  const knownRefIds = new Set<string>([...factsById.keys(), ...dimensionClaimsById.keys()]);
  const corpusText = [
    ...[...factsById.values()].map((f) => f.statement),
    ...[...dimensionClaimsById.values()].map((c) => c.text),
    ...args.items.flatMap((i) => i.flags.map((f) => `${f.title} ${f.description}`)),
  ].join("\n");

  const narrative: Claim[] = [];
  let droppedCount = 0;
  for (const candidate of data.narrative) {
    const realId = newId("clm");
    const outcome = finalizeNarrativeClaim(candidate, realId, {
      dimensionClaimsById,
      factsById,
      knownRefIds,
      corpusText,
    });
    if (outcome.claim) narrative.push(outcome.claim);
    else droppedCount += 1;
  }

  return { narrative, droppedCount, usage };
}
