import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WatchlistToggleButton } from "@/components/argus/watchlist-toggle-button";

const toggle = vi.fn();
const useToggleWatchlist = vi.fn();

vi.mock("@/hooks/use-toggle-watchlist", () => ({
  useToggleWatchlist: (...args: unknown[]) => useToggleWatchlist(...args),
}));

describe("WatchlistToggleButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToggleWatchlist.mockReturnValue({ toggling: false, error: null, toggle });
  });

  it("labels itself 'Add to watchlist' when not yet watchlisted", () => {
    render(<WatchlistToggleButton analysisId="ana_1" isWatchlisted={false} />);
    expect(screen.getByRole("button", { name: "Add to watchlist" })).toBeInTheDocument();
  });

  it("labels itself 'Remove from watchlist' when already watchlisted", () => {
    render(<WatchlistToggleButton analysisId="ana_1" isWatchlisted={true} />);
    expect(screen.getByRole("button", { name: "Remove from watchlist" })).toBeInTheDocument();
  });

  it("requests the opposite of the current state", () => {
    render(<WatchlistToggleButton analysisId="ana_1" isWatchlisted={false} />);
    expect(useToggleWatchlist).toHaveBeenCalledWith("ana_1", true);
  });

  it("calls toggle() on click", async () => {
    const user = userEvent.setup();
    render(<WatchlistToggleButton analysisId="ana_1" isWatchlisted={false} />);

    await user.click(screen.getByRole("button"));

    expect(toggle).toHaveBeenCalledOnce();
  });

  it("disables the button while toggling", () => {
    useToggleWatchlist.mockReturnValue({ toggling: true, error: null, toggle });
    render(<WatchlistToggleButton analysisId="ana_1" isWatchlisted={false} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows the error message when present", () => {
    useToggleWatchlist.mockReturnValue({ toggling: false, error: "Couldn't update the watchlist. Try again.", toggle });
    render(<WatchlistToggleButton analysisId="ana_1" isWatchlisted={false} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't update the watchlist. Try again.");
  });
});
