import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumbs } from "@/components/layout/breadcrumbs";

describe("Breadcrumbs", () => {
  it("links every item except the last, which is marked as the current page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Analyses", href: "/app/analyses" },
          { label: "Loopwell", href: "/app/analyses/ana_1" },
          { label: "Financial" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Analyses" })).toHaveAttribute("href", "/app/analyses");
    expect(screen.getByRole("link", { name: "Loopwell" })).toHaveAttribute(
      "href",
      "/app/analyses/ana_1",
    );
    const current = screen.getByText("Financial");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders a single item as the current page with no link", () => {
    render(<Breadcrumbs items={[{ label: "Dashboard" }]} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toHaveAttribute("aria-current", "page");
  });
});
