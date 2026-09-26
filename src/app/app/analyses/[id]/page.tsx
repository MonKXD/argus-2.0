import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DeleteAnalysisButton } from "@/components/argus/delete-analysis-button";
import { ResumeRunButton } from "@/components/argus/resume-run-button";
import { RunProgress } from "@/components/argus/run-progress";
import { requireUser } from "@/lib/api/auth";
import { confidenceLabel } from "@/lib/confidence";
import { formatDate } from "@/lib/format";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { zodConverter } from "@/lib/repos/converter";
import { Run } from "@/lib/schema/run";
import { failedStepLabels } from "@/lib/step-labels";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

const STAGE_LABELS: Record<string, string> = {
  PRE_SEED: "Pre-seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B_PLUS: "Series B+",
};

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
 * and a report once `COMPLETE`/`PARTIAL` — same URL, different content by
 * status. The real report is Phase 4 (T-4.01 onward); this is T-3.10's
 * "temporary result summary": the numbers already on the `Analysis`
 * document (`latest`), no claim-level detail, honestly labelled as
 * temporary rather than presented as the finished report.
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
    const { latest } = analysis;
    const run = analysis.status === "PARTIAL" && analysis.currentRunId ? await loadRun(id, analysis.currentRunId) : null;
    const failed = run ? failedStepLabels(run) : [];

    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-ui-sm text-mist">
            {[STAGE_LABELS[analysis.startup.stage], analysis.startup.sector].filter(Boolean).join(" · ") ||
              undefined}
          </p>
          <h1 className="font-serif text-h2 text-foreground">{analysis.startup.name}</h1>
        </div>

        {analysis.status === "PARTIAL" && (
          <p className="rounded-panel border border-hairline bg-panel p-4 text-ui-sm text-foreground">
            This report is partial.{" "}
            {failed.length > 0
              ? `Not analysed: ${failed.join(", ")}.`
              : "Some steps couldn't complete."}{" "}
            The claims that were analysed are reflected in the numbers below.
          </p>
        )}

        {latest && (
          <div className="rounded-panel border border-hairline p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-ui-sm">
              <dt className="text-mist">Score</dt>
              <dd className="tabular-nums text-foreground">
                {latest.label === "INSUFFICIENT_EVIDENCE" || latest.overallScore === null
                  ? "Not enough evidence to score"
                  : latest.overallScore}
              </dd>
              <dt className="text-mist">Confidence</dt>
              <dd className="text-foreground">{confidenceLabel(latest.confidence)}</dd>
              <dt className="text-mist">Generated</dt>
              <dd className="text-foreground">{formatDate(latest.generatedAt)}</dd>
              {latest.topFlagSeverity && (
                <>
                  <dt className="text-mist">Open flag</dt>
                  <dd className="text-foreground">{latest.topFlagSeverity}</dd>
                </>
              )}
            </dl>
          </div>
        )}

        <p className="text-ui-sm text-mist">
          The full report page isn&rsquo;t built yet &mdash; this is a temporary summary. Check back
          soon for claim-by-claim evidence.
        </p>

        {analysis.status === "PARTIAL" && analysis.currentRunId && (
          <ResumeRunButton analysisId={id} runId={analysis.currentRunId} label="Resume analysis" />
        )}

        <div className="flex gap-4">
          <Link
            href={`/app/analyses/${id}/setup?step=review`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Start a new run
          </Link>
          <Link href="/app" className="text-ui-sm text-mist hover:text-foreground hover:underline">
            Back to dashboard
          </Link>
          <DeleteAnalysisButton analysisId={id} startupName={analysis.startup.name} />
        </div>
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
