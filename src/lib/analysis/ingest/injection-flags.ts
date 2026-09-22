import type { InjectionMatch } from "@/lib/analysis/ingest/build-evidence";
import type { Flag } from "@/lib/schema/claims";
import { newId } from "@/lib/schema/ids";
import type { RunWarning } from "@/lib/schema/report";

export interface InjectionFlagsResult {
  flags: Flag[];
  warnings: RunWarning[];
}

/**
 * AI_SPEC 3.1: "Detect instruction-like patterns... Record
 * INJECTION_SUSPECTED and raise a SOURCE_INTEGRITY flag (severity MEDIUM,
 * informational)." `buildEvidence()` (T-2.06) detects instruction-like text
 * but deliberately stopped short of constructing these records (D-042) —
 * this is that construction step. One flag and one warning per matched
 * evidence item, not merged per source, so each flag points at exactly the
 * evidence that triggered it (useful for a "jump to evidence" UI link) —
 * a documented, undictated granularity choice, same class as D-008.
 *
 * Informational by design (R-AI-06's "deliberately over-inclusive": a false
 * positive only adds a dismissible flag, a false negative lets a real
 * attempt through unnoticed): this never removes or alters evidence text,
 * it only records that the pattern was seen. The actual containment is
 * everything else in the defense chain — delimited, escaped prompt blocks
 * (`escapeForPromptBlock`), sanitisation before detection runs
 * (`sanitizeText`), no tool but the output tool on any analysis call
 * (`AnthropicLLM.structured`), and V7 (`claimLeaksInstruction`, T-2.13)
 * stripping any claim that echoes or acts on the injected text regardless
 * of whether this flag ever gets raised.
 */
export function buildInjectionFlags(matches: InjectionMatch[]): InjectionFlagsResult {
  const flags: Flag[] = matches.map((match) => ({
    id: newId("flg"),
    category: "SOURCE_INTEGRITY",
    severity: "MEDIUM",
    title: "Possible prompt injection in source text",
    description: `Instruction-like text was detected in a source ("${match.pattern}"). The text is retained and treated as data, not instructions; review the source before relying on claims drawn from it.`,
    evidenceIds: [match.evidenceId],
    claimIds: [],
    detectedBy: "INGEST",
    status: "OPEN",
  }));

  const warnings: RunWarning[] = matches.map((match) => ({
    code: "INJECTION_SUSPECTED",
    message: `Instruction-like pattern "${match.pattern}" detected in evidence`,
    step: "INGEST",
    refId: match.evidenceId,
  }));

  return { flags, warnings };
}
