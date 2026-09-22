import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// DESIGN section 5.1: topbar 52px, "Search analyses ... Cmd K ... New
// analysis ●". Opens the command palette (T-1.10); real search over
// analyses lands with T-5.10.

function Topbar({ className, onOpenPalette }: { className?: string; onOpenPalette: () => void }) {
  return (
    <header
      className={cn(
        "flex h-[52px] shrink-0 items-center gap-4 border-b border-hairline bg-background px-4",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-control border border-hairline bg-panel px-3 py-1.5 text-left text-ui-sm text-mist focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search analyses</span>
        <kbd className="ml-auto shrink-0 rounded-control border border-hairline-strong px-1.5 py-0.5 text-caption text-mist">
          ⌘K
        </kbd>
      </button>
      {/* MobileBottomBar has its own "New analysis" action below md; two
          controls with the same name at once would be confusing (and a
          real duplicate-accessible-name issue for assistive tech). */}
      <Button asChild size="sm" className="hidden md:inline-flex">
        <Link href="/app/analyses/new">New analysis</Link>
      </Button>
      <span
        aria-hidden="true"
        className="size-8 shrink-0 rounded-full border border-hairline bg-panel-raised"
      />
    </header>
  );
}

export { Topbar };
