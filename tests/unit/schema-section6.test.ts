import { describe, expect, it } from "vitest";

import { Activity } from "@/lib/schema/activity";
import { Comparison } from "@/lib/schema/comparison";
import { Export } from "@/lib/schema/export";
import { Signal } from "@/lib/schema/signal";

// Minimal valid instances of docs/SCHEMA.md section 6's Firestore-collection
// schemas (Comparison, Activity, Signal, Export), parsed rather than merely
// type-checked, matching schema-core.test.ts's pattern for sections 3 to 5.

const now = "2026-09-22T00:00:00Z";

describe("section 6 schemas parse minimal valid instances", () => {
  it("Comparison", () => {
    expect(() =>
      Comparison.parse({
        id: "cmp_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerId: "user_1",
        name: "Fintech seed cohort",
        items: [
          {
            analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            reportId: "rpt_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            label: "Loopwell",
          },
          {
            analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FBV",
            reportId: "rpt_01ARZ3NDEKTSV4RRFFQ69G5FBV",
            label: "Verdant Grid",
          },
        ],
        scoringVersions: ["1.0.0"],
        createdAt: now,
      }),
    ).not.toThrow();
  });

  it("Comparison rejects fewer than 2 items", () => {
    expect(() =>
      Comparison.parse({
        id: "cmp_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerId: "user_1",
        name: "Too few",
        items: [
          {
            analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            reportId: "rpt_01ARZ3NDEKTSV4RRFFQ69G5FAV",
            label: "Loopwell",
          },
        ],
        scoringVersions: ["1.0.0"],
        createdAt: now,
      }),
    ).toThrow();
  });

  it("Activity", () => {
    expect(() =>
      Activity.parse({
        id: "act_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerId: "user_1",
        type: "RUN_COMPLETED",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        message: "Loopwell analysis completed.",
        createdAt: now,
      }),
    ).not.toThrow();
  });

  it("Signal", () => {
    expect(() =>
      Signal.parse({
        id: "sig_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        title: "Loopwell announces Series A",
        url: "https://example.com/loopwell-series-a",
        summary: "Fictional coverage of a fictional funding round.",
        impact: "POSITIVE",
        evidenceId: "ev_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        retrievedAt: now,
      }),
    ).not.toThrow();
  });

  it("Export", () => {
    expect(() =>
      Export.parse({
        id: "exp_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        ownerId: "user_1",
        analysisId: "ana_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        reportId: "rpt_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        format: "PDF",
        storagePath: "exports/exp_01ARZ3NDEKTSV4RRFFQ69G5FAV.pdf",
        createdAt: now,
        expiresAt: now,
      }),
    ).not.toThrow();
  });
});
