import { expect, test } from "@playwright/test";

// CommandPalette (T-5.10) needs a real signed-in session — every `/app/*`
// route redirects to `/login` otherwise, so an unauthenticated run of these
// assertions would silently test the login page instead (the gap flagged in
// docs/PROJECT_MEMORY.md's D-081, closed by D-091's auth.setup.ts fixture).
// The `.authenticated.spec.ts` suffix routes this file to the
// `chromium-authenticated` Playwright project (see playwright.config.ts),
// which signs in via auth.setup.ts before any test here runs.

test.describe("CommandPalette", () => {
  test("opens on Cmd/Ctrl+K from anywhere on an /app page, and on Escape", async ({ page }) => {
    await page.goto("/app");

    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeHidden();

    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette).toBeVisible();
    await expect(palette.getByPlaceholder(/Search analyses/)).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });

  test("opens via the topbar search button, and selecting a nav item closes it", async ({ page }) => {
    await page.goto("/app");

    await page.getByRole("button", { name: "Search analyses" }).click();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();

    await palette.getByRole("option", { name: "Analyses" }).click();
    await expect(palette).toBeHidden();
    await expect(page).toHaveURL(/\/app\/analyses/);
  });

  test("filters the Navigate group as the user types (T-5.10)", async ({ page }) => {
    await page.goto("/app");

    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette.getByRole("option", { name: "Compare" })).toBeVisible();

    await page.keyboard.type("compare");

    await expect(palette.getByRole("option", { name: "Compare" })).toBeVisible();
    await expect(palette.getByRole("option", { name: "Watchlist" })).toBeHidden();
  });

  test("runs the New analysis action and navigates to its setup wizard", async ({ page }) => {
    await page.goto("/app");

    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await palette.getByRole("option", { name: "New analysis" }).click();

    await expect(palette).toBeHidden();
    await expect(page).toHaveURL(/\/app\/analyses\/.+\/setup\?step=basics/);
  });
});
