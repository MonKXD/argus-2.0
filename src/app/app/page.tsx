import Link from "next/link";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { NewAnalysisEmptyState } from "@/components/argus/new-analysis-empty-state";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { LiveInProgressPanel } from "@/components/dashboard/live-in-progress-panel";
import { MarketIntelligencePanel } from "@/components/dashboard/market-intelligence-panel";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { requireUser } from "@/lib/api/auth";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import type { Analysis } from "@/lib/schema/analysis";

// DESIGN section 5.2 / TRACKER T-1.13/T-3.10: KPI strip, analyses table
// (dominant element), in-progress and watchlist panels, market
// intelligence — all on the signed-in user's own real analyses now
// (D-067). Recent activity isn't shown: there's no Activity data model yet
// (deliberately not pulled forward in T-1.08/D-026, and it's Phase 5
// functionality) — showing a panel with nothing behind it would be worse
// than not showing one.
export default async function DashboardPage() {
  const user = await requireUser();
  const analyses = await new AnalysisRepo(getAdminFirestore()).listByOwner(user.uid);
  const liveInProgress = analyses.filter(
    (a): a is Analysis & { currentRunId: string } => a.status === "PROCESSING" && a.currentRunId !== null,
  );

  // APP_FLOW section 5.2: "Empty (no analyses): guided first-run panel with
  // the New analysis action and a link to the sample report."
  if (analyses.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
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
      <h1 className="font-serif text-h2 text-foreground">Dashboard</h1>

      <KpiStrip analyses={analyses} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* min-w-0: grid items default to min-width: auto, which lets a wide
            table grow the whole page instead of scrolling within Table's
            own overflow-x-auto wrapper (the same footgun as flex items). */}
        <div className="flex min-w-0 flex-col gap-2">
          {/* APP_FLOW section 5.2: "analyses table (top 10 with link to
              all)". */}
          <AnalysesTable analyses={analyses.slice(0, 10)} />
          <Link
            href="/app/analyses"
            className="self-start text-ui-sm text-mist hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            View all analyses
          </Link>
        </div>
        <div className="flex flex-col gap-6">
          <LiveInProgressPanel analyses={liveInProgress} />
          <WatchlistPanel analyses={analyses} />
        </div>
      </div>

      <MarketIntelligencePanel analyses={analyses} />
    </div>
  );
}
