import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const analysisListByOwner = vi.fn();
const comparisonListByOwner = vi.fn();
const comparisonDelete = vi.fn();
const recursiveDelete = vi.fn();
const deleteFiles = vi.fn();
const deleteUser = vi.fn();
const activityGet = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({
  getAdminFirestore: () => ({
    recursiveDelete,
    collection: (name: string) =>
      name === "analyses"
        ? { doc: () => ({}) }
        : { where: () => ({ get: activityGet }) },
  }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorageBucket: () => ({ deleteFiles }),
  getAdminAuth: () => ({ deleteUser }),
}));

vi.mock("@/lib/repos/analysis-repo", () => ({
  AnalysisRepo: class {
    listByOwner = analysisListByOwner;
  },
}));

vi.mock("@/lib/repos/comparison-repo", () => ({
  ComparisonRepo: class {
    listByOwner = comparisonListByOwner;
    delete = comparisonDelete;
  },
}));

const { DELETE } = await import("@/app/api/account/route");

const APP_ORIGIN = "http://localhost:3000";
const OWNER = { uid: "user_1", email: "founder@example.com" };

function request(origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request("http://localhost:3000/api/account", { method: "DELETE", headers });
}

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue(OWNER);
    analysisListByOwner.mockResolvedValue([]);
    comparisonListByOwner.mockResolvedValue([]);
    activityGet.mockResolvedValue({ docs: [] });
    recursiveDelete.mockResolvedValue(undefined);
    deleteFiles.mockResolvedValue(undefined);
    deleteUser.mockResolvedValue(undefined);
  });

  it("rejects a request from a different origin", async () => {
    const response = await DELETE(request("https://evil.example"));
    expect(response.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("rejects while any owned analysis is still PROCESSING", async () => {
    analysisListByOwner.mockResolvedValue([{ id: "ana_1", status: "PROCESSING" }]);

    const response = await DELETE(request());

    expect(response.status).toBe(409);
    expect(recursiveDelete).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes every owned analysis, comparison and activity entry, the uploads prefix, and the auth user", async () => {
    analysisListByOwner.mockResolvedValue([
      { id: "ana_1", status: "COMPLETE" },
      { id: "ana_2", status: "DRAFT" },
    ]);
    comparisonListByOwner.mockResolvedValue([{ id: "cmp_1" }]);
    const activityDocDelete = vi.fn();
    activityGet.mockResolvedValue({ docs: [{ ref: { delete: activityDocDelete } }] });

    const response = await DELETE(request());

    expect(response.status).toBe(204);
    expect(recursiveDelete).toHaveBeenCalledTimes(2);
    expect(deleteFiles).toHaveBeenCalledWith({ prefix: `uploads/${OWNER.uid}/` });
    expect(comparisonDelete).toHaveBeenCalledWith("cmp_1");
    expect(activityDocDelete).toHaveBeenCalledOnce();
    expect(deleteUser).toHaveBeenCalledWith(OWNER.uid);
  });

  it("clears the session cookie on success", async () => {
    const response = await DELETE(request());
    expect(response.headers.get("set-cookie")).toContain("argus_session=;");
  });
});
