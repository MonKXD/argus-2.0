import { expect, test } from "@playwright/test";

test("landing page loads with the hero, a working CTA, and the disclaimer", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Every claim, traced to its source." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start an analysis" }).first()).toBeVisible();
  await expect(page.getByText(/does not provide investment, legal, tax/)).toBeVisible();
});
