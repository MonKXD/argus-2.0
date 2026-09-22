/**
 * Rounds to 2 decimal places, nudged by a small epsilon to counteract
 * IEEE-754 accumulation error landing an exact `.xx5` value (e.g. summing
 * `0.5*1 + 0.3*0.25 + 0.2*0`, mathematically exactly 0.575) just under its
 * true boundary as a float (0.43499999999999994, 0.574999999999...),
 * which `Math.round(value * 100) / 100` alone rounds the wrong way.
 * Verified against both AI_SPEC 5.2's and 5.3's worked golden-test values,
 * which land on exactly this boundary, plus ordinary non-boundary cases.
 *
 * The epsilon (1e-9) is far larger than realistic float noise from a
 * handful of arithmetic operations (~1e-15) but far smaller than the 0.005
 * threshold that would flip a genuine rounding decision — with one known,
 * accepted limitation: an input engineered to sit within ~1e-9 of a `.xx5`
 * boundary is indistinguishable from drifted noise and rounds up either
 * way. Every input in this codebase is a sum of at-most-4-decimal-place
 * weights/scores, so that case doesn't arise in practice.
 */
const EPSILON = 1e-9;

export function round2(value: number): number {
  return Math.round((value + EPSILON) * 100) / 100;
}
