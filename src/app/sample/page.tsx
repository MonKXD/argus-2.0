import { DemoBanner } from "@/components/argus/demo-banner";
import { ReportShell } from "@/components/argus/report/report-shell";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  demoDimensions,
  demoEvidence,
  demoFacts,
  demoReport,
  demoSources,
  loopwellAnalysis,
} from "@/demo";

/**
 * T-4.14: `/sample` now renders the real, full 16-section `ReportShell`
 * (T-4.01 through T-4.13) against the one fully-worked demo dataset
 * (Loopwell), rather than T-1.12's own hand-built two-section preview —
 * DESIGN 5.6's "built from the real... components... not a screenshot"
 * now applies to the whole report, not a subset. `DemoBanner` covers the
 * fictional-data labelling (R-UI-09); `ReportShell` itself needs no
 * `versions` prop (Loopwell has exactly one saved version, so the header
 * shows a plain version number with no selector, same as any real
 * single-version analysis).
 */
export default function SamplePage() {
  return (
    <>
      <SiteHeader />
      <DemoBanner />
      <ReportShell
        analysis={loopwellAnalysis}
        report={demoReport}
        dimensions={demoDimensions}
        sources={demoSources}
        evidence={demoEvidence}
        facts={demoFacts}
      />
      <SiteFooter />
    </>
  );
}
