# ARGUS AI — Data Schema

| | |
|---|---|
| Version | 0.1 (`schemaVersion: 1`) |
| Date | 2026-09-21 |
| Read with | [TRD](TRD.md), [AI_SPEC](AI_SPEC.md), [PRD](PRD.md) section 8 |

The Zod schemas in `src/lib/schema/` are the source of truth. TypeScript types are always `z.infer` of these schemas. Firestore documents are converted to and from these shapes in `src/lib/repos/` (Firestore `Timestamp` at rest, ISO 8601 strings in application code).

---

## 1. Conventions

- IDs are prefixed ULIDs, for example `ana_01J8Z...`. Prefixes: `ana` analysis, `src` source, `ev` evidence, `fct` fact, `clm` claim, `run` run, `rpt` report, `flg` flag, `chk` checklist item, `cmp` comparison, `act` activity, `sig` signal, `exp` export, `note` note.
- Field names are camelCase. Enums are UPPER_SNAKE strings.
- Every top-level document carries `ownerId`. Documents that clients may read carry it explicitly (analysis, run).
- Scores are 0 to 100 (`null` means not scored). Confidence is 0 to 1.
- Money is stored as a numeric amount in base units plus an ISO 4217 currency code. Never store formatted strings.
- Schema changes bump `schemaVersion` and ship a read-time upgrader. Never rewrite historical reports in place.
- `SCORING_VERSION` and `PROMPT_VERSION` (semantic versions) are stamped on every report.

## 2. Enums and identifiers

