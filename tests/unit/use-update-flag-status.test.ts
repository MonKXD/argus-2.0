import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUpdateFlagStatus } from "@/hooks/use-update-flag-status";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("useUpdateFlagStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useUpdateFlagStatus("ana_1", "rpt_1", "flg_1"));
    expect(result.current.updating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("PATCHes the flag endpoint and refreshes on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ flag: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useUpdateFlagStatus("ana_1", "rpt_1", "flg_1"));

    await act(() => result.current.updateStatus("ACKNOWLEDGED"));

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1/reports/rpt_1/flags/flg_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "ACKNOWLEDGED" }),
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Flag not found." } }), { status: 404 }),
      ),
    );
    const { result } = renderHook(() => useUpdateFlagStatus("ana_1", "rpt_1", "flg_1"));

    await act(() => result.current.updateStatus("DISMISSED"));

    expect(result.current.error).toBe("Flag not found.");
    expect(result.current.updating).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useUpdateFlagStatus("ana_1", "rpt_1", "flg_1"));

    await act(() => result.current.updateStatus("ACKNOWLEDGED"));

    expect(result.current.error).toBe("Couldn't update this flag. Check your connection and try again.");
    expect(result.current.updating).toBe(false);
  });
});
