import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDuplicateAnalysis } from "@/hooks/use-duplicate-analysis";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("useDuplicateAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useDuplicateAnalysis("ana_1"));
    expect(result.current.duplicating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("POSTs to the duplicate endpoint and navigates to the new analysis's review step", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ analysis: { id: "ana_2" } }), { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useDuplicateAnalysis("ana_1"));

    await act(() => result.current.duplicate());

    expect(fetch).toHaveBeenCalledWith("/api/analyses/ana_1/duplicate", { method: "POST" });
    expect(push).toHaveBeenCalledWith("/app/analyses/ana_2/setup?step=review");
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Not signed in." } }), { status: 401 }),
      ),
    );
    const { result } = renderHook(() => useDuplicateAnalysis("ana_1"));

    await act(() => result.current.duplicate());

    expect(result.current.error).toBe("Not signed in.");
    expect(result.current.duplicating).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useDuplicateAnalysis("ana_1"));

    await act(() => result.current.duplicate());

    expect(result.current.error).toBe(
      "Couldn't duplicate this analysis. Check your connection and try again.",
    );
    expect(result.current.duplicating).toBe(false);
  });
});