```ts
// src/lib/schema/enums.ts
import { z } from "zod";

export const ClaimStatus = z.enum(["VERIFIED", "AI_ANALYSIS", "ASSUMPTION", "MISSING"]);
export const Reliability = z.enum(["INDEPENDENT", "FIRST_PARTY", "PROVIDED"]);
export const DimensionKey = z.enum([
  "founder", "market", "product", "traction",
  "competitive", "business_model", "financial", "risk",
]);
export const SectionKey = z.enum([
  "executive_summary", "investment_overview", "investment_score", "founder_team",
  "product_business_model", "market_opportunity", "market_trends", "competitive_landscape",
  "traction_growth", "financial_signals", "risks_red_flags", "strengths_weaknesses",
  "market_gaps", "ai_insights", "evidence_sources", "missing_information",
]);
export const Stage = z.enum(["PRE_SEED", "SEED", "SERIES_A", "SERIES_B_PLUS", "UNKNOWN"]);
export const StageProfile = z.enum(["EARLY", "SEED", "GROWTH"]);
export const SourceType = z.enum([
  "PITCH_DECK", "FINANCIAL_DOC", "COMPANY_DOC", "WEBSITE", "WEB_RESEARCH", "USER_NOTES",
]);
export const SourceOrigin = z.enum(["UPLOAD", "URL", "TEXT", "RESEARCH"]);
export const SourceStatus = z.enum(["UPLOADED", "PARSING", "PARSED", "FAILED"]);
export const Severity = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const FlagCategory = z.enum([
  "INCONSISTENCY", "UNVERIFIABLE_CLAIM", "FOUNDER", "MARKET", "LEGAL_REGULATORY",
  "FINANCIAL", "TRACTION", "PRODUCT_TECH", "COMPETITION", "GOVERNANCE", "SOURCE_INTEGRITY", "OTHER",
]);
export const AnalysisStatus = z.enum(["DRAFT", "READY", "PROCESSING", "COMPLETE", "PARTIAL", "FAILED"]);
export const RunStatus = z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "PARTIAL", "FAILED", "CANCELLED"]);
export const StepName = z.enum([
  "INGEST", "EXTRACT_FACTS", "RESEARCH", "CONSISTENCY", "ANALYZE",
  "SCORE", "SYNTHESIZE", "VERIFY", "FINALIZE",
]);
export const StepStatus = z.enum(["PENDING", "RUNNING", "DONE", "FAILED", "SKIPPED"]);
export const WarningCode = z.enum([
  "CITATION_INVALID", "UNGROUNDED_NUMBER", "ENTITY_UNGROUNDED", "SENSITIVE_ATTRIBUTE",
  "INJECTION_SUSPECTED", "SCHEMA_REPAIR", "SOURCE_PARSE_FAILED", "EVIDENCE_TRUNCATED",
  "BUDGET_EXCEEDED", "STEP_RETRIED",
]);

// src/lib/schema/ids.ts
export const ID_PREFIXES = {
  analysis: "ana", source: "src", evidence: "ev", fact: "fct", claim: "clm", run: "run",
  report: "rpt", flag: "flg", checklist: "chk", comparison: "cmp", activity: "act",
  signal: "sig", export: "exp", note: "note",
} as const;
export const idOf = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`));
export const Iso = z.iso.datetime();  // z.string().datetime() is deprecated in the pinned Zod (4.6.5)
```

## 3. Core evidence types

```ts
// src/lib/schema/evidence.ts
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
  quote: z.string().min(3).max(400),   // must be a verbatim substring after normalisation
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
  key: z.string().regex(/^[a-z_]+(\.[a-z0-9_]+)+$/),   // canonical (section 8) or custom.*
  statement: z.string().max(280),
  value: FactValue,
  period: z.string().optional(),        // "FY2025", "Q2 2026", "TTM"
  asOf: z.string().optional(),          // ISO date the value refers to
  quotes: z.array(Quote).min(1),
  reliability: Reliability,             // strongest reliability among its quotes
  confidence: z.number().min(0).max(1),
  conflictsWith: z.array(idOf("fct")).default([]),
  runId: idOf("run"),
});
```

## 4. Claims, dimensions, flags, checklist

```ts
// src/lib/schema/claims.ts
const ClaimBase = z.object({
  id: idOf("clm"),
  text: z.string().min(1).max(320),                 // one atomic statement
  confidence: z.number().min(0).max(1),
  factKey: z.string().optional(),                   // set when restating a canonical fact
  entities: z.array(z.string().max(120)).default([]), // organisations or people named in text
  derivation: z.object({                            // required for any computed number
    formula: z.string(),
    inputs: z.array(z.object({ factId: idOf("fct"), value: z.number() })).min(1),
    result: z.number(),
  }).optional(),
});

const RefId = z.string().regex(/^(fct|clm)_[0-9A-HJKMNP-TV-Z]{26}$/);

export const Claim = z.discriminatedUnion("status", [
  ClaimBase.extend({ status: z.literal("VERIFIED"), quotes: z.array(Quote).min(1) }),
  ClaimBase.extend({ status: z.literal("AI_ANALYSIS"), basedOn: z.array(RefId).min(1) }),
  ClaimBase.extend({
    status: z.literal("ASSUMPTION"),
    assumption: z.object({ statement: z.string(), wouldConfirm: z.string() }),
  }),
  ClaimBase.extend({
    status: z.literal("MISSING"),
    missing: z.object({
      whatIsNeeded: z.string(),
      suggestedSource: z.string(),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    }),
  }),
]);

export const CriterionScore = z.object({
  id: z.string(),                                     // e.g. "founder.domain_fit"
  label: z.string(),
  score: z.number().int().min(0).max(4).nullable(),   // null = insufficient evidence
  rationale: z.string().max(400),
  claimIds: z.array(idOf("clm")),
});

// The model returns criteria and claims. Code fills score, confidence and versions.
export const DimensionAnalysis = z.object({
  dimension: DimensionKey,
  score: z.number().min(0).max(100).nullable(),
  confidence: z.number().min(0).max(1),
  evidenceTruncated: z.boolean().default(false),
  criteria: z.array(CriterionScore).min(3),
  claims: z.array(Claim),                             // claims are defined once, here
  strengthIds: z.array(idOf("clm")),
  weaknessIds: z.array(idOf("clm")),
  riskIds: z.array(idOf("clm")),
  missingIds: z.array(idOf("clm")),
  scoringVersion: z.string(),
  promptVersion: z.string(),
});

