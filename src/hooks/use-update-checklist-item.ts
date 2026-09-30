"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import type { ChecklistItem } from "@/lib/schema/claims";

interface UseUpdateChecklistItemResult {
  saving: boolean;
  error: string | null;
  updateItem: (patch: Partial<Pick<ChecklistItem, "status" | "userNote">>) => Promise<void>;
}

/**
 * T-4.12 (FR-RPT-21): calls `PATCH .../reports/:reportId/checklist/:itemId`.
 * No optimistic update — `router.refresh()` re-fetches the server-rendered
 * report (same pattern as `useResumeRun`), which is simpler than threading
 * a second, client-owned copy of `report.checklist` through `ReportShell`
 * that could drift from what's actually saved.
 */
export function useUpdateChecklistItem(
  analysisId: string,
  reportId: string,
  itemId: string,
): UseUpdateChecklistItemResult {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateItem = React.useCallback(
    async (patch: Partial<Pick<ChecklistItem, "status" | "userNote">>) => {
      setSaving(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/analyses/${analysisId}/reports/${reportId}/checklist/${itemId}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setError(body?.error?.message ?? "Couldn't save this checklist item. Try again.");
          setSaving(false);
          return;
        }
        router.refresh();
        setSaving(false);
      } catch {
        setError("Couldn't save this checklist item. Check your connection and try again.");
        setSaving(false);
      }
    },
    [analysisId, reportId, itemId, router],
  );

  return { saving, error, updateItem };
}
