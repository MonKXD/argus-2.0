import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";

const requireUser = vi.fn();
const get = vi.fn();
const update = vi.fn();
const recursiveDelete = vi.fn();
const deleteFiles = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({
  getAdminFirestore: () => ({
    recursiveDelete,
    collection: () => ({ doc: () => ({}) }),
  }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorageBucket: () => ({ deleteFiles }),
}));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    get = get;
    update = update;
  },
}));

const { GET, PATCH, DELETE } = await import("@/app/api/analyses/[id]/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function getRequest(): Request {
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}`);
}

function patchRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

function deleteRequest(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}`, {
    method: "DELETE",
    headers,
  });
}

describe("GET /api/analyses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
  });

  it("returns the analysis for its owner", async () => {
    get.mockResolvedValue(loopwellAnalysis);
    const response = await GET(getRequest(), context(loopwellAnalysis.id));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.analysis.id).toBe(loopwellAnalysis.id);
  });

  it("returns 404 for a missing analysis", async () => {
    get.mockResolvedValue(null);
    const response = await GET(getRequest(), context(loopwellAnalysis.id));
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    get.mockResolvedValue(loopwellAnalysis);
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await GET(getRequest(), context(loopwellAnalysis.id));
    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/analyses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
  });

  it("rejects a request from a different origin", async () => {
    const response = await PATCH(
      patchRequest({ isWatchlisted: true }, "https://evil.example"),
      context(loopwellAnalysis.id),
    );
    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    get.mockResolvedValue(null);
    const response = await PATCH(
      patchRequest({ isWatchlisted: true }),
      context(loopwellAnalysis.id),
    );
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    get.mockResolvedValue(loopwellAnalysis);
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await PATCH(
      patchRequest({ isWatchlisted: true }),
      context(loopwellAnalysis.id),
    );
    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("merges a partial startup update, leaving other startup fields untouched", async () => {
    get.mockResolvedValue(loopwellAnalysis);
    update.mockResolvedValue(undefined);

    const response = await PATCH(
      patchRequest({ startup: { oneLiner: "New pitch." } }),
      context(loopwellAnalysis.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.analysis.startup.oneLiner).toBe("New pitch.");
    expect(body.analysis.startup.name).toBe(loopwellAnalysis.startup.name);
    expect(update).toHaveBeenCalledWith(
      loopwellAnalysis.id,
      expect.objectContaining({ startup: expect.objectContaining({ oneLiner: "New pitch." }) }),
    );
  });

  it("rejects an invalid patch body", async () => {
    get.mockResolvedValue(loopwellAnalysis);
    const response = await PATCH(
      patchRequest({ tags: ["x".repeat(40)] }),
      context(loopwellAnalysis.id),
    );
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/analyses/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    recursiveDelete.mockResolvedValue(undefined);
    deleteFiles.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await DELETE(deleteRequest("https://evil.example"), context(loopwellAnalysis.id));
    expect(response.status).toBe(403);
    expect(recursiveDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    get.mockResolvedValue(null);
    const response = await DELETE(deleteRequest(), context(loopwellAnalysis.id));
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    get.mockResolvedValue(loopwellAnalysis);
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await DELETE(deleteRequest(), context(loopwellAnalysis.id));
    expect(response.status).toBe(403);
    expect(recursiveDelete).not.toHaveBeenCalled();
  });

  it("rejects deleting a PROCESSING analysis with 409, without touching Firestore or Storage", async () => {
    get.mockResolvedValue({ ...loopwellAnalysis, status: "PROCESSING" });
    const response = await DELETE(deleteRequest(), context(loopwellAnalysis.id));
    expect(response.status).toBe(409);
    expect(recursiveDelete).not.toHaveBeenCalled();
    expect(deleteFiles).not.toHaveBeenCalled();
  });

  it("recursively deletes the analysis and its Storage prefix, returning 204", async () => {
    get.mockResolvedValue({ ...loopwellAnalysis, status: "COMPLETE" });
    const response = await DELETE(deleteRequest(), context(loopwellAnalysis.id));

    expect(response.status).toBe(204);
    expect(recursiveDelete).toHaveBeenCalledOnce();
    expect(deleteFiles).toHaveBeenCalledWith({
      prefix: `uploads/${loopwellAnalysis.ownerId}/${loopwellAnalysis.id}/`,
    });
  });
});
