import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGenerateComparisonNarrative } from "@/hooks/use-generate-comparison-narrative";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("useGenerateComparisonNarrative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useGenerateComparisonNarrative("cmp_1"));
    expect(result.current.generating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("posts to the narrative endpoint and refreshes the current page on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ narrative: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useGenerateComparisonNarrative("cmp_1"));

    await act(() => result.current.generate());

    expect(fetchMock).toHaveBeenCalledWith("/api/comparisons/cmp_1/narrative", { method: "POST" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Need at least two startups." } }), { status: 400 }),
      ),
    );
    const { result } = renderHook(() => useGenerateComparisonNarrative("cmp_1"));

    await act(() => result.current.generate());

    expect(result.current.error).toBe("Need at least two startups.");
    expect(result.current.generating).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useGenerateComparisonNarrative("cmp_1"));

    await act(() => result.current.generate());

    expect(result.current.error).toBe("Couldn't generate a narrative. Check your connection and try again.");
    expect(result.current.generating).toBe(false);
  });
});
