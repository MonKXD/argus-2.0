import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import type { Fact, FactValue } from "@/lib/schema/evidence";

/**
 * FR-CMP-03's "canonical-metric matrix": a curated, cross-company-comparable
 * subset of SCHEMA.md section 8's canonical fact keys. Deliberately excludes
 * founder, competitor and risk keys (per-slug, not a single comparable
 * value), list/text/boolean-kind keys (don't tabulate as a single number),
 * and company/product identity fields (shown in the per-startup header, not
 * the metric matrix) — this is a reasoned selection of what's actually
 * comparable across startups, not every canonical key.
 */
export const COMPARE_METRIC_KEYS: readonly string[] = [
  "team.size",
  "traction.arr",
  "traction.mrr",
  "traction.revenue_growth_yoy",
  "traction.customers",
  "traction.nrr",
  "traction.churn_rate",
  "business.gross_margin",
  "business.ltv_cac_ratio",
  "financial.cash",
  "financial.burn_monthly",
  "financial.runway_months",
  "financial.total_raised",
  "market.tam",
];

export const COMPARE_METRIC_LABEL: Record<string, string> = {
  "team.size": "Team size",
  "traction.arr": "ARR",
  "traction.mrr": "MRR",
  "traction.revenue_growth_yoy": "Revenue growth (YoY)",
  "traction.customers": "Customers",
  "traction.nrr": "Net revenue retention",
  "traction.churn_rate": "Churn rate",
  "business.gross_margin": "Gross margin",
  "business.ltv_cac_ratio": "LTV:CAC",
  "financial.cash": "Cash",
  "financial.burn_monthly": "Monthly burn",
  "financial.runway_months": "Runway (months)",
  "financial.total_raised": "Total raised",
  "market.tam": "TAM",
};

/** Renders any `FactValue` kind as display text, via `format.ts` only (R-COD-05). */
export function formatFactValue(value: FactValue): string {
  switch (value.kind) {
    case "money":
      return formatMoney(value.amount, value.currency);
    case "percent":
      return formatPercent(value.value);
    case "number":
      return value.unit ? `${formatNumber(value.value)} ${value.unit}` : formatNumber(value.value);
    case "date":
      return value.value;
    case "boolean":
      return value.value ? "Yes" : "No";
    case "text":
      return value.value;
    case "list":
      return value.values.join(", ");
  }
}

/**
 * One fact per curated key, for the metric matrix's "Not available" cells.
 * A key can have more than one fact (different periods/conflicting
 * sources) — this picks the first match; period disambiguation isn't this
 * matrix's job (it shows the current snapshot, not a time series).
 */
export function pickComparisonFacts(facts: Fact[]): Partial<Record<string, Fact>> {
  const byKey: Partial<Record<string, Fact>> = {};
  for (const key of COMPARE_METRIC_KEYS) {
    byKey[key] = facts.find((f) => f.key === key);
  }
  return byKey;
}
