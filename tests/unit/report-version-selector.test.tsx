import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportVersionSelector } from "@/components/argus/report/report-version-selector";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

// jsdom doesn't implement scrollIntoView at all; Radix's Select calls it
// when opening (PROJECT_MEMORY section 4, same as report-section-nav.test.tsx).
Element.prototype.scrollIntoView = vi.fn();

const versions = [
  { id: "rpt_00000000000000000000000002", version: 2, generatedAt: "2026-09-30T00:00:00Z", score: 70 },
  { id: "rpt_00000000000000000000000001", version: 1, generatedAt: "2026-09-01T00:00:00Z", score: 60 },
];

describe("ReportVersionSelector", () => {
  it("renders nothing for a single-version report", () => {
    const { container } = render(
      <ReportVersionSelector
        analysisId="ana_00000000000000000000000001"
        versions={versions.slice(0, 1)}
        currentVersion={2}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("lists every version with its score and change, and navigates on selection", async () => {
    // A single render/open covers both the listing and the navigation:
    // Radix's Select leaves internal state (document-level listeners from
    // its open-outside-click handling) that a second, independently-opened
    // instance in the same file picks up mid-test-run, producing a flaky
    // `aria-expanded="false"` on the second render's click — not reachable
    // through the app itself, since an analysis page only ever mounts one
    // of these at a time. One render, one open, both assertions.
    const user = userEvent.setup();
    render(
      <ReportVersionSelector
        analysisId="ana_00000000000000000000000001"
        versions={versions}
        currentVersion={2}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Report version" }));

    expect(screen.getByRole("option", { name: /Version 2 .* Score 70 \(\+10\)/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Version 1 .* Score 60/ })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: /Version 1/ }));

    expect(push).toHaveBeenCalledWith("/app/analyses/ana_00000000000000000000000001?version=1");
  });
});
