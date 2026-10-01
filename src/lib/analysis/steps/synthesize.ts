import type { LLM } from "@/lib/ai/llm";
import {
  buildSynthesisPrompt,
  SYNTHESIS_TOOL_NAME,
  SubmitSynthesisInput,
  type CandidateNarrativeClaim,
} from "@/lib/analysis/prompts/synthesis";
import { finalizeNarrativeClaim } from "@/lib/analysis/steps/finalize-narrative-claim";
import type { ChecklistItem, Claim, DimensionAnalysis, Flag } from "@/lib/schema/claims";
import type { Fact } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";
import type { Overall, Report, RunWarning } from "@/lib/schema/report";
import type { Usage } from "@/lib/schema/run";

const MAX_OUTPUT_TOKENS = 8192;

export interface RunSynthesisArgs {
  startupName: string;
  overall: Overall;
  dimensions: DimensionAnalysis[];
  flags: Flag[];
  facts: Fact[];
  llm: LLM;
  signal?: AbortSignal;
}

export interface RunSynthesisResult {
  narrative: Report["narrative"];
  checklist: ChecklistItem[];
  warnings: RunWarning[];
  usage: Usage;
}

type NarrativeSectionKey = keyof Report["narrative"];

/**
 * AI_SPEC 3.7 (SYNTHESIZE): one `submit_synthesis` call over only validated
 * data (overall, dimension claims, flags, facts — no raw evidence), then
 * code resolves restatements against the real dimension claims/facts, runs
 * V2/V3/V4/V6 on the narrative claims it produces (no V1: a VERIFIED
 * narrative claim never carries model-authored quotes to validate — see
 * `resolveRestatement`), and assembles the checklist. Not wired to
 * `EvidenceStore`/`StepContext`; same scoping as T-2.06 through T-2.11 —
 * the real idempotent step runner is T-3.08's job.
 */
export async function runSynthesis(args: RunSynthesisArgs): Promise<RunSynthesisResult> {
  const prompt = buildSynthesisPrompt({
    startupName: args.startupName,
    overall: args.overall,
    dimensions: args.dimensions,
    flags: args.flags,
    facts: args.facts,
  });

  const { data, usage } = await args.llm.structured({
    role: "SYNTHESIS",
    system: prompt.system,
    user: prompt.user,
    cachePrefix: prompt.cachePrefix,
    toolName: SYNTHESIS_TOOL_NAME,
    schema: SubmitSynthesisInput,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    signal: args.signal,
  });

  const dimensionClaimsById = new Map<string, Claim>();
  for (const dimension of args.dimensions) {
    for (const claim of dimension.claims) dimensionClaimsById.set(claim.id, claim);
  }
  const factsById = new Map(args.facts.map((f) => [f.id, f]));
  const knownRefIds = new Set<string>([...factsById.keys(), ...dimensionClaimsById.keys()]);
  const corpusText = [
    ...args.facts.map((f) => f.statement),
    ...[...dimensionClaimsById.values()].map((c) => c.text),
    ...args.flags.map((f) => `${f.title} ${f.description}`),
  ].join("\n");

  const candidatesBySection: Array<{ key: NarrativeSectionKey; candidates: CandidateNarrativeClaim[] }> = [
    { key: "executiveSummary", candidates: data.executiveSummary },
    { key: "investmentOverview", candidates: data.investmentOverview },
    { key: "marketTrends", candidates: data.marketTrends },
    { key: "marketGaps", candidates: data.marketGaps },
    { key: "aiInsights", candidates: data.aiInsights },
  ];

  // Real ids up front, same "local id is just this response's own
  // cross-reference key" pattern as T-2.09's analyze-dimension.ts.
  const localToReal = new Map<string, string>();
  for (const section of candidatesBySection) {
    for (const candidate of section.candidates) localToReal.set(candidate.localId, newId("clm"));
  }

  const warnings: RunWarning[] = [];
  const narrative: Report["narrative"] = {
    executiveSummary: [],
    investmentOverview: [],
    marketTrends: [],
    marketGaps: [],
    aiInsights: [],
  };
  const finalizedIds = new Set<string>();

  for (const section of candidatesBySection) {
    for (const candidate of section.candidates) {
      const realId = localToReal.get(candidate.localId)!;
      const outcome = finalizeNarrativeClaim(candidate, realId, {
        dimensionClaimsById,
        factsById,
        knownRefIds,
        corpusText,
        step: "SYNTHESIZE",
      });
      warnings.push(...outcome.warnings);
      if (outcome.claim) {
        narrative[section.key].push(outcome.claim);
        finalizedIds.add(realId);
      }
    }
  }

  // Checklist items may link either a real fct_/clm_ id (facts, dimension
  // claims) or the localId of a narrative claim authored above (e.g. a
  // checklist item pointing at a MISSING claim it just produced).
  const validClaimIds = new Set<string>([...dimensionClaimsById.keys(), ...finalizedIds]);
  const checklist: ChecklistItem[] = [];
  for (const candidate of data.checklist) {
    const linked = candidate.linkedClaimIds
      .map((ref) => localToReal.get(ref) ?? ref)
      .filter((id) => validClaimIds.has(id));
    if (linked.length === 0) {
      warnings.push({
        code: "INVALID_REFERENCE",
        message: "Dropped checklist item: no linkedClaimIds resolved to a known claim",
        step: "SYNTHESIZE",
      });
      continue;
    }
    checklist.push({
      id: newId("chk"),
      dimension: candidate.dimension,
      priority: candidate.priority,
      question: candidate.question,
      whyItMatters: candidate.whyItMatters,
      suggestedSource: candidate.suggestedSource,
      linkedClaimIds: linked,
      status: "OPEN",
    });
  }

  return { narrative, checklist, warnings, usage };
}
