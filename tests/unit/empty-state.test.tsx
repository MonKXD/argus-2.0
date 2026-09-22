import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "@/components/argus/empty-state";

describe("EmptyState", () => {
  it("renders the message with no action", () => {
    render(<EmptyState message="Nothing watchlisted yet." />);
    expect(screen.getByText("Nothing watchlisted yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders an href action as a link", () => {
    render(
      <EmptyState
        message="You haven't started an analysis yet."
        action={{ label: "New analysis", href: "/app/analyses/new" }}
      />,
    );
    const link = screen.getByRole("link", { name: "New analysis" });
    expect(link).toHaveAttribute("href", "/app/analyses/new");
  });

  it("renders an onClick action as a button and calls it when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EmptyState message="No matches." action={{ label: "Clear search", onClick }} />);

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
