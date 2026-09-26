"use client";

import { EmptyState } from "@/components/argus/empty-state";
import { RunProgress } from "@/components/argus/run-progress";
import type { Analysis } from "@/lib/schema/analysis";

interface LiveAnalysis extends Analysis {
  currentRunId: string;
}

interface LiveInProgressPanelProps {
  analyses: LiveAnalysis[];
}

/**
 * T-3.09 built this against real data from the start (D-066); T-3.10 makes
 * it the dashboard's only "in progress" module, replacing the
 * demo-`InProgressPanel`/`demoRuns` pair it used to sit above (D-067) —
 * `RunProgress`'s own live Firestore listener replaces looking a static
 * `Run` up out of a passed-in array.
 */
function LiveInProgressPanel({ analyses }: LiveInProgressPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-panel border border-hairline p-4">
      <h3 className="text-ui font-medium text-foreground">In progress</h3>
      {analyses.length === 0 ? (
        <EmptyState message="Nothing is running right now." />
      ) : (
        analyses.map((analysis) => (
          <div key={analysis.id} className="flex flex-col gap-2">
            <span className="text-ui-sm text-foreground">{analysis.startup.name}</span>
            <RunProgress analysisId={analysis.id} runId={analysis.currentRunId} />
          </div>
        ))
      )}
    </div>
  );
}

export { LiveInProgressPanel };
