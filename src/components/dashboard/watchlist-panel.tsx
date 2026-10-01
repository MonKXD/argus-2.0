import Link from "next/link";

import { EmptyState } from "@/components/argus/empty-state";
import type { Analysis } from "@/lib/schema/analysis";

// DESIGN section 5.2: "Watchlist" panel, right-column stack. FR-DSH-06's
// full panel (toggle, dedicated page) is now real (T-5.07): this dashboard
// module stays a compact preview of the owner's real isWatchlisted
// analyses, with a "View all" link to the full /app/watchlist table (which
// also carries the star toggle, FR-WCH-01, via the shared AnalysesTable).

interface WatchlistPanelProps {
  analyses: Analysis[];
}

function WatchlistPanel({ analyses }: WatchlistPanelProps) {
  const watchlisted = analyses.filter((a) => a.isWatchlisted);

  return (
    <div className="rounded-panel border border-hairline p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-ui font-medium text-foreground">Watchlist</h3>
        {watchlisted.length > 0 && (
          <Link
            href="/app/watchlist"
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            View all
          </Link>
        )}
      </div>
      {watchlisted.length === 0 ? (
        <EmptyState message="Nothing watchlisted yet." />
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {watchlisted.map((analysis) => (
            <li key={analysis.id} className="flex items-baseline justify-between gap-2 text-ui-sm">
              <Link
                href={`/app/analyses/${analysis.id}`}
                className="text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {analysis.startup.name}
              </Link>
              <span className="tabular-nums text-mist">{analysis.latest?.overallScore ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { WatchlistPanel };