export const Flag = z.object({
  id: idOf("flg"),
  category: FlagCategory,
  severity: Severity,
  title: z.string().max(120),
  description: z.string().max(600),
  evidenceIds: z.array(idOf("ev")),
  claimIds: z.array(idOf("clm")).default([]),
  detectedBy: z.enum(["CONSISTENCY", "DIMENSION", "VERIFIER"]),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "DISMISSED"]).default("OPEN"),
});

export const ChecklistItem = z.object({
  id: idOf("chk"),
  dimension: z.union([DimensionKey, z.literal("general")]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  question: z.string().max(240),
  whyItMatters: z.string().max(400),
  suggestedSource: z.string().max(200),
  linkedClaimIds: z.array(idOf("clm")),
  status: z.enum(["OPEN", "REQUESTED", "RECEIVED", "WAIVED"]).default("OPEN"),
  userNote: z.string().max(1000).optional(),
});
```

## 5. Report, analysis, run

```ts
// src/lib/schema/report.ts
const StatusCounts = z.object({
  VERIFIED: z.number(), AI_ANALYSIS: z.number(), ASSUMPTION: z.number(), MISSING: z.number(),
});

export const EvidenceStats = z.object({
  sources: z.number(), evidenceItems: z.number(), facts: z.number(),
  claims: StatusCounts,
  bySection: z.record(z.string(), StatusCounts),      // keys are SectionKey values
  reliabilityMix: z.object({                          // VERIFIED claims by strongest reliability
    INDEPENDENT: z.number(), FIRST_PARTY: z.number(), PROVIDED: z.number(),
  }),
  downgraded: z.number(), dropped: z.number(),        // effect of the verification pass
});

export const Overall = z.object({
  score: z.number().min(0).max(100).nullable(),
  label: z.enum(["SCORED", "INSUFFICIENT_EVIDENCE"]),
  confidence: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),                 // weight share of scored dimensions
  cap: z.object({ value: z.number(), reason: z.string(), flagIds: z.array(idOf("flg")) }).optional(),
  weights: z.record(z.string(), z.number()),          // DimensionKey -> weight used
});

export const RunWarning = z.object({
  code: WarningCode, message: z.string(), step: StepName.optional(), refId: z.string().optional(),
});

export const Report = z.object({
  id: idOf("rpt"), analysisId: idOf("ana"), runId: idOf("run"),
  ownerId: z.string(),
  version: z.number().int().positive(),               // increments per analysis
  schemaVersion: z.literal(1),
  scoringVersion: z.string(), promptVersion: z.string(),
  generatedAt: Iso,
  stage: Stage, stageProfile: StageProfile,
  overall: Overall,
  narrative: z.object({                               // sentence-level claims
    executiveSummary: z.array(Claim),
    investmentOverview: z.array(Claim),
    marketTrends: z.array(Claim),
    marketGaps: z.array(Claim),
    aiInsights: z.array(Claim),
  }),
  flags: z.array(Flag).max(50),
  checklist: z.array(ChecklistItem).max(80),
  evidenceStats: EvidenceStats,
  warnings: z.array(RunWarning),
});
// Dimension analyses are stored separately (section 6) and assembled by the API.

