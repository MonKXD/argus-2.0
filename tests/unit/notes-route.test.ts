import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const noteCreate = vi.fn();
const noteList = vi.fn();
const noteDelete = vi.fn();

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

vi.mock("@/lib/repos/note-repo", () => ({
  NoteRepo: class {
    create = noteCreate;
    listByAnalysis = noteList;
    delete = noteDelete;
  },
}));

const { POST, GET } = await import("@/app/api/analyses/[id]/notes/route");
const { DELETE } = await import("@/app/api/analyses/[id]/notes/[noteId]/route");

const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };

function context() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id }) };
}

function noteContext() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id, noteId: "note_1" }) };
}

function postRequest(body: unknown, origin: string | null = "http://localhost:3000"): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function deleteRequest(origin: string | null = "http://localhost:3000"): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/notes/note_1`, {
    method: "DELETE",
    headers,
  });
}

describe("POST /api/analyses/[id]/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    noteCreate.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(
      postRequest({ sectionKey: "founder-team", text: "Check this." }, "https://evil.example"),
      context(),
    );
    expect(response.status).toBe(403);
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await POST(postRequest({ sectionKey: "founder-team", text: "x" }), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await POST(postRequest({ sectionKey: "founder-team", text: "x" }), context());
    expect(response.status).toBe(403);
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown section key", async () => {
    const response = await POST(
      postRequest({ sectionKey: "not-a-real-section", text: "x" }),
      context(),
    );
    expect(response.status).toBe(400);
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("rejects empty text", async () => {
    const response = await POST(postRequest({ sectionKey: "founder-team", text: "   " }), context());
    expect(response.status).toBe(400);
  });

  it("creates a note for a real section", async () => {
    const response = await POST(
      postRequest({ sectionKey: "founder-team", text: "Check this." }),
      context(),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.note.sectionKey).toBe("founder-team");
    expect(body.note.text).toBe("Check this.");
    expect(noteCreate).toHaveBeenCalledOnce();
  });
});

describe("GET /api/analyses/[id]/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
  });

  it("lists the analysis's notes", async () => {
    noteList.mockResolvedValue([{ id: "note_1" }]);
    const response = await GET(
      new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/notes`),
      context(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notes).toHaveLength(1);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await GET(
      new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/notes`),
      context(),
    );
    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/analyses/[id]/notes/[noteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    noteDelete.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await DELETE(deleteRequest("https://evil.example"), noteContext());
    expect(response.status).toBe(403);
    expect(noteDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await DELETE(deleteRequest(), noteContext());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await DELETE(deleteRequest(), noteContext());
    expect(response.status).toBe(403);
    expect(noteDelete).not.toHaveBeenCalled();
  });

  it("deletes the note", async () => {
    const response = await DELETE(deleteRequest(), noteContext());
    expect(response.status).toBe(204);
    expect(noteDelete).toHaveBeenCalledWith(loopwellAnalysis.id, "note_1");
  });
});
