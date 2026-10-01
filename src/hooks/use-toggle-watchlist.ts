"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

interface UseToggleWatchlistResult {
  toggling: boolean;
  error: string | null;
  toggle: () => Promise<void>;
}

/**
 * FR-WCH-01: calls the already-built `PATCH /api/analyses/:id`
 * (`isWatchlisted` has accepted this field since T-3.04 — this task is the
 * first real UI caller). Same no-optimistic-update, `router.refresh()`
 * shape as every other toggle-style action in this app
 * (`useResumeRun`/`useUpdateChecklistItem`/`useGenerateComparisonNarrative`)
 * — the server-rendered page is re-fetched rather than threading a second,
 * client-owned copy of `isWatchlisted` that could drift from what's saved.
 */
export function useToggleWatchlist(analysisId: string, nextValue: boolean): UseToggleWatchlistResult {
  const router = useRouter();
  const [toggling, setToggling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggle = React.useCallback(async () => {
    setToggling(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isWatchlisted: nextValue }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Couldn't update the watchlist. Try again.");
        setToggling(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't update the watchlist. Check your connection and try again.");
      setToggling(false);
    }
  }, [analysisId, nextValue, router]);

  return { toggling, error, toggle };
}
