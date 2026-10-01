import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerateNarrativeButton } from "@/components/argus/compare/generate-narrative-button";

const generate = vi.fn();
const useGenerateComparisonNarrative = vi.fn();

vi.mock("@/hooks/use-generate-comparison-narrative", () => ({
  useGenerateComparisonNarrative: (...args: unknown[]) => useGenerateComparisonNarrative(...args),
}));

describe("GenerateNarrativeButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGenerateComparisonNarrative.mockReturnValue({ generating: false, error: null, generate });
  });

  it("labels itself 'Generate narrative' when none exists yet", () => {
    render(<GenerateNarrativeButton comparisonId="cmp_1" hasNarrative={false} />);
    expect(screen.getByRole("button", { name: "Generate narrative" })).toBeInTheDocument();
  });

  it("labels itself 'Regenerate narrative' when one already exists", () => {
    render(<GenerateNarrativeButton comparisonId="cmp_1" hasNarrative={true} />);
    expect(screen.getByRole("button", { name: "Regenerate narrative" })).toBeInTheDocument();
  });

  it("calls generate() on click", async () => {
    const user = userEvent.setup();
    render(<GenerateNarrativeButton comparisonId="cmp_1" hasNarrative={false} />);

    await user.click(screen.getByRole("button"));

    expect(generate).toHaveBeenCalledOnce();
  });

  it("disables the button and shows a generating label while in flight", () => {
    useGenerateComparisonNarrative.mockReturnValue({ generating: true, error: null, generate });
    render(<GenerateNarrativeButton comparisonId="cmp_1" hasNarrative={false} />);
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
  });

  it("shows the error message when present", () => {
    useGenerateComparisonNarrative.mockReturnValue({
      generating: false,
      error: "Couldn't generate a narrative. Try again.",
      generate,
    });
    render(<GenerateNarrativeButton comparisonId="cmp_1" hasNarrative={false} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't generate a narrative. Try again.");
  });
});
