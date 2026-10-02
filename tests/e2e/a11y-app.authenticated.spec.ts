import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// R-TST-06/R-UI-12: the dashboard and analyses list need a real signed-in
// session — unauthenticated, both redirect to /login, so these axe scans
// and keyboard checks would otherwise silently cover the login page instead
// (docs/PROJECT_MEMORY.md's D-081, closed by D-091's auth.setup.ts fixture).
// The `.authenticated.spec.ts` suffix routes this file to the
// `chromium-authenticated` Playwright project (see playwright.config.ts).

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
];

const pages = [
  { name: "dashboard", path: "/app" },
  { name: "analyses list", path: "/app/analyses" },
  { name: "watchlist", path: "/app/watchlist" },
  { name: "settings", path: "/app/settings" },
  { name: "compare creator", path: "/app/compare" },
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

test.describe("keyboard operability", () => {
  test("app shell: sidebar links and collapse toggle are reachable and operable by keyboard", async ({
    page,
  }) => {
    await page.goto("/app");

    const analysesLink = page.getByRole("link", { name: "Analyses" }).first();
    await analysesLink.focus();
    await expect(analysesLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app\/analyses/);
  });

  test("sidebar collapse button has a visible focus outline", async ({ page }) => {
    await page.goto("/app");
    const collapseButton = page.getByRole("button", { name: /Collapse|Expand/ });
    await collapseButton.focus();
    await expect(collapseButton).toBeFocused();
    const outline = await collapseButton.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.outlineStyle === "none" ? style.boxShadow : style.outlineStyle;
    });
    expect(outline).not.toBe("none");
  });
});
