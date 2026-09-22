import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import type { Analysis } from "@/lib/schema/analysis";
import { cn } from "@/lib/utils";

// DESIGN section 5.2: "The KPI strip is one continuous row with hairline
// dividers, not four cards."

interface KpiStripProps {
  analyses: Analysis[];
  className?: string;
}

function KpiStrip({ analyses, className }: KpiStripProps) {
  const scored = analyses.filter((a) => a.latest?.overallScore !== null && a.latest !== null);
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + (a.latest!.overallScore ?? 0), 0) / scored.length)
    : null;
  const inProgress = analyses.filter((a) => a.status === "PROCESSING").length;
  const watchlisted = analyses.filter((a) => a.isWatchlisted).length;

  const items: { label: string; value: string }[] = [
    { label: "Analyses", value: formatNumber(analyses.length) },
    { label: "Average score", value: averageScore !== null ? formatNumber(averageScore) : "—" },
    { label: "In progress", value: formatNumber(inProgress) },
    { label: "Watchlisted", value: formatNumber(watchlisted) },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap divide-x divide-hairline rounded-panel border border-hairline",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col gap-1 px-6 py-4">
          <span className="text-ui-sm text-mist">{item.label}</span>
          <span className="font-serif text-h3 tabular-nums text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Same 4-column, hairline-divided layout as KpiStrip, sized for the real content (DESIGN section 6: skeletons at final layout size). */
function KpiStripSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap divide-x divide-hairline rounded-panel border border-hairline",
        className,
      )}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-1 flex-col gap-2 px-6 py-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

export { KpiStrip, KpiStripSkeleton };
