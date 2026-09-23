import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSourceUpload } from "@/hooks/use-source-upload";

interface FakeUploadTask {
  on: (
    event: "state_changed",
    onProgress: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
    onError: (error: unknown) => void,
    onComplete: () => void,
  ) => void;
  simulateProgress: (bytesTransferred: number, totalBytes: number) => void;
  simulateError: (error: unknown) => void;
  simulateComplete: () => void;
}

function createFakeUploadTask(): FakeUploadTask {
  let progressCb: ((snapshot: { bytesTransferred: number; totalBytes: number }) => void) | undefined;
  let errorCb: ((error: unknown) => void) | undefined;
  let completeCb: (() => void) | undefined;

  return {
    on: (_event, onProgress, onError, onComplete) => {
      progressCb = onProgress;
      errorCb = onError;
      completeCb = onComplete;
    },
    simulateProgress: (bytesTransferred, totalBytes) => progressCb?.({ bytesTransferred, totalBytes }),
    simulateError: (error) => errorCb?.(error),
    simulateComplete: () => completeCb?.(),
  };
}

const uploadBytesResumable = vi.fn();

vi.mock("firebase/storage", () => ({
  ref: vi.fn(() => ({})),
  uploadBytesResumable: (...args: unknown[]) => uploadBytesResumable(...args),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({ currentUser: { uid: "user_1" } }),
  getFirebaseStorage: () => ({}),
}));

const ANALYSIS_ID = "ana_00000000000000000000000001";

function makeFile(name: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: "" });
}

describe("useSourceUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads already-registered sources on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sources: [{ id: "src_1", filename: "deck.pdf" }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sources).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(`/api/analyses/${ANALYSIS_ID}/sources`);

    vi.unstubAllGlobals();
  });

  it("sets loadError when the initial list fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 500 })),
    );

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toMatch(/couldn.t load/i);

    vi.unstubAllGlobals();
  });

  it("rejects an unsupported extension client-side without uploading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: [] }))));
    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.uploadFiles([makeFile("virus.exe")], "COMPANY_DOC");
    });

    expect(result.current.uploading).toHaveLength(1);
    expect(result.current.uploading[0]?.phase).toBe("failed");
    expect(uploadBytesResumable).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("rejects an oversized file client-side without uploading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: [] }))));
    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.uploadFiles([makeFile("deck.pdf", 26 * 1024 * 1024)], "PITCH_DECK");
    });

    expect(result.current.uploading[0]?.phase).toBe("failed");
    expect(result.current.uploading[0]?.errorMessage).toMatch(/25 MB limit/);
    expect(uploadBytesResumable).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("uploads, tracks progress, and registers on completion", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sources: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ source: { id: "src_new", filename: "deck.pdf", status: "PARSED" } }), {
          status: 201,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const task = createFakeUploadTask();
    uploadBytesResumable.mockReturnValue(task);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.uploadFiles([makeFile("deck.pdf")], "PITCH_DECK");
    });
    expect(result.current.uploading).toHaveLength(1);

    act(() => task.simulateProgress(512, 1024));
    expect(result.current.uploading[0]?.progress).toBe(50);

    await act(async () => {
      task.simulateComplete();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.sources).toHaveLength(1));
    expect(result.current.uploading).toHaveLength(0);
    expect(result.current.sources[0]?.id).toBe("src_new");
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/analyses/${ANALYSIS_ID}/sources`,
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"filename":"deck.pdf"'),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("marks an entry failed when the Storage upload itself errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources: [] }))));
    const task = createFakeUploadTask();
    uploadBytesResumable.mockReturnValue(task);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.uploadFiles([makeFile("deck.pdf")], "PITCH_DECK");
    });

    act(() => task.simulateError(new Error("network down")));

    expect(result.current.uploading[0]?.phase).toBe("failed");
    expect(result.current.uploading[0]?.errorMessage).toMatch(/upload failed/i);

    vi.unstubAllGlobals();
  });

  it("marks an entry failed when registration (POST) fails after a successful upload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sources: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const task = createFakeUploadTask();
    uploadBytesResumable.mockReturnValue(task);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.uploadFiles([makeFile("deck.pdf")], "PITCH_DECK");
    });

    await act(async () => {
      task.simulateComplete();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.uploading[0]?.phase).toBe("failed"));
    expect(result.current.sources).toHaveLength(0);

    vi.unstubAllGlobals();
  });

  it("removeSource calls DELETE and drops the source from state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sources: [{ id: "src_1", filename: "deck.pdf" }] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.sources).toHaveLength(1));

    await act(async () => {
      await result.current.removeSource("src_1");
    });

    expect(result.current.sources).toHaveLength(0);
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/analyses/${ANALYSIS_ID}/sources/src_1`, {
      method: "DELETE",
    });

    vi.unstubAllGlobals();
  });

  it("addUrl registers a URL source", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sources: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ source: { id: "src_url", url: "https://example.com" } }), {
          status: 201,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addUrl("https://example.com");
    });

    expect(result.current.sources).toHaveLength(1);
    expect(result.current.actionError).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/analyses/${ANALYSIS_ID}/sources`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ origin: "URL", url: "https://example.com" }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("addUrl sets actionError when registration fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sources: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addUrl("not-a-real-url");
    });

    expect(result.current.sources).toHaveLength(0);
    expect(result.current.actionError).toMatch(/couldn.t add this url/i);

    vi.unstubAllGlobals();
  });

  it("addText registers a pasted-text source", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sources: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ source: { id: "src_text", title: "Founder notes" } }), {
          status: 201,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addText("Founder notes here.");
    });

    expect(result.current.sources).toHaveLength(1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/analyses/${ANALYSIS_ID}/sources`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ origin: "TEXT", text: "Founder notes here." }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("addText sets actionError when registration fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sources: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSourceUpload(ANALYSIS_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addText("Founder notes here.");
    });

    expect(result.current.sources).toHaveLength(0);
    expect(result.current.actionError).toMatch(/couldn.t save this text/i);

    vi.unstubAllGlobals();
  });
});
