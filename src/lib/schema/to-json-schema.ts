import { z } from "zod";

/**
 * TQ-2 (Zod version and JSON Schema conversion): resolved by using Zod
 * 4.6.5's own `z.toJSONSchema()` rather than a separate package — the
 * `zod-to-json-schema` npm package existed to cover Zod 3, which had no
 * built-in converter; the pinned Zod version already includes one.
 *
 * Anthropic's tool `input_schema` wants a plain JSON Schema object with
 * `type: "object"` at the root and no `$schema` meta key, so this strips
 * that key rather than passing `z.toJSONSchema()`'s output through as-is
 * (TRD section 6: "force a single tool call whose input schema is
 * generated from the Zod schema").
 */
export function toToolInputSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  return jsonSchema;
}
