import { expect, test, type Page } from "@playwright/test";
const open = async (page: Page, url: string) => { await page.goto(url); await expect(page.getByTestId("hud")).toBeVisible({ timeout: 30_000 }); await expect(page.locator(".app")).toHaveAttribute("data-intro", "done"); await page.waitForFunction(() => typeof (window as unknown as { __myceliaStats?: unknown }).__myceliaStats === "function", null, { timeout: 30_000 }); };
const num = async (page: Page, id: string) => Number((await page.getByTestId(id).textContent())!.replace(/[^0-9.]/g, ""));

// Blueprint section 19, the demo script.
test("demo walk: follow the raindrop, pick a field, descend, rain, compare scenarios, return to the map", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  // 1. the intro: skip is there from the first frame; it fast-forwards into the pull-back and the panels grow in
  await expect(page.getByTestId("skip-intro")).toBeVisible(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", /[0-9]/);
  await page.getByTestId("skip-intro").click(); await expect(page.getByTestId("intro")).toBeHidden({ timeout: 25_000 });
  await expect(page.getByRole("heading", { name: /Hollin Beck Farm/ })).toBeVisible();
  const proj0 = await num(page, "avg-proj"); expect(await num(page, "applied-count")).toBe(0);
  // 2. select a field from the map list
  await page.getByTestId("field-f03").click(); await page.getByTestId("nav-soil").click();
  await expect(page.getByRole("heading", { name: /Soil profile · Long Acre/ })).toBeVisible(); await expect(page.getByTestId("soil-table").locator("tbody tr")).toHaveCount(6);
  // 3. descend into the profile, then travel underground to a neighbour
  await page.getByTestId("go-f04").click(); await expect(page.getByRole("heading", { name: /Soil profile · Brook Piece/ })).toBeVisible({ timeout: 10_000 });
  // 4. rainfall and infiltration: the same storm on today's soil and after ten regenerative years
  await page.getByTestId("nav-water").click(); await page.getByTestId("rain-mm").fill("60"); await page.getByTestId("rain-play").click();
  const runoffNow = Number((await page.getByTestId("w-Runoff").textContent())!.replace(/[^0-9.]/g, "")); expect(runoffNow).toBeGreaterThan(0);
  const cells = await page.getByTestId("water-table").locator("tr", { hasText: "Runoff" }).locator("td").allTextContents(); expect(parseFloat(cells[2])).toBeLessThan(parseFloat(cells[1]));
  // 5. compare the current practice with the regenerative scenario
  await page.getByTestId("nav-carbon").click(); await page.getByTestId("preset-regen").click();
  const cur = await num(page, "soc-cur"), scn = await num(page, "soc-scn"); expect(scn).toBeGreaterThan(cur);
  await page.getByTestId("nav-rotation").click(); await page.getByTestId("rot-regen").click(); await expect(page.getByTestId("diversity")).not.toHaveText("0%");
  // 6. apply it and return to the map: the projected state has changed
  await page.getByTestId("nav-carbon").click(); await page.getByTestId("apply").click();
  await expect(page.getByRole("heading", { name: /Hollin Beck Farm/ })).toBeVisible(); expect(await num(page, "applied-count")).toBe(1);
  expect(await num(page, "avg-proj")).toBeGreaterThan(proj0);
  await expect(page.getByTestId("projected")).toBeChecked(); expect(await page.getByTestId("health-f04").textContent()).toContain("→");
  expect(errors).toEqual([]);
});
test("a filter lights the matching fields and the rest dim", async ({ page }) => {
  await open(page, "/?skip=1&view=farm"); await page.getByTestId("filter-crop").selectOption("wheat");
  await expect(page.locator("tr.dim")).toHaveCount(9); await expect(page.getByTestId("field-table").locator("tbody tr:not(.dim)")).toHaveCount(3);
  await page.getByTestId("filter-health").fill("60"); await expect(page.locator("tr:not(.dim) td [data-testid^=field-]")).toHaveCount(0);
});
test("rotation rules: the same crop twice is refused with the reason; no legume only warns", async ({ page }) => {
  await open(page, "/?skip=1&view=rotation&field=f05"); await page.getByTestId("slot-0").selectOption("wheat"); await page.getByTestId("slot-1").selectOption("wheat");
  await expect(page.getByTestId("rot-error").first()).toContainText("Winter wheat twice in a row");
  const mono = ["wheat", "barley", "wheat", "barley", "wheat", "barley", "wheat", "fallow"]; for (let i = 0; i < 8; i++) await page.getByTestId(`slot-${i}`).selectOption(mono[i]);
  await expect(page.getByTestId("rot-error")).toHaveCount(0); await expect(page.getByTestId("rot-warning")).toContainText("no legume");
  await page.getByTestId("rot-regen").click(); await expect(page.getByTestId("rot-warning")).toHaveCount(0); expect(await num(page, "nbal")).toBeGreaterThan(0);
});
test("the carbon chart is an image with a text alternative and the scenario beats the current practice", async ({ page }) => {
  await open(page, "/?skip=1&view=carbon&field=f01"); await expect(page.getByTestId("carbon-chart")).toHaveAttribute("aria-label", /Soil carbon in North Meadow/);
  await page.getByTestId("sc-cover").uncheck(); await page.getByTestId("sc-compost").uncheck(); await page.getByTestId("sc-tillage").selectOption("conventional");
  const a = await num(page, "soc-scn"); await page.getByTestId("preset-regen").click(); expect(await num(page, "soc-scn")).toBeGreaterThan(a);
});
test("seasons change the page's state and survive a view change", async ({ page }) => {
  await open(page, "/?skip=1&view=farm"); await page.getByTestId("season-winter").click(); await expect(page.locator(".app")).toHaveAttribute("data-season", "winter"); await page.getByTestId("nav-biodiversity").click(); await expect(page.locator(".app")).toHaveAttribute("data-season", "winter");
  await expect(page.getByTestId("season-winter")).toHaveAttribute("aria-checked", "true");
});
test("biodiversity ranks the fields by habitat score", async ({ page }) => { await open(page, "/?skip=1&view=biodiversity"); const rows = await page.getByTestId("bio-table").locator("tbody tr td:last-child").allTextContents(); const v = rows.map(parseFloat); expect(v).toEqual([...v].sort((a, b) => b - a)); });
test("refresh mid-sequence restarts the intro cleanly", async ({ page }) => { await page.goto("/"); await page.waitForTimeout(1500); await page.reload(); await expect(page.getByTestId("intro")).toHaveAttribute("data-step", "0"); });
test("keyboard: stations are reachable without a pointer", async ({ page }) => {
  await open(page, "/?skip=1&view=farm");
  await expect(async () => { await page.getByTestId("nav-water").focus(); await expect(page.getByTestId("nav-water")).toBeFocused({ timeout: 500 }); }).toPass({ timeout: 15_000 });
  await page.keyboard.press("Enter"); await expect(page.getByRole("heading", { name: /^Water/ })).toBeVisible(); await page.getByTestId("rain-play").focus(); await page.keyboard.press("Enter");
});
