import { expect, test } from "@playwright/test";
// Visual regression of the product surfaces with the canvas swapped for the poster (WebGL output is not bit-stable across GPUs).
for (const view of ["farm", "soil", "water", "carbon", "rotation", "biodiversity"]) {
  test(`visual: ${view}`, async ({ page }) => {
    await page.goto(`/?gfx=off&skip=1&view=${view}&field=f03`); await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
    await expect(page.getByTestId("hud")).toBeVisible(); await page.waitForTimeout(400); await expect(page).toHaveScreenshot(`${view}.png`);
  });
}
