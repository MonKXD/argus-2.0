import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { dismissToast, toast, useToasts } from "@/hooks/use-toast";

afterEach(() => {
  // Drain any toasts left over between tests (the store is a module
  // singleton, shared across the whole test file).
  const { result } = renderHook(() => useToasts());
  act(() => {
    for (const t of result.current) dismissToast(t.id);
  });
});

describe("useToasts / toast()", () => {
  it("adds a toast that subscribed hooks see", () => {
    const { result } = renderHook(() => useToasts());
    expect(result.current).toHaveLength(0);

    act(() => {
      toast({ title: "Report ready" });
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe("Report ready");
  });

  it("dismiss() removes just that toast", () => {
    const { result } = renderHook(() => useToasts());

    let first: { id: string; dismiss: () => void };
    act(() => {
      first = toast({ title: "First" });
      toast({ title: "Second" });
    });
    expect(result.current).toHaveLength(2);

    act(() => {
      first.dismiss();
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe("Second");
  });
});
