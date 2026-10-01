import type { DimensionScore } from "@/components/charts/dimension-radar";
import { pointsToPath, polarToCartesian, regularPolygonPoints } from "@/components/charts/geometry";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "@/lib/dimension-labels";
import type { DimensionKey } from "@/lib/schema/enums";
import { cn } from "@/lib/utils";

/**
 * FR-CMP-02's "radar overlay": 2 to 4 startups' `DimensionRadar` data
 * superimposed on one chart. DESIGN reserves chromatic colour for the
 * evidence spectrum only (D-012: "no brand hue") and names no second
 * encoding for multi-series comparison charts, so series are told apart by
 * `stroke-dasharray` pattern alone, all in the same `stroke-paper` token —
 * no new colour. A legend below (and the data-table disclosure) spells out
 * which pattern is which startup, so the distinction never depends on
 * colour alone (R-UI-03's spirit, applied to a chart rather than a claim).
 *
 * Unlike the single-series `DimensionRadar`, this chart doesn't dash
 * individual edges for low confidence (that would conflict visually with
 * the per-series dasharray) or substitute "Not scored" into the axis
 * label (ambiguous once more than one series might disagree on which
 * dimension is scored) — both stay the single-series chart's own job; the
 * per-series data table still shows each series' real score and
 * confidence per dimension.
 */

const RING_VALUES = [25, 50, 75, 100];
const AXIS_COUNT = DIMENSION_ORDER.length;
const SERIES_PATTERNS = ["none", "5 3", "1 3", "7 2 1 2"] as const;
const MAX_SERIES = SERIES_PATTERNS.length;

export interface RadarSeries {
  label: string;
  scores: Partial<Record<DimensionKey, DimensionScore>>;
}

interface DimensionRadarOverlayProps {
  series: RadarSeries[];
  size?: number;
  className?: string;
}

function axisAngle(index: number): number {
  return -90 + (360 / AXIS_COUNT) * index;
}

function DimensionRadarOverlay({ series, size = 320, className }: DimensionRadarOverlayProps) {
  const cx = size / 2;
  const cy = size / 2;
  const labelMargin = 56;
  const maxRadius = size / 2 - labelMargin;
  const plotted = series.slice(0, MAX_SERIES);

  const seriesVertices = plotted.map((s) =>
    DIMENSION_ORDER.map((key, index) => {
      const data = s.scores[key];
      const angle = axisAngle(index);
      const scored = data?.score != null;
      const radius = scored ? (data!.score! / 100) * maxRadius : 0;
      return { key, point: polarToCartesian(cx, cy, radius, angle), scored, data };
    }),
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          aria-hidden="true"
        >
          {RING_VALUES.map((ring) => (
            <path
              key={ring}
              d={pointsToPath(regularPolygonPoints(cx, cy, (ring / 100) * maxRadius, AXIS_COUNT))}
              fill="none"
              strokeWidth={1}
              className="stroke-hairline"
            />
          ))}

          {DIMENSION_ORDER.map((key, index) => {
            const outer = polarToCartesian(cx, cy, maxRadius, axisAngle(index));
            return (
              <line
                key={`spoke-${key}`}
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                strokeWidth={1}
                className="stroke-hairline"
              />
            );
          })}

          {seriesVertices.map((vertices, seriesIndex) => (
            <path
              key={`series-${seriesIndex}`}
              d={pointsToPath(vertices.map((v) => v.point))}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray={SERIES_PATTERNS[seriesIndex]}
              className="stroke-paper"
            />
          ))}

          {seriesVertices.flatMap((vertices, seriesIndex) =>
            vertices
              .filter((v) => v.scored)
              .map((v) => (
                <circle
                  key={`vertex-${seriesIndex}-${v.key}`}
                  cx={v.point.x}
                  cy={v.point.y}
                  r={2.5}
                  className="fill-paper stroke-none"
                />
              )),
          )}

          {DIMENSION_ORDER.map((key, index) => {
            const angle = axisAngle(index);
            const labelPoint = polarToCartesian(cx, cy, maxRadius + 16, angle);
            const cos = Math.cos((angle * Math.PI) / 180);
            const sin = Math.sin((angle * Math.PI) / 180);
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
            const dy = sin < -0.3 ? -4 : sin > 0.3 ? 10 : 4;
            return (
              <text
                key={`label-${key}`}
                x={labelPoint.x}
                y={labelPoint.y}
                dy={dy}
                textAnchor={anchor}
                className="fill-mist text-caption"
              >
                {DIMENSION_LABEL[key]}
              </text>
            );
          })}
        </svg>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-ui-sm text-mist">
        {plotted.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <svg width="20" height="8" aria-hidden="true">
              <line
                x1={0}
                y1={4}
                x2={20}
                y2={4}
                strokeWidth={1.5}
                strokeDasharray={SERIES_PATTERNS[i]}
                className="stroke-paper"
              />
            </svg>
            {s.label}
          </li>
        ))}
      </ul>

      <details className="text-ui-sm">
        <summary className="cursor-pointer text-mist">Show data table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-hairline text-mist">
                <th className="py-1 pr-4 font-medium">Dimension</th>
                {plotted.map((s) => (
                  <th key={s.label} className="py-1 pr-4 font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIMENSION_ORDER.map((key) => (
                <tr key={key} className="border-b border-hairline last:border-0">
                  <td className="py-1 pr-4">{DIMENSION_LABEL[key]}</td>
                  {plotted.map((s) => {
                    const data = s.scores[key];
                    return (
                      <td key={s.label} className="py-1 pr-4 tabular-nums">
                        {data?.score != null ? data.score : "Not scored"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export { DimensionRadarOverlay };
export type { DimensionRadarOverlayProps };
