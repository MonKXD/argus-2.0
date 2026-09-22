import { describe, expect, it } from "vitest";

import type { InjectionMatch } from "@/lib/analysis/ingest/build-evidence";
import { buildInjectionFlags } from "@/lib/analysis/ingest/injection-flags";

describe("buildInjectionFlags", () => {
  it("returns no flags or warnings for an empty match list", () => {
    const result = buildInjectionFlags([]);
    expect(result.flags).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("raises one SOURCE_INTEGRITY flag and one INJECTION_SUSPECTED warning per match", () => {
    const matches: InjectionMatch[] = [
      { evidenceId: "ev_00000000000000000000000001", pattern: "ignore previous instructions" },
      { evidenceId: "ev_00000000000000000000000002", pattern: "you are now" },
    ];

    const result = buildInjectionFlags(matches);

    expect(result.flags).toHaveLength(2);
    expect(result.flags[0]).toMatchObject({
      category: "SOURCE_INTEGRITY",
      severity: "MEDIUM",
      detectedBy: "INGEST",
      status: "OPEN",
      evidenceIds: ["ev_00000000000000000000000001"],
      claimIds: [],
    });
    expect(result.flags[0]!.description).toContain("ignore previous instructions");

    expect(result.warnings).toEqual([
      {
        code: "INJECTION_SUSPECTED",
        message: 'Instruction-like pattern "ignore previous instructions" detected in evidence',
        step: "INGEST",
        refId: "ev_00000000000000000000000001",
      },
      {
        code: "INJECTION_SUSPECTED",
        message: 'Instruction-like pattern "you are now" detected in evidence',
        step: "INGEST",
        refId: "ev_00000000000000000000000002",
      },
    ]);
  });

  it("gives each flag a unique id even for the same evidenceId matched twice", () => {
    const matches: InjectionMatch[] = [
      { evidenceId: "ev_00000000000000000000000001", pattern: "ignore previous instructions" },
      { evidenceId: "ev_00000000000000000000000001", pattern: "system prompt" },
    ];

    const { flags } = buildInjectionFlags(matches);
    expect(flags[0]!.id).not.toBe(flags[1]!.id);
  });
});
