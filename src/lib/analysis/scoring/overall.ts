import { STAGE_PROFILE_WEIGHTS } from "@/lib/analysis/config";
import { round2 } from "@/lib/analysis/scoring/round";
import type { Flag } from "@/lib/schema/claims";
import type { DimensionKey, StageProfile } from "@/lib/schema/enums";
import type { Overall } from "@/lib/schema/report";

/**
 * AI_SPEC 5.3, verbatim:
 *
 * ```
 * w_d      = weight of dimension d for the stage profile (SCHEMA section 7)
 * S        = dimensions with non-null score
 * coverage = sum(w_d for d in S)
 * if coverage < 0.5:  score = null, label = INSUFFICIENT_EVIDENCE
 * else:               score = round( sum(w_d * s_d for d in S) / coverage )
 * confidence = round( sum(w_d * c_d for d in S), 2 )     // missing dimensions contribute zero
 * cap: if any OPEN flag has severity CRITICAL -> score = min(score, 60); record cap with flag IDs
 * ```
 */
export interface DimensionResult {
  dimension: DimensionKey;
  score: number | null;
  confidence: number;
}

export function computeOverall(dimensions: DimensionResult[], stageProfile: StageProfile, flags: Flag[]): Overall {
  const weights = STAGE_PROFILE_WEIGHTS[stageProfile];
  const scored = dimensions.filter((d): d is DimensionResult & { score: number } => d.score !== null);
  const coverage = sum(scored.map((d) => weights[d.dimension]));

  let score: number | null;
  let label: Overall["label"];
  if (coverage < 0.5) {
    score = null;
    label = "INSUFFICIENT_EVIDENCE";
  } else {
    score = Math.round(sum(scored.map((d) => weights[d.dimension] * d.score)) / coverage);
    label = "SCORED";
  }

  const confidence = round2(sum(scored.map((d) => weights[d.dimension] * d.confidence)));

  const cap = computeCriticalFlagCap(score, flags);
  if (cap) score = cap.value;

  return {
    score,
    label,
    confidence,
    coverage: round2(coverage),
    cap,
    weights,
  };
}

/** D-008: "An open critical flag caps the score at 60." Recorded whenever a critical flag is open (even if it wasn't the binding constraint), so the report can always explain why a cap policy applies. */
function computeCriticalFlagCap(score: number | null, flags: Flag[]): Overall["cap"] {
  if (score === null) return undefined;
  const openCritical = flags.filter((f) => f.status === "OPEN" && f.severity === "CRITICAL");
  if (openCritical.length === 0) return undefined;

  return {
    value: Math.min(score, 60),
    reason: "An open critical flag caps the score at 60",
    flagIds: openCritical.map((f) => f.id),
  };
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
