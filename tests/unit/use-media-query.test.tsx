import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "@/hooks/use-media-query";

describe("useMediaQuery", () => {
  it("reflects window.matchMedia's initial match state", async () => {
    const spy = vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(min-width: 1024px)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    await vi.waitFor(() => expect(result.current).toBe(true));

    spy.mockRestore();
  });

  it("defaults to false before the effect runs, avoiding a hydration mismatch", () => {
    const spy = vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(min-width: 1024px)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);

    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    // Synchronous render, before the deferred effect fires.
    expect(result.current).toBe(false);

    spy.mockRestore();
  });
});
