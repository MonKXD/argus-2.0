import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NewAnalysisButton } from "@/components/argus/new-analysis-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("NewAnalysisButton", () => {
  it("creates a draft and navigates to the setup wizard", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ analysis: { id: "ana_1" } }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<NewAnalysisButton>New analysis</NewAnalysisButton>);
    await user.click(screen.getByRole("button", { name: "New analysis" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ startup: { name: "Untitled analysis" } }),
      }),
    );
    expect(push).toHaveBeenCalledWith("/app/analyses/ana_1/setup?step=basics");

    vi.unstubAllGlobals();
  });

  it("re-enables the button if creation fails, without navigating", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<NewAnalysisButton>New analysis</NewAnalysisButton>);
    const button = screen.getByRole("button", { name: "New analysis" });
    await user.click(button);

    expect(push).not.toHaveBeenCalled();
    expect(button).not.toBeDisabled();

    vi.unstubAllGlobals();
  });
});
