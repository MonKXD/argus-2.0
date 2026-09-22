import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EvidenceBar } from "@/components/argus/evidence-bar";

describe("EvidenceBar", () => {
  it("has a text alternative listing counts", () => {
    render(<EvidenceBar counts={{ VERIFIED: 3, AI_ANALYSIS: 1, ASSUMPTION: 2, MISSING: 1 }} />);

    expect(
      screen.getByRole("img", {
        name: "Evidence: 3 verified, 1 AI analysis, 2 assumptions, 1 missing",
      }),
    ).toBeInTheDocument();
  });

  it("uses singular 'assumption' for a count of one", () => {
    render(<EvidenceBar counts={{ ASSUMPTION: 1 }} />);
    expect(screen.getByRole("img", { name: "Evidence: 1 assumption" })).toBeInTheDocument();
  });

  it("renders one segment per non-zero status, none for zero counts", () => {
    const { container } = render(
      <EvidenceBar counts={{ VERIFIED: 3, AI_ANALYSIS: 0, MISSING: 1 }} />,
    );
    const bar = screen.getByRole("img");
    expect(bar.children).toHaveLength(2);
    expect(container.querySelectorAll(".bg-verified")).toHaveLength(1);
  });

  it("says 'none' when every count is zero or absent", () => {
    render(<EvidenceBar counts={{}} />);
    expect(screen.getByRole("img", { name: "Evidence: none" })).toBeInTheDocument();
  });

  it("shows a legend on focus", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<EvidenceBar counts={{ VERIFIED: 2, MISSING: 1 }} />);

    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
    await user.tab();
    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
  });
});
