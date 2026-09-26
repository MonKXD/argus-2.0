import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRunProgress } from "@/hooks/use-run-progress";

let latestOnNext: ((snapshot: { exists: () => boolean; data: () => unknown }) => void) | undefined;
let latestOnError: ((error: unknown) => void) | undefined;
const unsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn((_ref: unknown, onNext: typeof latestOnNext, onError: typeof latestOnError) => {
    latestOnNext = onNext;
    latestOnError = onError;
    return unsubscribe;
  }),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseFirestore: () => ({}),
}));

function fakeSnapshot(exists: boolean, data?: Record<string, unknown>) {
  return { exists: () => exists, data: () => data };
}

const VALID_RUN = {
  id: "run_00000000000000000000000001",
  analysisId: "ana_00000000000000000000000001",
  ownerId: "user_1",
  status: "RUNNING",
  options: { webResearch: true, stageProfile: "SEED" },
  steps: {},
  dimensionStatus: {},
  modelIds: { analysis: "a", synthesis: "s", fast: "f" },
  promptVersion: "v1",
  scoringVersion: "v1",
  usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0 },
  warnings: [],
  cancelRequested: false,
  reportId: null,
  startedAt: new Date().toISOString(),
};

describe("useRunProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestOnNext = undefined;
    latestOnError = undefined;
  });

  it("starts in a loading state with no run", () => {
    const { result } = renderHook(() => useRunProgress("ana_1", "run_1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.run).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("parses a valid run document from a snapshot", async () => {
    const { result } = renderHook(() => useRunProgress("ana_1", "run_1"));
    act(() => latestOnNext?.(fakeSnapshot(true, VALID_RUN)));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.run).toEqual(VALID_RUN);
    expect(result.current.error).toBeNull();
  });

  it("reports an error when the document does not exist", async () => {
    const { result } = renderHook(() => useRunProgress("ana_1", "run_1"));
    act(() => latestOnNext?.(fakeSnapshot(false)));

    await waitFor(() => expect(result.current.error).toBe("This run could not be found."));
    expect(result.current.run).toBeNull();
  });

  it("reports an error when the document fails schema validation", async () => {
    const { result } = renderHook(() => useRunProgress("ana_1", "run_1"));
    act(() => latestOnNext?.(fakeSnapshot(true, { ...VALID_RUN, status: "NOT_A_REAL_STATUS" })));

    await waitFor(() => expect(result.current.error).toBe("Couldn't read this run's progress."));
    expect(result.current.run).toBeNull();
  });

  it("reports an error when the listener itself errors (e.g. a permission error)", async () => {
    const { result } = renderHook(() => useRunProgress("ana_1", "run_1"));
    act(() => latestOnError?.(new Error("permission-denied")));

    await waitFor(() => expect(result.current.error).toBe("Couldn't read this run's progress."));
  });

  it("unsubscribes the listener on unmount", () => {
    const { unmount } = renderHook(() => useRunProgress("ana_1", "run_1"));
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
