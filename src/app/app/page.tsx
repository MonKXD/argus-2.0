import { DemoBanner } from "@/components/argus/demo-banner";
import { AnalysesTable } from "@/components/dashboard/analyses-table";
import { InProgressPanel } from "@/components/dashboard/in-progress-panel";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { MarketIntelligencePanel } from "@/components/dashboard/market-intelligence-panel";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { demoAnalyses, demoRuns } from "@/demo";

// DESIGN section 5.2 / TRACKER T-1.13: KPI strip, analyses table (dominant
// element), in-progress and watchlist panels, market intelligence. Every
// module here runs on the demo dataset (D-014/R-DAT-08) — DemoBanner labels
// it per FR-LND-02's "clearly labelled fictional dataset" (the same rule
// FR-LND-02 states for landing/sample applies here in spirit; nothing in
// /app is backed by a real analysis until Phase 3). Recent activity isn't
// shown: there's no Activity data model yet (deliberately not pulled
// forward in T-1.08/D-026, and it's Phase 5 functionality) — showing a
// panel with nothing behind it would be worse than not showing one.
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <DemoBanner />
      <h1 className="font-serif text-h2 text-foreground">Dashboard</h1>

      <KpiStrip analyses={demoAnalyses} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* min-w-0: grid items default to min-width: auto, which lets a wide
            table grow the whole page instead of scrolling within Table's
            own overflow-x-auto wrapper (the same footgun as flex items). */}
        <div className="min-w-0">
          <AnalysesTable analyses={demoAnalyses} />
        </div>
        <div className="flex flex-col gap-6">
          <InProgressPanel analyses={demoAnalyses} runs={demoRuns} />
          <WatchlistPanel analyses={demoAnalyses} />
        </div>
      </div>

      <MarketIntelligencePanel analyses={demoAnalyses} />
    </div>
  );
}
