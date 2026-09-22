import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import AnalysesListPage from "@/app/app/analyses/page";

describe("AnalysesListPage", () => {
  it("shows every demo analysis by default", () => {
    render(<AnalysesListPage />);
    expect(screen.getByRole("link", { name: "Loopwell" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verdant Grid" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nimbus Ledger" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fernway Health" })).toBeInTheDocument();
  });

  it("filters to matching names as the user types (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<AnalysesListPage />);

    await user.type(screen.getByLabelText("Search"), "loop");
    expect(screen.getByRole("link", { name: "Loopwell" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Verdant Grid" })).not.toBeInTheDocument();
  });

  it("shows a no-match message instead of an empty table", async () => {
    const user = userEvent.setup();
    render(<AnalysesListPage />);

    await user.type(screen.getByLabelText("Search"), "nonexistent startup");
    expect(screen.getByText('No analyses match "nonexistent startup".')).toBeInTheDocument();
  });

  it("clears the search and restores the table via the empty state's action", async () => {
    const user = userEvent.setup();
    render(<AnalysesListPage />);

    const search = screen.getByLabelText("Search");
    await user.type(search, "nonexistent startup");
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(search).toHaveValue("");
    expect(screen.getByRole("link", { name: "Loopwell" })).toBeInTheDocument();
  });
});
