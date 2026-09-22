import type { LLM } from "@/lib/ai/llm";
import { materialitySeverity } from "@/lib/analysis/flags";
import {
  buildConsistencyPrompt,
  CONSISTENCY_TOOL_NAME,
  SubmitConflictsInput,
} from "@/lib/analysis/prompts/consistency";
import { findConsistencyCandidates } from "@/lib/analysis/steps/consistency-candidates";
import type { Flag } from "@/lib/schema/claims";
import type { Fact } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";
import type { Usage } from "@/lib/schema/run";

const MAX_OUTPUT_TOKENS = 4096;

export interface ConsistencyArgs {
  llm: LLM;
  facts: Fact[];
  signal?: AbortSignal;
}

export interface ConsistencyResult {
  flags: Flag[];
  /** `facts` with `conflictsWith` populated for any fact involved in a real conflict. */
  facts: Fact[];
  usage: Usage | undefined;
}

/**
 * AI_SPEC 3.4 (CONSISTENCY): a deterministic candidate pass, then one FAST
 * model call adjudicating all candidates at once. No candidates means no
 * LLM call at all (`usage: undefined`) — most analyses won't have any.
 */
export async function runConsistency(args: ConsistencyArgs): Promise<ConsistencyResult> {
  const candidates = findConsistencyCandidates(args.facts);
  if (candidates.length === 0) {
    return { flags: [], facts: args.facts, usage: undefined };
  }

  const prompt = buildConsistencyPrompt(candidates);
  const { data, usage } = await args.llm.structured({
    role: "FAST",
    system: prompt.system,
    user: prompt.user,
    cachePrefix: prompt.cachePrefix,
    toolName: CONSISTENCY_TOOL_NAME,
    schema: SubmitConflictsInput,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    signal: args.signal,
  });

  const flags: Flag[] = [];
  const conflictsByFactId = new Map<string, Set<string>>();

  for (const verdict of data.verdicts) {
    const pair = candidates[verdict.pairIndex];
    if (!pair) continue; // model referenced an out-of-range pair; unverifiable, ignore
    if (verdict.verdict !== "CONFLICT") continue;

    flags.push({
      id: newId("flg"),
      category: "INCONSISTENCY",
      severity: materialitySeverity(pair.factA.key),
      title: `Conflicting values for ${pair.factA.key}`,
      description: verdict.explanation,
      evidenceIds: [...pair.factA.quotes.map((q) => q.evidenceId), ...pair.factB.quotes.map((q) => q.evidenceId)],
      claimIds: [],
      detectedBy: "CONSISTENCY",
      status: "OPEN",
    });

    addConflict(conflictsByFactId, pair.factA.id, pair.factB.id);
    addConflict(conflictsByFactId, pair.factB.id, pair.factA.id);
  }

  const facts = args.facts.map((fact) => {
    const conflicts = conflictsByFactId.get(fact.id);
    if (!conflicts) return fact;
    return { ...fact, conflictsWith: [...new Set([...fact.conflictsWith, ...conflicts])] };
  });

  return { flags, facts, usage };
}

function addConflict(map: Map<string, Set<string>>, factId: string, conflictsWithId: string): void {
  const set = map.get(factId);
  if (set) set.add(conflictsWithId);
  else map.set(factId, new Set([conflictsWithId]));
}
