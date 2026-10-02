"use client";

import { createContext, useContext, useState } from "react";

import { ChecklistItemControls } from "@/components/argus/checklist-item-controls";
import { ClaimRow } from "@/components/argus/claim-row";
import { EmptyState } from "@/components/argus/empty-state";
import { EvidenceBar } from "@/components/argus/evidence-bar";
import { STATUS_LABEL } from "@/components/argus/evidence-marker";
import { FlagAcknowledgeControls } from "@/components/argus/flag-acknowledge-controls";
import { ReliabilityChip } from "@/components/argus/reliability-chip";
import { EvidencePanel } from "@/components/argus/report/evidence-panel";
import { ReportHeader } from "@/components/argus/report/report-header";
import { ReportSectionNav } from "@/components/argus/report/report-section-nav";
import type { ReportVersionSummary } from "@/components/argus/report/report-version-selector";
import { DimensionRadar } from "@/components/charts/dimension-radar";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dimensionContributions } from "@/lib/analysis/scoring/contribution";
import { confidenceLabel } from "@/lib/confidence";
import { DIMENSION_LABEL } from "@/lib/dimension-labels";
import { formatNumber } from "@/lib/format";
import type { Analysis } from "@/lib/schema/analysis";
import type { Claim, CriterionScore, DimensionAnalysis } from "@/lib/schema/claims";
import type { ClaimStatus, DimensionKey } from "@/lib/schema/enums";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import type { Report } from "@/lib/schema/report";
import { SEVERITY_CLASS } from "@/lib/severity";
import { SOURCE_TYPE_LABEL } from "@/lib/source-labels";

import type { ReactNode } from "react";

type StatusFilter = ClaimStatus | "ALL";
type StatusCounts = Report["evidenceStats"]["claims"];

const EMPTY_COUNTS: StatusCounts = { VERIFIED: 0, AI_ANALYSIS: 0, ASSUMPTION: 0, MISSING: 0 };

interface ReportShellProps {
  analysis: Analysis;
  report: Report;
  dimensions: DimensionAnalysis[];
  /** The analysis's registered sources (FR-RPT-15's "source list"). Omitted
   * entirely in a context that hasn't loaded them (e.g. a unit test) — the
   * section then just shows the aggregate stats it already had. */
  sources?: Source[];
  /** Every piece of evidence and fact for the analysis, resolving the
   * evidence rail's quote-in-context/"based on" content (FR-RPT-17).
   * Omitted the same way `sources` can be — the rail then falls back to
   * `EvidenceRailContent`'s own "Unknown source" degradation. */
  evidence?: Evidence[];
  facts?: Fact[];
  /** Every saved version of this report, newest first (T-4.11, FR-RPT-19).
   * Omitted the same way `sources` can be — the header then shows a plain
   * version number with no selector or history. */
  versions?: ReportVersionSummary[];
  /** A `PARTIAL`-status banner (with its own Resume action) rendered
   * between the header and the section nav/reading column. */
  partialNotice?: ReactNode;
}

/** "Selecting opens the evidence rail" (DESIGN section 6) has to reach every
 * `ClaimRow` across all 16 sections without threading a prop through every
 * intermediate component (`DimensionSection`, `ExplainScore`, ...) — a
 * context read once inside `ClaimList` does the same job. The status
 * filter (FR-RPT-23) rides the same context for the same reason. */
const ClaimSelectionContext = createContext<{
  selectedId: string | null;
  onSelect: (claim: Claim) => void;
  statusFilter: StatusFilter;
} | null>(null);

function ClaimList({ claims }: { claims: Claim[] }) {
  const selection = useContext(ClaimSelectionContext);
  const filter = selection?.statusFilter ?? "ALL";
  const visible = filter === "ALL" ? claims : claims.filter((c) => c.status === filter);

  if (claims.length === 0) return <EmptyState message="Not in the sources provided." />;
  if (visible.length === 0 && filter !== "ALL") {
    return <EmptyState message={`No ${STATUS_LABEL[filter].toLowerCase()} claims here.`} />;
  }
  return (
    <div className="flex flex-col gap-3">
      {visible.map((claim) => (
        <ClaimRow
          key={claim.id}
          claim={claim}
          selected={selection?.selectedId === claim.id}
          onSelect={selection?.onSelect}
        />
      ))}
    </div>
  );
}

