import { z } from "zod";

import { DimensionKey, FlagCategory, Stage } from "@/lib/schema/enums";

/**
 * Fixture and expectation shapes (AI_SPEC section 10). "Fixtures are fully
 * fictional" (R-DAT-08/D-014) — every `startupName`, person and figure in
 * `evals/fixtures/**` is invented for this suite, not drawn from a real
 * company.
 */

export const FixtureSourceFile = z.object({
  id: z.string(),
  type: z.enum(["PITCH_DECK", "FINANCIAL_DOC", "COMPANY_DOC", "WEBSITE", "USER_NOTES"]),
  origin: z.enum(["UPLOAD", "URL"]),
  title: z.string(),
  /** Relative path (from the fixture directory) to a local text/md/pdf/docx/xlsx/csv file, for `origin: "UPLOAD"`. */
  file: z.string().optional(),
  /** Relative path to a local HTML file the harness serves over a throwaway local server, for `origin: "URL"`. */
  html: z.string().optional(),
});

export const FixtureManifest = z.object({
  slug: z.string(),
  trap: z.string(),
  startupName: z.string(),
  stage: Stage,
  sector: z.string().optional(),
  companyDomain: z.string().optional(),
  sources: z.array(FixtureSourceFile).min(1),
});

/**
 * Each field is one checkable translation of AI_SPEC 10.1's prose
 * expectation column for that fixture — only the fields a given fixture
 * needs are set. `forbiddenTextSubstrings` is case-insensitive and checked
 * against every claim's `text` (dimension and narrative) and every flag's
 * `title`/`description`.
 */
export const FixtureExpectation = z.object({
  scored: z.boolean().optional(),
  minOverallScore: z.number().optional(),
  maxOverallConfidence: z.number().optional(),
  nullDimensions: z.array(DimensionKey).optional(),
  minMissingClaims: z.number().optional(),
  minClaimsInDimension: z.record(z.string(), z.number()).optional(),
  minFlagsOfCategory: z.record(z.string(), z.number()).optional(),
  /** Every flag of this category must cite 2+ distinct evidence ids. */
  flagsMustCiteMultipleEvidence: z.array(FlagCategory).optional(),
  checklistMustMentionKeywords: z.array(z.string()).optional(),
  forbiddenTextSubstrings: z.array(z.string()).optional(),
  /** Every evidence item extracted for this fixture must carry this `extraction` value. */
  allEvidenceExtraction: z.enum(["text", "vision"]).optional(),
  /** Case-insensitive keywords that must each appear in at least one MISSING claim's text or `missing.whatIsNeeded` — the "planted gap recall" metric (AI_SPEC 10.2) reads this field across fixtures. */
  plantedGapKeywords: z.array(z.string()).optional(),
  /** This fixture is one of the "injection fixtures" the "Injection resistance" metric (AI_SPEC 10.2) is measured over. */
  isInjectionFixture: z.boolean().optional(),
});

export type FixtureSourceFile = z.infer<typeof FixtureSourceFile>;
export type FixtureManifest = z.infer<typeof FixtureManifest>;
export type FixtureExpectation = z.infer<typeof FixtureExpectation>;

export const Thresholds = z.object({
  invalidCitationsFinal: z.number(),
  ungroundedNumbersFinal: z.number(),
  ungroundedEntitiesFinal: z.number(),
  sensitiveAttributeHitsFinal: z.number(),
  injectionResistanceMinRate: z.number(),
  missingInfoRecallMinRate: z.number(),
  rawDowngradeRateAlertAbove: z.number(),
});

export type Thresholds = z.infer<typeof Thresholds>;
