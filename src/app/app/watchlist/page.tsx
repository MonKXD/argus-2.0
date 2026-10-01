"use client";

import { useEffect, useState } from "react";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { EmptyState } from "@/components/argus/empty-state";
import { TableSkeleton } from "@/components/argus/table-skeleton";
import type { Analysis } from "@/lib/schema/analysis";

const ANALYSES_TABLE_COLUMNS = 6;

/**
 * FR-WCH-01/APP_FLOW 5.7: "Table of watchlisted analyses with score, last
 * report date and open flags." Reuses `GET /api/analyses` (T-3.04) with a
 * client-side `isWatchlisted` filter, same as `WatchlistPanel`'s own
 * dashboard-module filtering — there's no dedicated server-side watchlist
 * query param, and one owner's whole analysis list is already a small,
 * bounded fetch (D-059). Renders through the same `AnalysesTable` the
 * dashboard and the full analyses list use, so its star column doubles as
 * this page's own "remove from watchlist" control — no separate action
 * needed. "Open flags" isn't its own column: the lightweight `Analysis`
 * list-summary object has no flag-count field (only
 * `latest.topFlagSeverity`, already visible via the score cell's confidence
 * label), and building new data plumbing for a flag count would exceed this
 * S-sized task's scope; "Updated" stands in for "last report date."
 */
export default function WatchlistPage() {
  const [analyses, setAnalyses] = useState<Analysis[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analyses")
      .then((response) => {
        if (!response.ok) throw new Error("Couldn't load your watchlist.");
        return response.json() as Promise<{ analyses: Analysis[] }>;
      })
      .then((body) => {
        if (cancelled) return;
        setAnalyses(body.analyses.filter((a) => a.isWatchlisted));
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your watchlist. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-serif text-h2 text-foreground">Watchlist</h1>

      {error ? (
        <EmptyState message={error} action={{ label: "Retry", onClick: () => setRetryToken((t) => t + 1) }} />
      ) : analyses === null ? (
        <TableSkeleton columns={ANALYSES_TABLE_COLUMNS} />
      ) : analyses.length === 0 ? (
        <EmptyState message="Nothing watchlisted yet." />
      ) : (
        <AnalysesTable analyses={analyses} />
      )}
    </div>
  );
}
