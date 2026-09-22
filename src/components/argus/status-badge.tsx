import { CircleDashed, CircleHelp, Cpu, ShieldCheck } from "lucide-react";
import * as React from "react";

import { EvidenceMarker, STATUS_LABEL } from "@/components/argus/evidence-marker";
import type { ClaimStatus } from "@/lib/schema/enums";
import { cn } from "@/lib/utils";

// DESIGN section 4: "StatusBadge = marker + label (+ icon in large sizes)."

const STATUS_ICON: Record<ClaimStatus, React.ComponentType<{ className?: string }>> = {
  VERIFIED: ShieldCheck,
  AI_ANALYSIS: Cpu,
  ASSUMPTION: CircleHelp,
  MISSING: CircleDashed,
};

interface StatusBadgeProps {
  status: ClaimStatus;
  /**
   * Overrides the default label — e.g. "Sourced" instead of "Verified" for
   * a claim backed only by PROVIDED evidence (D-004; the caller derives
   * this from reliability, StatusBadge doesn't).
   */
  label?: string;
  size?: "sm" | "lg";
  className?: string;
}

function StatusBadge({ status, label, size = "sm", className }: StatusBadgeProps) {
  const Icon = STATUS_ICON[status];
  const text = label ?? STATUS_LABEL[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-ui-sm text-foreground",
        size === "lg" && "text-ui",
        className,
      )}
    >
      <EvidenceMarker status={status} decorative />
      {size === "lg" && <Icon className="size-3.5 text-mist" />}
      <span>{text}</span>
    </span>
  );
}

export { StatusBadge };
export type { StatusBadgeProps };
