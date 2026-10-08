"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

interface UseDuplicateAnalysisResult {
  duplicating: boolean;
  error: string | null;
  duplicate: () => Promise<void>;
}

/**
 * FR-INT-08: calls `POST /api/analyses/:id/duplicate` (T-6.13), which
 * copies the startup info, options and every parsed source into a fresh
 * draft analysis. Navigates straight to the new analysis's review step
 * (its sources are already copied over, so there's nothing left to add
 * before running) rather than `router.refresh()` — the duplicate is a
 * different entity, not an update to the row the user clicked from.
 */
export function useDuplicateAnalysis(analysisId: string): UseDuplicateAnalysisResult {
  const router = useRouter();
  const [duplicating, setDuplicating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const duplicate = React.useCallback(async () => {
    if (duplicating) return;
    setDuplicating(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/duplicate`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Couldn't duplicate this analysis. Try again.");
        setDuplicating(false);
        return;
      }
      const { analysis } = (await response.json()) as { analysis: { id: string } };
      router.push(`/app/analyses/${analysis.id}/setup?step=review`);
    } catch {
      setError("Couldn't duplicate this analysis. Check your connection and try again.");
      setDuplicating(false);
    }
  }, [analysisId, duplicating, router]);

  return { duplicating, error, duplicate };
}
