import * as React from "react";

/**
 * Minimal imperative toast store: `toast({ title: "Report ready" })` from
 * anywhere, rendered by <Toaster> (src/components/ui/toaster.tsx). IDs here
 * are ephemeral UI keys, not domain entities, so R-COD-04's prefixed-ULID
 * rule doesn't apply.
 */

export interface ToastItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 0;

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function toast(item: Omit<ToastItem, "id">): { id: string; dismiss: () => void } {
  const id = String(nextId++);
  toasts = [...toasts, { ...item, id }];
  emit();
  return { id, dismiss: () => dismissToast(id) };
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  const [state, setState] = React.useState(toasts);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}
