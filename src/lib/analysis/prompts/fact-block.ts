import { escapeForPromptBlock } from "@/lib/analysis/prompts/preamble";
import type { Fact, FactValue } from "@/lib/schema/evidence";

/** AI_SPEC 7.7's `<fact>` element. */
export function renderFactBlock(fact: Fact): string {
  const parts = [fact.statement, renderFactValue(fact.value)];
  if (fact.period) parts.push(fact.period);
  const text = escapeForPromptBlock(parts.join(" | "));
  return `<fact id="${fact.id}" key="${fact.key}" reliability="${fact.reliability}">${text}</fact>`;
}

function renderFactValue(value: FactValue): string {
  switch (value.kind) {
    case "number":
      return `number ${value.value}${value.unit ? ` ${value.unit}` : ""}`;
    case "money":
      return `money ${value.amount} ${value.currency}`;
    case "percent":
      return `percent ${value.value}`;
    case "text":
      return `text ${value.value}`;
    case "date":
      return `date ${value.value}`;
    case "boolean":
      return `boolean ${value.value}`;
    case "list":
      return `list ${value.values.join(", ")}`;
  }
}
