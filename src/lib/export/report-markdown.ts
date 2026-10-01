import { STATUS_LABEL } from "@/components/argus/evidence-marker";
import { RELIABILITY_LABEL } from "@/components/argus/reliability-chip";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "@/lib/dimension-labels";
import type { ReportExportPayload } from "@/lib/export/report-export-data";
import { formatDate } from "@/lib/format";
import type { Claim } from "@/lib/schema/claims";
import { STAGE_LABEL } from "@/lib/stage-labels";

const NARRATIVE_SECTION_LABEL: Record<keyof ReportExportPayload["narrative"], string> = {
  executiveSummary: "Executive summary",
  investmentOverview: "Investment overview",
  marketTrends: "Market trends",
  marketGaps: "Market gaps",
  aiInsights: "AI insights",
};

function renderClaim(claim: Claim): string {
  const label = STATUS_LABEL[claim.status];
  let detail = "";
  switch (claim.status) {
    case "VERIFIED":
      detail = ` — "${claim.quotes.map((q) => q.quote).join('" / "')}"`;
      break;
    case "ASSUMPTION":
      detail = ` — assumption: ${claim.assumption.statement}`;
      break;
    case "MISSING":
      detail = ` — needed: ${claim.missing.whatIsNeeded}`;
      break;
    case "AI_ANALYSIS":
      break;
  }
  return `- **[${label}]** ${claim.text}${detail}`;
}

function renderClaims(claims: Claim[]): string {
  return claims.length > 0 ? claims.map(renderClaim).join("\n") : "_No claims._";
}

/**
 * FR-EXP-01/FR-EXP-04: every claim across every dimension and every
 * narrative section, each with its status marker and (for VERIFIED) its
 * exact quote; flags, checklist, evidence stats, sources, and the
 * disclaimer. Renders from `ReportExportPayload` only — no field this
 * function invents, every number and quote is copied verbatim from the
 * already-validated report (R-AI-01/R-AI-02).
 */
export function renderReportMarkdown(payload: ReportExportPayload): string {
  const lines: string[] = [];

  lines.push(`# ${payload.startup.name}`);
  lines.push("");
  lines.push(
    `${STAGE_LABEL[payload.startup.stage]}${payload.startup.sector ? ` · ${payload.startup.sector}` : ""}`,
  );
  lines.push(
    `Report version ${payload.version} · Scoring version ${payload.scoringVersion} · Prompt version ${payload.promptVersion} · Generated ${formatDate(payload.generatedAt)}`,
  );
  lines.push("");

  lines.push("## Investment score");
  lines.push("");
  lines.push(
    payload.overall.score != null
      ? `**${payload.overall.score} / 100** (confidence ${payload.overall.confidence}, coverage ${payload.overall.coverage})`
      : `**Not scored** — insufficient evidence (coverage ${payload.overall.coverage})`,
  );
  if (payload.overall.cap) {
    lines.push("");
    lines.push(`Capped at ${payload.overall.cap.value}: ${payload.overall.cap.reason}`);
  }
  lines.push("");

  for (const [key, title] of Object.entries(NARRATIVE_SECTION_LABEL) as [
    keyof ReportExportPayload["narrative"],
    string,
  ][]) {
    lines.push(`## ${title}`);
    lines.push("");
    lines.push(renderClaims(payload.narrative[key]));
    lines.push("");
  }

  for (const key of DIMENSION_ORDER) {
    const dimension = payload.dimensions.find((d) => d.dimension === key);
    lines.push(`## ${DIMENSION_LABEL[key]}`);
    lines.push("");
    if (!dimension) {
      lines.push("_Not analysed._");
    } else {
      lines.push(
        dimension.score != null
          ? `Score: ${dimension.score} / 100 (confidence ${dimension.confidence})`
          : "Not scored.",
      );
      lines.push("");
      lines.push(renderClaims(dimension.claims));
    }
    lines.push("");
  }

  lines.push("## Risks and flags");
  lines.push("");
  if (payload.flags.length > 0) {
    for (const flag of payload.flags) {
      lines.push(`- **[${flag.severity}, ${flag.status}]** ${flag.title} — ${flag.description}`);
    }
  } else {
    lines.push("_No flags raised._");
  }
  lines.push("");

  lines.push("## Checklist");
  lines.push("");
  if (payload.checklist.length > 0) {
    for (const item of payload.checklist) {
      lines.push(`- **[${item.priority}, ${item.status}]** ${item.question}`);
    }
  } else {
    lines.push("_No open checklist items._");
  }
  lines.push("");

  lines.push("## Evidence and sources");
  lines.push("");
  lines.push(
    `${payload.evidenceStats.sources} source(s), ${payload.evidenceStats.evidenceItems} evidence item(s), ${payload.evidenceStats.facts} extracted fact(s).`,
  );
  lines.push(
    `Claims: ${payload.evidenceStats.claims.VERIFIED} verified, ${payload.evidenceStats.claims.AI_ANALYSIS} AI analysis, ${payload.evidenceStats.claims.ASSUMPTION} assumption, ${payload.evidenceStats.claims.MISSING} missing.`,
  );
  lines.push("");
  if (payload.sources.length > 0) {
    for (const source of payload.sources) {
      lines.push(`- ${source.title} (${source.type}, ${RELIABILITY_LABEL[source.reliability]}, ${source.status})`);
    }
  } else {
    lines.push("_No sources recorded._");
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(payload.disclaimer);
  lines.push("");

  return lines.join("\n");
}
