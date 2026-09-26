import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RunProgress } from "@/components/argus/run-progress";
import { requireUser } from "@/lib/api/auth";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import type { AnalysisStatus } from "@/lib/schema/enums";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

const READY_COPY = "This analysis hasn't been run yet.";
const TERMINAL_COPY: Partial<Record<AnalysisStatus, string>> = {
  COMPLETE: "This analysis is complete. The full report page isn't built yet — check back soon.",
  PARTIAL: "This analysis finished with some steps that couldn't complete. The full report page isn't built yet — check back soon.",
  FAILED: "The last run of this analysis failed.",
};

/**
 * APP_FLOW 5.4/5.5: this route shows the processing view while `PROCESSING`
 * and the report once `COMPLETE`/`PARTIAL` — same URL, different content by
 * status. The report itself is Phase 4 (T-4.01 onward) and the interim
 * result summary is T-3.10's own task; this page's job (T-3.09) is only the
 * live processing view and a redirect target that actually exists for
 * "Start analysis" to land on, so every other status gets a plain, honest
 * placeholder rather than a page that goes nowhere (same reasoning as
 * D-029/D-060's disabled-with-a-reason controls, applied to a whole page).
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

  const copy =
    analysis.status === "READY" ? READY_COPY : (TERMINAL_COPY[analysis.status] ?? READY_COPY);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-6">
      <h1 className="font-serif text-h2 text-foreground">{analysis.startup.name}</h1>
      <p className="text-ui-sm text-mist">{copy}</p>
      <div className="flex gap-4">
        {(analysis.status === "READY" || analysis.status === "FAILED") && (
          <Link
            href={`/app/analyses/${id}/setup?step=review`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Go to review and run
          </Link>
        )}
        <Link href="/app" className="text-ui-sm text-mist hover:text-foreground hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
