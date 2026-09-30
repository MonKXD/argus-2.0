import { sourceCount } from "@/components/argus/claim-inline";
import { EvidenceMarker } from "@/components/argus/evidence-marker";
import type { Claim } from "@/lib/schema/claims";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 6: "ClaimRow, ClaimInline | Marker in gutter or inline;
 * text; source count affordance; selecting opens the evidence rail."
 * R-UI-03: every claim renders through ClaimRow or ClaimInline with an
 * EvidenceMarker — this is the gutter variant, for the report page's
 * reading column (T-4.09), once that column exists to put a gutter in
 * (T-4.01). Unlike `ClaimInline`'s flex row (marker and text bound as one
 * inline unit, sized to its own content — right for prose sections and the
 * landing hero), `ClaimRow` is a full-width grid: the marker sits in a
 * fixed-width gutter column and the row's interactive/hover target spans
 * the whole reading-column width, not just the text's own measure.
 */

interface ClaimRowProps {
  claim: Claim;
  /** "Selecting opens the evidence rail." Omit to render non-interactively. */
  onSelect?: (claim: Claim) => void;
  selected?: boolean;
  className?: string;
}

function ClaimRow({ claim, onSelect, selected, className }: ClaimRowProps) {
  const count = sourceCount(claim);
  const content = (
    <>
      <EvidenceMarker status={claim.status} className="mt-1" />
      <span>
        {claim.text}
        {count > 0 && <span className="ml-1.5 text-mist">({count})</span>}
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <div className={cn("grid grid-cols-[1.5rem_1fr] items-start gap-x-2 text-left", className)}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(claim)}
      aria-pressed={selected}
      className={cn(
        "grid w-full grid-cols-[1.5rem_1fr] items-start gap-x-2 rounded-control p-1 text-left transition-colors hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected && "bg-panel-raised",
        className,
      )}
    >
      {content}
    </button>
  );
}

export { ClaimRow };
export type { ClaimRowProps };
