import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TableSkeleton } from "@/components/argus/table-skeleton";
import { KpiStripSkeleton } from "@/components/dashboard/kpi-strip";

// DESIGN section 6: skeletons render at final-layout size with no shimmer
// and no live trigger yet in Phase 1 (see PROJECT_MEMORY) — these tests
// only cover the static shape, matching the real KpiStrip/AnalysesTable
// column counts.

describe("KpiStripSkeleton", () => {
  it("renders four placeholder columns", () => {
    const { container } = render(<KpiStripSkeleton />);
    expect(container.querySelectorAll(":scope > div > div")).toHaveLength(4);
  });
});

describe("TableSkeleton", () => {
  it("renders the requested number of rows and columns", () => {
    const { container } = render(<TableSkeleton columns={6} rows={3} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.querySelectorAll("td")).toHaveLength(6);
  });

  it("defaults to 5 rows", () => {
    const { container } = render(<TableSkeleton columns={2} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
  });
});
