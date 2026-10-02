import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PrintButton } from "@/components/argus/print/print-button";
import { PrintReport } from "@/components/argus/print/print-report";
import { requireUser } from "@/lib/api/auth";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";
import { buildReportExportPayload } from "@/lib/export/report-export-data";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import { SourceRepo } from "@/lib/repos/source-repo";

interface PrintReportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reportId?: string }>;
}

/**
 * FR-EXP-02 (APP_FLOW's route table: "Print-optimised report | Auth, owner
 * | For browser 'Save as PDF'"). Outside `/app`'s layout deliberately — no
 * sidebar/topbar chrome belongs in a printed document — so this page does
 * its own `requireUser()`/ownership check, the same pattern `AppLayout`
 * itself uses. Prints the latest version by default; an optional
 * `?reportId=` selects a specific historical one (same `?version=` idea
 * `/app/analyses/[id]` already uses, T-4.11, but keyed by id since that's
 * what T-6.04's server PDF export already has on hand rather than a
 * version number) — added for T-6.04 (FR-EXP-03), whose server-rendered
 * PDF route navigates here internally and must render the exact report
 * version it was asked to export, not silently substitute the latest one.
 *
 * The `@media print` block below forces legible colours: this app is
 * dark-only on screen (D-012), so its text token is a near-white colour
 * meant for a dark background. `body`'s own dark background (globals.css)
 * is forced white here rather than left to the browser's own "omit
 * background graphics by default" print setting — that's a user-toggleable
 * preference (Chrome's print dialog has a "Background graphics" checkbox),
 * and a reader with it enabled would otherwise get near-black text on a
 * near-black background: confirmed by a real headless print-media render
 * during this task's own R-UI-12 check, which doesn't apply that
 * omission heuristic and so caught it directly. The override reuses the
 * existing `--ink` token (already dark, already defined) as the print text
 * colour rather than inventing a new one, scoped to `.print-page` only so
 * the rest of the app is unaffected (R-UI-02: tokens only, no new raw
 * colour).
 */
export default async function PrintReportPage({ params, searchParams }: PrintReportPageProps) {
  const { id } = await params;
  const { reportId } = await searchParams;
  const user = await requireUser().catch(() => redirect("/login"));

  const db = getAdminFirestore();
  const analysis = await new AnalysisRepo(db).get(id);
  if (!analysis || analysis.ownerId !== user.uid) notFound();

  const reportRepo = new ReportRepo(db);
  const versionHistory = await reportRepo.list(id);
  const report = reportId ? (versionHistory.find((r) => r.id === reportId) ?? null) : (versionHistory[0] ?? null);
  if (!report) notFound();

  const [dimensions, sources] = await Promise.all([
    reportRepo.listDimensions(id, report.id),
    new SourceRepo(db).list(id),
  ]);

  const payload = buildReportExportPayload({
    analysis,
    report,
    dimensions,
    sources,
    disclaimer: DISCLAIMER_TEXT,
  });

  return (
    <>
      <style>{`
        @page { margin: 1.5cm; }
        @media print {
          html, body {
            background: white !important;
          }
          .print-page, .print-page * {
            color: var(--ink) !important;
            background: transparent !important;
            border-color: color-mix(in oklab, var(--ink) 25%, white) !important;
          }
        }
      `}</style>
      <div className="print-page mx-auto flex max-w-[760px] flex-col gap-6 p-8">
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link href={`/app/analyses/${id}`} className="text-ui-sm text-mist hover:text-foreground hover:underline">
            Back to report
          </Link>
          <PrintButton />
        </div>
        <PrintReport payload={payload} />
      </div>
    </>
  );
}
