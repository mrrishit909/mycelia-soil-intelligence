import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
// Budgets. Frame times under SwiftShader (CPU rasteriser) are bounds, not GPU results.
const out = new URL("../../apps/web/out/", import.meta.url).pathname;
const size = (dir: string): number => readdirSync(dir).reduce((a, f) => { const p = join(dir, f), s = statSync(p); return a + (s.isDirectory() ? size(p) : f.endsWith(".js") ? gzipSync(readFileSync(p)).length : 0); }, 0);
test("download weight stays inside the budget", () => { expect(statSync(out + "models/soil-cutaway.glb").size).toBeLessThan(700_000); expect(statSync(out + "data/guides.json").size).toBeLessThan(300_000); expect(size(out + "_next/static/chunks")).toBeLessThan(750_000); });
test("scene cost: draw calls and triangles are bounded", async ({ page }) => {
  await page.goto("/?skip=1&view=soil"); await page.waitForFunction(() => typeof (window as unknown as { __myceliaStats?: unknown }).__myceliaStats === "function", null, { timeout: 30_000 }); await page.waitForTimeout(2500);
  const st = await page.evaluate(() => (window as unknown as { __myceliaStats: () => { calls: number; triangles: number } }).__myceliaStats()); console.log("renderer", JSON.stringify(st)); expect(st.calls).toBeLessThan(200); expect(st.triangles).toBeLessThan(200_000);
});
test("a rain-slider change updates the numbers while the canvas renders", async ({ page }) => {
  await page.goto("/?skip=1&view=water&field=f03"); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(2000);
  const t0 = Date.now(); await page.getByTestId("rain-mm").fill("90"); await expect(page.getByText("90 mm/h")).toBeVisible(); console.log("slider-to-readout ms", Date.now() - t0); expect(Date.now() - t0).toBeLessThan(3000);
});
