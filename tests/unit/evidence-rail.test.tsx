import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EvidenceRailContent } from "@/components/argus/evidence-rail";
import type { Claim } from "@/lib/schema/claims";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";

const source: Source = {
  id: "src_00000000000000000000000001",
  analysisId: "ana_00000000000000000000000001",
  type: "PITCH_DECK",
  origin: "UPLOAD",
  title: "Deck.pdf",
  status: "PARSED",
  reliability: "PROVIDED",
  addedAt: "2026-09-22T00:00:00Z",
};

const evidence: Evidence[] = [
  {
    id: "ev_00000000000000000000000001",
    analysisId: "ana_00000000000000000000000001",
    sourceId: source.id,
    locator: { kind: "page", page: 7 },
    text: "ARR reached $2.0M in Q2 2026.",
    reliability: "PROVIDED",
    extraction: "text",
    retrievedAt: "2026-09-22T00:00:00Z",
    contentHash: "h1",
  },
];

const fact: Fact = {
  id: "fct_00000000000000000000000001",
  analysisId: "ana_00000000000000000000000001",
  key: "traction.arr",
  statement: "ARR is $2.0M.",
  value: { kind: "money", amount: 200_000_000, currency: "USD" },
  quotes: [{ evidenceId: evidence[0]!.id, quote: "ARR reached $2.0M" }],
  reliability: "PROVIDED",
  confidence: 0.7,
  conflictsWith: [],
  runId: "run_00000000000000000000000001",
};

describe("EvidenceRailContent", () => {
  it("shows the quote, source, locator, and reliability for a VERIFIED claim", () => {
    const claim: Claim = {
      id: "clm_00000000000000000000000001",
      text: "ARR is $2.0M.",
      confidence: 0.7,
      entities: [],
      status: "VERIFIED",
      quotes: [{ evidenceId: evidence[0]!.id, quote: "ARR reached $2.0M" }],
    };

    render(<EvidenceRailContent claim={claim} evidence={evidence} sources={[source]} />);

    expect(screen.getByText(/ARR reached \$2\.0M/)).toBeInTheDocument();
    expect(screen.getByText("Deck.pdf, page 7")).toBeInTheDocument();
    expect(screen.getByText("Provided")).toBeInTheDocument();
  });

  it("resolves a fact statement for an AI_ANALYSIS claim's basedOn list", () => {
    const claim: Claim = {
      id: "clm_00000000000000000000000002",
      text: "Growth looks concentrated.",
      confidence: 0.5,
      entities: [],
      status: "AI_ANALYSIS",
      basedOn: [fact.id],
    };

    render(
      <EvidenceRailContent claim={claim} evidence={evidence} sources={[source]} facts={[fact]} />,
    );

    expect(screen.getByText("Based on")).toBeInTheDocument();
    expect(screen.getByText("ARR is $2.0M.")).toBeInTheDocument();
  });

  it("falls back to a placeholder when a basedOn reference can't be resolved", () => {
    const claim: Claim = {
      id: "clm_00000000000000000000000003",
      text: "Growth looks concentrated.",
      confidence: 0.5,
      entities: [],
      status: "AI_ANALYSIS",
      basedOn: ["fct_00000000000000000000000099"],
    };

    render(<EvidenceRailContent claim={claim} evidence={evidence} sources={[source]} />);
    expect(screen.getByText("Related evidence elsewhere in this report")).toBeInTheDocument();
  });

  it("shows the assumption statement and what would confirm it", () => {
    const claim: Claim = {
      id: "clm_00000000000000000000000004",
      text: "Retention likely exceeds the median.",
      confidence: 0.3,
      entities: [],
      status: "ASSUMPTION",
      assumption: { statement: "Retention exceeds median", wouldConfirm: "Cohort data" },
    };

    render(<EvidenceRailContent claim={claim} evidence={evidence} sources={[source]} />);
    expect(screen.getByText("Retention exceeds median")).toBeInTheDocument();
    expect(screen.getByText("Would confirm: Cohort data")).toBeInTheDocument();
  });

  it("shows what is needed and the suggested source for a MISSING claim", () => {
    const claim: Claim = {
      id: "clm_00000000000000000000000005",
      text: "Burn rate is not disclosed.",
      confidence: 0,
      entities: [],
      status: "MISSING",
      missing: { whatIsNeeded: "Burn rate", suggestedSource: "Financials", priority: "HIGH" },
    };

    render(<EvidenceRailContent claim={claim} evidence={evidence} sources={[source]} />);
    expect(screen.getByText("Needed: Burn rate")).toBeInTheDocument();
    expect(screen.getByText("Suggested source: Financials")).toBeInTheDocument();
  });
});
