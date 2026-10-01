import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import WatchlistPage from "@/app/app/watchlist/page";
import { demoAnalyses } from "@/demo";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("WatchlistPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only the owner's watchlisted analyses (FR-WCH-01/APP_FLOW 5.7)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ analyses: demoAnalyses }))));
    render(<WatchlistPage />);

    expect(await screen.findByRole("link", { name: "Loopwell" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Verdant Grid" })).not.toBeInTheDocument();
  });

  it("shows a designed empty state when nothing is watchlisted", async () => {
    const noneWatchlisted = demoAnalyses.map((a) => ({ ...a, isWatchlisted: false }));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({ analyses: noneWatchlisted }))));
    render(<WatchlistPage />);

    expect(await screen.findByText("Nothing watchlisted yet.")).toBeInTheDocument();
  });

  it("shows an error with Retry when the request fails, and recovers on retry", async () => {
    let shouldFail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        if (shouldFail) return Promise.resolve(new Response("{}", { status: 500 }));
        return Promise.resolve(jsonResponse({ analyses: demoAnalyses }));
      }),
    );
    const user = userEvent.setup();
    render(<WatchlistPage />);

    expect(await screen.findByText("Couldn't load your watchlist. Try again.")).toBeInTheDocument();
    shouldFail = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("link", { name: "Loopwell" })).toBeInTheDocument();
  });
});
