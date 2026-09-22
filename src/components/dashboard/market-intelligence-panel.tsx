import { BarChart } from "@/components/charts/bar-chart";
import type { Analysis } from "@/lib/schema/analysis";

// DESIGN section 5.2: "Patterns across your analyses (derived): sector mix |
// score distribution | common risks." FR-DSH-08 says this must be "clearly
// labelled as derived, not external market data." Score distribution and
// common risks need evidenceStats/Flag data this demo set only has for one
// analysis (Loopwell), so this panel is sector mix only for now — narrower
// than the full spec, not faked from insufficient data.

interface MarketIntelligencePanelProps {
  analyses: Analysis[];
}

function MarketIntelligencePanel({ analyses }: MarketIntelligencePanelProps) {
  const counts = new Map<string, number>();
  for (const analysis of analyses) {
    const sector = analysis.startup.sector ?? "Unspecified";
    counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }
  const data = Array.from(counts, ([label, value]) => ({ label, value })).sort(
    (a, b) => b.value - a.value,
  );

  return (
    <div className="rounded-panel border border-hairline p-4">
      <h3 className="text-ui font-medium text-foreground">Sector mix</h3>
      <p className="mt-1 text-ui-sm text-mist">Derived from your analyses.</p>
      <div className="mt-4 max-w-sm">
        <BarChart data={data} />
      </div>
    </div>
  );
}

export { MarketIntelligencePanel };
