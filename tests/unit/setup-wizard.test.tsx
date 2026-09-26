import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const NO_SOURCES_RESPONSE = () => new Response(JSON.stringify({ sources: [] }), { status: 200 });

describe("SetupWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = "basics";
    // `SetupWizard` now owns one `useSourceUpload` instance for the whole
    // wizard (so Review's "at least one source" check and Sources' own
    // list agree) — it fetches on mount regardless of which step is
    // showing, so every test needs at least this baseline response. Tests
    // that care about a specific fetch (a PATCH, or starting a run)
    // override this with their own URL-branching mock.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(NO_SOURCES_RESPONSE()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the Basics step by default and shows the step nav", () => {
    render(<SetupWizard analysis={draftAnalysis} />);
    expect(screen.getByLabelText("Startup name")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Setup progress" })).toBeInTheDocument();
  });

  it("blocks Next on Basics when the name is empty", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(NO_SOURCES_RESPONSE());
    vi.stubGlobal("fetch", fetchMock);

    render(<SetupWizard analysis={draftAnalysis} />);
    await user.clear(screen.getByLabelText("Startup name"));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Startup name is required.");
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "PATCH" }));
    expect(push).not.toHaveBeenCalled();
  });

  it("saves Basics via PATCH and advances to Sources on a valid Next", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        String(url).endsWith("/sources")
          ? NO_SOURCES_RESPONSE()
          : new Response(JSON.stringify({ analysis: draftAnalysis }), { status: 200 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SetupWizard analysis={draftAnalysis} />);
    await user.type(screen.getByLabelText("Startup name"), "Acme Robotics");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/analyses/${draftAnalysis.id}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(push).toHaveBeenCalledWith(`/app/analyses/${draftAnalysis.id}/setup?step=sources`);
  });

  it("does not call PATCH when leaving the Sources step (nothing to save)", async () => {
    currentStep = "sources";
    const user = userEvent.setup();
    render(<SetupWizard analysis={draftAnalysis} />);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(push).toHaveBeenCalledWith(`/app/analyses/${draftAnalysis.id}/setup?step=options`);
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
  });

  it("has no Next button and a disabled Start analysis button when there is no usable source yet", async () => {
    currentStep = "review";
    render(<SetupWizard analysis={draftAnalysis} />);

    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Start analysis" })).toBeDisabled();
  });

  it("enables Start analysis once a usable source exists, and starts a run on click", async () => {
    currentStep = "review";
    const fetchMock = vi.fn((url: string) => {
      if (String(url).endsWith("/sources")) {
        return Promise.resolve(
          new Response(JSON.stringify({ sources: [{ id: "src_1", status: "PARSED" }] }), { status: 200 }),
        );
      }
      if (String(url).endsWith("/runs")) {
        return Promise.resolve(new Response(JSON.stringify({ runId: "run_1" }), { status: 202 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<SetupWizard analysis={draftAnalysis} />);

    const startButton = await screen.findByRole("button", { name: "Start analysis" });
    expect(startButton).toBeEnabled();

    await user.click(startButton);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/analyses/${draftAnalysis.id}/runs`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Idempotency-Key": expect.any(String) }),
      }),
    );
    expect(push).toHaveBeenCalledWith(`/app/analyses/${draftAnalysis.id}`);
  });

  it("shows an error and re-enables the button when starting a run fails", async () => {
    currentStep = "review";
    const fetchMock = vi.fn((url: string) => {
      if (String(url).endsWith("/sources")) {
        return Promise.resolve(
          new Response(JSON.stringify({ sources: [{ id: "src_1", status: "PARSED" }] }), { status: 200 }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ error: { message: "You have 2 analyses running already." } }), {
          status: 422,
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<SetupWizard analysis={draftAnalysis} />);

    const startButton = await screen.findByRole("button", { name: "Start analysis" });
    await user.click(startButton);

    expect(await screen.findByRole("alert")).toHaveTextContent("You have 2 analyses running already.");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start analysis" })).toBeEnabled();
  });

  it("disables Back on the first step", () => {
    render(<SetupWizard analysis={draftAnalysis} />);
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });
});
