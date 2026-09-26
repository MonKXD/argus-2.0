import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useResumeRun } from "@/hooks/use-resume-run";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("useResumeRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useResumeRun("ana_1", "run_1"));
    expect(result.current.resuming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("posts to the resume endpoint and refreshes the current page on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ runId: "run_1" }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useResumeRun("ana_1", "run_1"));

    await act(() => result.current.resumeRun());

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1/runs/run_1/resume", { method: "POST" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure (e.g. run limits)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "You have 2 analyses running already." } }), {
          status: 429,
        }),
      ),
    );
    const { result } = renderHook(() => useResumeRun("ana_1", "run_1"));

    await act(() => result.current.resumeRun());

    expect(result.current.error).toBe("You have 2 analyses running already.");
    expect(result.current.resuming).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useResumeRun("ana_1", "run_1"));

    await act(() => result.current.resumeRun());

    expect(result.current.error).toBe("Couldn't resume this analysis. Check your connection and try again.");
    expect(result.current.resuming).toBe(false);
  });
});
