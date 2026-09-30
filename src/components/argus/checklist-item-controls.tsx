"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateChecklistItem } from "@/hooks/use-update-checklist-item";
import type { ChecklistItem } from "@/lib/schema/claims";

const STATUS_LABEL: Record<ChecklistItem["status"], string> = {
  OPEN: "Open",
  REQUESTED: "Requested",
  RECEIVED: "Received",
  WAIVED: "Waived",
};
const STATUSES = Object.keys(STATUS_LABEL) as ChecklistItem["status"][];

interface ChecklistItemControlsProps {
  analysisId: string;
  reportId: string;
  item: ChecklistItem;
}

/**
 * FR-RPT-21: "checklist tracking (open, requested, received, waived) with
 * notes." The status `Select` auto-saves on change (matches
 * `ReportVersionSelector`'s own "select = act" pattern); the note is a
 * plain `Input` (no `Textarea` primitive exists anywhere in this codebase,
 * and DESIGN names none for this — a short note fits a single line), saved
 * explicitly so every keystroke doesn't fire a request. Both controls use
 * `aria-label` rather than a separate visible `<Label>` above, the same
 * established pattern as `ReportVersionSelector`/`ReportSectionNav`'s own
 * inline `Select`s — a full label row per checklist item would be heavier
 * than this compact, already-labelled-by-its-own-question list row needs.
 */
function ChecklistItemControls({ analysisId, reportId, item }: ChecklistItemControlsProps) {
  const { saving, error, updateItem } = useUpdateChecklistItem(analysisId, reportId, item.id);
  const [note, setNote] = React.useState(item.userNote ?? "");
  const noteDirty = note !== (item.userNote ?? "");

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Select
        value={item.status}
        onValueChange={(value) => void updateItem({ status: value as ChecklistItem["status"] })}
      >
        <SelectTrigger aria-label={`Status for "${item.question}"`} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        aria-label={`Note for "${item.question}"`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add a note"
        className="h-8 w-48"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={saving || !noteDirty}
        onClick={() => void updateItem({ userNote: note })}
      >
        {saving ? "Saving…" : "Save note"}
      </Button>
      {error && (
        <p role="alert" className="w-full text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { ChecklistItemControls };
