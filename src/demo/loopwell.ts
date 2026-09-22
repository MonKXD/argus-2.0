import { z } from "zod";

import { demoId } from "@/demo/ids";
import { Analysis } from "@/lib/schema/analysis";
import { Claim, ChecklistItem, DimensionAnalysis, Flag } from "@/lib/schema/claims";
import { Evidence, Fact, Source } from "@/lib/schema/evidence";
import { Report } from "@/lib/schema/report";

/**
 * Loopwell (fictional): embedded lending and expense tools for freelancer
 * marketplaces. A fully worked demo analysis — sources, evidence, facts,
 * narrative claims across all four statuses, flags, a checklist, and all
 * eight dimension analyses — for the landing hero and /sample preview
 * (FR-LND-02, T-1.11, T-1.12). Fictional per R-DAT-08; no real company data.
 */

const ANALYSIS_ID = demoId("ana", 1);
const REPORT_ID = demoId("rpt", 1);
const RUN_ID = demoId("run", 1);
const OWNER_ID = "demo_owner";

const SRC_DECK = demoId("src", 1);
const SRC_WEBSITE = demoId("src", 2);
const SRC_RESEARCH = demoId("src", 3);

const EV_ARR = demoId("ev", 1);
const EV_FOUNDERS = demoId("ev", 2);
const EV_PRODUCT = demoId("ev", 3);
const EV_MARKET = demoId("ev", 4);
const EV_PARTNERSHIPS = demoId("ev", 5);

const FCT_ARR = demoId("fct", 1);
const FCT_USERS = demoId("fct", 2);
const FCT_FOUNDER_EXPERIENCE = demoId("fct", 3);
const FCT_MARKET_GROWTH = demoId("fct", 4);
const FCT_PRODUCT_DESCRIPTION = demoId("fct", 5);

const FLG_ARR_UNVERIFIED = demoId("flg", 1);
const FLG_MARKET_SIZE = demoId("flg", 2);

const now = "2026-09-22T00:00:00Z";

export const loopwellSources: Source[] = [
  Source.parse({
    id: SRC_DECK,
    analysisId: ANALYSIS_ID,
    type: "PITCH_DECK",
    origin: "UPLOAD",
    title: "Loopwell — Seed deck.pdf",
    filename: "loopwell-seed-deck.pdf",
    mimeType: "application/pdf",
    pageCount: 14,
    status: "PARSED",
    reliability: "PROVIDED",
    addedAt: now,
    parsedAt: now,
  }),
  Source.parse({
    id: SRC_WEBSITE,
    analysisId: ANALYSIS_ID,
    type: "WEBSITE",
    origin: "URL",
    title: "loopwell.example",
    url: "https://loopwell.example",
    status: "PARSED",
    reliability: "FIRST_PARTY",
    addedAt: now,
    parsedAt: now,
  }),
  Source.parse({
    id: SRC_RESEARCH,
    analysisId: ANALYSIS_ID,
    type: "WEB_RESEARCH",
    origin: "RESEARCH",
    title: "Fintech funding trends, 2025",
    url: "https://research.example/fintech-2025",
    status: "PARSED",
    reliability: "INDEPENDENT",
    addedAt: now,
    parsedAt: now,
  }),
];

