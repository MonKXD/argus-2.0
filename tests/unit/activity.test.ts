import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const warn = vi.fn();

vi.mock("@/lib/repos/activity-repo", () => ({
  ActivityRepo: class {
    create = create;
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { warn } }));

const { recordActivity } = await import("@/lib/activity");

describe("recordActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes an Activity record with a fresh id and timestamp", async () => {
    create.mockResolvedValue(undefined);

    await recordActivity({} as never, {
      ownerId: "user_1",
      type: "ANALYSIS_CREATED",
      analysisId: "ana_00000000000000000000000001",
      message: "Created Loopwell.",
    });

    expect(create).toHaveBeenCalledOnce();
    const written = create.mock.calls[0][0];
    expect(written).toMatchObject({
      ownerId: "user_1",
      type: "ANALYSIS_CREATED",
      analysisId: "ana_00000000000000000000000001",
      message: "Created Loopwell.",
    });
    expect(written.id).toMatch(/^act_/);
    expect(written.createdAt).toEqual(expect.any(String));
  });

  it("never throws when the write fails, and logs only the error's reason", async () => {
    create.mockRejectedValue(new Error("boom"));

    await expect(
      recordActivity({} as never, { ownerId: "user_1", type: "SOURCE_ADDED", message: "Added a source." }),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      { reason: "Error", type: "SOURCE_ADDED" },
      "recordActivity: failed to write",
    );
  });
});
