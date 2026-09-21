import { X } from "lucide-react";
import * as React from "react";

import { Dialog, DialogClose, DialogTrigger, useDialogContext } from "@/components/ui/dialog";
import { useNativeDialog } from "@/hooks/use-native-dialog";
import { cn } from "@/lib/utils";

// A Dialog variant anchored to a viewport edge (DESIGN section 5.1's
// evidence rail becomes an overlay sheet below 1280px; section 10's bottom
// sheet below 768px). Shares Dialog's open-state context and native
// <dialog> wiring; only the positioning and motion differ.

const Sheet = Dialog;
const SheetTrigger = DialogTrigger;
const SheetClose = DialogClose;

const sideClasses = {
  right:
    "inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-sm translate-x-full open:translate-x-0 starting:open:translate-x-full",
  left: "inset-y-0 left-0 right-auto m-0 h-full max-h-none w-full max-w-sm -translate-x-full open:translate-x-0 starting:open:-translate-x-full",
  top: "inset-x-0 top-0 bottom-auto m-0 h-auto max-h-[85vh] w-full -translate-y-full open:translate-y-0 starting:open:-translate-y-full",
  bottom:
    "inset-x-0 bottom-0 top-auto m-0 h-auto max-h-[85vh] w-full translate-y-full open:translate-y-0 starting:open:translate-y-full",
} as const;

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<"dialog"> & {
  side?: keyof typeof sideClasses;
  showCloseButton?: boolean;
}) {
  const { open, setOpen, titleId } = useDialogContext("SheetContent");
  const ref = useNativeDialog(open, setOpen);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-slot="sheet-content"
      className={cn(
        // `open:flex` rather than a bare `flex`: an unscoped `display`
        // utility beats the UA stylesheet's `dialog:not([open]) { display:
        // none }` (author origin always wins over UA origin, specificity
        // tie or not), which kept the sheet visible and interactive after
        // close. Scoping display to :open, like the other transition
        // classes, keeps native open/closed state authoritative.
        "fixed hidden open:flex flex-col gap-4 border-hairline-strong bg-panel-raised p-6 text-foreground shadow-overlay",
        "backdrop:bg-black/50",
        "opacity-0 [transition-behavior:allow-discrete] transition-[opacity,transform,display,overlay] duration-(--dur-3) ease-(--ease)",
        "open:opacity-100",
        "starting:open:opacity-0",
        side === "left" || side === "right" ? "border-r border-l" : "border-t border-b",
        sideClasses[side],
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose
          className="absolute right-4 top-4 rounded-control p-1 text-mist opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogClose>
      )}
    </dialog>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 pr-6", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialogContext("SheetTitle");
  return (
    <h2
      id={titleId}
      data-slot="sheet-title"
      className={cn("text-h3 font-serif text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="sheet-description" className={cn("text-body text-mist", className)} {...props} />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
