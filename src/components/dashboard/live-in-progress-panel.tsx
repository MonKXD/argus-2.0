"use client";

import { RunProgress } from "@/components/argus/run-progress";
import type { Analysis } from "@/lib/schema/analysis";

interface LiveAnalysis extends Analysis {
  currentRunId: string;
}

interface LiveInProgressPanelProps {
  analyses: LiveAnalysis[];
}

/**
 * T-3.09's real-data counterpart to the demo-driven `InProgressPanel`
 * (T-1.13/T-1.15) below it on the dashboard. Deliberately scoped to just
 * this one module rather than converting the whole dashboard: T-3.10 owns
 * "dashboard on real data" for the KPI strip, analyses table, watchlist and
 * market intelligence panel, all of which still read `demoAnalyses`. Mixing
 * one real, live module into that demo section would either misrepresent
 * real data as part of the labelled demo dataset or vice versa (R-UI-09),
 * so this renders as its own section above it, and only when the signed-in
 * user actually has a real analysis running — an always-empty duplicate of
 * the demo panel's own empty state would add nothing.
 */
function LiveInProgressPanel({ analyses }: LiveInProgressPanelProps) {
  if (analyses.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-hairline p-4">
      <h2 className="text-ui font-medium text-foreground">Running now</h2>
      {analyses.map((analysis) => (
        <div key={analysis.id} className="flex flex-col gap-2">
          <span className="text-ui-sm text-foreground">{analysis.startup.name}</span>
          <RunProgress analysisId={analysis.id} runId={analysis.currentRunId} />
        </div>
      ))}
    </div>
  );
}

export { LiveInProgressPanel };
