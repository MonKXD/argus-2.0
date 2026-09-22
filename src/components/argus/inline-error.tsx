import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// APP_FLOW section 6 state catalogue: "Inline error with Retry, other
// modules unaffected" for dashboard modules and the analyses list. No live
// data fetching exists yet in Phase 1 (that's Phase 3), so nothing calls
// this today — it's here so Phase 3's Firestore-backed modules have a
// ready, spec-matching error treatment instead of inventing one ad hoc.
// R-UI-11: errors say what happened and how to fix it, and don't apologise.

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-panel border border-hairline-strong p-4",
        className,
      )}
    >
      <p className="text-ui-sm text-foreground">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export { InlineError };
export type { InlineErrorProps };
