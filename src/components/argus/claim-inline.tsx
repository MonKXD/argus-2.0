import { EvidenceMarker } from "@/components/argus/evidence-marker";
import type { Claim } from "@/lib/schema/claims";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 6: "ClaimRow, ClaimInline | Marker in gutter or inline;
 * text; source count affordance; selecting opens the evidence rail."
 * R-UI-03: every claim renders through ClaimRow or ClaimInline with an
 * EvidenceMarker — this is the inline variant (marker and text bound as one
 * flex unit, used in prose sections: the landing hero, `/sample`, and every
 * narrative/criteria list in `ReportShell` that isn't the reading column's
 * own claim rows). `ClaimRow` (`src/components/argus/claim-row.tsx`, a
 * full-width grid gutter) is the report page's own variant, T-4.09.
 *
 * Pulled forward from T-4.09 (D-031, PROJECT_MEMORY): the landing hero and
 * /sample need a real ClaimInline, not a mockup, per DESIGN section 5.6.
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
    return <span className={cn("flex items-start gap-2 text-left", className)}>{content}</span>;
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
