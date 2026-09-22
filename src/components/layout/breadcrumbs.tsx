import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

// APP_FLOW section 10: "Breadcrumbs inside analyses: Analyses / Startup
// name / Section."

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-ui-sm", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-mist" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="text-mist hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined} className="text-foreground">
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export { Breadcrumbs };
export type { BreadcrumbsProps, Crumb };
