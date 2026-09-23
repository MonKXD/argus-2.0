import { cn } from "@/lib/utils";

export const WIZARD_STEPS = ["basics", "sources", "options", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

const STEP_LABELS: Record<WizardStep, string> = {
  basics: "Basics",
  sources: "Sources",
  options: "Options",
  review: "Review",
};

interface WizardStepsNavProps {
  current: WizardStep;
}

/** DESIGN section 5.5: "four steps shown as a real sequence (numbered,
 * because it is one)". Forms guidance's multi-page pattern: a labelled
 * <nav>/<ol>, aria-current="step" on the active one. */
function WizardStepsNav({ current }: WizardStepsNavProps) {
  const currentIndex = WIZARD_STEPS.indexOf(current);

  return (
    <nav aria-label="Setup progress">
      <ol className="flex items-center gap-4">
        {WIZARD_STEPS.map((step, index) => {
          const isCurrent = step === current;
          const isDone = index < currentIndex;
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 text-ui-sm",
                  isCurrent ? "font-medium text-foreground" : "text-mist",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-caption tabular-nums",
                    isCurrent && "border-foreground text-foreground",
                    isDone && "border-mist bg-mist/20 text-foreground",
                    !isCurrent && !isDone && "border-hairline-strong text-mist",
                  )}
                >
                  {index + 1}
                </span>
                {STEP_LABELS[step]}
              </span>
              {index < WIZARD_STEPS.length - 1 && (
                <span aria-hidden="true" className="h-px w-6 bg-hairline" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { WizardStepsNav };
