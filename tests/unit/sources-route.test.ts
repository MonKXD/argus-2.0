import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis, loopwellSources } from "@/demo/loopwell";

const requireUser = vi.fn();
const analysisGet = vi.fn();
const sourceCreate = vi.fn();
const sourceList = vi.fn();
const sniffFileKind = vi.fn();
const ingestSource = vi.fn();
const fileExists = vi.fn();
const fileDownload = vi.fn();

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
    create = sourceCreate;
    list = sourceList;
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorageBucket: () => ({
    file: () => ({ exists: fileExists, download: fileDownload }),
  }),
}));

vi.mock("@/lib/analysis/ingest/file-signature", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analysis/ingest/file-signature")>();
  return { ...actual, sniffFileKind: (...args: unknown[]) => sniffFileKind(...args) };
});

vi.mock("@/lib/analysis/ingest/ingest-source", () => ({
  ingestSource: (...args: unknown[]) => ingestSource(...args),
}));

const { POST, GET } = await import("@/app/api/analyses/[id]/sources/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: loopwellAnalysis.ownerId, email: "founder@example.com" };
const OTHER_USER = { uid: "someone-else", email: "other@example.com" };

function context() {
  return { params: Promise.resolve({ id: loopwellAnalysis.id }) };
}

function postRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/sources`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function getRequest(): Request {
  return new Request(`http://localhost:3000/api/analyses/${loopwellAnalysis.id}/sources`);
}

const validBody = {
  type: "PITCH_DECK",
  filename: "deck.pdf",
  storagePath: `uploads/${loopwellAnalysis.ownerId}/${loopwellAnalysis.id}/deck.pdf`,
};

describe("POST /api/analyses/[id]/sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
    fileExists.mockResolvedValue([true]);
    fileDownload.mockResolvedValue([Buffer.from("%PDF-1.4\n...")]);
    sniffFileKind.mockReturnValue("pdf");
    sourceCreate.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(postRequest(validBody, "https://evil.example"), context());
    expect(response.status).toBe(403);
    expect(sourceCreate).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await POST(postRequest(validBody), context());
    expect(response.status).toBe(404);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await POST(postRequest(validBody), context());
    expect(response.status).toBe(403);
    expect(sourceCreate).not.toHaveBeenCalled();
  });

  it("rejects a storagePath that doesn't belong to this user and analysis", async () => {
    const response = await POST(
      postRequest({ ...validBody, storagePath: "uploads/someone-else/ana_x/deck.pdf" }),
      context(),
    );
    expect(response.status).toBe(400);
    expect(sourceCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the uploaded file isn't in Storage", async () => {
    fileExists.mockResolvedValue([false]);
    const response = await POST(postRequest(validBody), context());
    expect(response.status).toBe(404);
    expect(sourceCreate).not.toHaveBeenCalled();
  });

  it("registers a source with its evidence on a clean extraction", async () => {
    ingestSource.mockResolvedValue({
      source: { ...loopwellSources[0]!, storagePath: validBody.storagePath },
      evidence: [{ id: "ev_1" }],
      injectionMatches: [],
    });

    const response = await POST(postRequest(validBody), context());

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.source.status).toBe("PARSED");
    expect(sourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storagePath: validBody.storagePath, mimeType: "application/pdf" }),
      [{ id: "ev_1" }],
    );
  });

  it("registers a FAILED source with a plain-English message when extraction throws", async () => {
    ingestSource.mockRejectedValue(new Error("unpdf: invalid PDF structure"));

    const response = await POST(postRequest(validBody), context());

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.source.status).toBe("FAILED");
    expect(body.source.error.message).toMatch(/could not be read/i);
    expect(sourceCreate).toHaveBeenCalledWith(expect.objectContaining({ status: "FAILED" }), []);
  });

  it("registers a FAILED source when the file signature doesn't match its claimed type", async () => {
    const { FileSignatureError } = await import("@/lib/analysis/ingest/file-signature");
    sniffFileKind.mockImplementation(() => {
      throw new FileSignatureError('"deck.pdf" is not a valid PDF file.');
    });

    const response = await POST(postRequest(validBody), context());

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.source.status).toBe("FAILED");
    expect(body.source.error.code).toBe("INVALID_FILE");
    expect(ingestSource).not.toHaveBeenCalled();
  });

  it("registers a FAILED source for an oversized file without reading its content", async () => {
    fileDownload.mockResolvedValue([Buffer.alloc(26 * 1024 * 1024)]);

    const response = await POST(postRequest(validBody), context());

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.source.status).toBe("FAILED");
    expect(body.source.error.code).toBe("FILE_TOO_LARGE");
    expect(sniffFileKind).not.toHaveBeenCalled();
  });

  it("rejects an invalid body", async () => {
    const response = await POST(postRequest({ type: "PITCH_DECK" }), context());
    expect(response.status).toBe(400);
  });
});

describe("GET /api/analyses/[id]/sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisGet.mockResolvedValue(loopwellAnalysis);
  });

  it("lists the analysis's sources", async () => {
    sourceList.mockResolvedValue(loopwellSources);
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources).toHaveLength(loopwellSources.length);
  });

  it("returns 403 for a different signed-in user", async () => {
    requireUser.mockResolvedValue(OTHER_USER);
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(403);
  });

  it("returns 404 for a missing analysis", async () => {
    analysisGet.mockResolvedValue(null);
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });
});
