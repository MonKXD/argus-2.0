import * as React from "react";

import type { ClaimStatus } from "@/lib/schema/enums";
import { cn } from "@/lib/utils";

/**
 * The signature "certainty as texture" system (DESIGN section 4): each
 * claim status is a distinct shape/fill, not just a colour, so it still
 * reads under forced-colors mode or for colour-blind users (R-UI-03).
 * forced-colors handling here is best-effort (no dedicated
 * modern-web-guidance guide exists for it, unlike the overlay primitives in
 * T-1.02) — worth a real assistive-tech pass at T-1.16.
 */

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  VERIFIED: "Verified",
  AI_ANALYSIS: "AI analysis",
  ASSUMPTION: "Assumption",
  MISSING: "Missing",
};

const SIZE = 10;

interface EvidenceMarkerProps {
  status: ClaimStatus;
  /** Suppress the accessible name, for when a visible label sits next to it (StatusBadge). */
  decorative?: boolean;
  className?: string;
}

function EvidenceMarker({ status, decorative = false, className }: EvidenceMarkerProps) {
  const patternId = React.useId();

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : STATUS_LABEL[status]}
      className={cn("shrink-0", className)}
    >
      {status === "VERIFIED" && (
        <rect
          width={SIZE}
          height={SIZE}
          rx={2}
          className="fill-verified forced-colors:fill-[CanvasText]"
        />
      )}

      {status === "AI_ANALYSIS" && (
        <rect
          x={0.5}
          y={0.5}
          width={SIZE - 1}
          height={SIZE - 1}
          strokeWidth={1}
          className="fill-analysis/40 stroke-analysis forced-colors:fill-none forced-colors:stroke-[CanvasText]"
        />
      )}

      {status === "ASSUMPTION" && (
        <>
          <defs>
            <pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width={4}
              height={4}
              patternTransform="rotate(135)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={4}
                strokeWidth={2}
                className="stroke-assumption forced-colors:stroke-[CanvasText]"
              />
            </pattern>
          </defs>
          <rect
            x={0.5}
            y={0.5}
            width={SIZE - 1}
            height={SIZE - 1}
            strokeWidth={1}
            fill={`url(#${patternId})`}
            className="stroke-assumption forced-colors:stroke-[CanvasText]"
          />
        </>
      )}

      {status === "MISSING" && (
        <rect
          x={0.5}
          y={0.5}
          width={SIZE - 1}
          height={SIZE - 1}
          strokeWidth={1}
          strokeDasharray="2 2"
          className="fill-none stroke-missing forced-colors:stroke-[CanvasText]"
        />
      )}
    </svg>
  );
}

export { EvidenceMarker, SIZE as EVIDENCE_MARKER_SIZE };
export type { EvidenceMarkerProps };
