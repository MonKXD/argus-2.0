import { expect, test } from "@playwright/test";

// T-4.14: critical-flow e2e coverage for the report page (R-TST-06),
// against /sample — the full ReportShell (T-4.01 through T-4.13) rendered
// with the real Loopwell demo dataset, no auth required.

test.describe("status filter", () => {
  test("filtering to Verified hides other statuses across the whole report", async ({ page }) => {
    await page.goto("/sample");

    const execSummary = page.locator("section#executive-summary");
    await expect(execSummary.getByText("The founding team's prior", { exact: false })).toBeVisible();

    await page.getByRole("tab", { name: "Verified" }).click();

    await expect(execSummary.getByText("The founding team's prior", { exact: false })).toBeHidden();
    await expect(execSummary.getByText("Loopwell reached $2.0M", { exact: false })).toBeVisible();

    await page.getByRole("tab", { name: "All" }).click();
    await expect(execSummary.getByText("The founding team's prior", { exact: false })).toBeVisible();
  });
});

test.describe("section nav", () => {
  test("clicking a nav link scrolls to that section and marks it current", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sample");

    const nav = page.getByRole("navigation", { name: "Report sections" });
    // A middle section, not the last: the scroll-spy's own activation-offset
    // math picks the closest section to a fixed viewport offset, which is
    // ambiguous once the page can't scroll further than its last section.
    await nav.getByRole("link", { name: "Market opportunity" }).click();

    await expect(page.locator("section#market-opportunity")).toBeInViewport();
    await expect(nav.getByRole("link", { name: "Market opportunity" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("below md width, the nav is a select that jumps to a section", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 900 });
    await page.goto("/sample");

    await page.getByRole("combobox", { name: "Jump to section" }).click();
    await page.getByRole("option", { name: /16\. Missing information/ }).click();

    await expect(page.locator("section#missing-information")).toBeInViewport();
  });
});

test.describe("explain the score", () => {
  test("opens to show every dimension's weight and contribution", async ({ page }) => {
    await page.goto("/sample");

    await page.getByText("Explain this score").click();
    const table = page.locator("section#investment-score").getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("cell", { name: "Founder", exact: true })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Contribution" })).toBeVisible();
  });
});

test.describe("evidence rail", () => {
  test("desktop: selecting a claim opens the docked rail with its quote", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sample");

    const aside = page.locator("aside").filter({ hasText: "Select a claim" });
    await expect(aside).toBeVisible();

    const execSummary = page.locator("section#executive-summary");
    await execSummary.getByRole("button").first().click();

    await expect(page.locator("aside")).not.toContainText("Select a claim to see its evidence.");
  });

  test("narrow screens: selecting a claim opens the evidence sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sample");

    const execSummary = page.locator("section#executive-summary");
    await execSummary.getByRole("button").first().click();

    const sheet = page.getByRole("dialog", { name: "Evidence" });
    await expect(sheet).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });
});
