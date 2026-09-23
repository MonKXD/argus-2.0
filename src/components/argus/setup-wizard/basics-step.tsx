"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Analysis } from "@/lib/schema/analysis";

type Startup = Analysis["startup"];

const STAGES: { value: Startup["stage"]; label: string }[] = [
  { value: "UNKNOWN", label: "Not specified" },
  { value: "PRE_SEED", label: "Pre-seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "SERIES_B_PLUS", label: "Series B+" },
];

interface BasicsStepProps {
  startup: Startup;
  onChange: (startup: Startup) => void;
}

/** APP_FLOW 5.3 step 1: name required; website must be a valid URL. */
function BasicsStep({ startup, onChange }: BasicsStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startup-name">Startup name</Label>
        <Input
          id="startup-name"
          required
          value={startup.name}
          onChange={(event) => onChange({ ...startup, name: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startup-website">Website</Label>
        <Input
          id="startup-website"
          type="url"
          placeholder="https://"
          value={startup.website ?? ""}
          onChange={(event) => onChange({ ...startup, website: event.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startup-one-liner">One-line description</Label>
        <Input
          id="startup-one-liner"
          value={startup.oneLiner ?? ""}
          onChange={(event) => onChange({ ...startup, oneLiner: event.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startup-stage">Stage</Label>
        <Select
          value={startup.stage}
          onValueChange={(value) => onChange({ ...startup, stage: value as Startup["stage"] })}
        >
          <SelectTrigger id="startup-stage" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startup-sector">Sector</Label>
        <Input
          id="startup-sector"
          value={startup.sector ?? ""}
          onChange={(event) => onChange({ ...startup, sector: event.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="startup-hq">HQ country (2-letter code)</Label>
        <Input
          id="startup-hq"
          maxLength={2}
          placeholder="US"
          value={startup.hqCountry ?? ""}
          onChange={(event) =>
            onChange({ ...startup, hqCountry: event.target.value.toUpperCase() || undefined })
          }
        />
      </div>
    </div>
  );
}

export { BasicsStep };
