
import { ClaimInline } from "@/components/argus/claim-inline";
import { EmptyState } from "@/components/argus/empty-state";
import { ReportHeader } from "@/components/argus/report/report-header";
import { ReportSectionNav } from "@/components/argus/report/report-section-nav";
import { DimensionRadar } from "@/components/charts/dimension-radar";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { confidenceLabel } from "@/lib/confidence";
import { DIMENSION_LABEL } from "@/lib/dimension-labels";
import { formatNumber } from "@/lib/format";
import type { Analysis } from "@/lib/schema/analysis";
import type { Claim, DimensionAnalysis } from "@/lib/schema/claims";
import type { DimensionKey } from "@/lib/schema/enums";
import type { Report } from "@/lib/schema/report";
import { SEVERITY_CLASS } from "@/lib/severity";

import type { ReactNode } from "react";

interface ReportShellProps {
  analysis: Analysis;
  report: Report;
  dimensions: DimensionAnalysis[];
  /** A `PARTIAL`-status banner (with its own Resume action) rendered
   * between the header and the section nav/reading column. */
  partialNotice?: ReactNode;
}

function ClaimList({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return <EmptyState message="Not in the sources provided." />;
  return (
    <div className="flex flex-col gap-3">
      {claims.map((claim) => (
        <ClaimInline key={claim.id} claim={claim} />
      ))}
    </div>
  );
}

function DimensionSection({ dimension }: { dimension: DimensionAnalysis | undefined }) {
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
    </div>
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
function ReportShell({ analysis, report, dimensions, partialNotice }: ReportShellProps) {
  const byKey = new Map(dimensions.map((d) => [d.dimension, d]));
  const dimensionScores = Object.fromEntries(
    dimensions.map((d) => [d.dimension, { score: d.score, confidence: d.confidence }]),
  ) as Partial<Record<DimensionKey, { score: number | null; confidence: number }>>;
  const allClaims = claimsById(dimensions);

  const strengths = dimensions.flatMap((d) => d.strengthIds.map((id) => allClaims.get(id)).filter((c) => c !== undefined));
  const weaknesses = dimensions.flatMap((d) => d.weaknessIds.map((id) => allClaims.get(id)).filter((c) => c !== undefined));

  return (
    <div className="mx-auto flex max-w-[1360px] flex-col gap-6 p-6">
      <ReportHeader analysis={analysis} report={report} />

      {partialNotice}

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
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
                <ScoreGauge score={report.overall.score} cappedReason={report.overall.cap.reason} />
              ) : (
                <ScoreGauge score={report.overall.score} confidence={report.overall.confidence} />
              )}
              <DimensionRadar scores={dimensionScores} />
            </div>
          </section>

          <section id="founder-team">
            <h2 className="font-serif text-h3 text-foreground">4. Founder &amp; team</h2>
            <div className="mt-4">
              <DimensionSection dimension={byKey.get("founder")} />
            </div>
          </section>

          <section id="product-business-model">
            <h2 className="font-serif text-h3 text-foreground">5. Product &amp; business model</h2>
            <div className="mt-4 flex flex-col gap-6">
              <div>
                <h3 className="text-ui font-medium text-foreground">{DIMENSION_LABEL.product}</h3>
                <div className="mt-2">
                  <DimensionSection dimension={byKey.get("product")} />
                </div>
              </div>
              <div>
                <h3 className="text-ui font-medium text-foreground">{DIMENSION_LABEL.business_model}</h3>
                <div className="mt-2">
                  <DimensionSection dimension={byKey.get("business_model")} />
                </div>
              </div>
            </div>
          </section>

          <section id="market-opportunity">
            <h2 className="font-serif text-h3 text-foreground">6. Market opportunity</h2>
            <div className="mt-4">
              <DimensionSection dimension={byKey.get("market")} />
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
              <DimensionSection dimension={byKey.get("competitive")} />
            </div>
          </section>

          <section id="traction-growth">
            <h2 className="font-serif text-h3 text-foreground">9. Traction &amp; growth</h2>
            <div className="mt-4">
              <DimensionSection dimension={byKey.get("traction")} />
            </div>
          </section>

          <section id="financial-signals">
            <h2 className="font-serif text-h3 text-foreground">10. Financial signals</h2>
            <div className="mt-4">
              <DimensionSection dimension={byKey.get("financial")} />
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
                    <li key={flag.id} className="rounded-panel border border-hairline p-3 text-ui-sm">
                      <span className={SEVERITY_CLASS[flag.severity]}>{flag.severity}</span>
                      <span className="ml-2 font-medium text-foreground">{flag.title}</span>
                      <p className="mt-1 text-mist">{flag.description}</p>
                    </li>
                  ))}
                </ul>
              )}
              <DimensionSection dimension={byKey.get("risk")} />
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
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.sources)}</dd>
              <dt className="text-mist">Evidence items</dt>
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.evidenceItems)}</dd>
              <dt className="text-mist">Facts</dt>
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.facts)}</dd>
              <dt className="text-mist">Downgraded</dt>
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.downgraded)}</dd>
              <dt className="text-mist">Verified claims</dt>
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.claims.VERIFIED)}</dd>
              <dt className="text-mist">AI analysis claims</dt>
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.claims.AI_ANALYSIS)}</dd>
              <dt className="text-mist">Assumption claims</dt>
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.claims.ASSUMPTION)}</dd>
              <dt className="text-mist">Missing claims</dt>
              <dd className="tabular-nums text-foreground">{formatNumber(report.evidenceStats.claims.MISSING)}</dd>
            </dl>
          </section>

          <section id="missing-information">
            <h2 className="font-serif text-h3 text-foreground">16. Missing information</h2>
            <div className="mt-4">
              {report.checklist.length === 0 ? (
                <EmptyState message="Nothing outstanding from this run." />
              ) : (
                <ul className="flex flex-col gap-3">
                  {report.checklist.map((item) => (
                    <li key={item.id} className="rounded-panel border border-hairline p-3 text-ui-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{item.question}</span>
                        <span className="shrink-0 text-caption text-mist">{item.priority}</span>
                      </div>
                      <p className="mt-1 text-mist">{item.whyItMatters}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export { ReportShell };
