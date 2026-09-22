import { GitCompare, LayoutDashboard, ListChecks, Bookmark, Settings } from "lucide-react";

import type { ComponentType } from "react";

// APP_FLOW section 10: "Sidebar (desktop): Dashboard, Analyses, Compare,
// Watchlist, Settings." Shared by Sidebar and MobileBottomBar so the two
// don't drift.

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Analyses", href: "/app/analyses", icon: ListChecks },
  { label: "Compare", href: "/app/compare", icon: GitCompare },
  { label: "Watchlist", href: "/app/watchlist", icon: Bookmark },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export type { NavItem };
