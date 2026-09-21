"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { dismissToast, useToasts } from "@/hooks/use-toast";

/** Mount once, near the root layout. */
function Toaster() {
  const toasts = useToasts();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action }) => (
        <Toast key={id} onOpenChange={(open) => !open && dismissToast(id)}>
          <div className="flex flex-col gap-1">
            <ToastTitle>{title}</ToastTitle>
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export { Toaster };
