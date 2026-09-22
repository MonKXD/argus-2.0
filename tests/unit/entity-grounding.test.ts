import { describe, expect, it } from "vitest";

import { heuristicUndeclaredNames, undeclaredEntities } from "@/lib/analysis/verify/entity-grounding";

describe("undeclaredEntities", () => {
  it("returns entities not present (case-insensitively) in the corpus", () => {
    const corpus = "Loopwell competes with Acme Corp in the logistics space.";
    expect(undeclaredEntities(["Acme Corp", "Globex"], corpus)).toEqual(["Globex"]);
  });

  it("returns an empty array when every entity is present", () => {
    const corpus = "Loopwell competes with Acme Corp.";
    expect(undeclaredEntities(["acme corp"], corpus)).toEqual([]);
  });
});

describe("heuristicUndeclaredNames", () => {
  it("flags a capitalised name in claim text that is neither declared nor in the corpus", () => {
    const hits = heuristicUndeclaredNames("Loopwell competes with Zylo Systems.", ["Loopwell"], "Loopwell is a logistics startup.");
    expect(hits).toContain("Zylo Systems");
  });

  it("does not flag a name already present in the corpus", () => {
    const hits = heuristicUndeclaredNames("Loopwell competes with Acme Corp.", [], "Loopwell competes directly with Acme Corp in freight.");
    expect(hits).toEqual([]);
  });

  it("does not flag a name already declared in entities", () => {
    const hits = heuristicUndeclaredNames("Loopwell competes with Zylo Systems.", ["Loopwell", "Zylo Systems"], "");
    expect(hits).toEqual([]);
  });

  it("does not flag ordinary sentence-start capitalisation", () => {
    const hits = heuristicUndeclaredNames("The company grew revenue significantly.", [], "");
    expect(hits).toEqual([]);
  });
});
