"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

// DESIGN section 5.1: sidebar 232px, collapsible to 64px, hidden below the
// md breakpoint (MobileBottomBar takes over there — see css-layout guidance:
// this is a global page-layout decision driven by viewport, so a media
// query is the right tool, not a container query).
//
// Collapse state is in-memory only (resets on reload) — DESIGN only asks
// for it to be collapsible, not for the preference to persist, and
// persisting via localStorage would need a read-on-mount effect that
// either mismatches the SSR'd markup or fights the "don't setState
// synchronously in an effect" lint rule for no requirement it serves.

function isActive(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}

function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  function toggle() {
    setCollapsed((prev) => !prev);
  }

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "hidden shrink-0 flex-col border-r border-hairline bg-panel md:flex",
        collapsed ? "w-16" : "w-[232px]",
        className,
      )}
    >
      <div className="flex h-[52px] items-center border-b border-hairline px-4">
        <span className="font-serif text-ui font-semibold text-foreground">
          {collapsed ? "A" : "ARGUS"}
        </span>
      </div>

      <ul className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2 text-ui text-mist transition-colors hover:bg-panel-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active && "bg-panel-raised text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className={cn(collapsed && "sr-only")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center gap-2 border-t border-hairline px-4 py-3 text-ui-sm text-mist transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </nav>
  );
}

export { Sidebar };