// src/lib/schema/analysis.ts
export const Analysis = z.object({
  id: idOf("ana"), ownerId: z.string(),
  startup: z.object({
    name: z.string().min(1).max(120),
    website: z.url().optional(),
    oneLiner: z.string().max(240).optional(),
    stage: Stage.default("UNKNOWN"),
    sector: z.string().max(80).optional(),
    hqCountry: z.string().length(2).optional(),       // ISO 3166-1 alpha-2
  }),
  status: AnalysisStatus,
  options: z.object({
    webResearch: z.boolean(),
    stageProfile: StageProfile.optional(),
    analystFocus: z.string().max(500).optional(),
  }),
  latest: z.object({                                  // denormalised for list views
    reportId: idOf("rpt"), version: z.number().int(),
    overallScore: z.number().nullable(), confidence: z.number(),
    label: z.enum(["SCORED", "INSUFFICIENT_EVIDENCE"]),
    generatedAt: Iso, topFlagSeverity: Severity.nullable(),
  }).nullable(),
  currentRunId: idOf("run").nullable(),
  tags: z.array(z.string().max(32)).max(10),
  isWatchlisted: z.boolean(),
  isDemo: z.boolean().default(false),
  createdAt: Iso, updatedAt: Iso, archivedAt: Iso.nullable(),
});

// src/lib/schema/run.ts
export const Usage = z.object({
  inputTokens: z.number(), outputTokens: z.number(),
  cacheReadTokens: z.number().default(0), cacheWriteTokens: z.number().default(0),
  estimatedCostUsd: z.number(),
});

export const StepState = z.object({
  status: StepStatus,
  attempt: z.number().int().nonnegative(),
  startedAt: Iso.optional(), finishedAt: Iso.optional(),
  usage: Usage.optional(),
  counters: z.record(z.string(), z.number()).optional(),   // e.g. { evidence: 212, facts: 64 }
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});

export const Run = z.object({
  id: idOf("run"), analysisId: idOf("ana"), ownerId: z.string(),
  status: RunStatus,
  options: z.object({ webResearch: z.boolean(), stageProfile: StageProfile }),
  steps: z.record(z.string(), StepState),                   // keys are StepName values
  dimensionStatus: z.record(z.string(), StepStatus),        // keys are DimensionKey values
  modelIds: z.object({ analysis: z.string(), synthesis: z.string(), fast: z.string() }),
  promptVersion: z.string(), scoringVersion: z.string(),
  usage: Usage,
  warnings: z.array(RunWarning),
  cancelRequested: z.boolean().default(false),
  reportId: idOf("rpt").nullable(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  startedAt: Iso, finishedAt: Iso.optional(),
});
```

## 6. Firestore model

```
users/{uid}
users/{uid}/usage/{yyyymmdd}            analysesStarted, tokens, estimatedCostUsd

analyses/{analysisId}                   Analysis
  ├─ sources/{sourceId}                 Source
  ├─ evidence/{evidenceId}              Evidence
  ├─ facts/{factId}                     Fact
  ├─ runs/{runId}                       Run          (client-readable: progress)
  ├─ reports/{reportId}                 Report
  │    └─ dimensions/{dimensionKey}     DimensionAnalysis (8 docs)
  ├─ notes/{noteId}                     { sectionKey, text, createdAt }        (P2)
  └─ signals/{signalId}                 Signal                                  (Phase 6)

comparisons/{comparisonId}              Comparison
activity/{activityId}                   Activity
exports/{exportId}                      Export
```

Design notes:
- Dimension analyses are separate documents to stay far below Firestore's 1 MiB document limit and to let sections load independently.
- `analyses/{id}.latest` denormalises the newest report summary so list, dashboard and compare pickers need one read per analysis.
- Evidence can reach hundreds of documents per analysis. Write in batches; never read all evidence for list views.
- `ownerId` is stored on `analyses` and `runs`, the only client-readable collections.

```ts
export const Comparison = z.object({
  id: idOf("cmp"), ownerId: z.string(), name: z.string().max(120),
  items: z.array(z.object({
    analysisId: idOf("ana"), reportId: idOf("rpt"),
    label: z.string(), deleted: z.boolean().default(false),   // snapshot label if the analysis is deleted
  })).min(2).max(4),
  scoringVersions: z.array(z.string()),
  narrative: z.array(Claim).optional(),                       // P2
  createdAt: Iso,
});

export const Activity = z.object({
  id: idOf("act"), ownerId: z.string(),
  type: z.enum([
    "ANALYSIS_CREATED", "SOURCE_ADDED", "RUN_STARTED", "RUN_COMPLETED", "RUN_FAILED",
    "REPORT_EXPORTED", "COMPARISON_CREATED", "WATCHLIST_ADDED", "WATCHLIST_REMOVED", "SIGNAL_DETECTED",
  ]),
  analysisId: idOf("ana").optional(), message: z.string().max(200), createdAt: Iso,
});

export const Signal = z.object({
  id: idOf("sig"), analysisId: idOf("ana"),
  title: z.string(), url: z.url(), publisher: z.string().optional(),
  publishedAt: Iso.optional(), summary: z.string().max(400),
  impact: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "UNCLEAR"]),
  relatedDimension: DimensionKey.optional(),
  evidenceId: idOf("ev"), retrievedAt: Iso, seenAt: Iso.optional(),
});

