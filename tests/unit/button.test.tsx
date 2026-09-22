import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders its label and responds to a click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("the destructive variant uses ink text on ember, not white (T-1.17: white failed WCAG AA at 3.06:1)", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("text-ink");
    expect(button.className).not.toContain("text-white");
  });
});