/**
 * FR-RPT-18: "Every section shows: an evidence-composition bar, claims with
 * status markers, and a coverage note when the section has missing
 * information" (PRD section 10). `report.evidenceStats.bySection` (built by
 * VERIFY, D-051) already keys exactly this per-section breakdown — this
 * reads it rather than recomputing counts from each section's own claim
 * list, so it can never drift from the numbers section 15's own evidence
 * stats table shows. No bar for a section with zero claims (e.g. section 3,
 * Investment score — D-051's own "no claims live there" section).
 */
function SectionHeader({
  title,
  sectionKey,
  evidenceStats,
}: {
  title: ReactNode;
  sectionKey: string;
  evidenceStats: Report["evidenceStats"];
}) {
  const counts = evidenceStats.bySection[sectionKey] ?? EMPTY_COUNTS;
  const total = counts.VERIFIED + counts.AI_ANALYSIS + counts.ASSUMPTION + counts.MISSING;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-h3 text-foreground">{title}</h2>
      {total > 0 && <EvidenceBar counts={counts} className="max-w-60" />}
      {counts.MISSING > 0 && (
        <p className="text-ui-sm text-mist">
          {counts.MISSING} of {total} {total === 1 ? "claim is" : "claims are"} missing — not
          found in the sources provided.
        </p>
      )}
    </div>
  );
}

/** Shared per-criterion 0-4 score + rationale list, used both by the
 * global explain-the-score panel (every dimension at once) and by an
 * individual dimension section that wants its own criteria surfaced
 * inline (FR-RPT-04/FR-RPT-05's "criterion scores"). */
