import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { FilterBar } from "@/components/argus/filter-bar";

describe("FilterBar", () => {
  // jsdom doesn't implement scrollIntoView; Radix Select calls it when an
  // item scrolls into view on open (same gap report-section-nav.test.tsx
  // already stubs per-file).
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  // Radix Select is flaky across repeated renders/opens within one jsdom
  // test file (PROJECT_MEMORY section 4's established gotcha) — the one
  // test that opens a Select goes first, so no earlier render's mount-only
  // Select instance can leave state this one's open trips on.
  it("selecting a stage reports the real enum value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar filters={{}} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: /stage/i }));
    await user.click(screen.getByRole("option", { name: "Seed" }));
    expect(onChange).toHaveBeenLastCalledWith({ stage: "SEED" });
  });

  it("shows no Clear filters button when nothing is set", () => {
    render(<FilterBar filters={{}} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("shows a Clear filters button once a filter is active, resetting to {} on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar filters={{ sector: "Fintech" }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("updates sector, tag and score fields as free text", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterBar filters={{}} onChange={onChange} />);

    await user.type(screen.getByLabelText("Sector"), "F");
    expect(onChange).toHaveBeenLastCalledWith({ sector: "F" });

    await user.type(screen.getByLabelText("Minimum score"), "4");
    expect(onChange).toHaveBeenLastCalledWith({ scoreMin: "4" });
  });
});
