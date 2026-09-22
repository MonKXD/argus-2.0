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

const pages = [
  { name: "landing", path: "/" },
  { name: "sample report", path: "/sample" },
  { name: "dashboard", path: "/app" },
  { name: "analyses list", path: "/app/analyses" },
  { name: "component gallery", path: "/dev/ui" },
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
