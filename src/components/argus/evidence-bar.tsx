import { StatusBadge } from "@/components/argus/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ClaimStatus } from "@/lib/schema/enums";
import { cn } from "@/lib/utils";

import type { CSSProperties } from "react";

// DESIGN section 6: "EvidenceBar | 6 px tall; segments sized by count using
// the four textures; minimum segment 2 px; role="img" with a text
// alternative listing counts; hover or focus shows a legend." FR-RPT-18:
// one per section header, summarising that section's claim composition.

const STATUS_ORDER: ClaimStatus[] = ["VERIFIED", "AI_ANALYSIS", "ASSUMPTION", "MISSING"];

const SEGMENT_CLASS: Record<ClaimStatus, string> = {
  VERIFIED: "bg-verified",
  AI_ANALYSIS: "bg-analysis/40 border-x border-analysis",
  ASSUMPTION: "border-x border-assumption",
  // A faint fill alone was indistinguishable from the empty track past the
  // last segment; a visible border (matching the marker's "empty, dashed
  // border" language) is what actually reads at 6px tall.
  MISSING: "border border-hairline-strong",
};

// Assumption's diagonal hatch (matching EvidenceMarker) as a repeating
// gradient — there's no Tailwind utility for repeating-linear-gradient.
const ASSUMPTION_HATCH: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, var(--assumption) 0 2px, transparent 2px 4px)",
};

export type EvidenceCounts = Partial<Record<ClaimStatus, number>>;

function summarize(counts: EvidenceCounts): string {
  const parts = STATUS_ORDER.map((status) => {
    const count = counts[status] ?? 0;
    if (count === 0) return null;
    const label =
      status === "VERIFIED"
        ? "verified"
        : status === "AI_ANALYSIS"
          ? "AI analysis"
          : status === "ASSUMPTION"
            ? count === 1
              ? "assumption"
              : "assumptions"
            : "missing";
    return `${count} ${label}`;
  }).filter((part): part is string => part !== null);

  return parts.length > 0 ? `Evidence: ${parts.join(", ")}` : "Evidence: none";
}

interface EvidenceBarProps {
  counts: EvidenceCounts;
  className?: string;
}

function EvidenceBar({ counts, className }: EvidenceBarProps) {
  const present = STATUS_ORDER.filter((status) => (counts[status] ?? 0) > 0);
  const label = summarize(counts);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="img"
          aria-label={label}
          tabIndex={0}
          className={cn(
            "flex h-1.5 w-full overflow-hidden rounded-pill bg-panel outline-none",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50",
            className,
          )}
        >
          {present.map((status) => (
            <div
              key={status}
              style={{
                flexGrow: counts[status],
                minWidth: 2,
                ...(status === "ASSUMPTION" ? ASSUMPTION_HATCH : undefined),
              }}
              className={SEGMENT_CLASS[status]}
            />
          ))}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="flex flex-col gap-1">
          {present.map((status) => (
            <li key={status} className="flex items-center justify-between gap-4">
              <StatusBadge status={status} />
              <span className="tabular-nums text-mist">{counts[status]}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export { EvidenceBar };
export type { EvidenceBarProps };