export const Export = z.object({
  id: idOf("exp"), ownerId: z.string(), analysisId: idOf("ana"), reportId: idOf("rpt"),
  format: z.enum(["MD", "JSON", "PDF"]), storagePath: z.string(),
  createdAt: Iso, expiresAt: Iso,
});
```

### Indexes (`firebase/firestore.indexes.json`)

```json
{
  "indexes": [
    { "collectionGroup": "analyses", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "ownerId", "order": "ASCENDING" }, { "fieldPath": "updatedAt", "order": "DESCENDING" }] },
    { "collectionGroup": "analyses", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "ownerId", "order": "ASCENDING" }, { "fieldPath": "isWatchlisted", "order": "ASCENDING" }, { "fieldPath": "updatedAt", "order": "DESCENDING" }] },
    { "collectionGroup": "analyses", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "ownerId", "order": "ASCENDING" }, { "fieldPath": "status", "order": "ASCENDING" }, { "fieldPath": "updatedAt", "order": "DESCENDING" }] },
    { "collectionGroup": "analyses", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "ownerId", "order": "ASCENDING" }, { "fieldPath": "latest.overallScore", "order": "DESCENDING" }] },
    { "collectionGroup": "activity", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "ownerId", "order": "ASCENDING" }, { "fieldPath": "createdAt", "order": "DESCENDING" }] },
    { "collectionGroup": "comparisons", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "ownerId", "order": "ASCENDING" }, { "fieldPath": "createdAt", "order": "DESCENDING" }] }
  ],
  "fieldOverrides": []
}
```

### Security rules (`firebase/firestore.rules`)

Clients are read-only and only for what they need live (analysis summary, run progress). Everything else is read server-side through the Admin SDK, which bypasses rules.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }

    match /analyses/{analysisId} {
      allow read: if signedIn() && resource.data.ownerId == request.auth.uid;
      allow write: if false;

      match /runs/{runId} {
        allow read: if signedIn() && resource.data.ownerId == request.auth.uid;
        allow write: if false;
      }
    }

    // Deny everything else to clients.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Client list queries on `analyses` (if ever used) must include `where("ownerId", "==", uid)`, because rules are not filters. The app lists analyses on the server.

### Storage rules (`firebase/storage.rules`)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{uid}/{analysisId}/{fileName} {
      allow create: if request.auth != null && request.auth.uid == uid
        && request.resource.size < 25 * 1024 * 1024
        && request.resource.contentType.matches(
          'application/pdf|text/plain|text/markdown|text/csv|application/vnd.ms-excel|application/vnd.openxmlformats-officedocument.*');
      allow read: if request.auth != null && request.auth.uid == uid;
      allow update, delete: if false;     // removal is server-side (cascade)
    }
    match /exports/{uid}/{fileName} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

The client sets `contentType` explicitly from the file extension (some browsers send `application/octet-stream` for `.md`). The server re-validates by content regardless of what storage rules allowed. Keep the size cap here in step with `MAX_UPLOAD_MB`.

### Deletion cascade

`DELETE /api/analyses/:id` runs on the server: recursive delete of `analyses/{id}` and its subcollections, delete Storage prefix `uploads/{uid}/{id}/`, delete related exports, update comparisons (mark item `deleted`, remove the comparison if fewer than 2 live items remain), and write an activity entry.

## 7. Scoring constants (mirrored in `src/lib/analysis/config.ts`)

`SCORING_VERSION = "1.0.0"`. Weights per stage profile (each column sums to 1.00). Method and rubrics in [AI_SPEC](AI_SPEC.md).

| Dimension | EARLY | SEED | GROWTH |
|---|---|---|---|
| founder | 0.25 | 0.20 | 0.14 |
| market | 0.18 | 0.16 | 0.12 |
| product | 0.15 | 0.14 | 0.12 |
| traction | 0.06 | 0.14 | 0.22 |
| competitive | 0.10 | 0.10 | 0.10 |
| business_model | 0.10 | 0.10 | 0.10 |
| financial | 0.04 | 0.08 | 0.14 |
| risk | 0.12 | 0.08 | 0.06 |

Stage to profile: `PRE_SEED` → `EARLY`; `SEED` and `UNKNOWN` → `SEED`; `SERIES_A` and `SERIES_B_PLUS` → `GROWTH`. A user override in run options wins.

## 8. Canonical fact keys

Facts use these keys so reports and comparisons line up. Anything else uses the `custom.` prefix. Founder facts are per person: `founder.<slug>.<field>`.

| Key | Kind | Notes |
|---|---|---|
| company.name, company.legal_name | text | |
| company.founded_year | number | |
| company.hq_location | text | |
| company.employee_count | number | as stated, with `asOf` |
| company.stage | text | as stated by sources |
| company.sector | text | |
| founder.\<slug\>.name, .role | text | |
| founder.\<slug\>.prior_experience | list | professional history only |
| founder.\<slug\>.education | list | professional relevance only |
| founder.\<slug\>.prior_exits | list | |
| founder.\<slug\>.full_time | boolean | |
| team.size, team.technical_share | number, percent | |
| product.description | text | |
| product.stage | text | idea, prototype, beta, launched |
| product.differentiators | list | |
| product.ip_status | text | patents, trade secrets |
| market.tam, market.sam, market.som | money | with `period` and method in statement |
| market.growth_rate | percent | per year unless stated |
| business.model | text | |
| business.pricing | text | |
| business.gross_margin | percent | |
| business.cac, business.ltv | money | |
| business.ltv_cac_ratio | number | derived only with `derivation` |
| traction.arr, traction.mrr, traction.revenue_ttm | money | |
| traction.revenue_growth_yoy | percent | |
| traction.customers, traction.users, traction.mau | number | |
| traction.churn_rate, traction.nrr | percent | |
| traction.pipeline_value | money | |
| financial.cash, financial.burn_monthly | money | |
| financial.runway_months | number | derived only with `derivation` |
| financial.total_raised, financial.last_round_size | money | |
| financial.last_round_date | date | |
| financial.valuation_post | money | |
| financial.use_of_funds | list | |
| competitor.\<slug\>.name, .positioning | text | names only from evidence |
| risk.\<slug\>.description | text | |

Money facts store `amount` in base units. Percent facts store the value as a number in 0 to 100. Every derived number requires `derivation` on the claim that uses it.

## 9. Demo and fixture data

- `src/demo/` holds fictional data typed as `Report`, `Analysis` and related schemas. Every demo analysis has `isDemo: true` and the UI labels it "Demo data".
- `evals/fixtures/<slug>/` holds fictional startups with planted traps (AI_SPEC section 10). No real company data anywhere in the repository.
