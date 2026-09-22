"use client";

import * as React from "react";

import { CommandPalette } from "@/components/layout/command-palette";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

import type { ReactNode } from "react";

// DESIGN section 5.1 app-shell diagram: sidebar + topbar on desktop,
// MobileBottomBar replacing the sidebar below md (APP_FLOW section 10).
// NFR-06: usable from 320px to 2560px wide. Command palette open state
// lives here so both Topbar's search bar and the Cmd/Ctrl+K shortcut
// (registered inside CommandPalette itself) can open the same instance.

interface AppShellProps {
  children: ReactNode;
}

function AppShell({ children }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <MobileBottomBar />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

export { AppShell };
export type { AppShellProps };
