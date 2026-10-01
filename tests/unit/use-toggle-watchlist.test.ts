import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useToggleWatchlist } from "@/hooks/use-toggle-watchlist";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("useToggleWatchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useToggleWatchlist("ana_1", true));
    expect(result.current.toggling).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("PATCHes the analysis with the requested next value and refreshes on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ analysis: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useToggleWatchlist("ana_1", true));

    await act(() => result.current.toggle());

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isWatchlisted: true }),
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Not signed in." } }), { status: 401 })),
    );
    const { result } = renderHook(() => useToggleWatchlist("ana_1", false));

    await act(() => result.current.toggle());

    expect(result.current.error).toBe("Not signed in.");
    expect(result.current.toggling).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useToggleWatchlist("ana_1", true));

    await act(() => result.current.toggle());

    expect(result.current.error).toBe("Couldn't update the watchlist. Check your connection and try again.");
    expect(result.current.toggling).toBe(false);
  });
});
