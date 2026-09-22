import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ClaimInline } from "@/components/argus/claim-inline";
import type { Claim } from "@/lib/schema/claims";

const verifiedClaim: Claim = {
  id: "clm_00000000000000000000000001",
  text: "ARR is $2.0M.",
  confidence: 0.7,
  entities: [],
  status: "VERIFIED",
  quotes: [
    { evidenceId: "ev_00000000000000000000000001", quote: "ARR is $2.0M" },
    { evidenceId: "ev_00000000000000000000000002", quote: "confirmed again" },
  ],
};

const missingClaim: Claim = {
  id: "clm_00000000000000000000000002",
  text: "Burn rate is not disclosed.",
  confidence: 0,
  entities: [],
  status: "MISSING",
  missing: { whatIsNeeded: "Burn rate", suggestedSource: "Financials", priority: "HIGH" },
};

describe("ClaimInline", () => {
  it("shows the claim text, a status marker, and the source count", () => {
    render(<ClaimInline claim={verifiedClaim} />);
    expect(screen.getByText("ARR is $2.0M.")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Verified" })).toBeInTheDocument();
  });

  it("omits the source count affordance when there are no sources", () => {
    render(<ClaimInline claim={missingClaim} />);
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
  });

  it("renders as plain text (no button) when onSelect is omitted", () => {
    render(<ClaimInline claim={verifiedClaim} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders as a button and calls onSelect with the claim when interactive", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ClaimInline claim={verifiedClaim} onSelect={onSelect} />);

    const button = screen.getByRole("button");
    await user.click(button);
    expect(onSelect).toHaveBeenCalledWith(verifiedClaim);
  });

  it("marks the selected claim with aria-pressed", () => {
    render(<ClaimInline claim={verifiedClaim} onSelect={vi.fn()} selected />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});
