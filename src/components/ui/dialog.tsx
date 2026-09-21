import { Slot } from "@radix-ui/react-slot";
import { X } from "lucide-react";
import * as React from "react";

import { useNativeDialog } from "@/hooks/use-native-dialog";
import { cn } from "@/lib/utils";

// DESIGN section 12: prefer native <dialog> over Radix Dialog. See
// src/hooks/use-native-dialog.ts for the showModal()/light-dismiss wiring.

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

export function useDialogContext(component: string): DialogContextValue {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error(`<${component}> must be used within <Dialog>`);
  return ctx;
}

interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open: openProp, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const titleId = React.useId();

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const value = React.useMemo(() => ({ open, setOpen, titleId }), [open, setOpen, titleId]);

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

function DialogTrigger({
  asChild,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useDialogContext("DialogTrigger");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="dialog-trigger"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        setOpen(true);
      }}
      {...props}
    />
  );
}

function DialogClose({
  asChild,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = useDialogContext("DialogClose");
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="dialog-close"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        setOpen(false);
      }}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"dialog"> & { showCloseButton?: boolean }) {
  const { open, setOpen, titleId } = useDialogContext("DialogContent");
  const ref = useNativeDialog(open, setOpen);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-slot="dialog-content"
      className={cn(
        "m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg rounded-panel border border-hairline-strong bg-panel-raised p-6 text-foreground shadow-overlay",
        "backdrop:bg-black/50",
        "opacity-0 scale-95 [transition-behavior:allow-discrete] transition-[opacity,transform,display,overlay] duration-(--dur-3) ease-(--ease)",
        "open:opacity-100 open:scale-100",
        "starting:open:opacity-0 starting:open:scale-95",
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

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-6", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialogContext("DialogTitle");
  return (
    <h2
      id={titleId}
      data-slot="dialog-title"
      className={cn("text-h3 font-serif text-foreground", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="dialog-description" className={cn("text-body text-mist", className)} {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
