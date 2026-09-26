"use client";

import { useEffect, useState } from "react";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { EmptyState } from "@/components/argus/empty-state";
import { TableSkeleton } from "@/components/argus/table-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Analysis } from "@/lib/schema/analysis";

const ANALYSES_TABLE_COLUMNS = 6;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * FR-DSH-01/FR-DSH-04: full list, now backed by the real `GET
 * /api/analyses` (T-3.04/D-059 — search runs server-side, in memory over
 * one owner's own bounded analysis list) instead of filtering the demo
 * fixture (T-1.14). Sort-by-column already works client-side via
 * `AnalysesTable`'s `DataTable`; stage/sector/status filters are P1/Phase 5
 * per FR-DSH-04's own phase split, unchanged from T-1.14. The search box is
 * debounced against the server so typing doesn't fire one request per
 * keystroke (APP_FLOW section 6: skeleton while loading, a "no analyses
 * match" empty state, an inline error with Retry).
 */
export default function AnalysesListPage() {
  const [query, setQuery] = useState("");
  const [analyses, setAnalyses] = useState<Analysis[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch(`/api/analyses?q=${encodeURIComponent(query.trim())}`)
        .then((response) => {
          if (!response.ok) throw new Error("Couldn't load your analyses.");
          return response.json() as Promise<{ analyses: Analysis[] }>;
        })
        .then((body) => {
          if (cancelled) return;
          setAnalyses(body.analyses);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load your analyses. Try again.");
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, retryToken]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-serif text-h2 text-foreground">Analyses</h1>

      <div className="max-w-sm">
        <Label htmlFor="analyses-search">Search</Label>
        <Input
          id="analyses-search"
          type="search"
          placeholder="Search by name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1.5"
        />
      </div>

      {error ? (
        <EmptyState message={error} action={{ label: "Retry", onClick: () => setRetryToken((t) => t + 1) }} />
      ) : analyses === null ? (
        <TableSkeleton columns={ANALYSES_TABLE_COLUMNS} />
      ) : analyses.length === 0 ? (
        <EmptyState
          message={query ? `No analyses match "${query}".` : "No analyses yet."}
          action={query ? { label: "Clear search", onClick: () => setQuery("") } : undefined}
        />
      ) : (
        <AnalysesTable analyses={analyses} />
      )}
    </div>
  );
}
