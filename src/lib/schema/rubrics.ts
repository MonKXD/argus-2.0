import type { DimensionKey } from "@/lib/schema/enums";

/** Verbatim from docs/AI_SPEC.md section 4. */

export interface Criterion {
  id: string;
  label: string;
}

export interface Rubric {
  dimension: DimensionKey;
  label: string;
  criteria: Criterion[];
}

export const RUBRICS: Record<DimensionKey, Rubric> = {
  founder: {
    dimension: "founder",
    label: "Founder",
    criteria: [
      { id: "founder.domain_fit", label: "Relevant domain expertise or direct experience of the problem" },
      { id: "founder.execution_history", label: "Prior ventures, shipped products, notable outcomes" },
      { id: "founder.team_completeness", label: "Coverage of technical, product and commercial capability" },
      { id: "founder.commitment", label: "Full-time commitment, ownership and equity alignment" },
      { id: "founder.network_advisors", label: "Quality of advisors, investors, board, as evidenced" },
      { id: "founder.credibility", label: "Consistency between claimed and evidenced professional background" },
    ],
  },
  market: {
    dimension: "market",
    label: "Market",
    criteria: [
      { id: "market.size_credibility", label: "Whether TAM/SAM/SOM is stated with a method and is plausible" },
      { id: "market.growth", label: "Evidenced growth rate and trajectory" },
      { id: "market.timing", label: "Tailwinds and why-now" },
      { id: "market.pain_intensity", label: "Severity and urgency of the customer problem" },
      { id: "market.access", label: "Regulatory, channel and geographic accessibility" },
      { id: "market.structure", label: "Concentration, fragmentation, winner-take-most dynamics" },
    ],
  },
  product: {
    dimension: "product",
    label: "Product",
    criteria: [
      { id: "product.problem_solution_fit", label: "Does the product address the stated problem" },
      { id: "product.differentiation", label: "Distinct capability versus alternatives named in evidence" },
      { id: "product.maturity", label: "Built and shipped versus promised" },
      { id: "product.defensibility", label: "IP, data, network effects, switching costs" },
      { id: "product.user_value_signals", label: "Usage, retention and satisfaction evidence" },
      { id: "product.roadmap_credibility", label: "Plausibility of plans given team and resources" },
    ],
  },
  traction: {
    dimension: "traction",
    label: "Traction",
    criteria: [
      { id: "traction.revenue", label: "Revenue level and growth" },
      { id: "traction.customer_growth", label: "Users and customers over time" },
      { id: "traction.retention", label: "Churn, net revenue retention, repeat usage" },
      { id: "traction.customer_quality", label: "Contracts, named customers, paid versus unpaid pilots" },
      { id: "traction.sales_efficiency", label: "Pipeline, conversion, sales cycle, acquisition cost signals" },
      { id: "traction.milestone_velocity", label: "Pace of achieved milestones versus plan" },
    ],
  },
  competitive: {
    dimension: "competitive",
    label: "Competitive",
    criteria: [
      {
        id: "competitive.landscape_coverage",
        label: "Competitors present in evidence and how well characterised. Null when none are named.",
      },
      { id: "competitive.positioning", label: "Clarity of positioning versus named alternatives" },
      { id: "competitive.advantage_durability", label: "How long an advantage could last" },
      { id: "competitive.incumbent_response", label: "Risk of incumbent reaction or copying" },
      { id: "competitive.barriers", label: "Entry barriers and pricing power" },
    ],
  },
  business_model: {
    dimension: "business_model",
    label: "Business model",
    criteria: [
      { id: "business_model.clarity", label: "Who pays, for what, and how" },
      { id: "business_model.unit_economics", label: "Margins, acquisition cost, lifetime value, payback" },
      { id: "business_model.pricing", label: "Price level and willingness-to-pay evidence" },
      { id: "business_model.scalability", label: "Marginal cost and operational complexity" },
      { id: "business_model.revenue_quality", label: "Recurring versus one-off, concentration" },
      { id: "business_model.go_to_market", label: "Channel fit and repeatability" },
    ],
  },
  financial: {
    dimension: "financial",
    label: "Financial",
    criteria: [
      { id: "financial.runway", label: "Cash, burn and months of runway" },
      { id: "financial.funding_history", label: "Rounds, investors and valuation trajectory, as evidenced" },
      { id: "financial.margin_structure", label: "Gross and operating margin structure" },
      { id: "financial.use_of_funds", label: "Credibility and link to milestones" },
      { id: "financial.reporting_quality", label: "Completeness and internal consistency of financials provided" },
      { id: "financial.next_round_path", label: "Plausibility of reaching the next milestone or round" },
    ],
  },
  risk: {
    dimension: "risk",
    label: "Risk",
    criteria: [
      { id: "risk.regulatory_legal", label: "Regulatory and legal exposure" },
      { id: "risk.concentration", label: "Customer, supplier and key-person dependence" },
      { id: "risk.execution_technology", label: "Delivery and technical risk" },
      { id: "risk.market_timing", label: "Market and timing risk" },
      { id: "risk.financing", label: "Risk of not securing needed capital" },
      { id: "risk.integrity", label: "Inconsistencies and unverifiable claims (informed by flags)" },
    ],
  },
};

export const DIMENSION_KEYS = Object.keys(RUBRICS) as DimensionKey[];
