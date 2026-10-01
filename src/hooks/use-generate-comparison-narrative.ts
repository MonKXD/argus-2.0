"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

interface UseGenerateComparisonNarrativeResult {
  generating: boolean;
  error: string | null;
  generate: () => Promise<void>;
}

/**
 * FR-CMP-05 (P2): calls `POST /api/comparisons/:id/narrative` (T-5.04).
 * No optimistic update — on success, `router.refresh()` re-fetches the
 * server-rendered comparison page, same "server is the source of truth"
 * pattern as `useResumeRun`/`useUpdateChecklistItem`.
 */
export function useGenerateComparisonNarrative(comparisonId: string): UseGenerateComparisonNarrativeResult {
  const router = useRouter();
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generate = React.useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/comparisons/${comparisonId}/narrative`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Couldn't generate a narrative. Try again.");
        setGenerating(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't generate a narrative. Check your connection and try again.");
      setGenerating(false);
    }
  }, [comparisonId, router]);

  return { generating, error, generate };
}
