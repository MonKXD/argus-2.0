"use client";

import { Button } from "@/components/ui/button";
import { useGenerateComparisonNarrative } from "@/hooks/use-generate-comparison-narrative";

interface GenerateNarrativeButtonProps {
  comparisonId: string;
  hasNarrative: boolean;
}

/** FR-CMP-05 (P2): "Generate narrative" / "Regenerate narrative" — a real,
 * costed LLM call, so it's user-triggered, never automatic. */
function GenerateNarrativeButton({ comparisonId, hasNarrative }: GenerateNarrativeButtonProps) {
  const { generating, error, generate } = useGenerateComparisonNarrative(comparisonId);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={() => void generate()} disabled={generating}>
        {generating ? "Generating…" : hasNarrative ? "Regenerate narrative" : "Generate narrative"}
      </Button>
      {error && (
        <p role="alert" className="text-ui-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { GenerateNarrativeButton };
