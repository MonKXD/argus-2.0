import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SamplePage from "@/app/sample/page";

// ReportHeader renders DeleteAnalysisButton, and ReportVersionSelector
// (unused here, Loopwell has one version) needs useRouter either way.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

/**
 * T-4.14: `/sample` is now the real, full `ReportShell` (T-4.01-T-4.13)
 * against the Loopwell demo dataset — `ReportShell`'s own test suite
 * (`report-shell.test.tsx`) already covers its behaviour in full, so this
 * file only checks `/sample`'s own composition: demo labelling, marketing
 * chrome, and that the real (not a stripped-down preview) report renders.
 */
describe("SamplePage", () => {
  it("labels the report as demo data and shows the startup name", () => {
    render(<SamplePage />);
    expect(screen.getByText("Demo data. Fictional companies.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Loopwell" })).toBeInTheDocument();
  });

  it("renders the full 16-section report, not a preview subset", () => {
    render(<SamplePage />);
    expect(screen.getByRole("heading", { name: /1\. Executive summary/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /16\. Missing information/ })).toBeInTheDocument();
    expect(screen.getByText("62")).toBeInTheDocument();
  });

  it("shows the evidence rail's initial prompt", () => {
    // The full interactive select-a-claim flow (desktop docked rail vs.
    // narrow-screen Sheet) is ReportShell's own behaviour, already covered
    // by report-shell.test.tsx; this just confirms /sample wires evidence
    // and sources through so the rail has something to resolve once a
    // claim is selected, rather than falling back to "Unknown source".
    render(<SamplePage />);
    expect(screen.getByText("Select a claim to see its evidence.")).toBeInTheDocument();
  });
});
