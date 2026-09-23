import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis, loopwellSources } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const sourceGet = vi.fn();
const sourceDelete = vi.fn();
const fileDelete = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    get = analysisGet;
  },
}));

vi.mock("@/lib/repos/source-repo", () => ({
  SourceRepo: class {
    get = sourceGet;
    delete = sourceDelete;
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorageBucket: () => ({
    file: () => ({ delete: fileDelete }),
  }),
}));

const { DELETE } = await import("@/app/api/analyses/[id]/sources/[sourceId]/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };
const SOURCE = loopwellSources[0]!;

function context(sourceId = SOURCE.id) {
  return { params: Promise.resolve({ id: loopwellAnalysis.id, sourceId }) };
}

function deleteRequest(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(
    `http://localhost:3000/api/analyses/${loopwellAnalysis.id}/sources/${SOURCE.id}`,
    {
      method: "DELETE",
      headers,
    },
  );
}

describe("DELETE /api/analyses/[id]/sources/[sourceId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    sourceGet.mockResolvedValue(SOURCE);
    sourceDelete.mockResolvedValue(undefined);
    fileDelete.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await DELETE(deleteRequest("https://evil.example"), context());
    expect(response.status).toBe(403);
    expect(sourceDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(403);
    expect(sourceDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing source", async () => {
    sourceGet.mockResolvedValue(null);
    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(sourceDelete).not.toHaveBeenCalled();
  });

  it("deletes the source, its evidence, and its Storage object", async () => {
    sourceGet.mockResolvedValue({
      ...SOURCE,
      storagePath: `uploads/${OWNER.uid}/${loopwellAnalysis.id}/deck.pdf`,
    });

    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(204);
    expect(sourceDelete).toHaveBeenCalledWith(loopwellAnalysis.id, SOURCE.id);
    expect(fileDelete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it("skips the Storage delete when the source has no storagePath (e.g. a URL source)", async () => {
    sourceGet.mockResolvedValue({ ...SOURCE, storagePath: undefined });

    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(204);
    expect(fileDelete).not.toHaveBeenCalled();
  });
});
