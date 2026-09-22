import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MobileBottomBar } from "@/components/shell/mobile-bottom-bar";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/app") }));
vi.mock("next/navigation", () => ({ usePathname }));

describe("MobileBottomBar", () => {
  it("shows Dashboard, Analyses, New, Compare and More per APP_FLOW section 10", () => {
    render(<MobileBottomBar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analyses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New analysis" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("reveals Watchlist and Settings behind More, since only five slots fit", async () => {
    const user = userEvent.setup();
    render(<MobileBottomBar />);

    expect(screen.queryByRole("link", { name: "Watchlist" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(await screen.findByRole("link", { name: "Watchlist" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });
});
