import { describe, expect, it } from "vitest";

import type { LLM, StructuredArgs } from "@/lib/ai/llm";
import type { SubmitDimensionAnalysisInput } from "@/lib/analysis/prompts/dimension-analysis";
import type { SubmitFactsInput } from "@/lib/analysis/prompts/fact-extraction";
import type { SubmitSynthesisInput } from "@/lib/analysis/prompts/synthesis";
import type { Usage } from "@/lib/schema/run";

import { runEvals } from "../../evals/harness";

function usage(): Usage {
  return { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedCostUsd: 0.001 };
}

function extractId(prefix: "ev" | "fct", cachePrefix: string | undefined): string | undefined {
  const re = new RegExp(`id="(${prefix}_[0-9A-HJKMNP-TV-Z]{26})"`);
  return re.exec(cachePrefix ?? "")?.[1];
}

/** A content-agnostic FakeLlm: grounds every AI_ANALYSIS claim in whatever real fact id the prompt actually contains, so it works against any fixture's real evidence/facts without per-fixture tuning. */
class GenericFakeLlm implements LLM {
  public calls: StructuredArgs<unknown>[] = [];

  async structured<T>(args: StructuredArgs<T>): Promise<{ data: T; usage: Usage }> {
    this.calls.push(args as StructuredArgs<unknown>);
    switch (args.toolName) {
      case "submit_facts":
        return { data: this.factsResponse(args) as T, usage: usage() };
      case "submit_dimension_analysis":
        return { data: this.dimensionResponse(args) as T, usage: usage() };
      case "submit_synthesis":
        return { data: this.synthesisResponse() as T, usage: usage() };
      case "submit_conflicts":
        return { data: { verdicts: [] } as T, usage: usage() };
      default:
        throw new Error(`GenericFakeLlm: no handler for tool "${args.toolName}"`);
    }
  }

  private factsResponse(args: StructuredArgs<unknown>): SubmitFactsInput {
    const evidenceId = extractId("ev", args.cachePrefix) ?? "ev_00000000000000000000000001";
    return {
      facts: [
        {
          key: "company.hq_location",
          statement: "The company is based somewhere.",
          value: { kind: "text", value: "Somewhere" },
          quotes: [{ evidenceId, quote: extractQuoteHint(args.cachePrefix) }],
        },
      ],
    };
  }

  private dimensionResponse(args: StructuredArgs<unknown>): SubmitDimensionAnalysisInput {
    const factId = extractId("fct", args.cachePrefix);
    return {
      criteria: [
        { id: "c1", score: factId ? 2 : null, rationale: "Adequate.", claimIds: factId ? ["a1"] : [] },
        { id: "c2", score: factId ? 2 : null, rationale: "Adequate.", claimIds: factId ? ["a1"] : [] },
        { id: "c3", score: factId ? 2 : null, rationale: "Adequate.", claimIds: factId ? ["a1"] : [] },
      ],
      claims: factId
        ? [{ localId: "a1", status: "AI_ANALYSIS", text: "A reasonable inference about the company.", entities: [], basedOn: [factId] }]
        : [],
      strengthIds: [],
      weaknessIds: [],
      riskIds: [],
      missingIds: [],
    };
  }

  private synthesisResponse(): SubmitSynthesisInput {
    return {
      executiveSummary: [
        {
          localId: "n1",
          status: "MISSING",
          text: "Insufficient data to summarise.",
          entities: [],
          missing: { whatIsNeeded: "More evidence", suggestedSource: "Founder", priority: "MEDIUM" },
        },
      ],
      investmentOverview: [
        {
          localId: "n2",
          status: "MISSING",
          text: "Insufficient data for a thesis.",
          entities: [],
          missing: { whatIsNeeded: "More evidence", suggestedSource: "Founder", priority: "MEDIUM" },
        },
      ],
      marketTrends: [],
      marketGaps: [],
      aiInsights: [],
      checklist: [],
    };
  }
}

/** Pulls the first quoted sentence out of the rendered <evidence> block so the fact's quote is a real substring of the real evidence text, whatever that fixture's content is. */
function extractQuoteHint(cachePrefix: string | undefined): string {
  const match = /<evidence[^>]*>\n(.*?)(?:\.|$)/.exec(cachePrefix ?? "");
  return match?.[1]?.trim() ?? "the company";
}

describe("runEvals: end-to-end against a real fixture, no live model", () => {
  it("runs the clean-seed-saas fixture through the full pipeline and produces a summary", async () => {
    const llm = new GenericFakeLlm();
    const summary = await runEvals({ llm, slugs: ["clean-seed-saas"] });

    expect(summary.fixtures).toHaveLength(1);
    const fixture = summary.fixtures[0]!;
    expect(fixture.slug).toBe("clean-seed-saas");
    expect(fixture.result.dimensions).toHaveLength(8);
    expect(fixture.result.report.schemaVersion).toBe(1);
    expect(summary.thresholds.invalidCitationsFinal).toBe(0);
  });

  it("runs a WEBSITE-sourced fixture (website-only) through a real local server, no live model", async () => {
    const llm = new GenericFakeLlm();
    const summary = await runEvals({ llm, slugs: ["website-only"] });

    expect(summary.fixtures).toHaveLength(1);
    expect(summary.fixtures[0]!.result.sources[0]!.type).toBe("WEBSITE");
  });

  it("runs every fixture without slugs specified", async () => {
    const llm = new GenericFakeLlm();
    const summary = await runEvals({ llm });

    expect(summary.fixtures.map((f) => f.slug).sort()).toEqual(
      [
        "clean-seed-saas",
        "conflicting-numbers",
        "no-financials",
        "numeric-bait",
        "prompt-injection",
        "unverifiable-superlatives",
        "website-only",
      ].sort(),
    );
  }, 20_000);
});
