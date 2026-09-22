import type { Reliability } from "@/lib/schema/enums";
import { cn } from "@/lib/utils";

// DESIGN section 4: "Reliability chips (small text chips, 1 px border):
// Independent, Company, Provided." Neutral, not part of the evidence
// spectrum — reliability describes the source, not the claim's status.

const RELIABILITY_LABEL: Record<Reliability, string> = {
  INDEPENDENT: "Independent",
  FIRST_PARTY: "Company",
  PROVIDED: "Provided",
};

interface ReliabilityChipProps {
  reliability: Reliability;
  className?: string;
}

function ReliabilityChip({ reliability, className }: ReliabilityChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-border px-2 py-0.5 text-caption text-mist",
        className,
      )}
    >
      {RELIABILITY_LABEL[reliability]}
    </span>
  );
}

export { ReliabilityChip, RELIABILITY_LABEL };
export type { ReliabilityChipProps };
