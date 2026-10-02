import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DisclaimerPage from "@/app/legal/disclaimer/page";
import PrivacyPolicyPage from "@/app/legal/privacy/page";
import TermsPage from "@/app/legal/terms/page";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";

// T-6.09 (PRD section 15, FR-LND-03): SiteFooter's nav links to these three
// routes — confirms each one renders real content, not a 404, and that the
// required verbatim disclaimer text actually appears where PRD section 15
// requires it.

describe("legal pages", () => {
  it("terms of service shows the verbatim disclaimer and links to privacy", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of service" })).toBeInTheDocument();
    expect(screen.getAllByText(DISCLAIMER_TEXT).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("privacy policy names the real third-party processors", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByText(/Google Firebase/)).toBeInTheDocument();
    expect(screen.getByText(/AI model provider/)).toBeInTheDocument();
    expect(screen.getByText(/Sentry/)).toBeInTheDocument();
  });

  it("disclaimer page shows the verbatim required text", () => {
    render(<DisclaimerPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Disclaimer" })).toBeInTheDocument();
    // Appears twice: once in this page's own body, once in the shared
    // SiteFooter every page renders (PRD section 15's "every public page").
    expect(screen.getAllByText(DISCLAIMER_TEXT).length).toBeGreaterThanOrEqual(2);
  });
});
