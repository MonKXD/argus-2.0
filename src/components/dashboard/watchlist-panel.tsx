import Link from "next/link";

import type { Analysis } from "@/lib/schema/analysis";

// DESIGN section 5.2: "Watchlist" panel, right-column stack.
// FR-DSH-06 (toggle watchlist, full panel) is Phase 5 — this shows the
// demo dataset's isWatchlisted analyses read-only.

interface WatchlistPanelProps {
  analyses: Analysis[];
}

function WatchlistPanel({ analyses }: WatchlistPanelProps) {
  const watchlisted = analyses.filter((a) => a.isWatchlisted);

  return (
    <div className="rounded-panel border border-hairline p-4">
      <h3 className="text-ui font-medium text-foreground">Watchlist</h3>
      {watchlisted.length === 0 ? (
        <p className="mt-2 text-ui-sm text-mist">Nothing watchlisted yet.</p>
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
