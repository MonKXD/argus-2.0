import { STATUS_LABEL } from "@/components/argus/evidence-marker";
import { RELIABILITY_LABEL } from "@/components/argus/reliability-chip";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "@/lib/dimension-labels";
import type { ReportExportPayload } from "@/lib/export/report-export-data";
import { formatDate } from "@/lib/format";
import type { Claim } from "@/lib/schema/claims";
import { STAGE_LABEL } from "@/lib/stage-labels";

const NARRATIVE_SECTION_LABEL: Record<keyof ReportExportPayload["narrative"], string> = {
  executiveSummary: "Executive summary",
  investmentOverview: "Investment overview",
  marketTrends: "Market trends",
  marketGaps: "Market gaps",
  aiInsights: "AI insights",
};

interface PrintReportProps {
  payload: ReportExportPayload;
}

/**
 * FR-EXP-02 (print-optimised report for browser "Save as PDF"). Renders
 * from the same `ReportExportPayload` T-5.05's Markdown/JSON exporters
 * already build from, so the print view can't disagree with what those
 * exports say (FR-EXP-04's version/scoring-version/generated-time/
 * disclaimer/statuses/sources all come from one shared payload). Claims
 * render as plain bracketed status text (`[Verified] ...`), not through
 * `EvidenceMarker`'s SVG shapes — the marker's colour-coded fills would be
 * invisible on unprinted white paper (browsers omit background colours by
 * default, and this app's dark-theme text token is a near-white colour
 * meant for a dark background), and overriding its per-status fill/stroke
 * classes for print would need fighting SVG presentation-attribute
 * specificity per status. A text label is simpler, guaranteed legible, and
 * still satisfies R-UI-03 ("status never conveyed by colour alone") more
 * directly than shape alone would.
 */
function PrintReport({ payload }: PrintReportProps) {
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-1 border-b border-[color-mix(in_oklab,var(--ink)_25%,white)] pb-4">
        <p className="text-ui-sm">
          {STAGE_LABEL[payload.startup.stage]}
          {payload.startup.sector ? ` · ${payload.startup.sector}` : ""}
        </p>
        <h1 className="font-serif text-h1">{payload.startup.name}</h1>
        <p className="text-ui-sm">
          Report version {payload.version} · Scoring version {payload.scoringVersion} · Generated{" "}
          {formatDate(payload.generatedAt)}
        </p>
      </header>

      <section>
        <h2 className="font-serif text-h3">Investment score</h2>
        <p className="mt-2">
          {payload.overall.score != null
            ? `${payload.overall.score} / 100 (confidence ${payload.overall.confidence}, coverage ${payload.overall.coverage})`
            : `Not scored — insufficient evidence (coverage ${payload.overall.coverage})`}
        </p>
        {payload.overall.cap && (
          <p className="mt-1">
            Capped at {payload.overall.cap.value}: {payload.overall.cap.reason}
          </p>
        )}
      </section>

      {(Object.entries(NARRATIVE_SECTION_LABEL) as [keyof ReportExportPayload["narrative"], string][]).map(
        ([key, title]) => (
          <section key={key} className="break-inside-avoid">
            <h2 className="font-serif text-h3">{title}</h2>
            <ClaimList claims={payload.narrative[key]} />
          </section>
        ),
      )}

      {DIMENSION_ORDER.map((key) => {
        const dimension = payload.dimensions.find((d) => d.dimension === key);
        return (
          <section key={key} className="break-inside-avoid">
            <h2 className="font-serif text-h3">{DIMENSION_LABEL[key]}</h2>
            {!dimension ? (
              <p className="mt-2 italic">Not analysed.</p>
            ) : (
              <>
                <p className="mt-2">
                  {dimension.score != null
                    ? `Score: ${dimension.score} / 100 (confidence ${dimension.confidence})`
                    : "Not scored."}
                </p>
                <ClaimList claims={dimension.claims} />
              </>
            )}
          </section>
        );
      })}

      <section className="break-inside-avoid">
        <h2 className="font-serif text-h3">Risks and flags</h2>
        {payload.flags.length === 0 ? (
          <p className="mt-2 italic">No flags raised.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {payload.flags.map((flag) => (
              <li key={flag.id}>
                <strong>
                  [{flag.severity}, {flag.status}]
                </strong>{" "}
                {flag.title} — {flag.description}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="font-serif text-h3">Checklist</h2>
        {payload.checklist.length === 0 ? (
          <p className="mt-2 italic">No open checklist items.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {payload.checklist.map((item) => (
              <li key={item.id}>
                <strong>
                  [{item.priority}, {item.status}]
                </strong>{" "}
                {item.question}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="font-serif text-h3">Evidence and sources</h2>
        <p className="mt-2">
          {payload.evidenceStats.sources} source(s), {payload.evidenceStats.evidenceItems} evidence item(s),{" "}
          {payload.evidenceStats.facts} extracted fact(s).
        </p>
        {payload.sources.length === 0 ? (
          <p className="mt-2 italic">No sources recorded.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {payload.sources.map((source) => (
              <li key={source.title}>
                {source.title} ({source.type}, {RELIABILITY_LABEL[source.reliability]}, {source.status})
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-[color-mix(in_oklab,var(--ink)_25%,white)] pt-4 text-ui-sm">
        {payload.disclaimer}
      </footer>
    </article>
  );
}

function ClaimList({ claims }: { claims: Claim[] }) {
  if (claims.length === 0) return <p className="mt-2 italic">No claims.</p>;
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {claims.map((claim) => (
        <li key={claim.id}>
          <strong>[{STATUS_LABEL[claim.status]}]</strong> {claim.text}
          {claim.status === "VERIFIED" && (
            <span> — &ldquo;{claim.quotes.map((q) => q.quote).join('" / "')}&rdquo;</span>
          )}
          {claim.status === "ASSUMPTION" && <span> — assumption: {claim.assumption.statement}</span>}
          {claim.status === "MISSING" && <span> — needed: {claim.missing.whatIsNeeded}</span>}
        </li>
      ))}
    </ul>
  );
}

export { PrintReport };
