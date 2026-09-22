import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 7 (matrix cells): "value with a thin Paper bar for relative
 * size". Plain HTML bars, not SVG — each row already carries its label and
 * value as real text, so the bar itself can stay purely decorative
 * (aria-hidden) without needing a role="img" text-alternative trick.
 */

interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

function BarChart({ data, valueFormatter = formatNumber, className }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 0);

  if (data.length === 0) {
    return <p className={cn("text-ui-sm text-mist", className)}>No data</p>;
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {data.map((d) => {
        const pct = max === 0 ? 0 : Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0);
        return (
          <li key={d.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-ui-sm">
              <span className="text-foreground">{d.label}</span>
              <span className="tabular-nums text-mist">{valueFormatter(d.value)}</span>
            </div>
            <div className="h-1.5 w-full rounded-pill bg-panel-raised" aria-hidden="true">
              <div className="h-full rounded-pill bg-paper" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export { BarChart };
export type { BarChartProps, BarChartDatum };
