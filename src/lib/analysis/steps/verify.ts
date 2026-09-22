import { strongestReliability } from "@/lib/analysis/scoring/reliability-weight";
import { evidenceInfoForClaims, verifiedClaims, type EvidenceInfo } from "@/lib/analysis/scoring/verified-support";
import { detectUnverifiableClaims } from "@/lib/analysis/steps/unverifiable-claims";
import { claimLeaksInstruction } from "@/lib/analysis/verify/instruction-leakage";
import { sensitiveAttributeMatches } from "@/lib/analysis/verify/sensitive-attributes";
import { invalidBasedOnRefs } from "@/lib/analysis/verify/status-integrity";
import type { Claim, ChecklistItem, DimensionAnalysis, Flag } from "@/lib/schema/claims";
import type { DimensionKey } from "@/lib/schema/enums";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import type { EvidenceStats, Report, RunWarning } from "@/lib/schema/report";

type StatusCounts = EvidenceStats["claims"];
type NarrativeSectionKey = keyof Report["narrative"];

const NARRATIVE_SECTIONS: NarrativeSectionKey[] = [
  "executiveSummary",
  "investmentOverview",
  "marketTrends",
  "marketGaps",
  "aiInsights",
];

/**
 * AI_SPEC section 10's report spec (PRD section 10) maps each dimension to
 * exactly one report section; `product` and `business_model` share a
 * section (row 5). This is the only place that mapping is codified —
 * neither AI_SPEC nor SCHEMA.md states it directly, only PRD's own "Data
 * source" column does, so this table is this step's documented reading of
 * that column, not an invented one (see the T-2.13 decision entry).
 */
const DIMENSION_SECTION: Record<DimensionKey, string> = {
  founder: "founder_team",
  market: "market_opportunity",
  product: "product_business_model",
  traction: "traction_growth",
  competitive: "competitive_landscape",
  business_model: "product_business_model",
  financial: "financial_signals",
  risk: "risks_red_flags",
};

const NARRATIVE_SECTION_KEY: Record<NarrativeSectionKey, string> = {
  executiveSummary: "executive_summary",
  investmentOverview: "investment_overview",
  marketTrends: "market_trends",
  marketGaps: "market_gaps",
  aiInsights: "ai_insights",
};

/** SCHEMA.md's full 16-value `SectionKey` list, so every section gets a zero entry even with no claims. */
const ALL_SECTION_KEYS = [
  "executive_summary",
  "investment_overview",
  "investment_score",
  "founder_team",
  "product_business_model",
  "market_opportunity",
  "market_trends",
  "competitive_landscape",
  "traction_growth",
  "financial_signals",
  "risks_red_flags",
  "strengths_weaknesses",
  "market_gaps",
  "ai_insights",
  "evidence_sources",
  "missing_information",
];

export interface RunVerifyArgs {
  dimensions: DimensionAnalysis[];
  narrative: Report["narrative"];
  flags: Flag[];
  checklist: ChecklistItem[];
  facts: Fact[];
  sources: Source[];
  evidence: Evidence[];
}

export interface RunVerifyResult {
  dimensions: DimensionAnalysis[];
  narrative: Report["narrative"];
  flags: Flag[];
  checklist: ChecklistItem[];
  evidenceStats: EvidenceStats;
  warnings: RunWarning[];
  /**
   * Dimensions whose surviving claims (or the id lists that reference them)
   * changed during this pass. AI_SPEC 3.8: "If any dimension claim changes,
   * re-run SCORE and SYNTHESIZE once" — that re-run is the orchestrator's
   * job (T-3.08), using the already-built `computeDimensionScore`/
   * `computeOverall` (T-2.09/T-2.10) and a fresh SYNTHESIZE call; this step
   * only detects and reports the change, it does not recompute scores or
   * re-call the model itself (VERIFY has no model role, AI_SPEC step table).
   */
  changedDimensions: DimensionKey[];
}

