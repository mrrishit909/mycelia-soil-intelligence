import { expect, test } from "@playwright/test";
test("reduced motion: static keyframes, charts already grown, no panel animation, same navigation", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" }), page = await ctx.newPage(); await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Opening story" })).toContainText("MYCELIA"); await expect(page.getByTestId("pause-motion")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("skip-intro").click(); await expect(page.getByRole("heading", { name: /Hollin Beck Farm/ })).toBeVisible();
  await page.getByTestId("nav-carbon").click(); await expect(page.getByTestId("carbon-chart")).toBeVisible();
  expect(await page.locator(".panel").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".chart .root.scn").evaluate((el) => getComputedStyle(el).strokeDashoffset)).toBe("0px"); await ctx.close();
});
test("graphics failure: the poster still, and every view still works from the DOM", async ({ page }) => {
  await page.goto("/?gfx=off&skip=1&view=farm"); await expect(page.getByTestId("poster")).toBeVisible(); await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByTestId("field-f03").click(); await page.getByTestId("nav-soil").click(); await expect(page.getByTestId("soc30")).toBeVisible(); await page.getByTestId("nav-water").click(); await expect(page.getByTestId("water-table")).toBeVisible();
});
test("WebGL context loss falls back to the poster", async ({ page }) => {
  await page.goto("/?skip=1&view=farm"); await expect(page.locator("canvas")).toHaveCount(1, { timeout: 30_000 });
  await page.waitForFunction(() => typeof (window as unknown as { __myceliaStats?: unknown }).__myceliaStats === "function");
  await page.evaluate(() => document.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
  await expect(page.getByTestId("poster")).toBeVisible(); await page.getByTestId("nav-rotation").click(); await expect(page.getByTestId("slots")).toBeVisible();
});
test("phone width: the views become a strip, the panel sits below, nothing scrolls sideways", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true }), page = await ctx.newPage(); await page.goto("/?skip=1&view=farm&gfx=off");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const rail = await page.getByTestId("nav-farm").boundingBox(), panel = await page.locator(".panel").boundingBox(); expect(rail!.y).toBeLessThan(panel!.y); await ctx.close();
});
test("pause motion stops the ambient animation", async ({ page }) => { await page.goto("/?skip=1&view=farm"); await page.getByTestId("pause-motion").click(); await expect(page.getByTestId("pause-motion")).toHaveText("Resume motion"); });
