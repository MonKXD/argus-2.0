import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeleteNote } from "@/hooks/use-delete-note";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("useDeleteNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETEs the note and refreshes on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useDeleteNote("ana_1"));

    await act(() => result.current.deleteNote("note_1"));

    expect(fetchMock).toHaveBeenCalledWith("/api/analyses/ana_1/notes/note_1", { method: "DELETE" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Not signed in." } }), { status: 401 })),
    );
    const { result } = renderHook(() => useDeleteNote("ana_1"));

    await act(() => result.current.deleteNote("note_1"));

    expect(result.current.error).toBe("Not signed in.");
    expect(refresh).not.toHaveBeenCalled();
  });
});
