import { Circle, CircleCheck, CircleSlash, CircleX, Loader2 } from "lucide-react";

import type { StepStatus } from "@/lib/schema/enums";
import { STEP_LABEL, STEP_ORDER } from "@/lib/step-labels";
import { cn } from "@/lib/utils";

// DESIGN section 6: "StepProgress | Vertical list; status glyph per step;
// counters; aria-live='polite'."

interface StepProgressProps {
  steps: Partial<Record<string, { status: StepStatus; counters?: Record<string, number> }>>;
  className?: string;
}

const GLYPH: Record<StepStatus, typeof Circle> = {
  DONE: CircleCheck,
  RUNNING: Loader2,
  PENDING: Circle,
  FAILED: CircleX,
  SKIPPED: CircleSlash,
};

const GLYPH_CLASS: Record<StepStatus, string> = {
  DONE: "text-verified",
  RUNNING: "text-analysis animate-spin motion-reduce:animate-none",
  PENDING: "text-haze",
  FAILED: "text-ember",
  SKIPPED: "text-haze",
};

function StepProgress({ steps, className }: StepProgressProps) {
  return (
    <ol aria-live="polite" className={cn("flex flex-col gap-2", className)}>
      {STEP_ORDER.map((step) => {
        const state = steps[step];
        if (!state) return null;
        const Glyph = GLYPH[state.status];
        const counters = state.counters
          ? Object.entries(state.counters)
              .map(([k, v]) => `${v} ${k}`)
              .join(", ")
          : null;
        return (
          <li key={step} className="flex items-center gap-2 text-ui-sm">
            <Glyph
              className={cn("size-4 shrink-0", GLYPH_CLASS[state.status])}
              aria-hidden="true"
            />
            <span className={state.status === "PENDING" ? "text-mist" : "text-foreground"}>
              {STEP_LABEL[step]}
            </span>
            {counters && <span className="text-mist">({counters})</span>}
          </li>
        );
      })}
    </ol>
  );
}

export { StepProgress };
export type { StepProgressProps };
