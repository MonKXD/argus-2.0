import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ReportTour } from "@/components/marketing/report-tour";

describe("ReportTour", () => {
  it("shows the Score tab (the real ScoreGauge) by default", () => {
    render(<ReportTour />);
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByText("Confidence: Medium")).toBeInTheDocument();
  });

  it("switches to the Founder tab's real dimension claims on click", async () => {
    const user = userEvent.setup();
    render(<ReportTour />);

    await user.click(screen.getByRole("tab", { name: "Founder" }));
    expect(screen.getByText(/previously built payments infrastructure/)).toBeInTheDocument();
  });

  it("switches to the Evidence tab's real EvidenceRailContent on click", async () => {
    const user = userEvent.setup();
    render(<ReportTour />);

    await user.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(screen.getByText("Provided")).toBeInTheDocument();
  });
});
