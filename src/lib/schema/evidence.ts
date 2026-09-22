import { z } from "zod";

import { Reliability, SourceOrigin, SourceStatus, SourceType } from "@/lib/schema/enums";
import { idOf, Iso } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 3, with `z.url()` per the pinned Zod's current API. */

export const Locator = z.object({
  kind: z.enum(["page", "url", "paragraph", "sheet"]),
  page: z.number().int().positive().optional(),
  url: z.url().optional(),
  paragraph: z.number().int().nonnegative().optional(),
  sheet: z.string().optional(),
  cell: z.string().optional(),
  startChar: z.number().int().nonnegative().optional(),
  endChar: z.number().int().nonnegative().optional(),
});

export const Source = z.object({
  id: idOf("src"),
  analysisId: idOf("ana"),
  type: SourceType,
  origin: SourceOrigin,
  title: z.string().max(200),
  filename: z.string().optional(),
  url: z.url().optional(),
  storagePath: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  pageCount: z.number().int().positive().optional(),
  status: SourceStatus,
  reliability: Reliability,
  extraction: z.enum(["text", "vision"]).optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  addedAt: Iso,
  parsedAt: Iso.optional(),
});

export const Evidence = z.object({
  id: idOf("ev"),
  analysisId: idOf("ana"),
  sourceId: idOf("src"),
  locator: Locator,
  text: z.string().min(1).max(2000),
  reliability: Reliability,
  extraction: z.enum(["text", "vision"]).default("text"),
  retrievedAt: Iso,
  contentHash: z.string(),
});

export const Quote = z.object({
  evidenceId: idOf("ev"),
  quote: z.string().min(3).max(400),
});

export const FactValue = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("number"), value: z.number(), unit: z.string().optional() }),
  z.object({ kind: z.literal("money"), amount: z.number(), currency: z.string().length(3) }),
  z.object({ kind: z.literal("percent"), value: z.number() }),
  z.object({ kind: z.literal("text"), value: z.string() }),
  z.object({ kind: z.literal("date"), value: z.string() }),
  z.object({ kind: z.literal("boolean"), value: z.boolean() }),
  z.object({ kind: z.literal("list"), values: z.array(z.string()) }),
]);

export const Fact = z.object({
  id: idOf("fct"),
  analysisId: idOf("ana"),
  key: z.string().regex(/^[a-z_]+(\.[a-z0-9_]+)+$/),
  statement: z.string().max(280),
  value: FactValue,
  period: z.string().optional(),
  asOf: z.string().optional(),
  quotes: z.array(Quote).min(1),
  reliability: Reliability,
  confidence: z.number().min(0).max(1),
  conflictsWith: z.array(idOf("fct")).default([]),
  runId: idOf("run"),
});

export type Locator = z.infer<typeof Locator>;
export type Source = z.infer<typeof Source>;
export type Evidence = z.infer<typeof Evidence>;
export type Quote = z.infer<typeof Quote>;
export type FactValue = z.infer<typeof FactValue>;
export type Fact = z.infer<typeof Fact>;
