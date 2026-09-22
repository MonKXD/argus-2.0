"use client";

import { useState } from "react";

import { AnalysesTable } from "@/components/argus/analyses-table";
import { DemoBanner } from "@/components/argus/demo-banner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoAnalyses } from "@/demo";

// FR-DSH-04: "Search and sort (name, updated, score); filter by stage,
// sector, status, score range, tag." Sort is P0/Phase 1 (AnalysesTable's
// DataTable already sorts every column); search is P0/Phase 1, by name,
// client-side over the demo dataset here. Filters are P1/Phase 5 — not
// built yet, matching FR-DSH-04's own phase split.
export default function AnalysesListPage() {
  const [query, setQuery] = useState("");

  const filtered = demoAnalyses.filter((analysis) =>
    analysis.startup.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <DemoBanner />
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

      {filtered.length === 0 ? (
        <p className="text-ui-sm text-mist">No analyses match &ldquo;{query}&rdquo;.</p>
      ) : (
        <AnalysesTable analyses={filtered} />
      )}
    </div>
  );
}
