import { BarChart } from "@/components/charts/bar-chart";
import { FLAG_CATEGORY_LABEL } from "@/lib/flag-category-labels";
import type { Analysis } from "@/lib/schema/analysis";
import type { Flag } from "@/lib/schema/claims";
import type { FlagCategory } from "@/lib/schema/enums";

// DESIGN section 5.2 / FR-DSH-08: "Patterns across your analyses (derived):
// sector mix | score distribution | common risks", "clearly labelled as
// derived, not external market data." T-1.13/D-033 shipped sector mix only
// — score distribution and common risks needed evidenceStats/Flag data the
// demo fixtures only had for one analysis. Now on real Firestore data
// (T-3.10) every completed analysis has both, so T-5.09 fills in the rest.

const SCORE_BUCKETS = [
  { label: "0-19", min: 0, max: 19 },
  { label: "20-39", min: 20, max: 39 },
  { label: "40-59", min: 40, max: 59 },
  { label: "60-79", min: 60, max: 79 },
  { label: "80-100", min: 80, max: 100 },
] as const;

const TOP_RISK_CATEGORIES = 5;

interface MarketIntelligencePanelProps {
  analyses: Analysis[];
  /** Every `OPEN` flag from each analysis's latest report (page-level read,
   * R-ARC-07 — this component does no data fetching of its own). An
   * acknowledged or dismissed flag isn't a live risk any more, the same
   * reading `run-pipeline.ts` already uses for `Analysis.latest.topFlagSeverity`. */
  openFlags: Flag[];
}

function MarketIntelligencePanel({ analyses, openFlags }: MarketIntelligencePanelProps) {
  const sectorCounts = new Map<string, number>();
  for (const analysis of analyses) {
    const sector = analysis.startup.sector ?? "Unspecified";
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
  }
  const sectorData = Array.from(sectorCounts, ([label, value]) => ({ label, value })).sort(
    (a, b) => b.value - a.value,
  );

  const scoreCounts = SCORE_BUCKETS.map((bucket) => ({ label: bucket.label, value: 0 }));
  let noScoreCount = 0;
  for (const analysis of analyses) {
    const score = analysis.latest?.overallScore;
    if (score === null || score === undefined) {
      noScoreCount += 1;
      continue;
    }
    const bucketIndex = SCORE_BUCKETS.findIndex((b) => score >= b.min && score <= b.max);
    if (bucketIndex >= 0) scoreCounts[bucketIndex]!.value += 1;
  }
  const scoreData = noScoreCount > 0 ? [...scoreCounts, { label: "No score yet", value: noScoreCount }] : scoreCounts;

  const riskCounts = new Map<FlagCategory, number>();
  for (const flag of openFlags) {
    riskCounts.set(flag.category, (riskCounts.get(flag.category) ?? 0) + 1);
  }
  const riskData = Array.from(riskCounts, ([category, value]) => ({
    label: FLAG_CATEGORY_LABEL[category],
    value,
  }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_RISK_CATEGORIES);

  return (
    <div className="rounded-panel border border-hairline p-4">
      <h3 className="text-ui font-medium text-foreground">Patterns across your analyses</h3>
      <p className="mt-1 text-ui-sm text-mist">Derived from your own analyses, not external market data.</p>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h4 className="text-ui-sm font-medium text-foreground">Sector mix</h4>
          <BarChart data={sectorData} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <h4 className="text-ui-sm font-medium text-foreground">Score distribution</h4>
          <BarChart data={scoreData} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <h4 className="text-ui-sm font-medium text-foreground">Common risks</h4>
          {riskData.length === 0 ? (
            <p className="text-ui-sm text-mist">No open risks.</p>
          ) : (
            <BarChart data={riskData} />
          )}
        </div>
      </div>
    </div>
  );
}

export { MarketIntelligencePanel };
