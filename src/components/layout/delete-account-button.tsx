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
import { useDeleteAccount } from "@/hooks/use-delete-account";

/** FR-AUT-03, same confirm-dialog shape as `DeleteAnalysisButton` (T-3.12). */
function DeleteAccountButton() {
  const { deleting, error, deleteAccount } = useDeleteAccount();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-destructive">
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Every analysis, comparison and piece of activity history will be removed permanently.
            This can&rsquo;t be undone.
          </DialogDescription>
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
          <Button type="button" variant="destructive" onClick={() => void deleteAccount()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DeleteAccountButton };
