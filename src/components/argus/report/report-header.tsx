import Link from "next/link";

import { DeleteAnalysisButton } from "@/components/argus/delete-analysis-button";
import { formatDate } from "@/lib/format";
import type { Analysis } from "@/lib/schema/analysis";
import type { Report } from "@/lib/schema/report";
import { STAGE_LABEL } from "@/lib/stage-labels";

interface ReportHeaderProps {
  analysis: Analysis;
  report: Report;
}

/**
 * APP_FLOW 5.5's header row: "name, stage, sector, version, generated time
 * · Compare · Export · Watch · Re-run." Compare/Export/Watch are Phase 5/6
 * features (FR-CMP-*, FR-EXP-*, FR-DSH-06) that don't exist yet — omitted
 * rather than stubbed (D-060's "don't hide not-built-yet behind a flag").
 * "Re-run" reuses the already-built setup-wizard entry point. PRD section
 * 15's disclaimer belongs wherever a report is shown, so it sits here too.
 */
function ReportHeader({ analysis, report }: ReportHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-hairline pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-ui-sm text-mist">
            {[STAGE_LABEL[analysis.startup.stage], analysis.startup.sector].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-serif text-h1 text-foreground">{analysis.startup.name}</h1>
          <p className="text-ui-sm text-mist">
            Version {report.version} · Generated {formatDate(report.generatedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/app/analyses/${analysis.id}/setup?step=review`}
            className="text-ui-sm text-mist hover:text-foreground hover:underline"
          >
            Run again
          </Link>
          <Link href="/app" className="text-ui-sm text-mist hover:text-foreground hover:underline">
            Back to dashboard
          </Link>
          <DeleteAnalysisButton analysisId={analysis.id} startupName={analysis.startup.name} />
        </div>
      </div>

      <p className="max-w-[68ch] text-ui-sm text-mist">
        ARGUS AI is a research and intelligence tool. It does not provide investment, legal, tax or
        financial advice, and its outputs are not a substitute for professional due diligence. Verify
        all material facts independently.
      </p>
    </div>
  );
}

export { ReportHeader };
