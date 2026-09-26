import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteAnalysisButton } from "@/components/argus/delete-analysis-button";
import { ReportShell } from "@/components/argus/report/report-shell";
import { ResumeRunButton } from "@/components/argus/resume-run-button";
import { RunProgress } from "@/components/argus/run-progress";
import { requireUser } from "@/lib/api/auth";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { zodConverter } from "@/lib/repos/converter";
import { ReportRepo } from "@/lib/repos/report-repo";
import { Run } from "@/lib/schema/run";
import { failedStepLabels } from "@/lib/step-labels";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

async function loadRun(analysisId: string, runId: string): Promise<Run | null> {
  const snapshot = await getAdminFirestore()
    .collection("analyses")
    .doc(analysisId)
    .collection("runs")
    .doc(runId)
    .withConverter(zodConverter(Run))
    .get();
  return snapshot.data() ?? null;
}

/**
 * APP_FLOW 5.4/5.5: this route shows the processing view while `PROCESSING`
 * and the real report (T-4.01's `ReportShell`) once `COMPLETE`/`PARTIAL` —
 * same URL, different content by status. T-3.10's own "temporary result
 * summary" (score/confidence/date only, no claim detail) is now only the
 * defensive fallback for the case a report can't be loaded at all.
 *
 * T-3.13 (failure UX) wires "Resume"/"Retry" into the `PARTIAL`, `FAILED`
 * and cancelled-`READY` states via the already-built resume endpoint
 * (T-3.08/D-063: re-runs EXTRACT_FACTS onward on the same run, not a
 * literal per-step retry) — distinct from "Run again"/"Start a new run",
 * which goes through the wizard to create a brand-new run (APP_FLOW's own
 * lifecycle diagram draws both `resume` and `re-run` out of `PARTIAL`).
 */
export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  const user = await requireUser();

  const analysis = await new AnalysisRepo(getAdminFirestore()).get(id);
  if (!analysis || analysis.ownerId !== user.uid) notFound();

  if (analysis.status === "DRAFT") {
    redirect(`/app/analyses/${id}/setup`);
  }

  if (analysis.status === "PROCESSING" && analysis.currentRunId) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-ui-sm text-mist">Analysing</p>
          <h1 className="font-serif text-h2 text-foreground">{analysis.startup.name}</h1>
        </div>
        <RunProgress analysisId={analysis.id} runId={analysis.currentRunId} />
      </div>
    );
  }

  if (analysis.status === "COMPLETE" || analysis.status === "PARTIAL") {
    const reportRepo = new ReportRepo(getAdminFirestore());
    const report = analysis.latest ? await reportRepo.getReport(id, analysis.latest.reportId) : null;

    if (report) {
      const dimensions = await reportRepo.listDimensions(id, report.id);
      const run = analysis.status === "PARTIAL" && analysis.currentRunId ? await loadRun(id, analysis.currentRunId) : null;
      const failed = run ? failedStepLabels(run) : [];

      return (
        <ReportShell
          analysis={analysis}
          report={report}
          dimensions={dimensions}
          partialNotice={
            analysis.status === "PARTIAL" ? (
              <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-3 rounded-panel border border-hairline bg-panel p-4 text-ui-sm text-foreground">
                <p>
                  This report is partial.{" "}
                  {failed.length > 0 ? `Not analysed: ${failed.join(", ")}.` : "Some steps couldn't complete."}
                </p>
                {analysis.currentRunId && (
                  <ResumeRunButton analysisId={id} runId={analysis.currentRunId} label="Resume analysis" />
                )}
              </div>
            ) : undefined
          }
        />
      );
    }

    // Defensive fallback: `analysis.latest.reportId` names a report that
    // couldn't be loaded (should not happen in practice — the orchestrator
    // sets `latest` and saves the report in the same run, T-3.08).
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">
        <h1 className="font-serif text-h2 text-foreground">{analysis.startup.name}</h1>
        <p role="alert" className="text-ui-sm text-destructive">
          This analysis&rsquo;s report couldn&rsquo;t be loaded.
        </p>
        <Link href="/app" className="text-ui-sm text-mist hover:text-foreground hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (analysis.status === "FAILED") {
    const run = analysis.currentRunId ? await loadRun(id, analysis.currentRunId) : null;
    const reason = run?.error?.message ?? "The last run of this analysis failed.";

    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">
        <h1 className="font-serif text-h2 text-foreground">{analysis.startup.name}</h1>
        <p role="alert" className="text-ui-sm text-destructive">
          {reason}
        </p>

        {analysis.currentRunId && (
          <ResumeRunButton analysisId={id} runId={analysis.currentRunId} label="Retry analysis" />
        )}

        <div className="flex gap-4">
          <Link
            href={`/app/analyses/${id}/setup?step=sources`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Edit sources
          </Link>
          <Link href="/app" className="text-ui-sm text-mist hover:text-foreground hover:underline">
            Back to dashboard
          </Link>
          <DeleteAnalysisButton analysisId={id} startupName={analysis.startup.name} />
        </div>
      </div>
    );
  }

  const cancelledRun =
    analysis.status === "READY" && analysis.currentRunId ? await loadRun(id, analysis.currentRunId) : null;
  const resumable = cancelledRun?.status === "CANCELLED";

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">
      <h1 className="font-serif text-h2 text-foreground">{analysis.startup.name}</h1>
      <p className="text-ui-sm text-mist">
        {resumable ? "This analysis was cancelled partway through." : "This analysis hasn't been run yet."}
      </p>

      {resumable && analysis.currentRunId && (
        <ResumeRunButton analysisId={id} runId={analysis.currentRunId} label="Resume analysis" />
      )}

      <div className="flex gap-4">
        <Link
          href={`/app/analyses/${id}/setup?step=review`}
          className="text-ui-sm text-mist hover:text-foreground hover:underline"
        >
          {resumable ? "Start a new run instead" : "Go to review and run"}
        </Link>
        <Link href="/app" className="text-ui-sm text-mist hover:text-foreground hover:underline">
          Back to dashboard
        </Link>
        <DeleteAnalysisButton analysisId={id} startupName={analysis.startup.name} />
      </div>
    </div>
  );
}
