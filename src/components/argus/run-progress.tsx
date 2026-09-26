"use client";

import * as React from "react";

import { StepProgress } from "@/components/argus/step-progress";
import { Button } from "@/components/ui/button";
import { useRunProgress } from "@/hooks/use-run-progress";
import type { RunStatus, StepStatus } from "@/lib/schema/enums";
import type { StepState } from "@/lib/schema/run";
import { STEP_ORDER } from "@/lib/step-labels";

interface RunProgressProps {
  analysisId: string;
  runId: string;
}

const ACTIVE_STATUSES: RunStatus[] = ["QUEUED", "RUNNING"];

const STATUS_COPY: Record<RunStatus, string> = {
  QUEUED: "Queued to start.",
  RUNNING: "Analysing your sources.",
  SUCCEEDED: "Analysis complete.",
  PARTIAL: "Analysis complete. Some steps couldn't finish.",
  FAILED: "This run failed.",
  CANCELLED: "This run was cancelled.",
};

/**
 * The `Run` document only ever marks a step `DONE` once it finishes
 * (`run-pipeline.ts`'s `onProgress`) — nothing ever writes `RUNNING` for the
 * step currently executing, and `RESEARCH` never gets an `onProgress` call
 * at all (it isn't implemented in the pipeline yet, D-054). Both are
 * display-only gaps in an otherwise-accurate document, so they're patched
 * up for rendering here rather than by changing what gets written: while
 * the run is still active, the first `PENDING` step in execution order
 * reads as the one actually running; once the run reaches a terminal
 * status, any step still `PENDING` reads as `SKIPPED` rather than as
 * perpetually "not started yet".
 */
function deriveDisplaySteps(
  steps: Record<string, StepState>,
  runStatus: RunStatus,
): Record<string, { status: StepStatus }> {
  const active = ACTIVE_STATUSES.includes(runStatus);
  let runningAssigned = false;
  const display: Record<string, { status: StepStatus }> = {};
  for (const step of STEP_ORDER) {
    const state = steps[step];
    if (!state) continue;
    if (state.status !== "PENDING") {
      display[step] = { status: state.status };
      continue;
    }
    if (active && !runningAssigned) {
      display[step] = { status: "RUNNING" };
      runningAssigned = true;
    } else if (!active) {
      display[step] = { status: "SKIPPED" };
    } else {
      display[step] = { status: "PENDING" };
    }
  }
  return display;
}

/**
 * APP_FLOW 5.4: the live step list for a `PROCESSING` analysis, driven by
 * `useRunProgress`'s Firestore listener (D-010) — no polling, no dependence
 * on the request that started the run. Cancel posts to the already-built
 * `/runs/:runId/cancel` route (T-3.08); it's a no-op once the run is
 * terminal, so disabling it there is a UX nicety, not a correctness need.
 */
function RunProgress({ analysisId, runId }: RunProgressProps) {
  const { run, loading, error } = useRunProgress(analysisId, runId);
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/runs/${runId}/cancel`, {
        method: "POST",
      });
      if (!response.ok) {
        setCancelError("Couldn't cancel this run. Try again.");
      }
    } catch {
      setCancelError("Couldn't cancel this run. Check your connection and try again.");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <p className="text-ui-sm text-mist">Loading run progress…</p>;
  }

  if (error || !run) {
    return (
      <p role="alert" className="text-ui-sm text-destructive">
        {error ?? "This run could not be found."}
      </p>
    );
  }

  const isActive = ACTIVE_STATUSES.includes(run.status);

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-hairline p-4">
      <p className="text-ui-sm text-foreground">{STATUS_COPY[run.status]}</p>

      <StepProgress steps={deriveDisplaySteps(run.steps, run.status)} />

      {run.status === "FAILED" && run.error && (
        <p role="alert" className="text-ui-sm text-destructive">
          {run.error.message}
        </p>
      )}

      {isActive && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => void handleCancel()}
            disabled={cancelling || run.cancelRequested}
          >
            {run.cancelRequested ? "Cancelling…" : cancelling ? "Cancelling…" : "Cancel run"}
          </Button>
          <p className="text-ui-sm text-mist">
            You can leave this page — the run continues in the background.
          </p>
          {cancelError && (
            <p role="alert" className="text-ui-sm text-destructive">
              {cancelError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { RunProgress };
