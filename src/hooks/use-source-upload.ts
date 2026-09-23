"use client";

import { ref, uploadBytesResumable } from "firebase/storage";
import * as React from "react";

import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase/client";
import type { SourceType } from "@/lib/schema/enums";
import type { Source } from "@/lib/schema/evidence";

export interface UploadEntry {
  key: string;
  file: File;
  progress: number;
  phase: "uploading" | "registering" | "failed";
  errorMessage?: string;
}

interface UseSourceUploadResult {
  sources: Source[];
  uploading: UploadEntry[];
  loading: boolean;
  loadError: string | null;
  actionError: string | null;
  uploadFiles: (files: FileList | File[], type: SourceType) => void;
  addUrl: (url: string) => Promise<void>;
  addText: (text: string) => Promise<void>;
  removeSource: (sourceId: string) => Promise<void>;
}

// Matches firebase/storage.rules' allowlist. Client-only, quick feedback
// before ever touching Storage — the server (file-signature.ts) is the
// real authority (R-SEC-05: never trust the client).
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "xlsx", "csv", "txt", "md"]);
// Soft UX check only, mirroring env.ts's MAX_UPLOAD_MB default — there is
// no NEXT_PUBLIC_* mirror of that server-only value, and adding one for a
// convenience check alone isn't worth a schema change. The server (which
// does read the real env value) still enforces the real limit.
const SOFT_MAX_UPLOAD_MB = 25;

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
};

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

// Some browsers send "application/octet-stream" for certain extensions
// (.md in particular — see PROJECT_MEMORY's gotchas); guess from the
// extension when the browser's own guess is empty or generic.
function contentTypeFor(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  return CONTENT_TYPES[extensionOf(file.name)] ?? "application/octet-stream";
}

/**
 * FR-INT-02/FR-INT-05: direct-to-Storage upload with progress, then
 * registration via `POST /api/analyses/:id/sources` (T-3.06). Loads
 * already-registered sources on mount so the wizard resumes correctly
 * (APP_FLOW 5.3's "leaving and returning resumes at the last completed
 * step").
 */
export function useSourceUpload(analysisId: string): UseSourceUploadResult {
  const [sources, setSources] = React.useState<Source[]>([]);
  const [uploading, setUploading] = React.useState<UploadEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/analyses/${analysisId}/sources`);
        if (!response.ok) throw new Error("Could not load sources.");
        const body = (await response.json()) as { sources: Source[] };
        if (!cancelled) setSources(body.sources);
      } catch {
        if (!cancelled) setLoadError("Couldn't load your sources. Try reloading the page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const registerUpload = React.useCallback(
    async (key: string, file: File, type: SourceType, storagePath: string) => {
      setUploading((prev) => prev.map((u) => (u.key === key ? { ...u, phase: "registering" } : u)));
      try {
        const response = await fetch(`/api/analyses/${analysisId}/sources`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ origin: "UPLOAD", type, filename: file.name, storagePath }),
        });
        if (!response.ok) throw new Error("Registration failed.");
        const body = (await response.json()) as { source: Source };
        setSources((prev) => [...prev, body.source]);
        setUploading((prev) => prev.filter((u) => u.key !== key));
      } catch {
        setUploading((prev) =>
          prev.map((u) =>
            u.key === key
              ? { ...u, phase: "failed", errorMessage: "Couldn't save this file. Try again." }
              : u,
          ),
        );
      }
    },
    [analysisId],
  );

  const uploadFiles = React.useCallback(
    (files: FileList | File[], type: SourceType) => {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) return;

      for (const file of Array.from(files)) {
        const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const extension = extensionOf(file.name);

        if (!ALLOWED_EXTENSIONS.has(extension)) {
          setUploading((prev) => [
            ...prev,
            {
              key,
              file,
              progress: 0,
              phase: "failed",
              errorMessage: "This file type isn't supported. Use PDF, DOCX, XLSX, CSV, TXT or MD.",
            },
          ]);
          continue;
        }
        if (file.size > SOFT_MAX_UPLOAD_MB * 1024 * 1024) {
          setUploading((prev) => [
            ...prev,
            {
              key,
              file,
              progress: 0,
              phase: "failed",
              errorMessage: `"${file.name}" is larger than the ${SOFT_MAX_UPLOAD_MB} MB limit.`,
            },
          ]);
          continue;
        }

        setUploading((prev) => [...prev, { key, file, progress: 0, phase: "uploading" }]);

        const storagePath = `uploads/${uid}/${analysisId}/${key}-${file.name}`;
        const storageRef = ref(getFirebaseStorage(), storagePath);
        const task = uploadBytesResumable(storageRef, file, { contentType: contentTypeFor(file) });

        task.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploading((prev) => prev.map((u) => (u.key === key ? { ...u, progress } : u)));
          },
          () => {
            setUploading((prev) =>
              prev.map((u) =>
                u.key === key
                  ? {
                      ...u,
                      phase: "failed",
                      errorMessage: "Upload failed. Check your connection and try again.",
                    }
                  : u,
              ),
            );
          },
          () => {
            void registerUpload(key, file, type, storagePath);
          },
        );
      }
    },
    [analysisId, registerUpload],
  );

  const addUrl = React.useCallback(
    async (url: string) => {
      setActionError(null);
      try {
        const response = await fetch(`/api/analyses/${analysisId}/sources`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ origin: "URL", url }),
        });
        if (!response.ok) throw new Error("Registration failed.");
        const body = (await response.json()) as { source: Source };
        setSources((prev) => [...prev, body.source]);
      } catch {
        setActionError("Couldn't add this URL. Check that it's valid and try again.");
      }
    },
    [analysisId],
  );

  const addText = React.useCallback(
    async (text: string) => {
      setActionError(null);
      try {
        const response = await fetch(`/api/analyses/${analysisId}/sources`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ origin: "TEXT", text }),
        });
        if (!response.ok) throw new Error("Registration failed.");
        const body = (await response.json()) as { source: Source };
        setSources((prev) => [...prev, body.source]);
      } catch {
        setActionError("Couldn't save this text. Try again.");
      }
    },
    [analysisId],
  );

  const removeSource = React.useCallback(
    async (sourceId: string) => {
      await fetch(`/api/analyses/${analysisId}/sources/${sourceId}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    },
    [analysisId],
  );

  return {
    sources,
    uploading,
    loading,
    loadError,
    actionError,
    uploadFiles,
    addUrl,
    addText,
    removeSource,
  };
}
