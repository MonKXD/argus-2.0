import Link from "next/link";

import { DeleteAnalysisButton } from "@/components/argus/delete-analysis-button";
import {
  ReportVersionSelector,
  type ReportVersionSummary,
} from "@/components/argus/report/report-version-selector";
import { WatchlistToggleButton } from "@/components/argus/watchlist-toggle-button";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { formatDate } from "@/lib/format";
import type { Analysis } from "@/lib/schema/analysis";
import type { Report } from "@/lib/schema/report";
import { STAGE_LABEL } from "@/lib/stage-labels";

interface ReportHeaderProps {
  analysis: Analysis;
  report: Report;
  /** Every saved version of this report, newest first (T-4.11, FR-RPT-19).
   * Omitted entirely = old behaviour (no selector, no history), so no
   * existing caller or test breaks — same optional-prop pattern as
   * `sources`/`evidence`/`facts` (D-074/D-075). */
  versions?: ReportVersionSummary[];
}

/**
 * APP_FLOW 5.5's header row: "name, stage, sector, version, generated time
 * · Compare · Export · Watch · Re-run." Export, print and watch are now
 * real (T-5.05/T-5.06/T-5.07): Export Markdown/JSON are plain `<a href>`
 * downloads via `GET .../reports/:reportId/export?format=`, no client JS;
 * "Print or save as PDF" opens `/print/report/:id` in a new tab;
 * `WatchlistToggleButton` is the same star control `AnalysesTable` uses
 * (FR-WCH-01: "toggle watchlist on any analysis" — this is the per-report
 * entry point for that, not just the dashboard table's). Compare is still
 * a Phase 5 feature that doesn't exist yet on this page — omitted rather
 * than stubbed (D-060's "don't hide not-built-yet behind a flag"). "Run
 * again" and "Add sources" (T-5.11, FR-INT-07) both reuse the already-built
 * setup-wizard entry point — neither `POST /sources` nor `POST /runs` gates
 * on analysis status, and `run-pipeline.ts` already versions every run
 * (`version = (analysis.latest?.version ?? 0) + 1`, D-063), so the only real
 * gap was a direct path to the Sources step: "Run again" jumps to
 * `?step=review` (same sources, re-run now); "Add sources" jumps to
 * `?step=sources` so a user doesn't have to Back through Review and Options
 * to reach it. PRD section 15's disclaimer belongs wherever a report is
 * shown, so it sits here too.
 */
function ReportHeader({ analysis, report, versions = [] }: ReportHeaderProps) {
  const latestVersion = versions[0]?.version ?? report.version;
  const isHistorical = report.version !== latestVersion;

  return (
    <div className="flex flex-col gap-4 border-b border-hairline pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-ui-sm text-mist">
            {[STAGE_LABEL[analysis.startup.stage], analysis.startup.sector].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-serif text-h1 text-foreground">{analysis.startup.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {versions.length > 1 ? (
              <ReportVersionSelector
                analysisId={analysis.id}
                versions={versions}
                currentVersion={report.version}
              />
            ) : (
              <p className="text-ui-sm text-mist">Version {report.version}</p>
            )}
            <p className="text-ui-sm text-mist">Generated {formatDate(report.generatedAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={`/api/analyses/${analysis.id}/reports/${report.id}/export?format=md`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Export Markdown
          </a>
          <a
            href={`/api/analyses/${analysis.id}/reports/${report.id}/export?format=json`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Export JSON
          </a>
          <Link
            href={`/print/report/${analysis.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Print or save as PDF
          </Link>
          <Link
            href={`/app/analyses/${analysis.id}/setup?step=sources`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Add sources
          </Link>
          <Link
            href={`/app/analyses/${analysis.id}/setup?step=review`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Run again
          </Link>
          <Link href="/app" className="text-ui-sm text-mist hover:text-foreground hover:underline">
            Back to dashboard
          </Link>
          <WatchlistToggleButton analysisId={analysis.id} isWatchlisted={analysis.isWatchlisted} />
          <DeleteAnalysisButton analysisId={analysis.id} startupName={analysis.startup.name} />
        </div>
      </div>

      {isHistorical && (
        <p className="rounded-panel border border-hairline bg-panel p-3 text-ui-sm text-foreground">
          You&rsquo;re viewing version {report.version}, a read-only historical report.{" "}
          <Link
            href={`/app/analyses/${analysis.id}`}
            className="text-mist underline hover:text-foreground"
          >
            View the latest version
          </Link>
          .
        </p>
      )}

      <p className="max-w-[68ch] text-ui-sm text-mist">{DISCLAIMER_TEXT}</p>
    </div>
  );
}

export { ReportHeader };
