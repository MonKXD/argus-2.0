"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Analysis } from "@/lib/schema/analysis";

type Options = Analysis["options"];

const STAGE_PROFILES: { value: NonNullable<Options["stageProfile"]>; label: string }[] = [
  { value: "EARLY", label: "Early" },
  { value: "SEED", label: "Seed" },
  { value: "GROWTH", label: "Growth" },
];

const FOCUS_MAX = 500;

interface OptionsStepProps {
  options: Options;
  onChange: (options: Options) => void;
}

/** APP_FLOW 5.3 step 3: web research toggle (default on, plain
 * explanation), stage profile, optional analyst focus note. */
function OptionsStep({ options, onChange }: OptionsStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <input
          id="web-research"
          type="checkbox"
          className="mt-0.5 size-4 accent-primary"
          checked={options.webResearch}
          onChange={(event) => onChange({ ...options, webResearch: event.target.checked })}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="web-research">Public web research</Label>
          <p className="text-ui-sm text-mist">
            ARGUS searches public sources (news, the company website, social profiles) for context
            beyond what you provide. Turn this off to analyse only your own sources.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stage-profile">Stage profile</Label>
        <p className="text-ui-sm text-mist">
          Sets which dimensions carry the most weight in the score. Defaults from the stage you set
          in Basics.
        </p>
        <Select
          value={options.stageProfile ?? ""}
          onValueChange={(value) =>
            onChange({ ...options, stageProfile: (value || undefined) as Options["stageProfile"] })
          }
        >
          <SelectTrigger id="stage-profile" className="w-full">
            <SelectValue placeholder="Use the default for this stage" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_PROFILES.map((profile) => (
              <SelectItem key={profile.value} value={profile.value}>
                {profile.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="analyst-focus">Analyst focus note (optional)</Label>
        <textarea
          id="analyst-focus"
          maxLength={FOCUS_MAX}
          rows={3}
          aria-describedby="analyst-focus-hint"
          className="rounded-control border border-border bg-panel-raised px-3 py-2 text-ui text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={options.analystFocus ?? ""}
          onChange={(event) =>
            onChange({ ...options, analystFocus: event.target.value || undefined })
          }
        />
        <p id="analyst-focus-hint" className="text-ui-sm text-mist">
          What you specifically want examined. This guides the analysis; it never overrides evidence
          rules — nothing gets marked verified without a source.
        </p>
      </div>
    </div>
  );
}

export { OptionsStep };
