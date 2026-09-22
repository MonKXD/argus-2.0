import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 7: Paper, 1.5px, no fill. A small inline trend line — the
 * SVG is decorative (aria-hidden), the real accessible content is a visually
 * hidden summary sentence (same pattern as ScoreGauge/DimensionRadar: a
 * decorative visual plus real text, not an image standing in for data).
 */

interface SparklineProps {
  values: number[];
  /** What the values represent, for the text alternative, e.g. "Average score, last 6 runs". */
  label: string;
  width?: number;
  height?: number;
  className?: string;
}

function Sparkline({ values, label, width = 96, height = 24, className }: SparklineProps) {
  const padding = 2;
  const first = values[0];
  const last = values[values.length - 1];

  if (values.length === 0 || first === undefined || last === undefined) {
    return (
      <div className={cn("text-ui-sm text-mist", className)} style={{ width, height }}>
        <span className="sr-only">{label}: no data</span>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const points = values.map((value, i) => {
    const x = padding + (i / Math.max(values.length - 1, 1)) * (width - padding * 2);
    // Flat series (range === 0) draw a level line through the middle.
    const y =
      range === 0
        ? height / 2
        : height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const trend = last > first ? "up" : last < first ? "down" : "flat";
  const summary = `${label}: ${trend}, from ${formatNumber(first)} to ${formatNumber(last)}`;

  return (
    <div className={className}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <polyline
          points={points.join(" ")}
          fill="none"
          strokeWidth={1.5}
          className="stroke-paper"
        />
      </svg>
      <span className="sr-only">{summary}</span>
    </div>
  );
}

export { Sparkline };
export type { SparklineProps };
