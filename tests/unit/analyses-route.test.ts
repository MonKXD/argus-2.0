import { beforeEach, describe, expect, it, vi } from "vitest";

import { loopwellAnalysis } from "@/demo/loopwell";
import { UnauthenticatedError } from "@/lib/api/errors";

const requireUser = vi.fn();
const create = vi.fn();
const listByOwner = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    create = create;
    listByOwner = listByOwner;
  },
}));

const { POST, GET } = await import("@/app/api/analyses/route");

const APP_ORIGIN = "http://localhost:3000";
const USER = { uid: "user_1", email: "founder@example.com" };

function postRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request("http://localhost:3000/api/analyses", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function getRequest(query = ""): Request {
  return new Request(`http://localhost:3000/api/analyses${query}`);
}

describe("POST /api/analyses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(USER);
  });

  it("rejects a request from a different origin", async () => {
    const response = await POST(postRequest({ startup: { name: "Acme" } }, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an invalid body (missing startup name)", async () => {
    const response = await POST(postRequest({ startup: {} }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("creates a draft analysis owned by the caller", async () => {
    create.mockResolvedValue(undefined);

    const response = await POST(postRequest({ startup: { name: "Acme" } }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.analysis.ownerId).toBe(USER.uid);
    expect(body.analysis.status).toBe("DRAFT");
    expect(body.analysis.startup.name).toBe("Acme");
    expect(body.analysis.options).toEqual({ webResearch: true });
    expect(create).toHaveBeenCalledWith(body.analysis);
  });

  it("requires authentication", async () => {
    requireUser.mockRejectedValue(new UnauthenticatedError());
    const response = await POST(postRequest({ startup: { name: "Acme" } }));
    expect(response.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("GET /api/analyses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(USER);
  });

  it("returns only the caller's own analyses", async () => {
    listByOwner.mockResolvedValue([loopwellAnalysis]);

    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.analyses).toHaveLength(1);
    expect(listByOwner).toHaveBeenCalledWith(USER.uid);
  });

  it("filters by status", async () => {
    listByOwner.mockResolvedValue([
      loopwellAnalysis,
      { ...loopwellAnalysis, id: "ana_00000000000000000000000002", status: "DRAFT" },
    ]);

    const response = await GET(getRequest("?status=DRAFT"));
    const body = await response.json();

    expect(body.analyses).toHaveLength(1);
    expect(body.analyses[0].status).toBe("DRAFT");
  });

  it("filters by free-text name search, case-insensitively", async () => {
    listByOwner.mockResolvedValue([loopwellAnalysis]);

    const response = await GET(getRequest("?q=loop"));
    const body = await response.json();

    expect(body.analyses).toHaveLength(1);

    listByOwner.mockResolvedValue([loopwellAnalysis]);
    const miss = await GET(getRequest("?q=nomatch"));
    expect((await miss.json()).analyses).toHaveLength(0);
  });

  it("paginates with a cursor", async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      ...loopwellAnalysis,
      id: `ana_${String(i).padStart(26, "0")}`,
      updatedAt: new Date(2026, 0, i + 1).toISOString(),
    }));
    listByOwner.mockResolvedValue(many);

    const first = await GET(getRequest());
    const firstBody = await first.json();
    expect(firstBody.analyses).toHaveLength(20);
    expect(firstBody.nextCursor).toBeTruthy();

    listByOwner.mockResolvedValue(many);
    const second = await GET(getRequest(`?cursor=${encodeURIComponent(firstBody.nextCursor)}`));
    const secondBody = await second.json();
    expect(secondBody.analyses).toHaveLength(5);
    expect(secondBody.nextCursor).toBeNull();
  });

  it("rejects an invalid sort value", async () => {
    const response = await GET(getRequest("?sort=bogus"));
    expect(response.status).toBe(400);
  });
});
