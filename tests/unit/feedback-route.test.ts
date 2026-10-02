import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const feedbackCreate = vi.fn();

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...actual, requireUser: () => requireUser() };
});

vi.mock("@/lib/repos/admin-firestore", () => ({ getAdminFirestore: () => ({}) }));

vi.mock("@/lib/repos/feedback-repo", () => ({
  FeedbackRepo: class {
    create = feedbackCreate;
  },
}));

const { UnauthenticatedError } = await import("@/lib/api/errors");
const { POST } = await import("@/app/api/feedback/route");

const APP_ORIGIN = "http://localhost:3000";

function postRequest(body: unknown, origin: string | null = APP_ORIGIN): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin) headers.set("origin", origin);
  return new Request("http://localhost:3000/api/feedback", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not signed in", async () => {
    requireUser.mockRejectedValue(new UnauthenticatedError());
    const response = await POST(postRequest({ message: "hi" }));
    expect(response.status).toBe(401);
  });

  it("rejects a cross-origin request", async () => {
    requireUser.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });
    const response = await POST(postRequest({ message: "hi" }, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(feedbackCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty message", async () => {
    requireUser.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });
    const response = await POST(postRequest({ message: "" }));
    expect(response.status).toBe(400);
    expect(feedbackCreate).not.toHaveBeenCalled();
  });

  it("creates feedback for the signed-in owner and returns 201", async () => {
    requireUser.mockResolvedValue({ uid: "user_1", email: "founder@example.com" });
    feedbackCreate.mockResolvedValue(undefined);

    const response = await POST(postRequest({ message: "Love the evidence rail.", page: "/app" }));

    expect(response.status).toBe(201);
    expect(feedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "user_1",
        message: "Love the evidence rail.",
        page: "/app",
      }),
    );
  });
});
