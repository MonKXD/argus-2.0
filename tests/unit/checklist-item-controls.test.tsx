import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChecklistItemControls } from "@/components/argus/checklist-item-controls";
import type { ChecklistItem } from "@/lib/schema/claims";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

// jsdom gaps Radix's Select needs — same as report-version-selector.test.tsx.
Element.prototype.scrollIntoView = vi.fn();

const item: ChecklistItem = {
  id: "chk_00000000000000000000000001",
  dimension: "financial",
  priority: "HIGH",
  question: "What is the total addressable market for embedded fintech tools targeting freelancers?",
  whyItMatters: "Assesses the sizing of the opportunity.",
  suggestedSource: "Third-party market research",
  linkedClaimIds: [],
  status: "OPEN",
};

describe("ChecklistItemControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // The Select interaction runs first in this file, and every other test's
  // assertions that don't need to open it are folded in here too: Radix's
  // Select leaves state that a later, separately-rendered instance in the
  // same file picks up mid-run (the exact flake documented for
  // ReportVersionSelector, PROJECT_MEMORY section 4/D-078) — not reachable
  // through the app, which only ever mounts one of these at a time.
  it("shows the status selector and an empty note field, and changes status on selection", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ item: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChecklistItemControls analysisId="ana_1" reportId="rpt_1" item={item} />);

    expect(
      screen.getByRole("combobox", { name: `Status for "${item.question}"` }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: `Note for "${item.question}"` })).toHaveValue("");

    await user.click(screen.getByRole("combobox", { name: `Status for "${item.question}"` }));
    await user.click(screen.getByRole("option", { name: "Received" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyses/ana_1/reports/rpt_1/checklist/chk_00000000000000000000000001",
      expect.objectContaining({ body: JSON.stringify({ status: "RECEIVED" }) }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("disables Save note until the note is edited", async () => {
    const user = userEvent.setup();
    render(<ChecklistItemControls analysisId="ana_1" reportId="rpt_1" item={item} />);

    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: `Note for "${item.question}"` }), "Waiting");

    expect(screen.getByRole("button", { name: "Save note" })).toBeEnabled();
  });

  it("saves the note on click", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ item: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ChecklistItemControls analysisId="ana_1" reportId="rpt_1" item={item} />);

    await user.type(screen.getByRole("textbox", { name: `Note for "${item.question}"` }), "Got it");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyses/ana_1/reports/rpt_1/checklist/chk_00000000000000000000000001",
      expect.objectContaining({ body: JSON.stringify({ userNote: "Got it" }) }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
});
