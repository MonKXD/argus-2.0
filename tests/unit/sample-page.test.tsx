import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import SamplePage from "@/app/sample/page";

describe("SamplePage", () => {
  it("labels the report as demo data and shows the startup name", () => {
    render(<SamplePage />);
    expect(screen.getByText("Demo data. Fictional companies.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Loopwell" })).toBeInTheDocument();
  });

  it("shows the score and both narrative sections", () => {
    render(<SamplePage />);
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Executive summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Investment overview" })).toBeInTheDocument();
  });

  it("defaults the evidence rail to the first executive-summary claim", () => {
    render(<SamplePage />);
    expect(
      screen.getByText(/Loopwell reached \$2\.0M in annual recurring revenue”/),
    ).toBeInTheDocument();
    expect(screen.getByText("Provided")).toBeInTheDocument();
  });

  it("updates the evidence rail when a different claim is selected", async () => {
    const user = userEvent.setup();
    render(<SamplePage />);

    await user.click(screen.getByRole("button", { name: /current monthly burn rate/ }));
    expect(screen.getByText(/Needed: Monthly burn rate/)).toBeInTheDocument();
  });
});
