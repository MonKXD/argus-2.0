import Link from "next/link";

import { DimensionRadarOverlay, type RadarSeries } from "@/components/charts/dimension-radar-overlay";
import { ScoreGauge } from "@/components/charts/score-gauge";
import {
  COMPARE_METRIC_KEYS,
  COMPARE_METRIC_LABEL,
  formatFactValue,
  pickComparisonFacts,
} from "@/lib/compare-metrics";
import { dimensionDelta } from "@/lib/dimension-delta";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "@/lib/dimension-labels";
import type { DimensionAnalysis } from "@/lib/schema/claims";
import type { Severity } from "@/lib/schema/enums";
import type { Fact } from "@/lib/schema/evidence";
import type { Report } from "@/lib/schema/report";
import { SEVERITY_CLASS } from "@/lib/severity";

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function topOpenFlagSeverity(report: Report): Severity | null {
  const open = report.flags.filter((f) => f.status === "OPEN");
  return SEVERITY_ORDER.find((s) => open.some((f) => f.severity === s)) ?? null;
}

export interface ComparisonItemView {
  analysisId: string;
  label: string;
  report: Report;
  dimensions: DimensionAnalysis[];
  facts: Fact[];
}

interface ComparisonViewProps {
  name: string;
  createdAt: string;
  items: ComparisonItemView[];
  hasDeletedItems: boolean;
}

/**
 * FR-CMP-02/FR-CMP-03 (APP_FLOW 5.6 "View"): header per startup with score
 * and confidence, a radar overlay, a dimension score table with deltas, and
 * a canonical-metric matrix with explicit "Not available" cells. A pure
 * presentational component (no Firestore reads of its own) so it's
 * unit-testable without mocking repos — `/app/compare/[id]/page.tsx` loads
 * the pinned snapshot data and passes it in. Comparability warnings
 * (differing stage profile or scoring version) are T-5.03's own scope, not
 * built here.
 */
function ComparisonView({ name, createdAt, items, hasDeletedItems }: ComparisonViewProps) {
  const radarSeries: RadarSeries[] = items.map((item) => ({
    label: item.label,
    scores: Object.fromEntries(
      item.dimensions.map((d) => [d.dimension, { score: d.score, confidence: d.confidence }]),
    ),
  }));

  const baselineScores = new Map(items[0]?.dimensions.map((d) => [d.dimension, d.score]) ?? []);

  return (
    <div className="flex flex-col gap-10 p-6">
      <div>
        <h1 className="font-serif text-h2 text-foreground">{name}</h1>
        <p className="text-ui-sm text-mist">Created {new Date(createdAt).toLocaleDateString()}</p>
      </div>

      {hasDeletedItems && (
        <p className="text-ui-sm text-mist">
          One or more startups in this comparison have since been deleted; they&rsquo;re shown
          below by their saved name only.
        </p>
      )}

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const topSeverity = topOpenFlagSeverity(item.report);
          const openFlags = item.report.flags.filter((f) => f.status === "OPEN").length;
          return (
            <div
              key={item.analysisId}
              className="flex flex-col items-start gap-3 rounded-panel border border-hairline bg-panel p-4"
            >
              <Link
                href={`/app/analyses/${item.analysisId}`}
                className="text-ui font-medium text-foreground underline underline-offset-4"
              >
                {item.label}
              </Link>
              {item.report.overall.score != null ? (
                <ScoreGauge
                  score={item.report.overall.score}
                  confidence={item.report.overall.confidence}
                  size={120}
                />
              ) : (
                <ScoreGauge notScoredReason="Insufficient evidence" size={120} />
              )}
              <p className="text-ui-sm text-mist">
                {openFlags} open flag{openFlags === 1 ? "" : "s"}
                {topSeverity && (
                  <span className={`ml-1 ${SEVERITY_CLASS[topSeverity]}`}>(top: {topSeverity})</span>
                )}
              </p>
            </div>
          );
        })}
      </section>

      {items.length >= 2 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-ui font-medium text-foreground">Dimension radar</h2>
          <DimensionRadarOverlay series={radarSeries} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-ui font-medium text-foreground">Dimension scores</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-ui-sm">
            <thead>
              <tr className="border-b border-hairline text-mist">
                <th className="py-2 pr-4 font-medium">Dimension</th>
                {items.map((item, i) => (
                  <th key={item.analysisId} className="py-2 pr-4 font-medium">
                    {item.label}
                    {i === 0 && <span className="ml-1 text-mist">(baseline)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIMENSION_ORDER.map((key) => (
                <tr key={key} className="border-b border-hairline last:border-0">
                  <td className="py-2 pr-4">{DIMENSION_LABEL[key]}</td>
                  {items.map((item, i) => {
                    const dim = item.dimensions.find((d) => d.dimension === key);
                    const score = dim?.score ?? null;
                    const delta = i === 0 ? null : dimensionDelta(baselineScores.get(key) ?? null, score);
                    return (
                      <td key={item.analysisId} className="py-2 pr-4 tabular-nums">
                        {score != null ? score : "Not scored"}
                        {delta != null && (
                          <span className="ml-1 text-mist">
                            ({delta >= 0 ? "+" : ""}
                            {delta})
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-ui font-medium text-foreground">Metric matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-ui-sm">
            <thead>
              <tr className="border-b border-hairline text-mist">
                <th className="py-2 pr-4 font-medium">Metric</th>
                {items.map((item) => (
                  <th key={item.analysisId} className="py-2 pr-4 font-medium">
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_METRIC_KEYS.map((key) => (
                <tr key={key} className="border-b border-hairline last:border-0">
                  <td className="py-2 pr-4">{COMPARE_METRIC_LABEL[key]}</td>
                  {items.map((item) => {
                    const facts = pickComparisonFacts(item.facts);
                    const fact = facts[key];
                    return (
                      <td key={item.analysisId} className="py-2 pr-4 tabular-nums">
                        {fact ? (
                          formatFactValue(fact.value)
                        ) : (
                          <span className="text-mist">Not available</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export { ComparisonView };
export type { ComparisonViewProps };
