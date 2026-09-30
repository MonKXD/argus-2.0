"use client";

import { createContext, useContext, useState } from "react";

import { ClaimInline } from "@/components/argus/claim-inline";
import { EmptyState } from "@/components/argus/empty-state";
import { ReliabilityChip } from "@/components/argus/reliability-chip";
import { EvidencePanel } from "@/components/argus/report/evidence-panel";
import { ReportHeader } from "@/components/argus/report/report-header";
import { ReportSectionNav } from "@/components/argus/report/report-section-nav";
import { DimensionRadar } from "@/components/charts/dimension-radar";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { dimensionContributions } from "@/lib/analysis/scoring/contribution";
import { confidenceLabel } from "@/lib/confidence";
import { DIMENSION_LABEL } from "@/lib/dimension-labels";
import { formatNumber } from "@/lib/format";
import type { Analysis } from "@/lib/schema/analysis";
import type { Claim, CriterionScore, DimensionAnalysis } from "@/lib/schema/claims";
import type { DimensionKey } from "@/lib/schema/enums";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import type { Report } from "@/lib/schema/report";
import { SEVERITY_CLASS } from "@/lib/severity";
import { SOURCE_TYPE_LABEL } from "@/lib/source-labels";

import type { ReactNode } from "react";

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
  /** A `PARTIAL`-status banner (with its own Resume action) rendered
   * between the header and the section nav/reading column. */
  partialNotice?: ReactNode;
}

/** "Selecting opens the evidence rail" (DESIGN section 6) has to reach
 * every `ClaimInline` across all 16 sections without threading a prop
 * through every intermediate component (`DimensionSection`, `ExplainScore`,
 * ...) — a context read once inside `ClaimList` does the same job. */
const ClaimSelectionContext = createContext<{
  selectedId: string | null;
  onSelect: (claim: Claim) => void;
} | null>(null);

function ClaimList({ claims }: { claims: Claim[] }) {
  const selection = useContext(ClaimSelectionContext);
  if (claims.length === 0) return <EmptyState message="Not in the sources provided." />;
  return (
    <div className="flex flex-col gap-3">
      {claims.map((claim) => (
        <ClaimInline
          key={claim.id}
          claim={claim}
          selected={selection?.selectedId === claim.id}
          onSelect={selection?.onSelect}
        />
      ))}
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
        <div className="max-w-full min-w-0 overflow-x-auto">
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

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1360px] flex-col gap-6 p-6">
      <ReportHeader analysis={analysis} report={report} />

      {partialNotice}

      <ClaimSelectionContext.Provider
        value={{ selectedId: selected?.id ?? null, onSelect: setSelected }}
      >
        <div className="lg:grid lg:grid-cols-[220px_1fr_360px] lg:gap-12">
          <ReportSectionNav />

          <div className="mt-8 flex max-w-[760px] flex-col gap-12 lg:mt-0">
            <section id="executive-summary">
              <h2 className="font-serif text-h3 text-foreground">1. Executive summary</h2>
              <div className="mt-4">
                <ClaimList claims={report.narrative.executiveSummary} />
              </div>
            </section>

            <section id="investment-overview">
              <h2 className="font-serif text-h3 text-foreground">2. Investment overview</h2>
              <div className="mt-4">
                <ClaimList claims={report.narrative.investmentOverview} />
              </div>
            </section>

            <section id="investment-score">
              <h2 className="font-serif text-h3 text-foreground">3. Investment score</h2>
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
              <h2 className="font-serif text-h3 text-foreground">4. Founder &amp; team</h2>
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("founder")} showCriteria />
              </div>
            </section>

            <section id="product-business-model">
              <h2 className="font-serif text-h3 text-foreground">
                5. Product &amp; business model
              </h2>
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
              <h2 className="font-serif text-h3 text-foreground">6. Market opportunity</h2>
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("market")} showCriteria />
              </div>
            </section>

            <section id="market-trends">
              <h2 className="font-serif text-h3 text-foreground">7. Market trends</h2>
              <div className="mt-4">
                <ClaimList claims={report.narrative.marketTrends} />
              </div>
            </section>

            <section id="competitive-landscape">
              <h2 className="font-serif text-h3 text-foreground">8. Competitive landscape</h2>
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("competitive")} showCriteria />
              </div>
            </section>

            <section id="traction-growth">
              <h2 className="font-serif text-h3 text-foreground">9. Traction &amp; growth</h2>
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("traction")} showCriteria />
              </div>
            </section>

            <section id="financial-signals">
              <h2 className="font-serif text-h3 text-foreground">10. Financial signals</h2>
              <div className="mt-4">
                <DimensionSection dimension={byKey.get("financial")} showCriteria />
              </div>
            </section>

            <section id="risks-flags">
              <h2 className="font-serif text-h3 text-foreground">11. Risks &amp; red flags</h2>
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
                      </li>
                    ))}
                  </ul>
                )}
                <DimensionSection dimension={byKey.get("risk")} showCriteria />
              </div>
            </section>

            <section id="strengths-weaknesses">
              <h2 className="font-serif text-h3 text-foreground">12. Strengths &amp; weaknesses</h2>
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
              <h2 className="font-serif text-h3 text-foreground">13. Market gaps</h2>
              <div className="mt-4">
                <ClaimList claims={report.narrative.marketGaps} />
              </div>
            </section>

            <section id="ai-insights">
              <h2 className="font-serif text-h3 text-foreground">14. AI insights</h2>
              <div className="mt-4">
                <ClaimList claims={report.narrative.aiInsights} />
              </div>
            </section>

            <section id="evidence-sources">
              <h2 className="font-serif text-h3 text-foreground">15. Evidence &amp; sources</h2>
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
              <h2 className="font-serif text-h3 text-foreground">16. Missing information</h2>
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
