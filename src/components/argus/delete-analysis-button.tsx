"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteAnalysis } from "@/hooks/use-delete-analysis";

interface DeleteAnalysisButtonProps {
  analysisId: string;
  startupName: string;
}

/** FR-SET-02/US-07, APP_FLOW's own confirm copy ("Delete this analysis? Its
 * files, evidence and reports will be removed permanently."). */
function DeleteAnalysisButton({ analysisId, startupName }: DeleteAnalysisButtonProps) {
  const { deleting, error, deleteAnalysis } = useDeleteAnalysis(analysisId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Delete analysis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {startupName}?</DialogTitle>
          <DialogDescription>Its files, evidence and reports will be removed permanently.</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-ui-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={deleting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={() => void deleteAnalysis()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DeleteAnalysisButton };
