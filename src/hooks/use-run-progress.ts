"use client";

import { doc, onSnapshot } from "firebase/firestore";
import * as React from "react";

import { getFirebaseFirestore } from "@/lib/firebase/client";
import { Run } from "@/lib/schema/run";

interface UseRunProgressResult {
  run: Run | null;
  loading: boolean;
  error: string | null;
}

/**
 * D-010/D-018: run progress comes from the client's own Firestore listener
 * on `analyses/{id}/runs/{runId}`, not the request that started the run.
 * Firestore rules (T-3.03) already scope reads to the run's own owner, so
 * this never needs to pass or check `ownerId` itself. Every snapshot is
 * re-validated with `Run.safeParse` (R-COD-02: validate at every boundary,
 * including a Firestore read) rather than trusted as `Run` by cast.
 */
const INITIAL_STATE: UseRunProgressResult = { run: null, loading: true, error: null };

export function useRunProgress(analysisId: string, runId: string): UseRunProgressResult {
  const [state, setState] = React.useState<UseRunProgressResult>(INITIAL_STATE);

  React.useEffect(() => {
    // Deliberately doesn't reset to `INITIAL_STATE` here: `analysisId`/
    // `runId` come from the route and don't change without a remount, and
    // resetting synchronously in the effect body itself (rather than from
    // the listener's own callback) is exactly the cascading-render pattern
    // the react-hooks lint rule warns about.
    const ref = doc(getFirebaseFirestore(), "analyses", analysisId, "runs", runId);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setState({ run: null, loading: false, error: "This run could not be found." });
          return;
        }
        const parsed = Run.safeParse(snapshot.data());
        if (!parsed.success) {
          setState({ run: null, loading: false, error: "Couldn't read this run's progress." });
          return;
        }
        setState({ run: parsed.data, loading: false, error: null });
      },
      () => {
        setState({ run: null, loading: false, error: "Couldn't read this run's progress." });
      },
    );
    return unsubscribe;
  }, [analysisId, runId]);

  return state;
}
