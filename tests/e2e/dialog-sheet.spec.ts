import { expect, test } from "@playwright/test";

// Regression coverage for the hand-built native-<dialog> Dialog/Sheet
// primitives (docs/DESIGN.md section 12: prefer native <dialog> to Radix).
// jsdom doesn't implement showModal(), so this can only be verified in a
// real browser — see docs/PROJECT_MEMORY.md.

test.describe("Dialog", () => {
  test("opens, is labelled, and closes on Escape", async ({ page }) => {
    await page.goto("/dev/ui");

    await page.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm export" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("closes on backdrop click (light-dismiss)", async ({ page }) => {
    await page.goto("/dev/ui");

    await page.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm export" });
    await expect(dialog).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
  });

  test("Cancel button closes it", async ({ page }) => {
    await page.goto("/dev/ui");

    await page.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm export" });
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});

test.describe("Sheet", () => {
  test("opens anchored to the right edge and closes on Escape", async ({ page }) => {
    await page.goto("/dev/ui");

    await page.getByRole("button", { name: "Open sheet" }).click();
    const sheet = page.getByRole("dialog", { name: "Evidence" });
    await expect(sheet).toBeVisible();

    const box = await sheet.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box && viewport) {
      expect(box.x + box.width).toBeCloseTo(viewport.width, 0);
    }

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });
});
