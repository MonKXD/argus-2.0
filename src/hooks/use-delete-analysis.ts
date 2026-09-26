"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

interface UseDeleteAnalysisResult {
  deleting: boolean;
  error: string | null;
  deleteAnalysis: () => Promise<void>;
}

/**
 * FR-SET-02: calls the real cascading `DELETE /api/analyses/:id` (T-3.12)
 * and returns to the dashboard on success. Split out of
 * `DeleteAnalysisButton` so this logic is unit-testable on its own — the
 * component itself wraps native `<dialog>`-based `Dialog` (DESIGN section
 * 12), which jsdom can't render (`showModal()` is unimplemented,
 * PROJECT_MEMORY's gotchas); its generic open/close mechanics are already
 * covered once, in Playwright, for every Dialog user.
 */
export function useDeleteAnalysis(analysisId: string): UseDeleteAnalysisResult {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const deleteAnalysis = React.useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Couldn't delete this analysis. Try again.");
        setDeleting(false);
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Couldn't delete this analysis. Check your connection and try again.");
      setDeleting(false);
    }
  }, [analysisId, router]);

  return { deleting, error, deleteAnalysis };
}
