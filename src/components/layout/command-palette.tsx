"use client";

import { Command } from "cmdk";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useCreateAnalysis } from "@/hooks/use-create-analysis";
import { useNativeDialog } from "@/hooks/use-native-dialog";
import type { Analysis } from "@/lib/schema/analysis";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 6/12: "Glass overlay, 560px; search analyses, jump to
 * section, run actions." DESIGN section 12 names the command palette as
 * one of the few cases where native markup isn't enough and Radix should
 * be used instead — Radix itself ships no combobox/command-palette
 * primitive, so `cmdk` (the library the Radix/shadcn ecosystem pairs with
 * exactly this gap, confirmed via a real npm-registry check before adding
 * it — asked the user first per R-COD-08) supplies the combobox behaviour
 * (arrow-key roving focus, typeahead, ARIA listbox/option roles) this T-1.10
 * skeleton never had. The outer `<dialog>` chrome (open/close, light-dismiss,
 * animation) stays exactly as T-1.10 built it via `useNativeDialog` — only
 * the *inside* (a plain static list before this task) is now `cmdk`'s
 * `Command`, which composes with any container rather than requiring its
 * own `Command.Dialog`/Radix Dialog wrapper, so none of the already-built,
 * already-tested dialog chrome needed to change.
 *
 * "Jump to a section" is read as the app's own top-level sections — the
 * Navigate group below (Dashboard, Analyses, Compare, Watchlist, Settings)
 * — not a single report's in-page subsections, which `ReportSectionNav`
 * (T-4.01) already serves on the one page that has them; this palette is
 * global (rendered once in `AppShell`, present on every `/app/*` page), so
 * it has no notion of "the current report's sections" to jump within.
 */

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEARCH_DEBOUNCE_MS = 250;
const MAX_ANALYSIS_RESULTS = 8;

function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const ref = useNativeDialog(open, onOpenChange);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { create: createAnalysis } = useCreateAnalysis();
  const [query, setQuery] = React.useState("");
  const [analyses, setAnalyses] = React.useState<Analysis[]>([]);

  // React's own documented pattern for "reset state when a prop changes"
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes):
  // adjust state during render, guarded by a tracked previous value, rather
  // than in an effect — calling setState synchronously inside an effect
  // body causes an extra cascading render for no benefit here.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setAnalyses([]);
    }
  }

  React.useEffect(() => {
    if (!open) return;
    // `autoFocus` only fires once, on this always-mounted tree's first
    // render (while the dialog is still closed) — it never re-focuses on a
    // later open. Focus explicitly every time `open` turns true instead,
    // after the dialog's own opening transition has had a frame to start
    // (same reasoning `useNativeDialog`'s own effects already apply to
    // `showModal()`/`close()`).
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      fetch(`/api/analyses?q=${encodeURIComponent(query.trim())}`)
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((body: { analyses: Analysis[] }) => {
          if (!cancelled) setAnalyses(body.analyses.slice(0, MAX_ANALYSIS_RESULTS));
        })
        .catch(() => {
          if (!cancelled) setAnalyses([]);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [open, query]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const needle = query.trim().toLowerCase();
  const matchingNavItems = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(needle));

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
      <Command label="Command palette" shouldFilter={false} className="flex flex-col">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <Search className="size-4 shrink-0 text-mist" aria-hidden="true" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Search analyses, jump to a section, or run an action"
            aria-label="Search analyses, jump to a section, or run an action"
            className="w-full bg-transparent text-ui text-foreground outline-none placeholder:text-mist"
          />
        </div>

        <Command.List className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto p-2">
          <Command.Empty className="px-2 py-6 text-center text-ui-sm text-mist">
            No results.
          </Command.Empty>

          {analyses.length > 0 && (
            <Command.Group
              heading="Analyses"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-mist"
            >
              {analyses.map((analysis) => (
                <Command.Item
                  key={analysis.id}
                  value={`analysis-${analysis.id}`}
                  onSelect={() => go(`/app/analyses/${analysis.id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-2 text-ui text-foreground data-[selected=true]:bg-panel"
                >
                  {analysis.startup.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {matchingNavItems.length > 0 && (
            <Command.Group
              heading="Navigate"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-mist"
            >
              {matchingNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={`nav-${item.href}`}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-2 text-ui text-foreground data-[selected=true]:bg-panel"
                  >
                    <Icon className="size-4 shrink-0 text-mist" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {"new analysis".includes(needle) && (
            <Command.Group
              heading="Run"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-mist"
            >
              <Command.Item
                value="run-new-analysis"
                onSelect={() => {
                  onOpenChange(false);
                  void createAnalysis();
                }}
                className="flex cursor-pointer items-center gap-3 rounded-control px-2 py-2 text-ui text-foreground data-[selected=true]:bg-panel"
              >
                <Plus className="size-4 shrink-0 text-mist" />
                New analysis
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </dialog>
  );
}

export { CommandPalette };
export type { CommandPaletteProps };