export const loopwellEvidence: Evidence[] = [
  Evidence.parse({
    id: EV_ARR,
    analysisId: ANALYSIS_ID,
    sourceId: SRC_DECK,
    locator: { kind: "page", page: 7 },
    text: "Loopwell reached $2.0M in annual recurring revenue in Q2 2026.",
    reliability: "PROVIDED",
    retrievedAt: now,
    contentHash: "loopwell-ev-1",
  }),
  Evidence.parse({
    id: EV_FOUNDERS,
    analysisId: ANALYSIS_ID,
    sourceId: SRC_DECK,
    locator: { kind: "page", page: 2 },
    text: "Founders Maya Chen (CEO) and Idris Osei (CTO) previously built payments infrastructure at two fintech startups.",
    reliability: "PROVIDED",
    retrievedAt: now,
    contentHash: "loopwell-ev-2",
  }),
  Evidence.parse({
    id: EV_PRODUCT,
    analysisId: ANALYSIS_ID,
    sourceId: SRC_WEBSITE,
    locator: { kind: "url", url: "https://loopwell.example" },
    text: "Loopwell embeds lending and expense tools directly into freelancer marketplaces.",
    reliability: "FIRST_PARTY",
    retrievedAt: now,
    contentHash: "loopwell-ev-3",
  }),
  Evidence.parse({
    id: EV_MARKET,
    analysisId: ANALYSIS_ID,
    sourceId: SRC_RESEARCH,
    locator: { kind: "url", url: "https://research.example/fintech-2025" },
    text: "Industry analysts note freelancer-focused fintech saw a 40% funding increase in 2025.",
    reliability: "INDEPENDENT",
    retrievedAt: now,
    contentHash: "loopwell-ev-4",
  }),
  Evidence.parse({
    id: EV_PARTNERSHIPS,
    analysisId: ANALYSIS_ID,
    sourceId: SRC_DECK,
    locator: { kind: "page", page: 9 },
    text: "Loopwell has signed partnerships with three freelancer marketplaces representing 1.2M active users.",
    reliability: "PROVIDED",
    retrievedAt: now,
    contentHash: "loopwell-ev-5",
  }),
];

export const loopwellFacts: Fact[] = [
  Fact.parse({
    id: FCT_ARR,
    analysisId: ANALYSIS_ID,
    key: "traction.arr",
    statement: "Annual recurring revenue is $2.0M as of Q2 2026.",
    value: { kind: "money", amount: 200_000_000, currency: "USD" },
    period: "Q2 2026",
    quotes: [{ evidenceId: EV_ARR, quote: "Loopwell reached $2.0M in annual recurring revenue" }],
    reliability: "PROVIDED",
    confidence: 0.7,
    runId: RUN_ID,
  }),
  Fact.parse({
    id: FCT_USERS,
    analysisId: ANALYSIS_ID,
    key: "traction.users",
    statement: "Marketplace partnerships represent 1.2M active users.",
    value: { kind: "number", value: 1_200_000, unit: "users" },
    quotes: [{ evidenceId: EV_PARTNERSHIPS, quote: "representing 1.2M active users" }],
    reliability: "PROVIDED",
    confidence: 0.65,
    runId: RUN_ID,
  }),
  Fact.parse({
    id: FCT_FOUNDER_EXPERIENCE,
    analysisId: ANALYSIS_ID,
    key: "founder.maya_chen.prior_experience",
    statement: "Maya Chen previously built payments infrastructure at two fintech startups.",
    value: { kind: "list", values: ["Payments infrastructure, two prior fintech startups"] },
    quotes: [
      {
        evidenceId: EV_FOUNDERS,
        quote: "previously built payments infrastructure at two fintech startups",
      },
    ],
    reliability: "PROVIDED",
    confidence: 0.75,
    runId: RUN_ID,
  }),
  Fact.parse({
    id: FCT_MARKET_GROWTH,
    analysisId: ANALYSIS_ID,
    key: "market.growth_rate",
    statement: "Freelancer-focused fintech funding grew 40% in 2025.",
    value: { kind: "percent", value: 40 },
    period: "2025",
    quotes: [{ evidenceId: EV_MARKET, quote: "saw a 40% funding increase in 2025" }],
    reliability: "INDEPENDENT",
    confidence: 0.6,
    runId: RUN_ID,
  }),
  Fact.parse({
    id: FCT_PRODUCT_DESCRIPTION,
    analysisId: ANALYSIS_ID,
    key: "product.description",
    statement: "Loopwell embeds lending and expense tools into freelancer marketplaces.",
    value: {
      kind: "text",
      value: "Embedded lending and expense tools for freelancer marketplaces",
    },
    quotes: [
      {
        evidenceId: EV_PRODUCT,
        quote: "embeds lending and expense tools directly into freelancer marketplaces",
      },
    ],
    reliability: "FIRST_PARTY",
    confidence: 0.7,
    runId: RUN_ID,
  }),
];

// Omit doesn't distribute over Claim's discriminated union on its own; this
// does, so each status keeps only its own variant's extra fields.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function claim(id: number, data: DistributiveOmit<z.input<typeof Claim>, "id">): Claim {
  return Claim.parse({ id: demoId("clm", id), ...data });
}

