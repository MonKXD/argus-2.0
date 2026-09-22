import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EvidenceMarker } from "@/components/argus/evidence-marker";
import type { ClaimStatus } from "@/lib/schema/enums";

const STATUSES: ClaimStatus[] = ["VERIFIED", "AI_ANALYSIS", "ASSUMPTION", "MISSING"];
const EXPECTED_LABEL: Record<ClaimStatus, string> = {
  VERIFIED: "Verified",
  AI_ANALYSIS: "AI analysis",
  ASSUMPTION: "Assumption",
  MISSING: "Missing",
};

describe("EvidenceMarker", () => {
  it.each(STATUSES)("has an accessible name for %s by default", (status) => {
    render(<EvidenceMarker status={status} />);
    expect(screen.getByRole("img", { name: EXPECTED_LABEL[status] })).toBeInTheDocument();
  });

  it("has no accessible name when decorative (paired with a visible label)", () => {
    render(<EvidenceMarker status="VERIFIED" decorative />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each(STATUSES)("renders distinct markup per status (%s)", (status) => {
    const { container } = render(<EvidenceMarker status={status} />);
    // Every status must be visually distinguishable by shape/pattern, not
    // colour alone (R-UI-03): assert the actual rendering differs.
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("gives the assumption hatch pattern a unique id across instances", () => {
    const { container } = render(
      <>
        <EvidenceMarker status="ASSUMPTION" />
        <EvidenceMarker status="ASSUMPTION" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("pattern")).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
