import { StepProgress } from "@/components/argus/step-progress";
import type { Analysis } from "@/lib/schema/analysis";
import type { Run } from "@/lib/schema/run";

// DESIGN section 5.2: "In progress (4 cols): step list, progress."
// FR-DSH-03 (live step progress) is Phase 3 — this shows the same
// StepProgress component against a static demo run's steps.

interface InProgressPanelProps {
  analyses: Analysis[];
  runs: Run[];
}

function InProgressPanel({ analyses, runs }: InProgressPanelProps) {
  const inProgress = analyses.filter((a) => a.status === "PROCESSING");

  if (inProgress.length === 0) {
    return (
      <div className="rounded-panel border border-hairline p-4">
        <h3 className="text-ui font-medium text-foreground">In progress</h3>
        <p className="mt-2 text-ui-sm text-mist">Nothing is running right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-hairline p-4">
      <h3 className="text-ui font-medium text-foreground">In progress</h3>
      {inProgress.map((analysis) => {
        const run = runs.find((r) => r.id === analysis.currentRunId);
        return (
          <div key={analysis.id} className="flex flex-col gap-2">
            <span className="text-ui-sm text-foreground">{analysis.startup.name}</span>
            {run && <StepProgress steps={run.steps} />}
          </div>
        );
      })}
    </div>
  );
}

export { InProgressPanel };
