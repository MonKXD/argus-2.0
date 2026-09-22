import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DemoBanner } from "@/components/argus/demo-banner";

describe("DemoBanner", () => {
  it("shows the exact plain-text label from DESIGN section 6", () => {
    render(<DemoBanner />);
    expect(screen.getByText("Demo data. Fictional companies.")).toBeInTheDocument();
  });
});