/**
 * AI_SPEC 3.8 (VERIFY): runs the full verifier (section 6) over every claim
 * — dimension and narrative, not narrative alone (a T-2.13 scope decision;
 * see the D-entry) — then computes `EvidenceStats`. No model call (the step
 * table lists VERIFY's role as "none"). Not wired to `EvidenceStore`/
 * `StepContext`; same scoping as T-2.06 through T-2.12 — the real
 * idempotent step runner is T-3.08's job.
 *
 * Only V4 (referential integrity, with real cascade-repair this time — see
 * below), V5 (unverifiable-claim detection), V6 (sensitive attributes) and
 * V7 (instruction leakage, new at this step) run here. V1 (citation) and V2
 * (numeric grounding) are deliberately not re-run: every claim's quotes and
 * asserted numbers were already checked against their grounding surface at
 * the point they were created (ANALYZE, SYNTHESIZE), evidence text never
 * changes afterward (`EvidenceStore` is append-only, R-ARC-03), and a
 * narrative `VERIFIED` claim's quotes are themselves a verbatim copy of an
 * already-V1-validated claim or fact — so a second pass would only ever
 * reconfirm the same result.
 */
export function runVerify(args: RunVerifyArgs): RunVerifyResult {
  const factIds = new Set(args.facts.map((f) => f.id));
  const evidenceById = new Map(args.evidence.map((e) => [e.id, e]));
  const evidenceInfoOf = (evidenceId: string): EvidenceInfo | undefined => {
    const evidence = evidenceById.get(evidenceId);
    return evidence ? { sourceId: evidence.sourceId, reliability: evidence.reliability } : undefined;
  };

  const survivors = new Map<string, Claim>();
  for (const dimension of args.dimensions) for (const claim of dimension.claims) survivors.set(claim.id, claim);
  for (const key of NARRATIVE_SECTIONS) for (const claim of args.narrative[key]) survivors.set(claim.id, claim);
  const totalClaims = survivors.size;

  const warnings: RunWarning[] = [];

  // V6 and V7: direct per-claim checks, no cascade needed.
  for (const claim of [...survivors.values()]) {
    const sensitiveHits = sensitiveAttributeMatches(claim.text);
    if (sensitiveHits.length > 0) {
      survivors.delete(claim.id);
      warnings.push({
        code: "SENSITIVE_ATTRIBUTE",
        message: `Dropped claim: matched sensitive-attribute pattern(s) [${sensitiveHits.map((h) => h.category).join(", ")}]`,
        step: "VERIFY",
        refId: claim.id,
      });
      continue;
    }
    const leak = claimLeaksInstruction(claim);
    if (leak) {
      survivors.delete(claim.id);
      warnings.push({
        code: "INJECTION_SUSPECTED",
        message: `Dropped claim: matched instruction-like pattern "${leak}"`,
        step: "VERIFY",
        refId: claim.id,
      });
    }
  }

  // V4, with the cascade repair D-047 documented as out of scope for ANALYZE's
  // own per-dimension check: iterate to a fixed point, since dropping one
  // AI_ANALYSIS claim can invalidate another that cited it.
  let changed = true;
  while (changed) {
    changed = false;
    const knownIds = new Set<string>([...factIds, ...survivors.keys()]);
    for (const claim of [...survivors.values()]) {
      if (claim.status !== "AI_ANALYSIS") continue;
      const invalid = invalidBasedOnRefs(claim.id, claim.basedOn, knownIds);
      if (invalid.length > 0) {
        survivors.delete(claim.id);
        warnings.push({
          code: "INVALID_REFERENCE",
          message: `Dropped claim: invalid basedOn reference(s) [${invalid.join(", ")}]`,
          step: "VERIFY",
          refId: claim.id,
        });
        changed = true;
      }
    }
  }

  const dimensions: DimensionAnalysis[] = args.dimensions.map((dimension) => {
    const claims = dimension.claims.filter((c) => survivors.has(c.id));
    const remapSurviving = (ids: string[]): string[] => ids.filter((id) => survivors.has(id));
    return {
      ...dimension,
      claims,
      criteria: dimension.criteria.map((c) => ({ ...c, claimIds: remapSurviving(c.claimIds) })),
      strengthIds: remapSurviving(dimension.strengthIds),
      weaknessIds: remapSurviving(dimension.weaknessIds),
      riskIds: remapSurviving(dimension.riskIds),
      missingIds: remapSurviving(dimension.missingIds),
    };
  });
  const changedDimensions = dimensions
    .filter((updated, i) => updated.claims.length !== args.dimensions[i]!.claims.length)
    .map((d) => d.dimension);

  const narrative: Report["narrative"] = {
    executiveSummary: args.narrative.executiveSummary.filter((c) => survivors.has(c.id)),
    investmentOverview: args.narrative.investmentOverview.filter((c) => survivors.has(c.id)),
    marketTrends: args.narrative.marketTrends.filter((c) => survivors.has(c.id)),
    marketGaps: args.narrative.marketGaps.filter((c) => survivors.has(c.id)),
    aiInsights: args.narrative.aiInsights.filter((c) => survivors.has(c.id)),
  };

  const checklist: ChecklistItem[] = [];
  for (const item of args.checklist) {
    const linked = item.linkedClaimIds.filter((id) => survivors.has(id));
    if (linked.length === 0) {
      warnings.push({
        code: "INVALID_REFERENCE",
        message: `Dropped checklist item "${item.id}": no linkedClaimIds survived verification`,
        step: "VERIFY",
        refId: item.id,
      });
      continue;
    }
    checklist.push({ ...item, linkedClaimIds: linked });
  }

  const survivingClaims = [...survivors.values()];
  const flags: Flag[] = [
    ...args.flags.map((flag) => ({ ...flag, claimIds: flag.claimIds.filter((id) => survivors.has(id)) })),
    ...detectUnverifiableClaims(survivingClaims, evidenceInfoOf),
  ];

  const evidenceStats = computeEvidenceStats({
    dimensions,
    narrative,
    facts: args.facts,
    sources: args.sources,
    evidence: args.evidence,
    evidenceInfoOf,
    droppedCount: totalClaims - survivors.size,
  });

  return { dimensions, narrative, flags, checklist, evidenceStats, warnings, changedDimensions };
}

