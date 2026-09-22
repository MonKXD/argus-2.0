import { EvidenceMarker } from "@/components/argus/evidence-marker";
import type { Claim } from "@/lib/schema/claims";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 6: "ClaimRow, ClaimInline | Marker in gutter or inline;
 * text; source count affordance; selecting opens the evidence rail."
 * R-UI-03: every claim renders through ClaimRow or ClaimInline with an
 * EvidenceMarker — this is the inline variant (marker before the sentence,
 * used in prose sections). ClaimRow (marker in a gutter, for the report
 * page's reading column) is T-4.09's job, once the report page exists to
 * put a gutter in.
 *
 * Pulled forward from T-4.09 (D-031, PROJECT_MEMORY): the landing hero and
 * /sample need a real ClaimInline, not a mockup, per DESIGN section 5.6.
 * T-4.09 extends this with the report page's status filter, not a rewrite.
 */

function sourceCount(claim: Claim): number {
  switch (claim.status) {
    case "VERIFIED":
      return claim.quotes.length;
    case "AI_ANALYSIS":
      return claim.basedOn.length;
    case "ASSUMPTION":
    case "MISSING":
      return 0;
  }
}

interface ClaimInlineProps {
  claim: Claim;
  /** "Selecting opens the evidence rail." Omit to render non-interactively (e.g. the landing hero's animated sequence). */
  onSelect?: (claim: Claim) => void;
  selected?: boolean;
  className?: string;
}

function ClaimInline({ claim, onSelect, selected, className }: ClaimInlineProps) {
  const count = sourceCount(claim);
  const content = (
    <>
      <EvidenceMarker status={claim.status} className="mt-1 shrink-0" />
      <span>
        {claim.text}
        {count > 0 && <span className="ml-1.5 text-mist">({count})</span>}
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <span className={cn("flex items-start gap-2 text-left", className)}>{content}</span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(claim)}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-2 rounded-control text-left transition-colors hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected && "bg-panel-raised",
        className,
      )}
    >
      {content}
    </button>
  );
}

export { ClaimInline, sourceCount };
export type { ClaimInlineProps };
