import { pointsToPath, polarToCartesian, regularPolygonPoints } from "@/components/charts/geometry";
import { confidenceLabel, LOW_CONFIDENCE_THRESHOLD } from "@/lib/confidence";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "@/lib/dimension-labels";
import type { DimensionKey } from "@/lib/schema/enums";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 7: eight axes; polygon Paper stroke 1.5px with Paper fill
 * at 8%; grid rings at 25/50/75/100 in Hairline. Dimensions with confidence
 * below 0.35 use a dashed edge and a hollow vertex. Unscored dimensions
 * have no vertex and the axis label says "Not scored". Data table
 * alternative in a disclosure.
 *
 * Like ScoreGauge, the SVG is decorative (aria-hidden) — but a radar
 * polygon has no equivalent "just show the real text" fallback the way a
 * numeral does, so the required text alternative here is the <details>
 * table below it (a native disclosure, DESIGN section 12), not just
 * incidental visible text.
 */

const RING_VALUES = [25, 50, 75, 100];
const AXIS_COUNT = DIMENSION_ORDER.length;

export interface DimensionScore {
  /** 0 to 100, or null if this dimension was not scored. */
  score: number | null;
  /** 0 to 1. Ignored when score is null. */
  confidence: number;
}

interface DimensionRadarProps {
  scores: Partial<Record<DimensionKey, DimensionScore>>;
  size?: number;
  className?: string;
}

function axisAngle(index: number): number {
  return -90 + (360 / AXIS_COUNT) * index;
}

function DimensionRadar({ scores, size = 280, className }: DimensionRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const labelMargin = 56;
  const maxRadius = size / 2 - labelMargin;

  const vertices = DIMENSION_ORDER.map((key, index) => {
    const data = scores[key];
    const angle = axisAngle(index);
    const scored = data?.score != null;
    const radius = scored ? (data!.score! / 100) * maxRadius : 0;
    const point = polarToCartesian(cx, cy, radius, angle);
    const lowConfidence = scored && data!.confidence < LOW_CONFIDENCE_THRESHOLD;
    return { key, angle, scored, point, lowConfidence, data };
  });

  const fillPath = pointsToPath(vertices.map((v) => v.point));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          {RING_VALUES.map((ring) => (
            <path
              key={ring}
              d={pointsToPath(regularPolygonPoints(cx, cy, (ring / 100) * maxRadius, AXIS_COUNT))}
              fill="none"
              strokeWidth={1}
              className="stroke-hairline"
            />
          ))}

          {vertices.map((v) => {
            const outer = polarToCartesian(cx, cy, maxRadius, v.angle);
            return (
              <line
                key={`spoke-${v.key}`}
                x1={cx}
                y1={cy}
                x2={outer.x}
                y2={outer.y}
                strokeWidth={1}
                className="stroke-hairline"
              />
            );
          })}

          <path d={fillPath} className="fill-paper/8 stroke-none" />

          {vertices.map((v, i) => {
            const next = vertices[(i + 1) % AXIS_COUNT];
            const dashed = !v.scored || !next.scored || v.lowConfidence || next.lowConfidence;
            return (
              <line
                key={`edge-${v.key}`}
                x1={v.point.x}
                y1={v.point.y}
                x2={next.point.x}
                y2={next.point.y}
                strokeWidth={1.5}
                strokeDasharray={dashed ? "3 3" : undefined}
                className="stroke-paper"
              />
            );
          })}

          {vertices.map((v) =>
            v.scored ? (
              <circle
                key={`vertex-${v.key}`}
                cx={v.point.x}
                cy={v.point.y}
                r={3}
                strokeWidth={1.5}
                className={v.lowConfidence ? "fill-none stroke-paper" : "fill-paper stroke-none"}
              />
            ) : null,
          )}

          {vertices.map((v) => {
            const labelPoint = polarToCartesian(cx, cy, maxRadius + 16, v.angle);
            const cos = Math.cos((v.angle * Math.PI) / 180);
            const sin = Math.sin((v.angle * Math.PI) / 180);
            const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
            const dy = sin < -0.3 ? -4 : sin > 0.3 ? 10 : 4;
            return (
              <text
                key={`label-${v.key}`}
                x={labelPoint.x}
                y={labelPoint.y}
                dy={dy}
                textAnchor={anchor}
                className="fill-mist text-caption"
              >
                {v.scored ? DIMENSION_LABEL[v.key] : "Not scored"}
              </text>
            );
          })}
        </svg>
      </div>

      <details className="text-ui-sm">
        <summary className="cursor-pointer text-mist">Show data table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="border-b border-hairline text-mist">
              <th className="py-1 pr-4 font-medium">Dimension</th>
              <th className="py-1 pr-4 font-medium">Score</th>
              <th className="py-1 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {vertices.map((v) => (
              <tr key={v.key} className="border-b border-hairline last:border-0">
                <td className="py-1 pr-4">{DIMENSION_LABEL[v.key]}</td>
                <td className="py-1 pr-4 tabular-nums">
                  {v.scored ? v.data!.score : "Not scored"}
                </td>
                <td className="py-1 tabular-nums">
                  {v.scored ? confidenceLabel(v.data!.confidence) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export { DimensionRadar };
export type { DimensionRadarProps };
