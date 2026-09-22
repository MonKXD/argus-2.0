import { escapeForPromptBlock } from "@/lib/analysis/prompts/preamble";
import type { Locator } from "@/lib/schema/evidence";

/**
 * AI_SPEC 7.7's `<evidence>` element, reused by every prompt that cites
 * evidence (fact extraction now; dimension analysis, synthesis later).
 */
export function renderEvidenceBlock(args: {
  evidenceId: string;
  sourceTitle: string;
  reliability: string;
  locator: Locator;
  text: string;
}): string {
  const source = escapeForPromptBlock(args.sourceTitle);
  const locator = escapeForPromptBlock(describeLocator(args.locator));
  const text = escapeForPromptBlock(args.text);
  return `<evidence id="${args.evidenceId}" source="${source}" reliability="${args.reliability}" locator="${locator}">\n${text}\n</evidence>`;
}

function describeLocator(locator: Locator): string {
  switch (locator.kind) {
    case "page":
      return `page ${locator.page ?? "?"}`;
    case "url":
      return locator.url ?? "url";
    case "paragraph":
      return `paragraph ${locator.paragraph ?? "?"}`;
    case "sheet":
      return locator.cell ? `sheet ${locator.sheet} cell ${locator.cell}` : `sheet ${locator.sheet ?? "?"}`;
  }
}
