import type { LLM } from "@/lib/ai/llm";
import {
  buildFactExtractionPrompt,
  FACT_EXTRACTION_TOOL_NAME,
  SubmitFactsInput,
  type CandidateFact,
} from "@/lib/analysis/prompts/fact-extraction";
import { reliabilityWeight, strongestReliability } from "@/lib/analysis/scoring/reliability-weight";
import { validateQuote } from "@/lib/analysis/verify/citation";
import type { Reliability } from "@/lib/schema/enums";
import type { Evidence, Fact, FactValue, Quote, Source } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";
import type { RunWarning } from "@/lib/schema/report";
import type { Usage } from "@/lib/schema/run";

const MAX_OUTPUT_TOKENS = 4096;

export interface ExtractFactsArgs {
  analysisId: string;
  runId: string;
  startupName: string;
  llm: LLM;
  evidence: Evidence[];
  sources: Source[];
  signal?: AbortSignal;
}

export interface ExtractFactsResult {
  facts: Fact[];
  warnings: RunWarning[];
  usage: Usage[];
}

/**
 * AI_SPEC 3.2 (EXTRACT_FACTS): one `submit_facts` call per source (its own
 * "Batch evidence by source"), then code validates every quote (V1),
 * assigns reliability/confidence/IDs, and merges duplicate facts. Not wired
 * to `EvidenceStore`/`StepContext` — this takes already-fetched evidence
 * and sources and returns facts, the same scoping T-2.06's `buildEvidence()`
 * used, because the real step runner (idempotent IDs, DONE marking, R-ARC-03)
 * is T-3.08's job and doesn't exist yet.
 */
export async function extractFacts(args: ExtractFactsArgs): Promise<ExtractFactsResult> {
  const sourceTitleById = new Map(args.sources.map((s) => [s.id, s.title]));
  const evidenceById = new Map(args.evidence.map((e) => [e.id, e]));
  const evidenceBySource = groupBySource(args.evidence);

  const warnings: RunWarning[] = [];
  const usage: Usage[] = [];
  const validated: ValidatedCandidate[] = [];

  for (const [sourceId, items] of evidenceBySource) {
    const sourceTitle = sourceTitleById.get(sourceId);
    if (!sourceTitle) {
      throw new Error(`extractFacts: evidence references unknown sourceId "${sourceId}"`);
    }

    const prompt = buildFactExtractionPrompt({
      startupName: args.startupName,
      items: items.map((evidence) => ({ evidence, sourceTitle })),
    });

    const { data, usage: callUsage } = await args.llm.structured({
      role: "ANALYSIS",
      system: prompt.system,
      user: prompt.user,
      cachePrefix: prompt.cachePrefix,
      toolName: FACT_EXTRACTION_TOOL_NAME,
      schema: SubmitFactsInput,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      signal: args.signal,
    });
    usage.push(callUsage);

    for (const candidate of data.facts) {
      const outcome = validateCandidate(candidate, evidenceById);
      if (outcome.quotes.length === 0) {
        warnings.push({
          code: "CITATION_INVALID",
          message: `Dropped fact "${candidate.key}": no quote passed citation validation`,
          step: "EXTRACT_FACTS",
        });
        continue;
      }
      validated.push({ ...candidate, quotes: outcome.quotes });
    }
  }

  const facts = mergeAndFinalize(validated, args.analysisId, args.runId);
  return { facts, warnings, usage };
}

interface ValidatedQuote extends Quote {
  reliability: Reliability;
}

interface ValidatedCandidate extends Omit<CandidateFact, "quotes"> {
  quotes: ValidatedQuote[];
}

function validateCandidate(
  candidate: CandidateFact,
  evidenceById: Map<string, Evidence>,
): { quotes: ValidatedQuote[] } {
  const quotes: ValidatedQuote[] = [];
  for (const q of candidate.quotes) {
    const evidence = evidenceById.get(q.evidenceId);
    if (!evidence) continue; // model cited an evidence id that doesn't exist: unvalidatable, drop

    const result = validateQuote(q.quote, evidence.text);
    if (!result.valid || !result.matchedText) continue;

    quotes.push({ evidenceId: q.evidenceId, quote: result.matchedText, reliability: evidence.reliability });
  }
  return { quotes };
}

function groupBySource(evidence: Evidence[]): Map<string, Evidence[]> {
  const groups = new Map<string, Evidence[]>();
  for (const item of evidence) {
    const group = groups.get(item.sourceId);
    if (group) group.push(item);
    else groups.set(item.sourceId, [item]);
  }
  return groups;
}

function mergeAndFinalize(candidates: ValidatedCandidate[], analysisId: string, runId: string): Fact[] {
  const groups = new Map<string, ValidatedCandidate[]>();
  for (const candidate of candidates) {
    const groupKey = `${candidate.key}\u0000${factValueSignature(candidate.value)}\u0000${candidate.period ?? ""}`;
    const group = groups.get(groupKey);
    if (group) group.push(candidate);
    else groups.set(groupKey, [candidate]);
  }

  const facts: Fact[] = [];
  for (const group of groups.values()) {
    const first = group[0]!;
    const quotes = dedupeQuotes(group.flatMap((c) => c.quotes));
    const reliability = quotes.map((q) => q.reliability).reduce(strongestReliability);

    facts.push({
      id: newId("fct"),
      analysisId,
      runId,
      key: first.key,
      statement: first.statement,
      value: first.value,
      period: first.period,
      asOf: first.asOf,
      quotes: quotes.map(({ evidenceId, quote }) => ({ evidenceId, quote })),
      reliability,
      confidence: reliabilityWeight(reliability),
      conflictsWith: [],
    });
  }
  return facts;
}

function dedupeQuotes(quotes: ValidatedQuote[]): ValidatedQuote[] {
  const seen = new Set<string>();
  const result: ValidatedQuote[] = [];
  for (const q of quotes) {
    const key = `${q.evidenceId}\u0000${q.quote}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(q);
  }
  return result;
}

function factValueSignature(value: FactValue): string {
  switch (value.kind) {
    case "number":
      return `number:${value.value}:${value.unit ?? ""}`;
    case "money":
      return `money:${value.amount}:${value.currency}`;
    case "percent":
      return `percent:${value.value}`;
    case "text":
      return `text:${value.value}`;
    case "date":
      return `date:${value.value}`;
    case "boolean":
      return `boolean:${value.value}`;
    case "list":
      return `list:${JSON.stringify(value.values)}`;
  }
}
