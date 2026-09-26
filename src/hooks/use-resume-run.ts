"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

interface UseResumeRunResult {
  resuming: boolean;
  error: string | null;
  resumeRun: () => Promise<void>;
}

/**
 * T-3.13 (failure UX): calls the already-built `POST
 * .../runs/:runId/resume` (T-3.08 — re-runs EXTRACT_FACTS onward on the
 * same run document, TRD section 7/D-063). No navigation on success: the
 * resumed run keeps the same `runId` on `/app/analyses/[id]`, and the
 * analysis's own status flips to `PROCESSING` server-side, so a plain
 * `router.refresh()` is enough for that page's next render to pick up the
 * live `RunProgress` view itself.
 */
export function useResumeRun(analysisId: string, runId: string): UseResumeRunResult {
  const router = useRouter();
  const [resuming, setResuming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resumeRun = React.useCallback(async () => {
    setResuming(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/runs/${runId}/resume`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Couldn't resume this analysis. Try again.");
        setResuming(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't resume this analysis. Check your connection and try again.");
      setResuming(false);
    }
  }, [analysisId, runId, router]);

  return { resuming, error, resumeRun };
}
