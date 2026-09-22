import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Hero } from "@/components/marketing/hero";

describe("Hero", () => {
  it("shows the exact DESIGN section 5.6 headline and sub copy", () => {
    render(<Hero />);
    expect(screen.getByText("Every claim, traced to its source.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "ARGUS reads a pitch deck, a website and your notes, then marks what it verified, what it inferred, what it assumed, and what is still missing.",
      ),
    ).toBeInTheDocument();
  });

  it("links both CTAs to real destinations, with no trailing arrow text (R-UI-06)", () => {
    render(<Hero />);
    const start = screen.getByRole("link", { name: "Start an analysis" });
    const sample = screen.getByRole("link", { name: "See a sample report" });
    expect(start).toHaveAttribute("href", "/app/analyses/new");
    expect(sample).toHaveAttribute("href", "/sample");
  });

  it("shows one real Loopwell claim per status, via the real ClaimInline component", () => {
    render(<Hero />);
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText(/reached \$2\.0M in annual recurring revenue/)).toBeInTheDocument();
  });

  it("resolves a real evidence citation (source + locator) from the demo dataset", () => {
    render(<Hero />);
    expect(screen.getByText(/Evidence: Loopwell — Seed deck\.pdf, page 7/)).toBeInTheDocument();
  });
});
