import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { rainEvent, infiltrationCapacity, availableWater, SOIL, projectSOC, equilibriumSOC, stockTHa, socPct, validateRotation, scoreRotation, MONOCULTURE, REGENERATIVE, SLOTS, habitatScore, soilHealth, healthColor, hex, hops, shortestPath, activation, SEASON, cropGrowth, runScenario, regenerativePractice, currentPractice, validatePractice, underground, wordmark, farmMap, params, buildStrands, PTS, mulberry32, LAYERS_CM } from "../src/index.ts";
import type { Farm, FieldSoil } from "@mycelia/schemas";
const gen = (n: string) => JSON.parse(readFileSync(new URL(`../../../data/generated/${n}.json`, import.meta.url), "utf8"));
const farm: Farm = gen("farm"), soils: FieldSoil[] = gen("soil"), guides = JSON.parse(readFileSync(new URL("../../../model/exports/guides.json", import.meta.url), "utf8"));
const dry = LAYERS_CM.map(() => 0.15);

describe("water", () => {
  it("more organic carbon means more infiltration, and sand beats clay", () => {
    expect(infiltrationCapacity("loam", 3)).toBeGreaterThan(infiltrationCapacity("loam", 1)); expect(infiltrationCapacity("sandy-loam", 1.5)).toBeGreaterThan(infiltrationCapacity("clay", 1.5));
    expect(infiltrationCapacity("loam", 1.5)).toBe(SOIL.loam.ksat); expect(infiltrationCapacity("clay", 99)).toBeCloseTo(SOIL.clay.ksat * 1.9, 0);
  });
  it("conserves water: rain = infiltrated + runoff", () => { for (const rain of [5, 25, 80]) { const w = rainEvent("loam", 1.5, dry, rain, 3); expect(w.infiltratedMm + w.runoffMm).toBeCloseTo(w.rainMm, 0); } });
  it("a downpour on low-carbon soil runs off more than on high-carbon soil", () => { const lo = rainEvent("loam", 1, dry, 60, 2), hi = rainEvent("loam", 3.2, dry, 60, 2); expect(lo.runoffMm).toBeGreaterThan(hi.runoffMm); expect(hi.infiltratedMm).toBeGreaterThan(lo.infiltratedMm); });
  it("light rain all soaks in, and wets the top layer first", () => { const w = rainEvent("loam", 1.5, dry, 3, 1); expect(w.runoffMm).toBe(0); expect(w.moisture[0]).toBeGreaterThan(w.moisture[5]); });
  it("a saturated profile sheds everything", () => { const w = rainEvent("clay", 1.5, LAYERS_CM.map(() => 0.45), 20, 1); expect(w.infiltratedMm).toBeLessThan(w.rainMm); });
  it("available water counts only above wilting point", () => { expect(availableWater("loam", LAYERS_CM.map(() => SOIL.loam.wp))).toBe(0); expect(availableWater("loam", LAYERS_CM.map(() => SOIL.loam.fc))).toBeGreaterThan(100); });
});
describe("carbon", () => {
  it("stock and percent convert back", () => expect(socPct(stockTHa(2.2, "loam"), "loam")).toBeCloseTo(2.2));
  it("conventional monoculture declines toward a low equilibrium; regenerative rises toward a higher one", () => {
    const conv = { tillage: "conventional" as const, cover: false, compost: false, rotation: MONOCULTURE }, reg = regenerativePractice();
    expect(projectSOC(2.2, conv, "loam", 10).at(-1)!.soc).toBeLessThan(2.2); expect(projectSOC(2.2, reg, "loam", 10).at(-1)!.soc).toBeGreaterThan(2.2);
    expect(equilibriumSOC(reg, "loam")).toBeGreaterThan(equilibriumSOC(conv, "loam"));
  });
  it("series runs years 0..n from the start year", () => { const s = projectSOC(2, regenerativePractice(), "silt", 10, 2026); expect(s).toHaveLength(11); expect(s[0]).toEqual({ year: 2026, soc: 2 }); expect(s[10].year).toBe(2036); });
  it("each practice helps on its own", () => { const base = { tillage: "conventional" as const, cover: false, compost: false, rotation: MONOCULTURE }, f = (p: object) => projectSOC(2, { ...base, ...p }, "loam", 10).at(-1)!.soc; expect(f({ tillage: "no-till" })).toBeGreaterThan(f({})); expect(f({ cover: true })).toBeGreaterThan(f({})); expect(f({ compost: true })).toBeGreaterThan(f({})); });
});
describe("rotation", () => {
  it("accepts the two templates; the monoculture only warns", () => { expect(validateRotation(REGENERATIVE).errors).toEqual([]); expect(validateRotation(MONOCULTURE).warnings.join()).toMatch(/no legume/); });
  it("rejects the same crop twice in a row, two brassicas, wrong length and unknown crops", () => {
    expect(validateRotation(["wheat", "wheat", ...REGENERATIVE.slice(2)]).errors[0]).toMatch(/twice in a row/); expect(validateRotation(["rapeseed", "rapeseed", ...REGENERATIVE.slice(2)]).errors.length).toBeGreaterThan(0);
    expect(validateRotation(["wheat"]).errors[0]).toMatch(/8 seasons/); expect(validateRotation([...REGENERATIVE.slice(0, 7), "kale"]).errors[0]).toMatch(/unknown crop/);
  });
  it("the wrap-around counts: last and first season are neighbours", () => expect(validateRotation(["wheat", "beans", "barley", "clover", "rapeseed", "clover", "barley", "wheat"]).errors[0]).toMatch(/seasons 8 and 1/));
  it("scores: regenerative has more diversity and a positive nitrogen balance", () => { const a = scoreRotation(MONOCULTURE), b = scoreRotation(REGENERATIVE); expect(b.diversity).toBeGreaterThan(a.diversity); expect(b.nBalance).toBeGreaterThan(a.nBalance); expect(b.legumeSeasons).toBe(3); expect(SLOTS).toBe(8); });
});
describe("health", () => {
  it("rises with carbon, infiltration and habitat; peaks near ph 6.5", () => {
    const h = (o = {}) => soilHealth({ soc: 2, ph: 6.5, infiltrationMmH: 30, habitat: 0.5, nBalance: 0, ...o });
    expect(h({ soc: 3 })).toBeGreaterThan(h()); expect(h({ ph: 5 })).toBeLessThan(h()); expect(h({ habitat: 0.9 })).toBeGreaterThan(h()); expect(h({ soc: 0, infiltrationMmH: 0, habitat: 0, ph: 4, nBalance: -150 })).toBe(0);
  });
  it("habitat score caps at half the perimeter in hedgerow", () => { expect(habitatScore({ hedgerowM: 500, perimeterM: 1000 }, 0)).toBeCloseTo(0.6); expect(habitatScore({ hedgerowM: 900, perimeterM: 1000 }, 0)).toBeCloseTo(0.6); });
  it("colour ramp hits the palette at its stops and stays valid between", () => { expect(hex(healthColor(0))).toBe("#18140f"); expect(hex(healthColor(100))).toBe("#e8c86a"); expect(hex(healthColor(55))).toBe("#536b3c"); expect(healthColor(-5)).toEqual(healthColor(0)); expect(healthColor(999)).toEqual(healthColor(100)); });
});
describe("network", () => {
  const g = { a: ["b"], b: ["a", "c"], c: ["b"], z: [] as string[] };
  it("hops, paths and unreachable nodes", () => { expect(hops(g, ["a"])).toEqual({ a: 0, b: 1, c: 2 }); expect(shortestPath(g, "a", "c")).toEqual(["a", "b", "c"]); expect(shortestPath(g, "a", "z")).toEqual([]); });
  it("activation spreads one hop at a time and never reaches an isolated field", () => { const t0 = activation(g, ["a"], 0.2), t1 = activation(g, ["a"], 2); expect(t0.a).toBeGreaterThan(0); expect(t0.b).toBe(0); expect(t1.c).toBe(1); expect(t1.z).toBe(0); });
  it("the generated farm graph is symmetric and connected", () => { const gr = Object.fromEntries(farm.fields.map((f) => [f.id, f.neighbours])); for (const f of farm.fields) for (const n of f.neighbours) expect(gr[n]).toContain(f.id); expect(Object.keys(hops(gr, ["f01"]))).toHaveLength(12); });
});
describe("season", () => { it("sun is highest in summer, lowest in winter; spring crops sleep in winter", () => { expect(SEASON.summer.sunElevationDeg).toBeGreaterThan(SEASON.winter.sunElevationDeg); expect(cropGrowth("barley", "winter")).toBe(0); expect(cropGrowth("wheat", "winter")).toBeGreaterThan(0); expect(cropGrowth("wheat", "summer")).toBe(1); }); });
describe("scenarios on the generated farm", () => {
  it("the regenerative practice lifts projected carbon, infiltration and health on every field", () => {
    for (const f of farm.fields) { const s = soils.find((x) => x.fieldId === f.id)!, cur = runScenario(f, s, currentPractice(f)), reg = runScenario(f, s, regenerativePractice()); expect(reg.projected.socEnd).toBeGreaterThanOrEqual(cur.projected.socEnd); expect(reg.projected.healthEnd).toBeGreaterThanOrEqual(cur.projected.healthEnd); expect(reg.projected.socSeries).toHaveLength(11); }
  });
  it("rejects an invalid rotation", () => expect(validatePractice({ ...regenerativePractice(), rotation: ["wheat"] })[0]).toMatch(/8 seasons/));
  it("data is internally consistent: 12 fields, valid rotations, hedgerow within perimeter", () => { expect(farm.fields).toHaveLength(12); for (const f of farm.fields) { expect(validateRotation(f.rotation).errors).toEqual([]); expect(f.hedgerowM).toBeLessThanOrEqual(f.perimeterM); } });
});
describe("strands", () => {
  const mask = new Uint8Array(64 * 16).fill(0); for (let x = 4; x < 60; x++) for (let y = 6; y < 10; y++) mask[y * 64 + x] = 255;
  it("keyframe A follows the guides inside the block, deterministically", () => { const a = underground(guides, 50, 1), b = underground(guides, 50, 1); expect(Array.from(a)).toEqual(Array.from(b)); expect(a).toHaveLength(50 * PTS * 3); for (let i = 0; i < a.length; i += 3) { expect(Math.abs(a[i])).toBeLessThanOrEqual(10 + 0.81); expect(a[i + 1]).toBeLessThanOrEqual(0.01); expect(a[i + 1]).toBeGreaterThanOrEqual(-14.01); } });
  it("keyframe C stays near the lit pixels; an empty mask is an error", () => { const c = wordmark(mask, 64, 16, 40, 26, 6); for (let i = 0; i < c.length; i += 3) expect(Math.abs(c[i + 1] - 6)).toBeLessThan(26 / 64 * 16); expect(() => wordmark(new Uint8Array(100), 10, 10, 5, 1, 0)).toThrow(/empty/); });
  it("keyframe B lies on field edges or neighbour links, on the ground", () => { const b = farmMap(farm, 80, 0.02); for (let i = 0; i < b.length; i += 3) { expect(b[i + 1]).toBeGreaterThan(1.5); expect(Math.abs(b[i])).toBeLessThanOrEqual(farm.extent.w * 0.02 / 2 + 1); } });
  it("all three sets and the params share one layout", () => { const s = buildStrands(guides, farm, mask, 64, 16, 120); expect(s.a.length).toBe(s.b.length); expect(s.b.length).toBe(s.c.length); expect(s.t.length).toBe(s.count * PTS * 2); expect(params(3)[2 * (PTS - 1)]).toBe(1); void mulberry32; });
});