// Narrative claims (Report.narrative), spanning all four statuses.
const execSummaryArr = claim(1, {
  text: "Loopwell reached $2.0M in annual recurring revenue in Q2 2026.",
  confidence: 0.7,
  factKey: "traction.arr",
  status: "VERIFIED",
  quotes: [{ evidenceId: EV_ARR, quote: "Loopwell reached $2.0M in annual recurring revenue" }],
});
const execSummaryTeam = claim(2, {
  text: "The founding team's prior fintech infrastructure experience is a meaningful asset for execution risk.",
  confidence: 0.65,
  status: "AI_ANALYSIS",
  basedOn: [FCT_FOUNDER_EXPERIENCE],
});
const overviewRetention = claim(3, {
  text: "Loopwell's retention likely exceeds typical freelancer-marketplace tooling, though this is not yet evidenced.",
  confidence: 0.3,
  status: "ASSUMPTION",
  assumption: {
    statement: "Retention exceeds the category median",
    wouldConfirm: "Cohort retention data covering at least two quarters",
  },
});
const overviewBurn = claim(4, {
  text: "Loopwell's current monthly burn rate is not disclosed in the available materials.",
  confidence: 0,
  status: "MISSING",
  missing: {
    whatIsNeeded: "Monthly burn rate and cash balance",
    suggestedSource: "Financial statements or bank statements",
    priority: "HIGH",
  },
});
const marketTrend = claim(5, {
  text: "Industry analysts note freelancer-focused fintech saw a 40% funding increase in 2025.",
  confidence: 0.6,
  factKey: "market.growth_rate",
  status: "VERIFIED",
  quotes: [{ evidenceId: EV_MARKET, quote: "saw a 40% funding increase in 2025" }],
});
const marketGapTam = claim(6, {
  text: "No independent estimate of the total addressable market for freelancer-embedded fintech tools was found.",
  confidence: 0,
  status: "MISSING",
  missing: {
    whatIsNeeded: "Independent TAM/SAM sizing",
    suggestedSource: "Third-party market research",
    priority: "MEDIUM",
  },
});
const insightDistribution = claim(7, {
  text: "Loopwell's marketplace-partnership distribution model reduces customer acquisition cost relative to direct-to-freelancer sales.",
  confidence: 0.55,
  status: "AI_ANALYSIS",
  basedOn: [FCT_USERS],
});
const insightReporting = claim(8, {
  text: "The absence of a disclosed burn rate alongside a single-source revenue figure suggests financial reporting practices a diligence process should probe further.",
  confidence: 0.5,
  status: "AI_ANALYSIS",
  basedOn: [FCT_ARR],
});

// Dimension-level claims, one per dimension.
const founderClaim = claim(9, {
  text: "Maya Chen and Idris Osei previously built payments infrastructure at two fintech startups.",
  confidence: 0.75,
  factKey: "founder.maya_chen.prior_experience",
  status: "VERIFIED",
  quotes: [
    {
      evidenceId: EV_FOUNDERS,
      quote: "previously built payments infrastructure at two fintech startups",
    },
  ],
});
const marketClaim = claim(10, {
  text: "Freelancer-focused fintech tailwinds support Loopwell's positioning.",
  confidence: 0.5,
  status: "AI_ANALYSIS",
  basedOn: [FCT_MARKET_GROWTH],
});
const productClaim = claim(11, {
  text: "Embedding lending and expense tools directly into freelancer marketplaces differentiates Loopwell's distribution from standalone fintech apps.",
  confidence: 0.55,
  status: "AI_ANALYSIS",
  basedOn: [FCT_PRODUCT_DESCRIPTION],
});
const tractionClaim = claim(12, {
  text: "Loopwell has signed partnerships with three freelancer marketplaces representing 1.2M active users.",
  confidence: 0.65,
  factKey: "traction.users",
  status: "VERIFIED",
  quotes: [{ evidenceId: EV_PARTNERSHIPS, quote: "representing 1.2M active users" }],
});
const competitiveClaim = claim(13, {
  text: "Loopwell likely faces limited direct competition in the narrow niche of freelancer-marketplace-embedded lending, though this has not been independently confirmed.",
  confidence: 0.3,
  status: "ASSUMPTION",
  assumption: {
    statement: "Limited direct competition in this niche",
    wouldConfirm: "An independent competitive landscape scan",
  },
});
const businessModelClaim = claim(14, {
  text: "Loopwell's pricing model and take rate are not disclosed in the available materials.",
  confidence: 0,
  status: "MISSING",
  missing: {
    whatIsNeeded: "Pricing model and take rate",
    suggestedSource: "Pitch deck financial appendix or founder interview",
    priority: "MEDIUM",
  },
});
const financialClaim = claim(15, {
  text: "Loopwell's monthly burn rate and cash runway are not disclosed.",
  confidence: 0,
  status: "MISSING",
  missing: {
    whatIsNeeded: "Monthly burn rate and cash runway",
    suggestedSource: "Financial statements",
    priority: "HIGH",
  },
});
const riskClaim = claim(16, {
  text: "Reliance on a small number of marketplace partnerships concentrates Loopwell's distribution risk.",
  confidence: 0.5,
  status: "AI_ANALYSIS",
  basedOn: [FCT_USERS],
});

