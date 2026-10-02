"use client";

import { Fragment, useEffect, useState } from "react";

import { EmptyState } from "@/components/argus/empty-state";
import { SCORING_VERSION, STAGE_PROFILE_WEIGHTS } from "@/lib/analysis/config";
import { DIMENSION_LABEL, DIMENSION_ORDER } from "@/lib/dimension-labels";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { RUN_STATUS_LABEL } from "@/lib/run-status-labels";
import type { RunStatus, StageProfile } from "@/lib/schema/enums";
import { RUBRICS } from "@/lib/schema/rubrics";
import { STAGE_PROFILE_LABEL } from "@/lib/stage-labels";

interface RecentRun {
  id: string;
  analysisId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | undefined;
  usage: { estimatedCostUsd: number; inputTokens: number; outputTokens: number };
}

interface Usage {
  runningCount: number;
  dailyCount: number;
  maxConcurrentRuns: number;
  dailyAnalysisLimit: number;
  recentRuns: RecentRun[];
}

const STAGE_PROFILE_ORDER: StageProfile[] = ["EARLY", "SEED", "GROWTH"];

/**
 * FR-SET-01/FR-SET-04 (APP_FLOW 5.8): "Usage and limits view" and a
 * "Read-only view of scoring methodology (weights, rubrics, version)."
 * Account (email, sign-out, delete account) already lives in `UserMenu`
 * (T-3.01/T-5.12) — this page is specifically the two views FR-SET-01/04
 * name, not a general account-settings hub.
 *
 * Usage fetches the real `GET /api/usage` (T-5.13), which shares
 * `run-limits.ts`'s own `getRunUsage()` with the server-side gate
 * (`assertWithinRunLimits`) so this view can never show a number that
 * disagrees with what actually blocks starting a run. The same response now
 * also carries `recentRuns` (T-6.08, NFR-08/09's "cost estimate recorded
 * per run"), from `listRecentRuns()` — one more real field on the same
 * fetch, not a second round trip. The methodology
 * section needs no fetch — it's a static render of data already in code
 * (`RUBRICS`, verbatim from AI_SPEC.md section 4 since T-2.09/D-047;
 * `STAGE_PROFILE_WEIGHTS`/`SCORING_VERSION`, verbatim from SCHEMA.md
 * section 7 since T-2.10), the same "the model proposes, the doc and code
 * are the source of truth" principle every other report-page rendering of
 * this data already follows (`ExplainScore`, T-4.02).
 */
export default function SettingsPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then((response) => {
        if (!response.ok) throw new Error("Couldn't load your usage.");
        return response.json() as Promise<Usage>;
      })
      .then((body) => {
        if (!cancelled) {
          setUsage(body);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your usage. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  return (
    <div className="flex flex-col gap-10 p-6">
      <h1 className="font-serif text-h2 text-foreground">Settings</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-serif text-foreground">Usage and limits</h2>
        {error ? (
          <EmptyState message={error} action={{ label: "Retry", onClick: () => setRetryToken((t) => t + 1) }} />
        ) : usage === null ? (
          <p className="text-ui-sm text-mist">Loading…</p>
        ) : (
          <dl className="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-ui-sm">
            <dt className="text-mist">Analyses running now</dt>
            <dd className="text-foreground tabular-nums">
              {usage.runningCount} of {usage.maxConcurrentRuns}
            </dd>
            <dt className="text-mist">Analyses started in the last 24 hours</dt>
            <dd className="text-foreground tabular-nums">
              {usage.dailyCount} of {usage.dailyAnalysisLimit}
            </dd>
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-serif text-foreground">Run history</h2>
          <p className="text-ui-sm text-mist">
            Your most recent analysis runs, with duration and the model usage cost each one
            recorded (NFR-08/09).
          </p>
        </div>
        {usage === null ? null : usage.recentRuns.length === 0 ? (
          <EmptyState message="No runs yet. Start an analysis to see its duration and cost here." />
        ) : (
          <div className="overflow-x-auto" tabIndex={0}>
            <table className="w-full min-w-[560px] text-left text-ui-sm">
              <thead>
                <tr className="border-b border-hairline text-mist">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Started
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Duration
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Tokens
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-hairline last:border-0">
                    <td className="py-2 pr-4 text-foreground">{formatDate(run.startedAt)}</td>
                    <td className="py-2 pr-4 text-foreground">{RUN_STATUS_LABEL[run.status]}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {run.finishedAt
                        ? formatDuration(
                            new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime(),
                          )
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {formatNumber(run.usage.inputTokens + run.usage.outputTokens)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {formatNumber(run.usage.estimatedCostUsd, {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 4,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-serif text-foreground">Scoring methodology</h2>
          <p className="text-ui-sm text-mist">
            Version {SCORING_VERSION}. Every criterion is scored 0 to 4 by the model; the dimension
            score, confidence and overall score are computed by code, never the model. Weights are
            read-only in this version of ARGUS.
          </p>
        </div>

        {/* DESIGN section 10: "Below 768: tables become stacked rows" — the
         * same duplicate-markup, toggle-by-breakpoint pattern T-4.13's
         * `ExplainScore` already uses, both views driven by the identical
         * `STAGE_PROFILE_WEIGHTS` data so they can never disagree. */}
        <ul className="flex flex-col gap-3 md:hidden">
          {DIMENSION_ORDER.map((dimension) => (
            <li key={dimension} className="rounded-panel border border-hairline p-3">
              <p className="font-medium text-foreground">{DIMENSION_LABEL[dimension]}</p>
              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-mist">
                {STAGE_PROFILE_ORDER.map((profile) => (
                  <Fragment key={profile}>
                    <dt>{STAGE_PROFILE_LABEL[profile]}</dt>
                    <dd className="tabular-nums text-foreground">
                      {formatNumber(STAGE_PROFILE_WEIGHTS[profile][dimension] * 100, {
                        maximumFractionDigits: 0,
                      })}
                      %
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[480px] text-left text-ui-sm">
            <thead>
              <tr className="border-b border-hairline text-mist">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Dimension
                </th>
                {STAGE_PROFILE_ORDER.map((profile) => (
                  <th key={profile} scope="col" className="py-2 pr-4 text-right font-medium">
                    {STAGE_PROFILE_LABEL[profile]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIMENSION_ORDER.map((dimension) => (
                <tr key={dimension} className="border-b border-hairline">
                  <th scope="row" className="py-2 pr-4 font-normal text-foreground">
                    {DIMENSION_LABEL[dimension]}
                  </th>
                  {STAGE_PROFILE_ORDER.map((profile) => (
                    <td key={profile} className="py-2 pr-4 text-right tabular-nums text-foreground">
                      {formatNumber(STAGE_PROFILE_WEIGHTS[profile][dimension] * 100, {
                        maximumFractionDigits: 0,
                      })}
                      %
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-ui-sm text-mist">
          Each stage profile&rsquo;s weights sum to 100%. ARGUS picks a profile from the startup&rsquo;s
          own stage (overridable per run) — Early for pre-seed, Seed for seed, Growth for Series A and
          later.
        </p>

        <div className="flex flex-col gap-6">
          {DIMENSION_ORDER.map((dimension) => (
            <div key={dimension} className="flex flex-col gap-2">
              <h3 className="text-ui font-medium text-foreground">{DIMENSION_LABEL[dimension]}</h3>
              <ul className="flex flex-col gap-1 text-ui-sm text-mist">
                {RUBRICS[dimension].criteria.map((criterion) => (
                  <li key={criterion.id}>{criterion.label}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
