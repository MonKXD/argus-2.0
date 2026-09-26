"use client";

import { Button } from "@/components/ui/button";
import { useResumeRun } from "@/hooks/use-resume-run";

interface ResumeRunButtonProps {
  analysisId: string;
  runId: string;
  label: string;
}

/** T-3.13: resumes a FAILED/PARTIAL/CANCELLED run in place (same run
 * document — TRD section 7/D-063), no confirmation needed since resuming
 * isn't destructive the way deleting is. */
function ResumeRunButton({ analysisId, runId, label }: ResumeRunButtonProps) {
  const { resuming, error, resumeRun } = useResumeRun(analysisId, runId);

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={() => void resumeRun()} disabled={resuming}>
        {resuming ? "Resuming…" : label}
      </Button>
      {error && (
        <p role="alert" className="text-ui-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { ResumeRunButton };
