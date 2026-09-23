"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { BasicsStep } from "@/components/argus/setup-wizard/basics-step";
import { OptionsStep } from "@/components/argus/setup-wizard/options-step";
import { ReviewStep } from "@/components/argus/setup-wizard/review-step";
import { SourcesStep } from "@/components/argus/setup-wizard/sources-step";
import {
  WIZARD_STEPS,
  WizardStepsNav,
  type WizardStep,
} from "@/components/argus/setup-wizard/wizard-steps-nav";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/lib/schema/analysis";

interface SetupWizardProps {
  analysis: Analysis;
}

function isWizardStep(value: string | null): value is WizardStep {
  return WIZARD_STEPS.includes(value as WizardStep);
}

/**
 * APP_FLOW 5.3. "Progress is saved on every step" — Basics and Options map
 * directly to real Analysis fields and are PATCHed (T-3.04) on every Next/
 * Back; Sources has nothing to save yet (see sources-step.tsx). "Leaving
 * and returning resumes at the last completed step" is narrowed here: with
 * no stored per-step completion state (adding one would be a schema
 * change), returning to /setup with no `?step=` always starts at Basics —
 * a safe, always-valid entry point — rather than tracking exact resume
 * position.
 */
function SetupWizard({ analysis }: SetupWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const step: WizardStep = isWizardStep(stepParam) ? stepParam : "basics";

  const [startup, setStartup] = React.useState(analysis.startup);
  const [options, setOptions] = React.useState(analysis.options);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const stepIndex = WIZARD_STEPS.indexOf(step);

  function goToStep(next: WizardStep) {
    router.push(`/app/analyses/${analysis.id}/setup?step=${next}`);
  }

  async function save(patch: Partial<Pick<Analysis, "startup" | "options">>): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/${analysis.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? "Couldn't save. Try again.");
        return false;
      }
      return true;
    } catch {
      setError("Couldn't save. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (step === "basics") {
      if (!startup.name.trim()) {
        setError("Startup name is required.");
        return;
      }
      if (!(await save({ startup }))) return;
    } else if (step === "options") {
      if (!(await save({ options }))) return;
    }
    const next = WIZARD_STEPS[stepIndex + 1];
    if (next) goToStep(next);
  }

  function handleBack() {
    const previous = WIZARD_STEPS[stepIndex - 1];
    if (previous) goToStep(previous);
  }

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <p className="text-ui-sm text-mist">Set up your analysis</p>
        <h1 className="font-serif text-h2 text-foreground">
          {startup.name || "Untitled analysis"}
        </h1>
      </div>

      <WizardStepsNav current={step} />

      {step === "basics" && <BasicsStep startup={startup} onChange={setStartup} />}
      {step === "sources" && <SourcesStep analysisId={analysis.id} />}
      {step === "options" && <OptionsStep options={options} onChange={setOptions} />}
      {step === "review" && <ReviewStep startup={startup} options={options} />}

      {error && (
        <p role="alert" className="text-ui-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={stepIndex === 0 || saving}
        >
          Back
        </Button>
        {step !== "review" && (
          <Button type="button" onClick={handleNext} disabled={saving}>
            {saving ? "Saving…" : "Next"}
          </Button>
        )}
      </div>
    </div>
  );
}

export { SetupWizard };
