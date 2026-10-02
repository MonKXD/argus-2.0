import Link from "next/link";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { NewAnalysisEmptyState } from "@/components/argus/new-analysis-empty-state";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { LiveInProgressPanel } from "@/components/dashboard/live-in-progress-panel";
import { MarketIntelligencePanel } from "@/components/dashboard/market-intelligence-panel";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { requireUser } from "@/lib/api/auth";
import { ActivityRepo } from "@/lib/repos/activity-repo";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import type { Analysis } from "@/lib/schema/analysis";
import type { Flag } from "@/lib/schema/claims";

// DESIGN section 5.2 / TRACKER T-1.13/T-3.10/T-5.08/T-5.09: KPI strip,
// analyses table (dominant element), in-progress, watchlist and
// recent-activity panels, market intelligence (sector mix, score
// distribution, common risks) — all on the signed-in user's own real data
// (D-067, D-088's Activity feed, D-090's score-distribution/common-risks).
export default async function DashboardPage() {
  const user = await requireUser();
  const db = getAdminFirestore();
  const [analyses, activity] = await Promise.all([
    new AnalysisRepo(db).listByOwner(user.uid),
    new ActivityRepo(db).listByOwner(user.uid),
  ]);
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

  // FR-DSH-08's "common risks": each completed analysis's latest report's
  // own OPEN flags (a dismissed/acknowledged flag isn't a live risk any
  // more — the same reading `run-pipeline.ts` already uses for
  // `Analysis.latest.topFlagSeverity`). One owner's own analyses are
  // already a small, bounded set (D-059), so one extra Report read per
  // completed analysis is the same trade-off the report export route and
  // the comparison creator already make.
  const reportRepo = new ReportRepo(db);
  const openFlags: Flag[] = (
    await Promise.all(
      analyses
        .filter((a) => a.latest !== null)
        .map((a) => reportRepo.getReport(a.id, a.latest!.reportId)),
    )
  ).flatMap((report) => report?.flags.filter((flag) => flag.status === "OPEN") ?? []);

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
          <RecentActivityPanel activity={activity} />
        </div>
      </div>

      <MarketIntelligencePanel analyses={analyses} openFlags={openFlags} />
    </div>
  );
}
