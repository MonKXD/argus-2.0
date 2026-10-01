"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/argus/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Analysis } from "@/lib/schema/analysis";
import type { Comparison } from "@/lib/schema/comparison";

const MIN_ITEMS = 2;
const MAX_ITEMS = 4;

/**
 * FR-CMP-01/FR-CMP-06 (TRD section 7, APP_FLOW 5.6 "Creator"): choose 2 to 4
 * completed analyses (a completed analysis is one with a `latest` report —
 * COMPLETE or PARTIAL both qualify, matching POST /api/comparisons' own
 * validation) and a name, then create and revisit saved comparisons. The
 * comparison's own rendered view (radar overlay, score table, metric
 * matrix) is T-5.02's job — this page only creates and lists.
 */
export default function ComparePage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[] | null>(null);
  const [comparisons, setComparisons] = useState<Comparison[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/analyses").then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ analyses: Analysis[] }>;
      }),
      fetch("/api/comparisons").then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ comparisons: Comparison[] }>;
      }),
    ])
      .then(([analysesBody, comparisonsBody]) => {
        if (cancelled) return;
        setAnalyses(analysesBody.analyses.filter((a) => a.latest !== null));
        setComparisons(comparisonsBody.comparisons);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load your analyses and comparisons. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_ITEMS
          ? [...prev, id]
          : prev,
    );
  }

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Untitled comparison", analysisIds: selected }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? "Couldn't create the comparison.");
      }
      const { comparison } = (await response.json()) as { comparison: Comparison };
      router.push(`/app/compare/${comparison.id}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Couldn't create the comparison.");
      setCreating(false);
    }
  }

  const canCreate = selected.length >= MIN_ITEMS && selected.length <= MAX_ITEMS && !creating;

  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="font-serif text-h2 text-foreground">Compare</h1>

      {loadError ? (
        <EmptyState message={loadError} />
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-ui font-medium text-foreground">New comparison</h2>
            {analyses === null ? (
              <p className="text-ui-sm text-mist">Loading your analyses…</p>
            ) : analyses.length < MIN_ITEMS ? (
              <EmptyState message="You need at least two completed analyses to start a comparison." />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="max-w-sm">
                  <Label htmlFor="compare-name">Name</Label>
                  <Input
                    id="compare-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Seed-stage fintech"
                    className="mt-1.5"
                  />
                </div>

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-ui-sm text-mist">
                    Choose {MIN_ITEMS} to {MAX_ITEMS} analyses
                  </legend>
                  {analyses.map((analysis) => {
                    const checked = selected.includes(analysis.id);
                    const disabled = !checked && selected.length >= MAX_ITEMS;
                    return (
                      <div key={analysis.id} className="flex items-center gap-3">
                        <input
                          id={`analysis-${analysis.id}`}
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(analysis.id)}
                        />
                        <Label htmlFor={`analysis-${analysis.id}`} className="font-normal">
                          {analysis.startup.name}
                          {analysis.latest ? (
                            <span className="ml-2 text-mist">Score {analysis.latest.overallScore}</span>
                          ) : null}
                        </Label>
                      </div>
                    );
                  })}
                </fieldset>

                {createError && (
                  <p role="alert" className="text-ui-sm text-destructive">
                    {createError}
                  </p>
                )}

                <div>
                  <Button type="button" onClick={() => void handleCreate()} disabled={!canCreate}>
                    {creating ? "Creating…" : "Create comparison"}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-ui font-medium text-foreground">Saved comparisons</h2>
            {comparisons === null ? (
              <p className="text-ui-sm text-mist">Loading…</p>
            ) : comparisons.length === 0 ? (
              <EmptyState message="No comparisons yet." />
            ) : (
              <ul className="flex flex-col gap-2">
                {comparisons.map((comparison) => (
                  <li key={comparison.id}>
                    <Link
                      href={`/app/compare/${comparison.id}`}
                      className="text-ui-sm text-foreground underline underline-offset-4"
                    >
                      {comparison.name}
                    </Link>
                    <span className="ml-2 text-ui-sm text-mist">
                      {comparison.items.length} startups &middot;{" "}
                      {new Date(comparison.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
