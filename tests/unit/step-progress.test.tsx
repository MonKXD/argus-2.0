import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StepProgress } from "@/components/argus/step-progress";

describe("StepProgress", () => {
  it("renders only the steps present, in canonical order, with their labels", () => {
    render(
      <StepProgress
        steps={{
          INGEST: { status: "DONE" },
          RESEARCH: { status: "RUNNING" },
          SCORE: { status: "PENDING" },
        }}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["Ingest sources", "Research", "Score"]);
  });

  it("shows step counters when present", () => {
    render(
      <StepProgress
        steps={{ EXTRACT_FACTS: { status: "DONE", counters: { evidence: 212, facts: 64 } } }}
      />,
    );
    expect(screen.getByText(/212 evidence, 64 facts/)).toBeInTheDocument();
  });

  it("is a live region so step changes are announced", () => {
    render(<StepProgress steps={{ INGEST: { status: "DONE" } }} />);
    expect(screen.getByRole("list")).toHaveAttribute("aria-live", "polite");
  });
});
