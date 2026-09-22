import { describe, expect, it } from "vitest";
import { z } from "zod";

import { Claim } from "@/lib/schema/claims";
import { toToolInputSchema } from "@/lib/schema/to-json-schema";

// TQ-2 (docs/PROJECT_MEMORY.md D-037): Zod 4's own z.toJSONSchema() is the
// conversion, wrapped to strip the $schema meta key Anthropic's tool
// input_schema doesn't expect (TRD section 6).

describe("toToolInputSchema", () => {
  it("produces a plain object-type JSON Schema with no $schema meta key", () => {
    const schema = z.object({ name: z.string(), score: z.number().min(0).max(100) });
    const jsonSchema = toToolInputSchema(schema);

    expect(jsonSchema.$schema).toBeUndefined();
    expect(jsonSchema.type).toBe("object");
    expect(jsonSchema.properties).toMatchObject({
      name: { type: "string" },
      score: { type: "number", minimum: 0, maximum: 100 },
    });
    expect(jsonSchema.required).toEqual(["name", "score"]);
  });

  it("converts a discriminated union (Claim) to oneOf branches with const status literals", () => {
    const jsonSchema = toToolInputSchema(z.object({ claims: z.array(Claim) }));
    const claims = jsonSchema.properties as { claims: { items: { oneOf: unknown[] } } };

    expect(Array.isArray(claims.claims.items.oneOf)).toBe(true);
    expect(claims.claims.items.oneOf).toHaveLength(4); // VERIFIED, AI_ANALYSIS, ASSUMPTION, MISSING
  });

  it("rejects additional properties by default, matching a forced tool call's strict input", () => {
    const jsonSchema = toToolInputSchema(z.object({ name: z.string() }));
    expect(jsonSchema.additionalProperties).toBe(false);
  });
});
