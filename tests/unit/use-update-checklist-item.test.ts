import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUpdateChecklistItem } from "@/hooks/use-update-checklist-item";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("useUpdateChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useUpdateChecklistItem("ana_1", "rpt_1", "chk_1"));
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("PATCHes the checklist item endpoint and refreshes on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ item: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useUpdateChecklistItem("ana_1", "rpt_1", "chk_1"));

    await act(() => result.current.updateItem({ status: "RECEIVED" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1/reports/rpt_1/checklist/chk_1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED" }),
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Checklist item not found." } }), { status: 404 }),
      ),
    );
    const { result } = renderHook(() => useUpdateChecklistItem("ana_1", "rpt_1", "chk_1"));

    await act(() => result.current.updateItem({ status: "WAIVED" }));

    expect(result.current.error).toBe("Checklist item not found.");
    expect(result.current.saving).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useUpdateChecklistItem("ana_1", "rpt_1", "chk_1"));

    await act(() => result.current.updateItem({ userNote: "note" }));

    expect(result.current.error).toBe(
      "Couldn't save this checklist item. Check your connection and try again.",
    );
    expect(result.current.saving).toBe(false);
  });
});
