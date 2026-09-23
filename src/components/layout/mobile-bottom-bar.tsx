"use client";

import { LayoutDashboard, ListChecks, GitCompare, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NewAnalysisButton } from "@/components/argus/new-analysis-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// APP_FLOW section 10: "Mobile: bottom bar with Dashboard, Analyses, New
// (centre action), Compare, More." Watchlist and Settings — the sidebar
// items that don't fit five mobile slots — live behind "More".

function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 text-caption text-mist transition-colors",
        active && "text-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

function MobileBottomBar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-hairline bg-panel pb-[env(safe-area-inset-bottom)] md:hidden",
        className,
      )}
    >
      <TabLink
        href="/app"
        label="Dashboard"
        icon={LayoutDashboard}
        active={isActive(pathname, "/app")}
      />
      <TabLink
        href="/app/analyses"
        label="Analyses"
        icon={ListChecks}
        active={isActive(pathname, "/app/analyses")}
      />

      <NewAnalysisButton
        aria-label="New analysis"
        className="mx-1 flex size-12 shrink-0 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Plus className="size-5" />
      </NewAnalysisButton>

      <TabLink
        href="/app/compare"
        label="Compare"
        icon={GitCompare}
        active={isActive(pathname, "/app/compare")}
      />

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-caption text-mist transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="size-5" />
            More
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-40 flex-col gap-1">
          <Link
            href="/app/watchlist"
            className="rounded-control px-2 py-1.5 text-ui-sm text-foreground hover:bg-panel-raised"
          >
            Watchlist
          </Link>
          <Link
            href="/app/settings"
            className="rounded-control px-2 py-1.5 text-ui-sm text-foreground hover:bg-panel-raised"
          >
            Settings
          </Link>
        </PopoverContent>
      </Popover>
    </nav>
  );
}

export { MobileBottomBar };
