import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/argus/status-badge";

describe("StatusBadge", () => {
  it("shows the default label for a status", () => {
    render(<StatusBadge status="VERIFIED" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("supports a label override (D-004: Sourced vs Verified)", () => {
    render(<StatusBadge status="VERIFIED" label="Sourced" />);
    expect(screen.getByText("Sourced")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it("only shows the icon at the large size", () => {
    const { container: small } = render(<StatusBadge status="AI_ANALYSIS" size="sm" />);
    const { container: large } = render(<StatusBadge status="AI_ANALYSIS" size="lg" />);

    expect(small.querySelectorAll("svg")).toHaveLength(1); // marker only
    expect(large.querySelectorAll("svg")).toHaveLength(2); // marker + icon
  });

  it("does not double-announce: the marker is decorative, the text carries the name", () => {
    render(<StatusBadge status="MISSING" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Missing")).toBeInTheDocument();
  });
});