function CriteriaList({ criteria }: { criteria: CriterionScore[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {criteria.map((criterion) => (
        <li key={criterion.id} className="text-mist">
          <span className="text-foreground">{criterion.label}:</span>{" "}
          {criterion.score === null ? "Not scored" : `${criterion.score}/4`}
          {criterion.rationale ? ` — ${criterion.rationale}` : null}
        </li>
      ))}
    </ul>
  );
}

function DimensionSection({
  dimension,
  showCriteria = false,
}: {
  dimension: DimensionAnalysis | undefined;
  /** FR-RPT-04/FR-RPT-05: show this dimension's own criterion breakdown
   * inline, not just its aggregate score. */
  showCriteria?: boolean;
}) {
  if (!dimension) {
    return <EmptyState message="This dimension could not be analysed in this run." />;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-ui-sm text-mist">
        {dimension.score === null
          ? "Not scored"
          : `Score ${dimension.score} · ${confidenceLabel(dimension.confidence)} confidence`}
      </p>
      <ClaimList claims={dimension.claims} />
      {showCriteria && (
        <details className="text-ui-sm">
          <summary className="cursor-pointer text-mist">Show criteria</summary>
          <div className="mt-2">
            <CriteriaList criteria={dimension.criteria} />
          </div>
        </details>
      )}
    </div>
  );
}

/** FR-RPT-22: "explain the score" — weights, criterion scores and each
 * dimension's contribution to the overall score, as a `<details>`
 * disclosure (the same pattern `DimensionRadar`'s own data-table text
 * alternative already uses). */
function ExplainScore({
  overall,
  dimensions,
}: {
  overall: Report["overall"];
  dimensions: DimensionAnalysis[];
}) {
  const contributions = dimensionContributions(overall, dimensions);
  const byKey = new Map(dimensions.map((d) => [d.dimension, d]));

  return (
    <details className="w-full min-w-0 text-ui-sm">
      <summary className="cursor-pointer text-mist">Explain this score</summary>
      <div className="mt-3 flex min-w-0 flex-col gap-4">
        {/* DESIGN section 10: "Below 768: tables become stacked rows."
         * A real table stays the desktop presentation (md and up); below
         * that, the identical data renders as a list of labelled cards —
         * the same "duplicate markup, toggle by breakpoint" pattern this
         * report already uses for its section nav and evidence rail,
         * rather than CSS-toggling one table's own display mode (T-4.13). */}
        <ul className="flex flex-col gap-3 md:hidden">
          {contributions.map((c) => (
            <li key={c.dimension} className="rounded-panel border border-hairline p-3">
              <p className="font-medium text-foreground">{c.label}</p>
              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-mist">
                <dt>Weight</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(c.weight * 100, { maximumFractionDigits: 0 })}%
                </dd>
                <dt>Score</dt>
                <dd className="tabular-nums text-foreground">
                  {c.score === null ? "Not scored" : c.score}
                </dd>
                <dt>Confidence</dt>
                <dd className="tabular-nums text-foreground">
                  {c.score === null ? "—" : confidenceLabel(c.confidence)}
                </dd>
                <dt>Contribution</dt>
                <dd className="tabular-nums text-foreground">
                  {c.contribution === null
                    ? "—"
                    : formatNumber(c.contribution, { maximumFractionDigits: 1 })}
                </dd>
              </dl>
            </li>
          ))}
        </ul>

        <div className="hidden max-w-full min-w-0 overflow-x-auto md:block">
          <table
            className="w-full text-left"
            aria-label="Per-dimension weight, score and contribution to the overall score"
          >
            <thead>
              <tr className="border-b border-hairline text-mist">
                <th className="py-1 pr-4 font-medium">Dimension</th>
                <th className="py-1 pr-4 font-medium">Weight</th>
                <th className="py-1 pr-4 font-medium">Score</th>
                <th className="py-1 pr-4 font-medium">Confidence</th>
                <th className="py-1 font-medium">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => (
                <tr key={c.dimension} className="border-b border-hairline last:border-0">
                  <td className="py-1 pr-4">{c.label}</td>
                  <td className="py-1 pr-4 tabular-nums">
                    {formatNumber(c.weight * 100, { maximumFractionDigits: 0 })}%
                  </td>
                  <td className="py-1 pr-4 tabular-nums">
                    {c.score === null ? "Not scored" : c.score}
                  </td>
                  <td className="py-1 pr-4 tabular-nums">
                    {c.score === null ? "—" : confidenceLabel(c.confidence)}
                  </td>
                  <td className="py-1 tabular-nums">
                    {c.contribution === null
                      ? "—"
                      : formatNumber(c.contribution, { maximumFractionDigits: 1 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3">
          {contributions
            .map((c) => byKey.get(c.dimension))
            .filter((d): d is DimensionAnalysis => d !== undefined)
            .map((d) => (
              <div key={d.dimension}>
                <h4 className="text-ui font-medium text-foreground">
                  {DIMENSION_LABEL[d.dimension]}
                </h4>
                <div className="mt-1">
                  <CriteriaList criteria={d.criteria} />
                </div>
              </div>
            ))}
        </div>
      </div>
    </details>
  );
}

function claimsById(dimensions: DimensionAnalysis[]): Map<string, Claim> {
  const map = new Map<string, Claim>();
  for (const dimension of dimensions) {
    for (const claim of dimension.claims) map.set(claim.id, claim);
  }
  return map;
}

/**
 * APP_FLOW 5.5's report layout: sticky section nav, ~68ch reading column,
 * an evidence rail slot (T-4.08 adds the column — every `ClaimInline` here
 * is deliberately non-interactive, `onSelect` omitted, until then). PRD
 * section 10's 16 sections are all rendered with real data using
 * already-built components (`ClaimInline`, `ScoreGauge`, `DimensionRadar`)
 * rather than left as placeholders — subsequent Phase 4 tasks upgrade
 * specific sections' presentation (explain-the-score, `ClaimRow` in a
 * gutter, evidence-composition bars, interactive rail, status filter) but
 * don't need to build first-pass content from zero. See PROJECT_MEMORY
 * D-071.
 */
function ReportShell({
  analysis,
  report,
  dimensions,
  sources = [],
  evidence = [],
  facts = [],
  versions = [],
  partialNotice,
}: ReportShellProps) {
  const byKey = new Map(dimensions.map((d) => [d.dimension, d]));
  const dimensionScores = Object.fromEntries(
    dimensions.map((d) => [d.dimension, { score: d.score, confidence: d.confidence }]),
  ) as Partial<Record<DimensionKey, { score: number | null; confidence: number }>>;
  const allClaims = claimsById(dimensions);

  const strengths = dimensions.flatMap((d) =>
    d.strengthIds.map((id) => allClaims.get(id)).filter((c) => c !== undefined),
  );
  const weaknesses = dimensions.flatMap((d) =>
    d.weaknessIds.map((id) => allClaims.get(id)).filter((c) => c !== undefined),
  );

  const [selected, setSelected] = useState<Claim | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1360px] flex-col gap-6 p-6">
      <ReportHeader analysis={analysis} report={report} versions={versions} />

      {partialNotice}

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        className="min-w-0"
      >
        {/* Radix's TabsList manages its own roving tabindex and won't accept
         * an overridden tabIndex — the scrollable region needs its own,
         * separately focusable wrapper so a keyboard user can scroll it
         * directly (axe scrollable-region-focusable). */}
        <div className="overflow-x-auto" tabIndex={0}>
          <TabsList aria-label="Filter claims by status">
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="VERIFIED">{STATUS_LABEL.VERIFIED}</TabsTrigger>
            <TabsTrigger value="AI_ANALYSIS">{STATUS_LABEL.AI_ANALYSIS}</TabsTrigger>
            <TabsTrigger value="ASSUMPTION">{STATUS_LABEL.ASSUMPTION}</TabsTrigger>
            <TabsTrigger value="MISSING">{STATUS_LABEL.MISSING}</TabsTrigger>
          </TabsList>
        </div>
        {/* This toggle filters claims across the whole page below, not a
         * single co-located panel — there's nothing for a real TabsContent
         * to show. Radix's TabsTrigger still emits `aria-controls` pointing
         * at a same-value TabsContent's id regardless, so an empty one per
         * value is required to keep that id a valid reference (axe
         * aria-valid-attr-value, WCAG 4.1.2) — found via a real axe scan of
         * this page, T-4.14; D-076's "no TabsContent panels" precedent was
         * itself wrong (report-tour.tsx, the cited precedent, has real
         * content panels for each of its tabs). */}
        <TabsContent value="ALL" />
        <TabsContent value="VERIFIED" />
        <TabsContent value="AI_ANALYSIS" />
        <TabsContent value="ASSUMPTION" />
        <TabsContent value="MISSING" />
      </Tabs>

      <ClaimSelectionContext.Provider
        value={{ selectedId: selected?.id ?? null, onSelect: setSelected, statusFilter }}
      >
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-12 xl:grid-cols-[220px_1fr_360px]">
          <ReportSectionNav />

          <div className="mt-8 flex max-w-[760px] flex-col gap-12 md:mt-0">
            <section id="executive-summary">
              <SectionHeader
                title="1. Executive summary"
                sectionKey="executive_summary"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <ClaimList claims={report.narrative.executiveSummary} />
              </div>
            </section>

            <section id="investment-overview">
              <SectionHeader
                title="2. Investment overview"
                sectionKey="investment_overview"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <ClaimList claims={report.narrative.investmentOverview} />
              </div>
            </section>

            <section id="investment-score">
              <SectionHeader
                title="3. Investment score"
                sectionKey="investment_score"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4 flex flex-wrap gap-8">
                {report.overall.score === null ? (
                  <ScoreGauge notScoredReason="Not enough evidence to score this analysis." />
                ) : report.overall.cap ? (
                  <ScoreGauge
                    score={report.overall.score}
                    cappedReason={report.overall.cap.reason}
                  />
                ) : (
                  <ScoreGauge score={report.overall.score} confidence={report.overall.confidence} />
                )}
                <DimensionRadar scores={dimensionScores} />
              </div>
              <div className="mt-4">
                <ExplainScore overall={report.overall} dimensions={dimensions} />
              </div>
            </section>

            <section id="founder-team">
              <SectionHeader
                title="4. Founder & team"
                sectionKey="founder_team"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("founder")} showCriteria />
              </div>
            </section>

            <section id="product-business-model">
              <SectionHeader
                title="5. Product & business model"
                sectionKey="product_business_model"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4 flex flex-col gap-6">
                <div>
                  <h3 className="text-ui font-medium text-foreground">{DIMENSION_LABEL.product}</h3>
                  <div className="mt-2">
                    <DimensionSection dimension={byKey.get("product")} showCriteria />
                  </div>
                </div>
                <div>
                  <h3 className="text-ui font-medium text-foreground">
                    {DIMENSION_LABEL.business_model}
                  </h3>
                  <div className="mt-2">
                    <DimensionSection dimension={byKey.get("business_model")} showCriteria />
                  </div>
                </div>
              </div>
            </section>

            <section id="market-opportunity">
              <SectionHeader
                title="6. Market opportunity"
                sectionKey="market_opportunity"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("market")} showCriteria />
              </div>
            </section>

            <section id="market-trends">
              <SectionHeader
                title="7. Market trends"
                sectionKey="market_trends"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <ClaimList claims={report.narrative.marketTrends} />
              </div>
            </section>

            <section id="competitive-landscape">
              <SectionHeader
                title="8. Competitive landscape"
                sectionKey="competitive_landscape"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("competitive")} showCriteria />
              </div>
            </section>

            <section id="traction-growth">
              <SectionHeader
                title="9. Traction & growth"
                sectionKey="traction_growth"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("traction")} showCriteria />
              </div>
            </section>

            <section id="financial-signals">
              <SectionHeader
                title="10. Financial signals"
                sectionKey="financial_signals"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("financial")} showCriteria />
              </div>
            </section>

            <section id="risks-flags">
              <SectionHeader
                title="11. Risks & red flags"
                sectionKey="risks_red_flags"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4 flex flex-col gap-4">
                {report.flags.length === 0 ? (
                  <EmptyState message="No flags raised in this run." />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {report.flags.map((flag) => (
                      <li
                        key={flag.id}
                        className="rounded-panel border border-hairline p-3 text-ui-sm"
                      >
                        <span className={SEVERITY_CLASS[flag.severity]}>{flag.severity}</span>
                        <span className="ml-2 font-medium text-foreground">{flag.title}</span>
                        <p className="mt-1 text-mist">{flag.description}</p>
                        <FlagAcknowledgeControls
                          analysisId={analysis.id}
                          reportId={report.id}
                          flag={flag}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <DimensionSection dimension={byKey.get("risk")} showCriteria />
              </div>
            </section>

            <section id="strengths-weaknesses">
              <SectionHeader
                title="12. Strengths & weaknesses"
                sectionKey="strengths_weaknesses"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-ui font-medium text-foreground">Strengths</h3>
                  <div className="mt-2">
                    <ClaimList claims={strengths} />
                  </div>
                </div>
                <div>
                  <h3 className="text-ui font-medium text-foreground">Weaknesses</h3>
                  <div className="mt-2">
                    <ClaimList claims={weaknesses} />
                  </div>
                </div>
              </div>
            </section>

            <section id="market-gaps">
              <SectionHeader
                title="13. Market gaps"
                sectionKey="market_gaps"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <ClaimList claims={report.narrative.marketGaps} />
              </div>
            </section>

            <section id="ai-insights">
              <SectionHeader
                title="14. AI insights"
                sectionKey="ai_insights"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                <ClaimList claims={report.narrative.aiInsights} />
              </div>
            </section>

            <section id="evidence-sources">
              <SectionHeader
                title="15. Evidence & sources"
                sectionKey="evidence_sources"
                evidenceStats={report.evidenceStats}
              />
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-ui-sm sm:grid-cols-4">
                <dt className="text-mist">Sources</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.sources)}
                </dd>
                <dt className="text-mist">Evidence items</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.evidenceItems)}
                </dd>
                <dt className="text-mist">Facts</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.facts)}
                </dd>
                <dt className="text-mist">Downgraded</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.downgraded)}
                </dd>
                <dt className="text-mist">Verified claims</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.claims.VERIFIED)}
                </dd>
                <dt className="text-mist">AI analysis claims</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.claims.AI_ANALYSIS)}
                </dd>
                <dt className="text-mist">Assumption claims</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.claims.ASSUMPTION)}
                </dd>
                <dt className="text-mist">Missing claims</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.claims.MISSING)}
                </dd>
                <dt className="text-mist">Independent evidence</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.reliabilityMix.INDEPENDENT)}
                </dd>
                <dt className="text-mist">Company evidence</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.reliabilityMix.FIRST_PARTY)}
                </dd>
                <dt className="text-mist">Provided evidence</dt>
                <dd className="tabular-nums text-foreground">
                  {formatNumber(report.evidenceStats.reliabilityMix.PROVIDED)}
                </dd>
              </dl>

              {sources.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2">
                  {sources.map((source) => (
                    <li
                      key={source.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-hairline p-3 text-ui-sm"
                    >
                      <span className="text-foreground">{source.title}</span>
                      <span className="flex items-center gap-2 text-mist">
                        {SOURCE_TYPE_LABEL[source.type]}
                        <ReliabilityChip reliability={source.reliability} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section id="missing-information">
              <SectionHeader
                title="16. Missing information"
                sectionKey="missing_information"
                evidenceStats={report.evidenceStats}
              />
              <div className="mt-4">
                {report.checklist.length === 0 ? (
                  <EmptyState message="Nothing outstanding from this run." />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {report.checklist.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-panel border border-hairline p-3 text-ui-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{item.question}</span>
                          <span className="shrink-0 text-caption text-mist">{item.priority}</span>
                        </div>
                        <p className="mt-1 text-mist">{item.whyItMatters}</p>
                        {item.suggestedSource && (
                          <p className="mt-1 text-caption text-mist">
                            Suggested source: {item.suggestedSource}
                          </p>
                        )}
                        <ChecklistItemControls
                          analysisId={analysis.id}
                          reportId={report.id}
                          item={item}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <EvidencePanel
            selected={selected}
            onClose={() => setSelected(null)}
            evidence={evidence}
            sources={sources}
            facts={facts}
          />
        </div>
      </ClaimSelectionContext.Provider>
    </div>
  );
}

export { ReportShell };
