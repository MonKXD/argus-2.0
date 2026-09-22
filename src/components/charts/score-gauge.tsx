import { describeArc, polarToCartesian } from "@/components/charts/geometry";
import { confidenceLabel } from "@/lib/confidence";
import { cn } from "@/lib/utils";

/**
 * DESIGN section 7: 270deg arc, 10px stroke, track Surface 3, value Paper,
 * ticks at 25/50/75 in Haze. Numeral in Newsreader 72, "of 100" beneath. A
 * five-segment confidence meter with a label sits under the number. Not
 * scored: dashed arc, "Not scored", and the reason. Capped: "Capped at 60:
 * open critical flag" instead of the confidence line.
 *
 * The arc is decorative (aria-hidden) — the real accessible content is the
 * visible text (numeral, "of 100", confidence/capped/not-scored line),
 * same pattern as StatusBadge's decorative marker + real text label.
 */

const START_ANGLE = 135;
const SWEEP = 270;
const TICKS = [25, 50, 75];
const SEGMENT_COUNT = 5;

function angleForValue(value: number): number {
  return START_ANGLE + SWEEP * (value / 100);
}

interface ScoreGaugeBaseProps {
  size?: number;
  className?: string;
}

interface ScoreGaugeScoredProps extends ScoreGaugeBaseProps {
  score: number;
  /** 0 to 1. Required unless `cappedReason` is set. */
  confidence?: number;
  /** If set, the gauge shows "Capped at {score}: {cappedReason}" instead of confidence. */
  cappedReason?: string;
  notScoredReason?: never;
}

interface ScoreGaugeNotScoredProps extends ScoreGaugeBaseProps {
  score?: never;
  confidence?: never;
  cappedReason?: never;
  notScoredReason: string;
}

type ScoreGaugeProps = ScoreGaugeScoredProps | ScoreGaugeNotScoredProps;

function ScoreGauge({ size = 160, className, ...props }: ScoreGaugeProps) {
  const strokeWidth = 10;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - strokeWidth / 2 - 6;

  const trackPath = describeArc(cx, cy, radius, START_ANGLE, START_ANGLE + SWEEP);
  const notScored = "notScoredReason" in props && props.notScoredReason !== undefined;
  const score = "score" in props ? props.score : undefined;
  const valuePath =
    score !== undefined ? describeArc(cx, cy, radius, START_ANGLE, angleForValue(score)) : null;

  const tickRadiusOuter = radius + strokeWidth / 2 + 3;
  const tickRadiusInner = radius + strokeWidth / 2 - 1;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <path
            d={trackPath}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={notScored ? "4 4" : undefined}
            className="stroke-surface-3"
          />
          {valuePath && (
            <path d={valuePath} fill="none" strokeWidth={strokeWidth} className="stroke-paper" />
          )}
          {!notScored &&
            TICKS.map((tick) => {
              const angle = angleForValue(tick);
              const inner = polarToCartesian(cx, cy, tickRadiusInner, angle);
              const outer = polarToCartesian(cx, cy, tickRadiusOuter, angle);
              return (
                <line
                  key={tick}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  strokeWidth={1.5}
                  className="stroke-haze"
                />
              );
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
          {notScored ? (
            <span className="text-ui font-medium text-foreground">Not scored</span>
          ) : (
            <>
              <span className="font-serif text-numeral tabular-nums text-foreground">{score}</span>
              <span className="text-ui-sm text-mist">of 100</span>
            </>
          )}
        </div>
      </div>

      {notScored && (
        <p className="max-w-48 text-center text-ui-sm text-mist">
          {"notScoredReason" in props ? props.notScoredReason : null}
        </p>
      )}

      {!notScored && "cappedReason" in props && props.cappedReason && (
        <p className="max-w-48 text-center text-ui-sm text-mist">
          Capped at {score}: {props.cappedReason}
        </p>
      )}

      {!notScored &&
        "confidence" in props &&
        props.confidence !== undefined &&
        !props.cappedReason && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
                const filled = i < Math.round(props.confidence! * SEGMENT_COUNT);
                return (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-3 rounded-pill",
                      filled ? "bg-paper" : "bg-panel-raised",
                    )}
                  />
                );
              })}
            </div>
            <span className="text-ui-sm text-mist">
              Confidence: {confidenceLabel(props.confidence)}
            </span>
          </div>
        )}
    </div>
  );
}

export { ScoreGauge };
export type { ScoreGaugeProps };
