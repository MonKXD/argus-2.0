import { describe, expect, it, vi } from "vitest";

// The real Anthropic constructor refuses to run under vitest's jsdom test
// environment (its own browser-credential-leak guard, correctly left
// enabled in src/lib/ai/client.ts — see llm.test.ts for why tests that
// exercise the client construct it directly with dangerouslyAllowBrowser
// instead). Mocked here so this test can check getAnthropicClient()'s own
// memoization without weakening that guard in production code.
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function MockAnthropic() {
    return {};
  }),
}));

describe("getAnthropicClient", () => {
  it("constructs the Anthropic client once and returns the same cached instance thereafter", async () => {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const { getAnthropicClient } = await import("@/lib/ai/client");

    const first = getAnthropicClient();
    const second = getAnthropicClient();

    expect(second).toBe(first);
    expect(Anthropic).toHaveBeenCalledTimes(1);
  });
});
