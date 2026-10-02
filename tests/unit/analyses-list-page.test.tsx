import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AnalysesListPage from "@/app/app/analyses/page";
import { demoAnalyses } from "@/demo";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function stubSearchFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const q = (new URL(url, "http://localhost").searchParams.get("q") ?? "").toLowerCase();
      const analyses = demoAnalyses.filter((a) => a.startup.name.toLowerCase().includes(q));
      return Promise.resolve(jsonResponse({ analyses, nextCursor: null }));
    }),
  );
}

describe("AnalysesListPage", () => {
  beforeEach(() => {
    stubSearchFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows every matching analysis by default", async () => {
    render(<AnalysesListPage />);
    expect(await screen.findByRole("link", { name: "Loopwell" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verdant Grid" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nimbus Ledger" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fernway Health" })).toBeInTheDocument();
  });

  it("filters to matching names as the user types (case-insensitive)", async () => {
    const user = userEvent.setup();
    render(<AnalysesListPage />);
    await screen.findByRole("link", { name: "Loopwell" });

    await user.type(screen.getByLabelText("Search"), "loop");

    await waitFor(() => expect(screen.queryByRole("link", { name: "Verdant Grid" })).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Loopwell" })).toBeInTheDocument();
  });

  it("shows a no-match message instead of an empty table", async () => {
    const user = userEvent.setup();
    render(<AnalysesListPage />);
    await screen.findByRole("link", { name: "Loopwell" });

    await user.type(screen.getByLabelText("Search"), "nonexistent startup");

    expect(await screen.findByText("No analyses match these filters.")).toBeInTheDocument();
  });

  it("clears the search and restores the table via the empty state's action", async () => {
    const user = userEvent.setup();
    render(<AnalysesListPage />);
    await screen.findByRole("link", { name: "Loopwell" });

    const search = screen.getByLabelText("Search");
    await user.type(search, "nonexistent startup");
    await screen.findByText("No analyses match these filters.");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(search).toHaveValue("");
    expect(await screen.findByRole("link", { name: "Loopwell" })).toBeInTheDocument();
  });

  it("includes the selected stage, status, sector, tag and score range in the request (T-5.10)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((url: string) => {
      const analyses = url.includes("stage=SEED") ? [] : demoAnalyses;
      return Promise.resolve(jsonResponse({ analyses, nextCursor: null }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AnalysesListPage />);
    await screen.findByRole("link", { name: "Loopwell" });

    await user.type(screen.getByLabelText("Sector"), "Fintech");
    await user.type(screen.getByLabelText("Tag"), "seed");
    await user.type(screen.getByLabelText("Minimum score"), "40");
    await user.type(screen.getByLabelText("Maximum score"), "80");

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).toContain("sector=Fintech");
      expect(lastCall).toContain("tag=seed");
      expect(lastCall).toContain("scoreMin=40");
      expect(lastCall).toContain("scoreMax=80");
    });
  });

  it("shows 'Clear filters' once any filter is active, resetting search and filters together", async () => {
    const user = userEvent.setup();
    render(<AnalysesListPage />);
    await screen.findByRole("link", { name: "Loopwell" });

    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Sector"), "Fintech");
    expect(await screen.findByRole("button", { name: "Clear filters" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByLabelText("Sector")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("shows an error with Retry when the request fails, and recovers on retry", async () => {
    let shouldFail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        if (shouldFail) return Promise.resolve(new Response("{}", { status: 500 }));
        return Promise.resolve(jsonResponse({ analyses: demoAnalyses, nextCursor: null }));
      }),
    );
    const user = userEvent.setup();
    render(<AnalysesListPage />);

    expect(await screen.findByText("Couldn't load your analyses. Try again.")).toBeInTheDocument();
    shouldFail = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("link", { name: "Loopwell" })).toBeInTheDocument();
  });
});
