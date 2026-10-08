"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDuplicateAnalysis } from "@/hooks/use-duplicate-analysis";
import { cn } from "@/lib/utils";

interface DuplicateAnalysisButtonProps {
  analysisId: string;
  className?: string;
}

/** FR-INT-08: "Duplicate an analysis." A single click, no confirm dialog —
 * unlike delete, duplicating is non-destructive and trivially undoable
 * (just delete the copy). */
function DuplicateAnalysisButton({ analysisId, className }: DuplicateAnalysisButtonProps) {
  const { duplicating, error, duplicate } = useDuplicateAnalysis(analysisId);

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => void duplicate()}
        disabled={duplicating}
        aria-label="Duplicate analysis"
      >
        <Copy className="size-4" />
      </Button>
      {error && (
        <p role="alert" className="text-ui-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { DuplicateAnalysisButton };
