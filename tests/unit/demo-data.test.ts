import { describe, expect, it } from "vitest";

import {
  demoAnalyses,
  demoDimensions,
  demoEvidence,
  demoFacts,
  demoReport,
  demoRuns,
  demoSources,
  loopwellAnalysis,
  fernwayHealthAnalysis,
} from "@/demo";
import { Analysis } from "@/lib/schema/analysis";
import { DimensionAnalysis } from "@/lib/schema/claims";
import { Evidence, Fact, Source } from "@/lib/schema/evidence";
import { Report } from "@/lib/schema/report";
import { Run } from "@/lib/schema/run";

// The fixtures already call `.parse()` at module load (a schema mismatch
// throws on import, before this file even runs), but re-parsing the
// exported values here pins that guarantee to a named, visible test rather
// than an implicit side effect of importing the module.
describe("demo dataset", () => {
  it("every demo analysis validates against the Analysis schema and is marked isDemo", () => {
    expect(demoAnalyses.length).toBeGreaterThan(0);
    for (const analysis of demoAnalyses) {
      expect(() => Analysis.parse(analysis)).not.toThrow();
      expect(analysis.isDemo).toBe(true);
    }
  });

  it("the worked report and its dimensions validate", () => {
    expect(() => Report.parse(demoReport)).not.toThrow();
    expect(demoDimensions).toHaveLength(8);
    for (const dimension of demoDimensions) {
      expect(() => DimensionAnalysis.parse(dimension)).not.toThrow();
    }
  });

  it("sources, evidence and facts validate", () => {
    for (const source of demoSources) expect(() => Source.parse(source)).not.toThrow();
    for (const evidence of demoEvidence) expect(() => Evidence.parse(evidence)).not.toThrow();
    for (const fact of demoFacts) expect(() => Fact.parse(fact)).not.toThrow();
  });

  it("every fact's quote is a verbatim substring of its evidence text (R-AI-03)", () => {
    const evidenceById = new Map(demoEvidence.map((e) => [e.id, e]));
    for (const fact of demoFacts) {
      for (const quote of fact.quotes) {
        const evidence = evidenceById.get(quote.evidenceId);
        expect(evidence).toBeDefined();
        expect(evidence!.text).toContain(quote.quote);
      }
    }
  });

  it("runs validate", () => {
    for (const run of demoRuns) expect(() => Run.parse(run)).not.toThrow();
  });

  it("Loopwell's analysis points at the worked report (the only fully-built one)", () => {
    expect(loopwellAnalysis.latest?.reportId).toBe(demoReport.id);
  });

  it("Fernway Health's in-progress analysis points at a run in the fixture", () => {
    const runIds = new Set(demoRuns.map((r) => r.id));
    expect(fernwayHealthAnalysis.currentRunId).not.toBeNull();
    expect(runIds.has(fernwayHealthAnalysis.currentRunId!)).toBe(true);
  });
});
