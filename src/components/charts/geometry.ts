/** Shared polar/arc math for SVG charts (ScoreGauge, DimensionRadar). */

export interface Point {
  x: number;
  y: number;
}

// Math.cos/Math.sin can differ in their last bit between the server's V8
// build and the browser's, which turns into a real hydration mismatch once
// embedded verbatim in an SSR'd SVG path string. Rounding collapses those
// sub-visible differences so server and client always agree.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** `angleDeg` in the SVG convention: 0deg = 3 o'clock, clockwise (y-down). */
export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) };
}

/** SVG arc path `d` for a circular arc, sweeping clockwise from startAngle to endAngle. */
export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

/** `count` points evenly spaced around a circle, starting at `startAngle`. */
export function regularPolygonPoints(
  cx: number,
  cy: number,
  r: number,
  count: number,
  startAngle = -90,
): Point[] {
  return Array.from({ length: count }, (_, i) =>
    polarToCartesian(cx, cy, r, startAngle + (360 / count) * i),
  );
}

export function pointsToPath(points: Point[], close = true): string {
  const [first, ...rest] = points;
  if (!first) return "";
  const segments = rest.map((p) => `L ${p.x} ${p.y}`);
  return `M ${first.x} ${first.y} ${segments.join(" ")}${close ? " Z" : ""}`;
}
