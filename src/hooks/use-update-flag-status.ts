"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import type { Flag } from "@/lib/schema/claims";

interface UseUpdateFlagStatusResult {
  updating: boolean;
  error: string | null;
  updateStatus: (status: Flag["status"]) => Promise<void>;
}

/** T-4.12 (FR-RPT-21): calls `PATCH .../reports/:reportId/flags/:flagId`.
 * Same `router.refresh()` pattern as `useUpdateChecklistItem`. */
export function useUpdateFlagStatus(
  analysisId: string,
  reportId: string,
  flagId: string,
): UseUpdateFlagStatusResult {
  const router = useRouter();
  const [updating, setUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateStatus = React.useCallback(
    async (status: Flag["status"]) => {
      setUpdating(true);
      setError(null);
      try {
        const response = await fetch(`/api/analyses/${analysisId}/reports/${reportId}/flags/${flagId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setError(body?.error?.message ?? "Couldn't update this flag. Try again.");
          setUpdating(false);
          return;
        }
        router.refresh();
        setUpdating(false);
      } catch {
        setError("Couldn't update this flag. Check your connection and try again.");
        setUpdating(false);
      }
    },
    [analysisId, reportId, flagId, router],
  );

  return { updating, error, updateStatus };
}
