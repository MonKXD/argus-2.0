"use client";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToggleWatchlist } from "@/hooks/use-toggle-watchlist";
import { cn } from "@/lib/utils";

interface WatchlistToggleButtonProps {
  analysisId: string;
  isWatchlisted: boolean;
  className?: string;
}

/** FR-WCH-01: "Toggle watchlist on any analysis." A filled star means
 * watchlisted; the accessible name states the action the click performs
 * (not just the current state), matching `DeleteAnalysisButton`'s own
 * "describe the action" convention. */
function WatchlistToggleButton({ analysisId, isWatchlisted, className }: WatchlistToggleButtonProps) {
  const { toggling, error, toggle } = useToggleWatchlist(analysisId, !isWatchlisted);

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void toggle()}
        disabled={toggling}
        aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Star className={cn("size-4", isWatchlisted && "fill-current")} />
      </Button>
      {error && (
        <p role="alert" className="text-ui-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { WatchlistToggleButton };
