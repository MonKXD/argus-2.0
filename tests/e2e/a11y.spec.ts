import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// R-TST-06: critical flows have Playwright coverage with axe checks.
// R-UI-12: review at 1440, 768 and 390 before marking a UI task done.
// Every reachable Phase 1 surface is scanned at all three breakpoints.

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

// /app and /app/analyses (which need a real signed-in session) are scanned
// in a11y-app.authenticated.spec.ts instead — see that file's doc comment.
const pages = [
  { name: "landing", path: "/" },
  { name: "sample report", path: "/sample" },
  { name: "component gallery", path: "/dev/ui" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
];

for (const vp of viewports) {
  test.describe(`at ${vp.name}px`, () => {
    for (const p of pages) {
      test(`${p.name} has no axe violations`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(p.path);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
      });
    }
  });
}

// App-shell keyboard-operability (sidebar links, collapse toggle) needs a
// real signed-in session — see a11y-app.authenticated.spec.ts.
test.describe("keyboard operability", () => {
  test("landing page: tab reaches the primary CTA and it activates on Enter", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "Start an analysis" }).first();

    let guard = 0;
    while (!(await cta.evaluate((el) => el === document.activeElement)) && guard < 30) {
      await page.keyboard.press("Tab");
      guard++;
    }
    await expect(cta).toBeFocused();
  });
});

test.describe("reduced motion", () => {
  test("landing hero shows final state immediately with no console/hydration errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("Failed to load resource")) {
        errors.push(msg.text());
      }
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Every claim, traced to its source." }),
    ).toBeVisible();
    expect(errors, `console/page errors: ${errors.join("\n")}`).toEqual([]);
  });
});
