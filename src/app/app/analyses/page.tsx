"use client";

import { useEffect, useState } from "react";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { EmptyState } from "@/components/argus/empty-state";
import { FilterBar, type AnalysesFilters } from "@/components/argus/filter-bar";
import { TableSkeleton } from "@/components/argus/table-skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Analysis } from "@/lib/schema/analysis";

const ANALYSES_TABLE_COLUMNS = 6;
const SEARCH_DEBOUNCE_MS = 250;

function buildQueryString(query: string, filters: AnalysesFilters): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.status) params.set("status", filters.status);
  if (filters.sector) params.set("sector", filters.sector);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.scoreMin) params.set("scoreMin", filters.scoreMin);
  if (filters.scoreMax) params.set("scoreMax", filters.scoreMax);
  return params.toString();
}

function hasAnyFilter(query: string, filters: AnalysesFilters): boolean {
  return (
    query.trim().length > 0 ||
    filters.stage !== undefined ||
    filters.status !== undefined ||
    !!filters.sector ||
    !!filters.tag ||
    !!filters.scoreMin ||
    !!filters.scoreMax
  );
}

/**
 * FR-DSH-01/FR-DSH-04: full list, now backed by the real `GET
 * /api/analyses` (T-3.04/D-059 — search and filtering both run
 * server-side, in memory over one owner's own bounded analysis list)
 * instead of filtering the demo fixture (T-1.14). Sort-by-column already
 * works client-side via `AnalysesTable`'s `DataTable`; stage/sector/status/
 * score-range/tag filters (T-5.10) are driven by `FilterBar`, debounced
 * together with the search box against the same server request so neither
 * fires its own separate round-trip (APP_FLOW section 6: skeleton while
 * loading, a "no analyses match" empty state, an inline error with Retry).
 */
export default function AnalysesListPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<AnalysesFilters>({});
  const [analyses, setAnalyses] = useState<Analysis[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch(`/api/analyses?${buildQueryString(query, filters)}`)
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
  }, [query, filters, retryToken]);

  const anyFilterActive = hasAnyFilter(query, filters);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-serif text-h2 text-foreground">Analyses</h1>

      <div className="flex flex-col gap-4">
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
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {error ? (
        <EmptyState message={error} action={{ label: "Retry", onClick: () => setRetryToken((t) => t + 1) }} />
      ) : analyses === null ? (
        <TableSkeleton columns={ANALYSES_TABLE_COLUMNS} />
      ) : analyses.length === 0 ? (
        <EmptyState
          message={anyFilterActive ? "No analyses match these filters." : "No analyses yet."}
          action={
            anyFilterActive
              ? {
                  label: "Clear filters",
                  onClick: () => {
                    setQuery("");
                    setFilters({});
                  },
                }
              : undefined
          }
        />
      ) : (
        <AnalysesTable analyses={analyses} />
      )}
    </div>
  );
}
