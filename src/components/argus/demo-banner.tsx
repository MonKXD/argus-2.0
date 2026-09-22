import { cn } from "@/lib/utils";

// DESIGN section 6: "DemoBanner | Persistent, plain: 'Demo data. Fictional
// companies.'" — R-UI-09 (demo data is always labelled and never presented
// as real), no decorative gradients/glows/emoji (R-UI-06).

interface DemoBannerProps {
  className?: string;
}

function DemoBanner({ className }: DemoBannerProps) {
  return (
    <div
      className={cn(
        "border-b border-hairline bg-panel px-4 py-2 text-center text-ui-sm text-mist",
        className,
      )}
    >
      Demo data. Fictional companies.
    </div>
  );
}

export { DemoBanner };
export type { DemoBannerProps };
