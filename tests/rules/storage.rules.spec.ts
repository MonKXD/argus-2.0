// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";

/**
 * R-TST-05: every new Storage path gets a rules test. Requires the real
 * Storage emulator running (`pnpm emulators`) — run via `pnpm test:rules`,
 * same as tests/rules/firestore.rules.spec.ts.
 */
const OWNER_UID = "owner-1";
const OTHER_UID = "owner-2";
const ANALYSIS_ID = "ana_test000000000000000000001";

const SMALL_PDF = new Uint8Array(Buffer.from("%PDF-1.4\ntest"));
const OVERSIZED = new Uint8Array(26 * 1024 * 1024); // over the 25 MB rule cap

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-argus-ai",
    storage: {
      rules: readFileSync(path.join(import.meta.dirname, "..", "..", "firebase", "storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearStorage();
});

function uploadPath(uid: string, fileName = "deck.pdf"): string {
  return `uploads/${uid}/${ANALYSIS_ID}/${fileName}`;
}

describe("storage.rules: uploads/{uid}/{analysisId}/{fileName}", () => {
  it("lets the owner upload a small, allowed-type file", async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertSucceeds(
      uploadBytes(ref(owner.storage(), uploadPath(OWNER_UID)), SMALL_PDF, {
        contentType: "application/pdf",
      }),
    );
  });

  it("denies uploading at a different uid's path", async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(
      uploadBytes(ref(owner.storage(), uploadPath(OTHER_UID)), SMALL_PDF, {
        contentType: "application/pdf",
      }),
    );
  });

  it("denies an unauthenticated upload", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      uploadBytes(ref(anon.storage(), uploadPath(OWNER_UID)), SMALL_PDF, {
        contentType: "application/pdf",
      }),
    );
  });

  it("denies an oversized upload", async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(
      uploadBytes(ref(owner.storage(), uploadPath(OWNER_UID)), OVERSIZED, {
        contentType: "application/pdf",
      }),
    );
  });

  it("denies a disallowed content type", async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(
      uploadBytes(ref(owner.storage(), uploadPath(OWNER_UID, "script.exe")), SMALL_PDF, {
        contentType: "application/x-msdownload",
      }),
    );
  });

  it("lets the owner read their own upload", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), uploadPath(OWNER_UID)), SMALL_PDF, {
        contentType: "application/pdf",
      });
    });
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertSucceeds(getBytes(ref(owner.storage(), uploadPath(OWNER_UID))));
  });

  it("denies a different signed-in user reading someone else's upload", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), uploadPath(OWNER_UID)), SMALL_PDF, {
        contentType: "application/pdf",
      });
    });
    const other = testEnv.authenticatedContext(OTHER_UID);
    await assertFails(getBytes(ref(other.storage(), uploadPath(OWNER_UID))));
  });

  it("denies the owner deleting their own upload (server-only removal, R-DAT-05)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), uploadPath(OWNER_UID)), SMALL_PDF, {
        contentType: "application/pdf",
      });
    });
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(deleteObject(ref(owner.storage(), uploadPath(OWNER_UID))));
  });
});

describe("storage.rules: exports/{uid}/{fileName}", () => {
  it("lets the owner read their own export", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), `exports/${OWNER_UID}/report.pdf`), SMALL_PDF, {
        contentType: "application/pdf",
      });
    });
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertSucceeds(getBytes(ref(owner.storage(), `exports/${OWNER_UID}/report.pdf`)));
  });

  it("denies a different user reading someone else's export", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), `exports/${OWNER_UID}/report.pdf`), SMALL_PDF, {
        contentType: "application/pdf",
      });
    });
    const other = testEnv.authenticatedContext(OTHER_UID);
    await assertFails(getBytes(ref(other.storage(), `exports/${OWNER_UID}/report.pdf`)));
  });

  it("denies any client write to exports", async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(
      uploadBytes(ref(owner.storage(), `exports/${OWNER_UID}/report.pdf`), SMALL_PDF, {
        contentType: "application/pdf",
      }),
    );
  });
});

describe("storage.rules: every other path denies clients by default", () => {
  it("denies reading an undeclared top-level path", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), "misc/file.txt"), SMALL_PDF);
    });
    const owner = testEnv.authenticatedContext(OWNER_UID);
    await assertFails(getBytes(ref(owner.storage(), "misc/file.txt")));
  });
});
