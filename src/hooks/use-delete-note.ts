"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

interface UseDeleteNoteResult {
  deleting: boolean;
  error: string | null;
  deleteNote: (noteId: string) => Promise<void>;
}

export function useDeleteNote(analysisId: string): UseDeleteNoteResult {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const deleteNote = React.useCallback(
    async (noteId: string) => {
      setDeleting(true);
      setError(null);
      try {
        const response = await fetch(`/api/analyses/${analysisId}/notes/${noteId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setError(body?.error?.message ?? "Couldn't remove this note. Try again.");
          setDeleting(false);
          return;
        }
        router.refresh();
        setDeleting(false);
      } catch {
        setError("Couldn't remove this note. Check your connection and try again.");
        setDeleting(false);
      }
    },
    [analysisId, router],
  );

  return { deleting, error, deleteNote };
}
