"use client";

import { EmptyState } from "@/components/argus/empty-state";
import { useCreateAnalysis } from "@/hooks/use-create-analysis";

interface NewAnalysisEmptyStateProps {
  message: string;
}

/** EmptyState's action needs an onClick (a real create-draft write), which
 * a Server Component page can't hand it directly — this is that one
 * interactive slice, split out so the page around it can stay a Server
 * Component. */
function NewAnalysisEmptyState({ message }: NewAnalysisEmptyStateProps) {
  const { create, creating } = useCreateAnalysis();

  return (
    <EmptyState
      message={message}
      action={{ label: creating ? "Creating…" : "New analysis", onClick: create }}
    />
  );
}

export { NewAnalysisEmptyState };
