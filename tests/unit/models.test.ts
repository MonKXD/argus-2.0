import { afterEach, describe, expect, it, vi } from "vitest";

describe("modelForRole", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("maps each role to its own env-configured model ID", async () => {
    vi.stubEnv("ANTHROPIC_MODEL_ANALYSIS", "analysis-model");
    vi.stubEnv("ANTHROPIC_MODEL_SYNTHESIS", "synthesis-model");
    vi.stubEnv("ANTHROPIC_MODEL_FAST", "fast-model");
    vi.resetModules();
    const { modelForRole } = await import("@/lib/ai/models");

    expect(modelForRole("ANALYSIS")).toBe("analysis-model");
    expect(modelForRole("SYNTHESIS")).toBe("synthesis-model");
    expect(modelForRole("FAST")).toBe("fast-model");
  });
});
