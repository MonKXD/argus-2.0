import { MobileBottomBar } from "@/components/shell/mobile-bottom-bar";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

import type { ReactNode } from "react";

// DESIGN section 5.1 app-shell diagram: sidebar + topbar on desktop,
// MobileBottomBar replacing the sidebar below md (APP_FLOW section 10).
// NFR-06: usable from 320px to 2560px wide.

interface AppShellProps {
  children: ReactNode;
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <MobileBottomBar />
    </div>
  );
}

export { AppShell };
export type { AppShellProps };
