/** Structured output failed validation on the original call and the one repair attempt (AI_SPEC section 8). */
export class LlmSchemaError extends Error {
  constructor(
    message: string,
    readonly issues: string,
  ) {
    super(message);
    this.name = "LlmSchemaError";
  }
}

/** The model's response didn't contain the forced tool_use block, or was otherwise unusable. */
export class LlmResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmResponseError";
  }
}

/** A model ID has no entry in src/lib/ai/pricing.ts's price table. */
export class PricingNotFoundError extends Error {
  constructor(modelId: string) {
    super(`No price table entry for model "${modelId}". Add it to src/lib/ai/pricing.ts.`);
    this.name = "PricingNotFoundError";
  }
}

/** The web search tool didn't run (no result block), or the server tool itself reported an error. */
export class WebSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebSearchError";
  }
}
