"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

interface UseAddNoteResult {
  adding: boolean;
  error: string | null;
  addNote: (sectionKey: string, text: string) => Promise<void>;
}

/** FR-RPT-20: `POST /api/analyses/:id/notes`. Same no-optimistic-update,
 * `router.refresh()`-on-success shape as `useUpdateChecklistItem` — notes
 * are read back and rendered on the same page, unlike feedback. */
export function useAddNote(analysisId: string): UseAddNoteResult {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const addNote = React.useCallback(
    async (sectionKey: string, text: string) => {
      setAdding(true);
      setError(null);
      try {
        const response = await fetch(`/api/analyses/${analysisId}/notes`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sectionKey, text }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setError(body?.error?.message ?? "Couldn't save your note. Try again.");
          setAdding(false);
          return;
        }
        router.refresh();
        setAdding(false);
      } catch {
        setError("Couldn't save your note. Check your connection and try again.");
        setAdding(false);
      }
    },
    [analysisId, router],
  );

  return { adding, error, addNote };
}
