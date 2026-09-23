"use client";

import { useCreateAnalysis } from "@/hooks/use-create-analysis";

interface NewAnalysisButtonProps {
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}

/**
 * A button, not a Link: creating the draft is a real write (POST
 * /api/analyses), and Next.js can prefetch a hovered/visible Link's target
 * route, which would create stray drafts on every hover.
 */
function NewAnalysisButton({ className, children, ...props }: NewAnalysisButtonProps) {
  const { create, creating } = useCreateAnalysis();

  return (
    <button
      type="button"
      onClick={create}
      disabled={creating}
      className={className}
      aria-label={props["aria-label"]}
    >
      {children}
    </button>
  );
}

export { NewAnalysisButton };
