import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDeleteAccount } from "@/hooks/use-delete-account";

const push = vi.fn();
const refresh = vi.fn();
const signOut = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("firebase/auth", () => ({
  signOut: (...args: unknown[]) => signOut(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({}),
}));

describe("useDeleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts idle with no error", () => {
    const { result } = renderHook(() => useDeleteAccount());
    expect(result.current.deleting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls DELETE on the account, signs out of the client SDK, and navigates to /login on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useDeleteAccount());

    await act(() => result.current.deleteAccount());

    expect(fetchMock).toHaveBeenCalledWith("/api/account", { method: "DELETE" });
    expect(signOut).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.error).toBeNull();
  });

  it("surfaces the server's error message and clears the deleting flag on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Cancel every running analysis before deleting your account." } }),
          { status: 409 },
        ),
      ),
    );
    const { result } = renderHook(() => useDeleteAccount());

    await act(() => result.current.deleteAccount());

    expect(result.current.error).toBe("Cancel every running analysis before deleting your account.");
    expect(result.current.deleting).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the failure response has no error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 500 })));
    const { result } = renderHook(() => useDeleteAccount());

    await act(() => result.current.deleteAccount());

    expect(result.current.error).toBe("Couldn't delete your account. Try again.");
  });

  it("shows a connection-error message when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { result } = renderHook(() => useDeleteAccount());

    await act(() => result.current.deleteAccount());

    expect(result.current.error).toBe("Couldn't delete your account. Check your connection and try again.");
    expect(result.current.deleting).toBe(false);
  });
});
