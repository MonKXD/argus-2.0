import { describe, expect, it } from "vitest";

import { loopwellFacts } from "@/demo/loopwell";
import { FactRepo } from "@/lib/repos/fact-repo";
import { FirestoreStore } from "@/lib/repos/firestore-store";

import { createFakeFirestore } from "../helpers/fake-firestore";

const ANALYSIS_ID = loopwellFacts[0]!.analysisId;

describe("FactRepo", () => {
  it("lists every fact written for an analysis", async () => {
    const { db } = createFakeFirestore();
    await new FirestoreStore(db).putFacts(ANALYSIS_ID, loopwellFacts);

    const facts = await new FactRepo(db).list(ANALYSIS_ID);

    expect(facts.map((f) => f.id).sort()).toEqual(loopwellFacts.map((f) => f.id).sort());
  });

  it("returns an empty array for an analysis with no facts", async () => {
    const { db } = createFakeFirestore();

    await expect(new FactRepo(db).list(ANALYSIS_ID)).resolves.toEqual([]);
  });
});
