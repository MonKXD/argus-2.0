import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAddNote } from "@/hooks/use-add-note";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("useAddNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useAddNote("ana_1"));
    expect(result.current.adding).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("POSTs the section key and text, then refreshes on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ note: {} }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAddNote("ana_1"));

    await act(() => result.current.addNote("founder-team", "Check this."));

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionKey: "founder-team", text: "Check this." }),
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Not signed in." } }), { status: 401 })),
    );
    const { result } = renderHook(() => useAddNote("ana_1"));

    await act(() => result.current.addNote("founder-team", "x"));

    expect(result.current.error).toBe("Not signed in.");
    expect(result.current.adding).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useAddNote("ana_1"));

    await act(() => result.current.addNote("founder-team", "x"));

    expect(result.current.error).toBe("Couldn't save your note. Check your connection and try again.");
    expect(result.current.adding).toBe(false);
  });
});
