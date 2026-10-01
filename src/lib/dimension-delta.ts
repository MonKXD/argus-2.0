/**
 * FR-CMP-02's "score table with deltas": each non-baseline startup's
 * dimension score relative to the comparison's first item (the baseline,
 * matching `items[0]`'s own creation-time order — not an average or a
 * pairwise matrix, same single-baseline convention `ReportVersionSelector`
 * already uses for a report version's delta from the one before it).
 * `null` when either side is unscored — a delta against "unscored" has no
 * meaningful value.
 */
export function dimensionDelta(baseline: number | null, value: number | null): number | null {
  if (baseline == null || value == null) return null;
  return value - baseline;
}
