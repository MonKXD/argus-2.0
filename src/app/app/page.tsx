import Link from "next/link";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { DemoBanner } from "@/components/argus/demo-banner";
import { NewAnalysisEmptyState } from "@/components/argus/new-analysis-empty-state";
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
  // APP_FLOW section 5.2: "Empty (no analyses): guided first-run panel with
  // the New analysis action and a link to the sample report." Never
  // triggers with the current demo fixture (always 4 analyses), but the
  // real condition once Phase 3 brings real per-user data.
  if (demoAnalyses.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <DemoBanner />
        <h1 className="font-serif text-h2 text-foreground">Dashboard</h1>
        <NewAnalysisEmptyState message="You haven't started an analysis yet." />
        <Link href="/sample" className="text-ui-sm text-mist hover:text-foreground hover:underline">
          See a sample report
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <DemoBanner />
      <h1 className="font-serif text-h2 text-foreground">Dashboard</h1>

      <KpiStrip analyses={demoAnalyses} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* min-w-0: grid items default to min-width: auto, which lets a wide
            table grow the whole page instead of scrolling within Table's
            own overflow-x-auto wrapper (the same footgun as flex items). */}
        <div className="flex min-w-0 flex-col gap-2">
          {/* APP_FLOW section 5.2: "analyses table (top 10 with link to
              all)". No cap applied here — the demo dataset only has 4 rows,
              so a slice(0, 10) would be a no-op; T-1.14's real
              /app/analyses is what the link goes to either way. */}
          <AnalysesTable analyses={demoAnalyses} />
          <Link
            href="/app/analyses"
            className="self-start text-ui-sm text-mist hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            View all analyses
          </Link>
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
