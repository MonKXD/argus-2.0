import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalysesTable } from "@/components/dashboard/analyses-table";
import { demoAnalyses } from "@/demo";

describe("AnalysesTable", () => {
  it("shows name, stage, sector, score+confidence and status for every analysis", () => {
    render(<AnalysesTable analyses={demoAnalyses} />);

    expect(screen.getByRole("link", { name: "Loopwell" })).toHaveAttribute(
      "href",
      expect.stringContaining("/app/analyses/"),
    );
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByText("(Medium)")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });

  it("shows an em dash for a score-less (insufficient-evidence) analysis", () => {
    render(<AnalysesTable analyses={demoAnalyses} />);
    const nimbusRow = screen.getByRole("link", { name: "Nimbus Ledger" }).closest("tr");
    expect(nimbusRow).toHaveTextContent("—");
  });

  it("shows the empty message when there are no analyses", () => {
    render(<AnalysesTable analyses={[]} />);
    expect(screen.getByText("No analyses yet.")).toBeInTheDocument();
  });
});
