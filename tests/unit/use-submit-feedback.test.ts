import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSubmitFeedback } from "@/hooks/use-submit-feedback";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
}));

describe("useSubmitFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error and not submitted", () => {
    const { result } = renderHook(() => useSubmitFeedback());
    expect(result.current.submitting).toBe(false);
    expect(result.current.submitted).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("posts the message and the current page, and flips to submitted on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useSubmitFeedback());

    await act(() => result.current.submitFeedback("Love the evidence rail."));

    expect(fetchMock).toHaveBeenCalledWith("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Love the evidence rail.", page: "/app" }),
    });
    expect(result.current.submitted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message and clears submitting on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Too long." } }), { status: 400 })),
    );
    const { result } = renderHook(() => useSubmitFeedback());

    await act(() => result.current.submitFeedback("x".repeat(3000)));

    expect(result.current.error).toBe("Too long.");
    expect(result.current.submitting).toBe(false);
    expect(result.current.submitted).toBe(false);
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useSubmitFeedback());

    await act(() => result.current.submitFeedback("hi"));

    expect(result.current.error).toBe("Couldn't send your feedback. Check your connection and try again.");
  });

  it("reset() clears submitted and error state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 201 })));
    const { result } = renderHook(() => useSubmitFeedback());

    await act(() => result.current.submitFeedback("hi"));
    expect(result.current.submitted).toBe(true);

    act(() => result.current.reset());
    expect(result.current.submitted).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