export const loopwellFlags: Flag[] = [
  Flag.parse({
    id: FLG_ARR_UNVERIFIED,
    category: "FINANCIAL",
    severity: "MEDIUM",
    title: "ARR is founder-stated only",
    description:
      "The $2.0M ARR figure appears only in the pitch deck, with no independent corroboration.",
    evidenceIds: [EV_ARR],
    claimIds: [execSummaryArr.id],
    detectedBy: "VERIFIER",
  }),
  Flag.parse({
    id: FLG_MARKET_SIZE,
    category: "MARKET",
    severity: "LOW",
    title: "No independent market-size estimate",
    description: "The deck asserts a large opportunity without a defined TAM or SAM figure.",
    evidenceIds: [],
    claimIds: [marketGapTam.id],
    detectedBy: "CONSISTENCY",
  }),
];

export const loopwellChecklist: ChecklistItem[] = [
  ChecklistItem.parse({
    id: demoId("chk", 1),
    dimension: "financial",
    priority: "HIGH",
    question: "What is Loopwell's current monthly burn rate and cash runway?",
    whyItMatters: "Determines how long the company can operate before the next raise.",
    suggestedSource: "Financial statements or bank statements",
    linkedClaimIds: [overviewBurn.id, financialClaim.id],
  }),
  ChecklistItem.parse({
    id: demoId("chk", 2),
    dimension: "market",
    priority: "MEDIUM",
    question:
      "What is the total addressable market for embedded fintech tools targeting freelancers?",
    whyItMatters: "Assesses the ceiling on Loopwell's growth.",
    suggestedSource: "Third-party market research report",
    linkedClaimIds: [marketGapTam.id],
  }),
  ChecklistItem.parse({
    id: demoId("chk", 3),
    dimension: "traction",
    priority: "MEDIUM",
    question:
      "What is the net revenue retention across existing freelancer-marketplace partnerships?",
    whyItMatters: "Indicates whether partnerships convert into durable revenue.",
    suggestedSource: "Partnership performance data",
    linkedClaimIds: [overviewRetention.id],
  }),
];

const SEED_WEIGHTS = {
  founder: 0.2,
  market: 0.16,
  product: 0.14,
  traction: 0.14,
  competitive: 0.1,
  business_model: 0.1,
  financial: 0.08,
  risk: 0.08,
};

