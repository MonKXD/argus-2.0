import { expect, test } from "@playwright/test";

test("home page loads and renders the placeholder button", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "ARGUS AI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Placeholder button" })).toBeVisible();
});