function computeEvidenceStats(args: {
  dimensions: DimensionAnalysis[];
  narrative: Report["narrative"];
  facts: Fact[];
  sources: Source[];
  evidence: Evidence[];
  evidenceInfoOf: (evidenceId: string) => EvidenceInfo | undefined;
  droppedCount: number;
}): EvidenceStats {
  const allClaims = [...args.dimensions.flatMap((d) => d.claims), ...allNarrativeClaims(args.narrative)];

  const claims = emptyStatusCounts();
  for (const claim of allClaims) claims[claim.status] += 1;

  const bySection: Record<string, StatusCounts> = {};
  for (const key of ALL_SECTION_KEYS) bySection[key] = emptyStatusCounts();

  for (const dimension of args.dimensions) {
    const sectionKey = DIMENSION_SECTION[dimension.dimension];
    for (const claim of dimension.claims) bySection[sectionKey]![claim.status] += 1;
  }
  for (const key of NARRATIVE_SECTIONS) {
    const sectionKey = NARRATIVE_SECTION_KEY[key];
    for (const claim of args.narrative[key]) bySection[sectionKey]![claim.status] += 1;
  }
  const claimsById = new Map(allClaims.map((c) => [c.id, c]));
  for (const dimension of args.dimensions) {
    for (const id of [...dimension.strengthIds, ...dimension.weaknessIds]) {
      const claim = claimsById.get(id);
      if (claim) bySection.strengths_weaknesses![claim.status] += 1;
    }
  }
  for (const claim of allClaims) {
    bySection.evidence_sources![claim.status] += 1;
    if (claim.status === "MISSING") bySection.missing_information!.MISSING += 1;
  }

  const reliabilityMix = { INDEPENDENT: 0, FIRST_PARTY: 0, PROVIDED: 0 };
  let downgraded = 0;
  for (const claim of verifiedClaims(allClaims)) {
    const infos = evidenceInfoForClaims([claim], args.evidenceInfoOf);
    if (infos.length === 0) continue;
    const strongest = infos.map((i) => i.reliability).reduce(strongestReliability);
    reliabilityMix[strongest] += 1;
    if (strongest === "PROVIDED") downgraded += 1;
  }

  return {
    sources: args.sources.length,
    evidenceItems: args.evidence.length,
    facts: args.facts.length,
    claims,
    bySection,
    reliabilityMix,
    downgraded,
    dropped: args.droppedCount,
  };
}

function allNarrativeClaims(narrative: Report["narrative"]): Claim[] {
  return NARRATIVE_SECTIONS.flatMap((key) => narrative[key]);
}

function emptyStatusCounts(): StatusCounts {
  return { VERIFIED: 0, AI_ANALYSIS: 0, ASSUMPTION: 0, MISSING: 0 };
}
