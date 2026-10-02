"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANALYSIS_STATUS_LABEL } from "@/lib/analysis-status-labels";
import type { AnalysisStatus, Stage } from "@/lib/schema/enums";
import { STAGE_LABEL } from "@/lib/stage-labels";

// FR-DSH-04: "filter by stage, sector, status, score range, tag" (P1,
// Phase 5 — sort/search already shipped at T-1.14/T-3.04). Radix `Select`
// rejects an item with value="" (it's reserved to mean "no selection
// made"), so stage/status each use an "ALL" sentinel mapped back to
// `undefined` at the boundary, rather than a controlled empty string.

interface AnalysesFilters {
  stage?: Stage;
  status?: AnalysisStatus;
  sector?: string;
  tag?: string;
  scoreMin?: string;
  scoreMax?: string;
}

const ALL = "ALL";

interface FilterBarProps {
  filters: AnalysesFilters;
  onChange: (filters: AnalysesFilters) => void;
}

function FilterBar({ filters, onChange }: FilterBarProps) {
  const hasActiveFilters =
    filters.stage !== undefined ||
    filters.status !== undefined ||
    !!filters.sector ||
    !!filters.tag ||
    !!filters.scoreMin ||
    !!filters.scoreMax;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-stage">Stage</Label>
        <Select
          value={filters.stage ?? ALL}
          onValueChange={(value) => onChange({ ...filters, stage: value === ALL ? undefined : (value as Stage) })}
        >
          <SelectTrigger id="filter-stage" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {Object.entries(STAGE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) =>
            onChange({ ...filters, status: value === ALL ? undefined : (value as AnalysisStatus) })
          }
        >
          <SelectTrigger id="filter-status" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.entries(ANALYSIS_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-sector">Sector</Label>
        <Input
          id="filter-sector"
          placeholder="Any sector"
          value={filters.sector ?? ""}
          onChange={(event) => onChange({ ...filters, sector: event.target.value || undefined })}
          className="w-[160px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-tag">Tag</Label>
        <Input
          id="filter-tag"
          placeholder="Any tag"
          value={filters.tag ?? ""}
          onChange={(event) => onChange({ ...filters, tag: event.target.value || undefined })}
          className="w-[140px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-score-min">Score</Label>
        <div className="flex items-center gap-2">
          <Input
            id="filter-score-min"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            placeholder="Min"
            aria-label="Minimum score"
            value={filters.scoreMin ?? ""}
            onChange={(event) => onChange({ ...filters, scoreMin: event.target.value || undefined })}
            className="w-[76px]"
          />
          <span className="text-mist" aria-hidden="true">
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            placeholder="Max"
            aria-label="Maximum score"
            value={filters.scoreMax ?? ""}
            onChange={(event) => onChange({ ...filters, scoreMax: event.target.value || undefined })}
            className="w-[76px]"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange({})}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

export { FilterBar };
export type { AnalysesFilters };
