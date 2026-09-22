import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InlineError } from "@/components/argus/inline-error";

describe("InlineError", () => {
  it("renders the message with role alert and no retry button", () => {
    render(<InlineError message="The sector-mix panel couldn't load." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("The sector-mix panel couldn't load.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a Retry button and calls onRetry when clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<InlineError message="Couldn't load analyses." onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
