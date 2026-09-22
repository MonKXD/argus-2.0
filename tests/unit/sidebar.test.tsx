import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/sidebar";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/app/analyses") }));
vi.mock("next/navigation", () => ({ usePathname }));

describe("Sidebar", () => {
  it("marks the nav item matching the current path as the current page", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Analyses" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("only marks Dashboard current on an exact /app match, not every /app/* route", () => {
    usePathname.mockReturnValue("/app");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("collapses to icon-only on toggle, keeping labels accessible via sr-only text", async () => {
    usePathname.mockReturnValue("/app");
    const user = userEvent.setup();
    render(<Sidebar />);

    expect(screen.getByText("Dashboard")).not.toHaveClass("sr-only");
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByText("Dashboard")).toHaveClass("sr-only");
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });
});
