import { describe, expect, it } from "vitest";

import { materialitySeverity } from "@/lib/analysis/flags";

describe("materialitySeverity", () => {
  it.each(["traction.arr", "traction.mrr", "traction.revenue_ttm", "traction.revenue_growth_yoy"])(
    "revenue key %s is HIGH",
    (key) => {
      expect(materialitySeverity(key)).toBe("HIGH");
    },
  );

  it.each(["financial.total_raised", "financial.last_round_size", "financial.valuation_post"])(
    "funding key %s is HIGH",
    (key) => {
      expect(materialitySeverity(key)).toBe("HIGH");
    },
  );

  it("team size is HIGH", () => {
    expect(materialitySeverity("team.size")).toBe("HIGH");
    expect(materialitySeverity("company.employee_count")).toBe("HIGH");
  });

  it.each(["traction.customers", "traction.users", "traction.mau"])("customer count key %s is HIGH", (key) => {
    expect(materialitySeverity(key)).toBe("HIGH");
  });

  it.each(["product.stage", "market.tam", "founder.jane.role", "custom.anything"])(
    "other keys are MEDIUM",
    (key) => {
      expect(materialitySeverity(key)).toBe("MEDIUM");
    },
  );
});
