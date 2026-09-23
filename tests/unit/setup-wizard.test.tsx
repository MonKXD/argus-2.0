import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SetupWizard } from "@/components/argus/setup-wizard/setup-wizard";
import { loopwellAnalysis } from "@/demo/loopwell";

const push = vi.fn();
let currentStep = "basics";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(`step=${currentStep}`),
}));

const draftAnalysis = {
  ...loopwellAnalysis,
  startup: { ...loopwellAnalysis.startup, name: "Untitled analysis", oneLiner: undefined },
  options: { webResearch: true },
};

describe("SetupWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = "basics";
  });

  it("renders the Basics step by default and shows the step nav", () => {
    render(<SetupWizard analysis={draftAnalysis} />);
    expect(screen.getByLabelText("Startup name")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Setup progress" })).toBeInTheDocument();
  });

  it("blocks Next on Basics when the name is empty", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SetupWizard analysis={draftAnalysis} />);
    await user.clear(screen.getByLabelText("Startup name"));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Startup name is required.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("saves Basics via PATCH and advances to Sources on a valid Next", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ analysis: draftAnalysis }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SetupWizard analysis={draftAnalysis} />);
    await user.type(screen.getByLabelText("Startup name"), "Acme Robotics");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/analyses/${draftAnalysis.id}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(push).toHaveBeenCalledWith(`/app/analyses/${draftAnalysis.id}/setup?step=sources`);

    vi.unstubAllGlobals();
  });

  it("does not call PATCH when leaving the Sources step (nothing to save)", async () => {
    currentStep = "sources";
    const user = userEvent.setup();
    // SourcesStep's own useSourceUpload GET-on-mount is real, legitimate
    // fetch activity — this test only asserts that leaving the step never
    // triggers a save (PATCH).
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ sources: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SetupWizard analysis={draftAnalysis} />);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(push).toHaveBeenCalledWith(`/app/analyses/${draftAnalysis.id}/setup?step=options`);

    vi.unstubAllGlobals();
  });

  it("shows a save error and does not advance when PATCH fails", async () => {
    currentStep = "options";
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Server error." } }), { status: 500 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SetupWizard analysis={draftAnalysis} />);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server error.");
    expect(push).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("has no Next button and a disabled Start analysis button on Review", () => {
    currentStep = "review";
    render(<SetupWizard analysis={draftAnalysis} />);

    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start analysis" })).toBeDisabled();
  });

  it("disables Back on the first step", () => {
    render(<SetupWizard analysis={draftAnalysis} />);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });
});
