import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeleteAnalysis } from "@/hooks/use-delete-analysis";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("useDeleteAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useDeleteAnalysis("ana_1"));
    expect(result.current.deleting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls DELETE on the analysis and navigates to the dashboard on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useDeleteAnalysis("ana_1"));

    await act(() => result.current.deleteAnalysis());

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1", { method: "DELETE" });
    expect(push).toHaveBeenCalledWith("/app");
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message and clears the deleting flag on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Cancel the running analysis before deleting it." } }), {
          status: 409,
        }),
      ),
    );
    const { result } = renderHook(() => useDeleteAnalysis("ana_1"));

    await act(() => result.current.deleteAnalysis());

    expect(result.current.error).toBe("Cancel the running analysis before deleting it.");
    expect(result.current.deleting).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the failure response has no error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 500 })));
    const { result } = renderHook(() => useDeleteAnalysis("ana_1"));

    await act(() => result.current.deleteAnalysis());

    expect(result.current.error).toBe("Couldn't delete this analysis. Try again.");
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useDeleteAnalysis("ana_1"));

    await act(() => result.current.deleteAnalysis());

    expect(result.current.error).toBe("Couldn't delete this analysis. Check your connection and try again.");
    expect(result.current.deleting).toBe(false);
  });
});
