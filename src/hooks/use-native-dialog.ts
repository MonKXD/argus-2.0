import * as React from "react";

/**
 * Imperative sync between React `open` state and a native `<dialog>`
 * element (DESIGN section 12: prefer native `dialog`/Popover to Radix).
 * `showModal()`/`close()` give focus trapping and Esc-to-close for free;
 * the click handler is the guide's documented fallback for light-dismiss
 * (`closedby="any"`) on browsers that don't support it yet (Safari, as of
 * this writing — see docs/PROJECT_MEMORY.md).
 */
export function useNativeDialog(open: boolean, onOpenChange: (open: boolean) => void) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => onOpenChange(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if ("closedBy" in dialog) {
      // Native light-dismiss support; enable it. Sets the IDL property
      // rather than the `closedby` JSX/HTML attribute, since the DOM types
      // this TypeScript/lib.dom version ships don't declare it yet.
      (dialog as HTMLDialogElement & { closedBy: string }).closedBy = "any";
      return;
    }

    function handleClick(event: MouseEvent) {
      if (event.target !== dialog) return;
      const rect = dialog!.getBoundingClientRect();
      const insideContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!insideContent) dialog!.close();
    }

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, []);

  return ref;
}
