import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// DESIGN section 6: "EmptyState | One sentence and one action; never
// illustration-only." R-UI-11: copy is plain and specific, errors (and by
// the same voice rule, empty states) do not apologise.

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  message: string;
  action?: EmptyStateAction;
  className?: string;
}

function EmptyState({ message, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-3 py-6", className)}>
      <p className="text-ui-sm text-mist">{message}</p>
      {action &&
        (action.href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