export const loopwellDimensions: DimensionAnalysis[] = [
  DimensionAnalysis.parse({
    dimension: "founder",
    score: 82,
    confidence: 0.75,
    criteria: [
      {
        id: "founder.domain_fit",
        label: "Domain fit",
        score: 4,
        rationale: "Both founders have direct payments-infrastructure backgrounds.",
        claimIds: [founderClaim.id],
      },
      {
        id: "founder.track_record",
        label: "Track record",
        score: 3,
        rationale: "Two prior fintech startups, outcomes not detailed.",
        claimIds: [founderClaim.id],
      },
      {
        id: "founder.commitment",
        label: "Commitment",
        score: 3,
        rationale: "Full-time status not explicitly confirmed in evidence.",
        claimIds: [],
      },
    ],
    claims: [founderClaim],
    strengthIds: [founderClaim.id],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
  DimensionAnalysis.parse({
    dimension: "market",
    score: 55,
    confidence: 0.45,
    criteria: [
      {
        id: "market.size",
        label: "Market size",
        score: 2,
        rationale: "No independent TAM/SAM figure.",
        claimIds: [marketGapTam.id],
      },
      {
        id: "market.growth",
        label: "Growth",
        score: 3,
        rationale: "Independent research shows sector funding growth.",
        claimIds: [marketClaim.id],
      },
      {
        id: "market.timing",
        label: "Timing",
        score: 2,
        rationale: "Timing signal inferred, not independently confirmed.",
        claimIds: [marketClaim.id],
      },
    ],
    claims: [marketClaim, marketGapTam],
    strengthIds: [marketClaim.id],
    weaknessIds: [],
    riskIds: [],
    missingIds: [marketGapTam.id],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
  DimensionAnalysis.parse({
    dimension: "product",
    score: 60,
    confidence: 0.5,
    criteria: [
      {
        id: "product.differentiation",
        label: "Differentiation",
        score: 3,
        rationale: "Embedded distribution model is a real differentiator.",
        claimIds: [productClaim.id],
      },
      {
        id: "product.maturity",
        label: "Maturity",
        score: 2,
        rationale: "Stage of product (beta/launched) not stated in evidence.",
        claimIds: [],
      },
      {
        id: "product.moat",
        label: "Moat",
        score: 2,
        rationale: "No IP or exclusivity evidence found.",
        claimIds: [],
      },
    ],
    claims: [productClaim],
    strengthIds: [productClaim.id],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
  DimensionAnalysis.parse({
    dimension: "traction",
    score: 68,
    confidence: 0.6,
    criteria: [
      {
        id: "traction.revenue",
        label: "Revenue",
        score: 3,
        rationale: "$2.0M ARR, founder-stated only.",
        claimIds: [tractionClaim.id],
      },
      {
        id: "traction.growth",
        label: "Growth",
        score: 2,
        rationale: "Growth rate not disclosed in evidence.",
        claimIds: [],
      },
      {
        id: "traction.distribution",
        label: "Distribution",
        score: 3,
        rationale: "Three marketplace partnerships reach 1.2M users.",
        claimIds: [tractionClaim.id],
      },
    ],
    claims: [tractionClaim],
    strengthIds: [tractionClaim.id],
    weaknessIds: [],
    riskIds: [],
    missingIds: [],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
  DimensionAnalysis.parse({
    dimension: "competitive",
    score: 58,
    confidence: 0.5,
    criteria: [
      {
        id: "competitive.landscape",
        label: "Landscape",
        score: 2,
        rationale: "No named competitors in evidence.",
        claimIds: [competitiveClaim.id],
      },
      {
        id: "competitive.differentiation",
        label: "Differentiation",
        score: 3,
        rationale: "Embedded-distribution niche appears underserved.",
        claimIds: [competitiveClaim.id],
      },
      {
        id: "competitive.barriers",
        label: "Barriers to entry",
        score: 2,
        rationale: "No evidence of durable barriers.",
        claimIds: [],
      },
    ],
    claims: [competitiveClaim],
    strengthIds: [],
    weaknessIds: [],
    riskIds: [competitiveClaim.id],
    missingIds: [],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
  DimensionAnalysis.parse({
    dimension: "business_model",
    score: 50,
    confidence: 0.4,
    criteria: [
      {
        id: "business_model.pricing",
        label: "Pricing clarity",
        score: 1,
        rationale: "Pricing and take rate not disclosed.",
        claimIds: [businessModelClaim.id],
      },
      {
        id: "business_model.unit_economics",
        label: "Unit economics",
        score: 2,
        rationale: "No CAC/LTV figures in evidence.",
        claimIds: [],
      },
      {
        id: "business_model.scalability",
        label: "Scalability",
        score: 3,
        rationale: "Marketplace-embedded distribution scales with partner reach.",
        claimIds: [],
      },
    ],
    claims: [businessModelClaim],
    strengthIds: [],
    weaknessIds: [businessModelClaim.id],
    riskIds: [],
    missingIds: [businessModelClaim.id],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
  DimensionAnalysis.parse({
    dimension: "financial",
    score: 35,
    confidence: 0.3,
    criteria: [
      {
        id: "financial.runway",
        label: "Runway",
        score: 1,
        rationale: "Burn rate and cash balance not disclosed.",
        claimIds: [financialClaim.id],
      },
      {
        id: "financial.efficiency",
        label: "Capital efficiency",
        score: 2,
        rationale: "Cannot assess without burn data.",
        claimIds: [financialClaim.id],
      },
      {
        id: "financial.fundraising",
        label: "Fundraising history",
        score: 2,
        rationale: "Prior round size and date not in evidence.",
        claimIds: [],
      },
    ],
    claims: [financialClaim],
    strengthIds: [],
    weaknessIds: [financialClaim.id],
    riskIds: [financialClaim.id],
    missingIds: [financialClaim.id],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
  DimensionAnalysis.parse({
    dimension: "risk",
    score: 60,
    confidence: 0.55,
    criteria: [
      {
        id: "risk.concentration",
        label: "Concentration risk",
        score: 2,
        rationale: "Revenue depends on three marketplace partnerships.",
        claimIds: [riskClaim.id],
      },
      {
        id: "risk.regulatory",
        label: "Regulatory exposure",
        score: 3,
        rationale: "No regulatory issues found in evidence.",
        claimIds: [],
      },
      {
        id: "risk.governance",
        label: "Governance",
        score: 3,
        rationale: "No governance concerns found in evidence.",
        claimIds: [],
      },
    ],
    claims: [riskClaim],
    strengthIds: [],
    weaknessIds: [],
    riskIds: [riskClaim.id],
    missingIds: [],
    scoringVersion: "1.0.0",
    promptVersion: "1.0.0",
  }),
];

export const loopwellReport: Report = Report.parse({
  id: REPORT_ID,
  analysisId: ANALYSIS_ID,
  runId: RUN_ID,
  ownerId: OWNER_ID,
  version: 1,
  schemaVersion: 1,
  scoringVersion: "1.0.0",
  promptVersion: "1.0.0",
  generatedAt: now,
  stage: "SEED",
  stageProfile: "SEED",
  overall: {
    score: 62,
    label: "SCORED",
    confidence: 0.53,
    coverage: 1,
    weights: SEED_WEIGHTS,
  },
  narrative: {
    executiveSummary: [execSummaryArr, execSummaryTeam],
    investmentOverview: [overviewRetention, overviewBurn],
    marketTrends: [marketTrend],
    marketGaps: [marketGapTam],
    aiInsights: [insightDistribution, insightReporting],
  },
  flags: loopwellFlags,
  checklist: loopwellChecklist,
  evidenceStats: {
    sources: loopwellSources.length,
    evidenceItems: loopwellEvidence.length,
    facts: loopwellFacts.length,
    claims: { VERIFIED: 4, AI_ANALYSIS: 6, ASSUMPTION: 2, MISSING: 4 },
    bySection: {},
    reliabilityMix: { INDEPENDENT: 1, FIRST_PARTY: 0, PROVIDED: 3 },
    downgraded: 0,
    dropped: 0,
  },
  warnings: [],
});

export const loopwellAnalysis: Analysis = Analysis.parse({
  id: ANALYSIS_ID,
  ownerId: OWNER_ID,
  startup: {
    name: "Loopwell",
    website: "https://loopwell.example",
    oneLiner: "Embedded lending and expense tools for freelancer marketplaces.",
    stage: "SEED",
    sector: "Fintech",
    hqCountry: "US",
  },
  status: "COMPLETE",
  options: { webResearch: true, stageProfile: "SEED" },
  latest: {
    reportId: REPORT_ID,
    version: 1,
    overallScore: 62,
    confidence: 0.53,
    label: "SCORED",
    generatedAt: now,
    topFlagSeverity: "MEDIUM",
  },
  currentRunId: null,
  tags: ["fintech", "embedded-finance"],
  isWatchlisted: true,
  isDemo: true,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
});
