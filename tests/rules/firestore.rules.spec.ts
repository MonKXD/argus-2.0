// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";

/**
 * R-TST-05: every new Firestore path gets a rules test. Requires the real
 * Firestore emulator running (`pnpm emulators`) — not part of `pnpm test`/
 * `pnpm check` (same reasoning `pnpm test:e2e` already needs a dev server),
 * run explicitly with `pnpm test:rules`.
 */
const OWNER_UID = "owner-1";
const OTHER_UID = "owner-2";
const ANALYSIS_ID = "ana_test000000000000000000001";
const RUN_ID = "run_test000000000000000000001";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-argus-ai",
    firestore: {
      rules: readFileSync(path.join(import.meta.dirname, "..", "..", "firebase", "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

async function seedAnalysis(): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "analyses", ANALYSIS_ID), {
      ownerId: OWNER_UID,
      startupName: "Test Co",
    });
    await setDoc(doc(context.firestore(), "analyses", ANALYSIS_ID, "runs", RUN_ID), {
      ownerId: OWNER_UID,
      status: "RUNNING",
    });
  });
}

describe("firestore.rules: analyses", () => {
  it("lets the owner read their own analysis", async () => {
    await seedAnalysis();
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertSucceeds(getDoc(doc(owner.firestore(), "analyses", ANALYSIS_ID)));
  });

  it("denies a different signed-in user reading someone else's analysis", async () => {
    await seedAnalysis();
    const other = testEnv.authenticatedContext(OTHER_UID);
    await assertFails(getDoc(doc(other.firestore(), "analyses", ANALYSIS_ID)));
  });

  it("denies an unauthenticated client reading any analysis", async () => {
    await seedAnalysis();
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "analyses", ANALYSIS_ID)));
  });

  it("denies the owner writing to their own analysis (server-only writes, R-ARC-04)", async () => {
    await seedAnalysis();
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(
      setDoc(doc(owner.firestore(), "analyses", ANALYSIS_ID), { startupName: "Hijacked" }, { merge: true }),
    );
    await assertFails(deleteDoc(doc(owner.firestore(), "analyses", ANALYSIS_ID)));
  });

  it("denies creating a brand-new analysis document from the client, even self-owned", async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(
      setDoc(doc(owner.firestore(), "analyses", "ana_client_created00000000001"), {
        ownerId: OWNER_UID,
      }),
    );
  });
});

describe("firestore.rules: analyses/{id}/runs", () => {
  it("lets the owner read their own run", async () => {
    await seedAnalysis();
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertSucceeds(getDoc(doc(owner.firestore(), "analyses", ANALYSIS_ID, "runs", RUN_ID)));
  });

  it("denies a different signed-in user reading someone else's run", async () => {
    await seedAnalysis();
    const other = testEnv.authenticatedContext(OTHER_UID);
    await assertFails(getDoc(doc(other.firestore(), "analyses", ANALYSIS_ID, "runs", RUN_ID)));
  });

  it("denies an unauthenticated client reading any run", async () => {
    await seedAnalysis();
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "analyses", ANALYSIS_ID, "runs", RUN_ID)));
  });

  it("denies the owner writing to their own run", async () => {
    await seedAnalysis();
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(
      setDoc(doc(owner.firestore(), "analyses", ANALYSIS_ID, "runs", RUN_ID), { status: "SUCCEEDED" }, { merge: true }),
    );
  });
});

describe("firestore.rules: every other collection denies clients by default", () => {
  it("denies reading a server-only subcollection (sources) even for the owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "analyses", ANALYSIS_ID, "sources", "src_1"), {
        analysisId: ANALYSIS_ID,
      });
    });
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(getDoc(doc(owner.firestore(), "analyses", ANALYSIS_ID, "sources", "src_1")));
  });

  it("denies reading a top-level users document", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", OWNER_UID), { plan: "free" });
    });
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(getDoc(doc(owner.firestore(), "users", OWNER_UID)));
  });

  it("denies reading a top-level comparisons document even when owned", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "comparisons", "cmp_1"), { ownerId: OWNER_UID });
    });
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(getDoc(doc(owner.firestore(), "comparisons", "cmp_1")));
  });
});
