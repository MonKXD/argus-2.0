import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/marketing/site-footer";

// PRD section 15: this exact wording is required verbatim on the landing
// footer, report footer, and every export — pinned so it can't drift.
const DISCLAIMER =
  "ARGUS AI is a research and intelligence tool. It does not provide investment, legal, tax or financial advice, and its outputs are not a substitute for professional due diligence. Verify all material facts independently.";

describe("SiteFooter", () => {
  it("shows the exact required disclaimer text", () => {
    render(<SiteFooter />);
    const paragraph = screen.getByText((_, element) => element?.textContent === DISCLAIMER);
    expect(paragraph).toBeInTheDocument();
  });
});
