import { afterEach, describe, expect, it, vi } from "vitest";

const createGeminiLlmMock = vi.fn();
const createAnthropicLlmMock = vi.fn();
vi.mock("@/lib/ai/gemini-llm", () => ({ createGeminiLlm: () => createGeminiLlmMock() }));
vi.mock("@/lib/ai/llm", () => ({ createAnthropicLlm: () => createAnthropicLlmMock() }));

describe("createLlm / activeModelIds", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("wires up GeminiLLM when LLM_PROVIDER=gemini (the default)", async () => {
    vi.doMock("@/lib/env", () => ({ env: { LLM_PROVIDER: "gemini" } }));
    const { createLlm } = await import("@/lib/ai/create-llm");
    const geminiInstance = {};
    createGeminiLlmMock.mockReturnValue(geminiInstance);

    expect(createLlm()).toBe(geminiInstance);
    expect(createGeminiLlmMock).toHaveBeenCalledOnce();
    expect(createAnthropicLlmMock).not.toHaveBeenCalled();
  });

  it("wires up AnthropicLLM when LLM_PROVIDER=anthropic", async () => {
    vi.doMock("@/lib/env", () => ({ env: { LLM_PROVIDER: "anthropic" } }));
    const { createLlm } = await import("@/lib/ai/create-llm");
    const anthropicInstance = {};
    createAnthropicLlmMock.mockReturnValue(anthropicInstance);

    expect(createLlm()).toBe(anthropicInstance);
    expect(createAnthropicLlmMock).toHaveBeenCalledOnce();
    expect(createGeminiLlmMock).not.toHaveBeenCalled();
  });

  it("activeModelIds() reads the active provider's own model-role vars", async () => {
    vi.doMock("@/lib/env", () => ({
      env: {
        LLM_PROVIDER: "gemini",
        GEMINI_MODEL_ANALYSIS: "gemini-a",
        GEMINI_MODEL_SYNTHESIS: "gemini-s",
        GEMINI_MODEL_FAST: "gemini-f",
      },
    }));
    const { activeModelIds } = await import("@/lib/ai/create-llm");

    expect(activeModelIds()).toEqual({ analysis: "gemini-a", synthesis: "gemini-s", fast: "gemini-f" });
  });
});
