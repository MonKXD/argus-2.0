"use client";

import * as React from "react";

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
import { useSubmitFeedback } from "@/hooks/use-submit-feedback";

/** T-6.11 (beta feedback loop, PRD section 13). No dedicated Textarea
 * primitive exists in this codebase (D-079's own gotcha note: nothing
 * before this needed one) — a plain, token-styled native `<textarea>`
 * for this one call site, rather than building a new shadcn-style
 * primitive for a single user. */
function FeedbackButton() {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const { submitting, submitted, error, submitFeedback, reset } = useSubmitFeedback();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setMessage("");
      reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Send feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Tell us what&rsquo;s working, what&rsquo;s confusing, or what&rsquo;s missing. We read
            every message.
          </DialogDescription>
        </DialogHeader>
        {submitted ? (
          <p className="text-ui-sm text-foreground">Thanks — your feedback was sent.</p>
        ) : (
          <>
            <label htmlFor="feedback-message" className="sr-only">
              Your feedback
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="What's on your mind?"
              className="w-full resize-none rounded-control border border-hairline bg-panel-raised p-3 text-body text-foreground outline-none placeholder:text-mist focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {error && (
              <p role="alert" className="text-ui-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              {submitted ? "Close" : "Cancel"}
            </Button>
          </DialogClose>
          {!submitted && (
            <Button
              type="button"
              onClick={() => void submitFeedback(message)}
              disabled={submitting || message.trim().length === 0}
            >
              {submitting ? "Sending…" : "Send"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { FeedbackButton };
