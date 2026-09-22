import { ReliabilityChip } from "@/components/argus/reliability-chip";
import type { Claim } from "@/lib/schema/claims";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 6: "EvidenceRail and Sheet | 360px column on desktop;
 * bottom sheet on narrow screens. Shows quote in context, source, locator,
 * reliability, 'based on' list for inferences."
 *
 * Pulled forward from T-4.08 (D-031, PROJECT_MEMORY): the landing hero and
 * /sample need a real evidence rail, not a mockup. This is the content
 * renderer only — quote/source/locator/reliability/based-on, given already
 * -resolved data, no responsive column-vs-sheet chrome and no live
 * Firestore lookups. T-1.12 adds the interactive "selecting opens it" open
 * /close behaviour it actually exercises; T-4.08 adds the report page's
 * docked-column-vs-sheet positioning once there's a report page layout to
 * dock it in.
 */

function locatorLabel(locator: Evidence["locator"]): string | null {
  switch (locator.kind) {
    case "page":
      return locator.page !== undefined ? `page ${locator.page}` : null;
    case "paragraph":
      return locator.paragraph !== undefined ? `paragraph ${locator.paragraph}` : null;
    case "sheet":
      return locator.sheet ?? null;
    case "url":
      return null;
  }
}

interface EvidenceRailContentProps {
  claim: Claim;
  /** All evidence for the analysis, to resolve VERIFIED claims' quote.evidenceId. */
  evidence: Evidence[];
  /** All sources, to resolve evidence.sourceId to a title/reliability. */
  sources: Source[];
  /** All facts, to resolve AI_ANALYSIS claims' basedOn fact references. */
  facts?: Fact[];
  className?: string;
}

function EvidenceRailContent({
  claim,
  evidence,
  sources,
  facts = [],
  className,
}: EvidenceRailContentProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-body text-foreground">{claim.text}</p>

      {claim.status === "VERIFIED" &&
        claim.quotes.map((quote, i) => {
          const ev = evidence.find((e) => e.id === quote.evidenceId);
          const source = ev ? sources.find((s) => s.id === ev.sourceId) : undefined;
          const locator = ev ? locatorLabel(ev.locator) : null;
          return (
            <div key={i} className="flex flex-col gap-1.5 border-l-2 border-hairline-strong pl-3">
              <p className="font-serif text-prose text-foreground">&ldquo;{quote.quote}&rdquo;</p>
              <p className="text-ui-sm text-mist">
                {source?.title ?? "Unknown source"}
                {locator ? `, ${locator}` : ""}
              </p>
              {source && <ReliabilityChip reliability={source.reliability} />}
            </div>
          );
        })}

      {claim.status === "AI_ANALYSIS" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-ui-sm text-mist">Based on</span>
          <ul className="flex flex-col gap-1">
            {claim.basedOn.map((refId) => {
              const fact = facts.find((f) => f.id === refId);
              return (
                <li key={refId} className="text-ui-sm text-foreground">
                  {fact ? fact.statement : "Related evidence elsewhere in this report"}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {claim.status === "ASSUMPTION" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-ui-sm text-mist">{claim.assumption.statement}</p>
          <p className="text-ui-sm text-mist">Would confirm: {claim.assumption.wouldConfirm}</p>
        </div>
      )}

      {claim.status === "MISSING" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-ui-sm text-mist">Needed: {claim.missing.whatIsNeeded}</p>
          <p className="text-ui-sm text-mist">Suggested source: {claim.missing.suggestedSource}</p>
        </div>
      )}
    </div>
  );
}

export { EvidenceRailContent };
export type { EvidenceRailContentProps };
