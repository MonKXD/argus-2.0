"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useNativeDialog } from "@/hooks/use-native-dialog";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 6/12: "Glass overlay, 560px; search analyses, jump to
 * section, run actions." This is the T-1.10 skeleton — overlay, keyboard
 * shortcut, and a static list of real navigation links. Live search over
 * analyses/sections (FR-DSH-09) is wired in T-5.10, once there's real data
 * and more than one section to jump to.
 */

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const ref = useNativeDialog(open, onOpenChange);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  return (
    <dialog
      ref={ref}
      aria-label="Command palette"
      className={cn(
        "mx-auto mt-[12vh] mb-auto w-[calc(100%-2rem)] max-w-[560px] rounded-overlay border border-hairline-strong text-foreground shadow-overlay",
        "bg-panel-raised backdrop:bg-black/50",
        "supports-[backdrop-filter:blur(1px)]:bg-[var(--glass-bg)] supports-[backdrop-filter:blur(1px)]:[backdrop-filter:blur(var(--glass-blur))_saturate(1.15)]",
        "opacity-0 scale-95 [transition-behavior:allow-discrete] transition-[opacity,transform,display,overlay] duration-(--dur-3) ease-(--ease)",
        "open:opacity-100 open:scale-100",
        "starting:open:opacity-0 starting:open:scale-95",
      )}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
        <Search className="size-4 shrink-0 text-mist" aria-hidden="true" />
        <label htmlFor="command-palette-search" className="sr-only">
          Search analyses, jump to a section, or run an action
        </label>
        <input
          id="command-palette-search"
          type="text"
          autoFocus
          placeholder="Search analyses, jump to a section, or run an action"
          className="w-full bg-transparent text-ui text-foreground outline-none placeholder:text-mist"
        />
      </div>

      <div className="flex flex-col gap-1 p-2">
        <span className="px-2 py-1 text-caption text-mist">Navigate</span>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-control px-2 py-2 text-ui text-foreground hover:bg-panel focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Icon className="size-4 shrink-0 text-mist" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </dialog>
  );
}

export { CommandPalette };
export type { CommandPaletteProps };
