"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

interface UseSubmitFeedbackResult {
  submitting: boolean;
  submitted: boolean;
  error: string | null;
  submitFeedback: (message: string) => Promise<void>;
  reset: () => void;
}

/** T-6.11: no optimistic update to reconcile and nothing to re-fetch
 * (feedback has no in-app reader) — `submitted` just flips a success
 * state the dialog can show, matching `useGenerateComparisonNarrative`'s
 * plain fetch-then-local-state shape rather than `router.refresh()`. */
export function useSubmitFeedback(): UseSubmitFeedbackResult {
  const pathname = usePathname();
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submitFeedback = React.useCallback(
    async (message: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, page: pathname }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setError(body?.error?.message ?? "Couldn't send your feedback. Try again.");
          setSubmitting(false);
          return;
        }
        setSubmitted(true);
        setSubmitting(false);
      } catch {
        setError("Couldn't send your feedback. Check your connection and try again.");
        setSubmitting(false);
      }
    },
    [pathname],
  );

  const reset = React.useCallback(() => {
    setSubmitted(false);
    setError(null);
  }, []);

  return { submitting, submitted, error, submitFeedback, reset };
}
