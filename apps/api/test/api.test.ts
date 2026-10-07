import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { REGENERATIVE, MONOCULTURE } from "../../../packages/domain/src/index.ts";
import { build } from "../src/server.ts";
const api = build(); let base = "";
beforeAll(async () => { base = `http://127.0.0.1:${await api.listen(0)}`; }); afterAll(() => api.close());
const j = async (path: string, init?: RequestInit) => { const r = await fetch(base + path, init); return { status: r.status, body: (await r.json()) as any }; };
const post = (b: unknown, key: string | null) => j("/v1/scenarios", { method: "POST", headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) }, body: JSON.stringify(b) });
const reg = { tillage: "no-till", cover: true, compost: true, rotation: REGENERATIVE };

describe("read endpoints", () => {
  it("farm, field, soil and OpenAPI", async () => {
    expect((await j("/v1/farms/hollin-beck")).body.fields).toHaveLength(12); expect((await j("/v1/farms/x")).status).toBe(404);
    expect((await j("/v1/fields/f03")).body.name).toBe("Long Acre"); expect((await j("/v1/fields/f99")).status).toBe(404);
    const s = (await j("/v1/fields/f03/soil")).body; expect(s.layers).toHaveLength(6); expect(s.socHistory).toHaveLength(5); expect((await j("/openapi.json")).body.openapi).toBe("3.1.0");
  });
});
describe("water", () => {
  it("returns a conserved balance and validates its inputs", async () => {
    const w = (await j("/v1/fields/f01/water?rain=40&hours=3")).body; expect(w.infiltratedMm + w.runoffMm).toBeCloseTo(w.rainMm, 0); expect(w.moisture).toHaveLength(6);
    for (const q of ["rain=-1", "rain=500", "hours=0", "hours=2.5", "rain=abc"]) expect((await j(`/v1/fields/f01/water?${q}`)).status).toBe(400);
  });
  it("a regenerative loam (Long Acre) sheds less than a conventional loam (North Meadow) in the same storm", async () => { const a = (await j("/v1/fields/f03/water?rain=60&hours=2")).body, b = (await j("/v1/fields/f01/water?rain=60&hours=2")).body; expect(a.capacityMmH).toBeGreaterThan(b.capacityMmH); expect(a.runoffMm / a.rainMm).toBeLessThan(b.runoffMm / b.rainMm); });
});
describe("scenarios", () => {
  it("run, store, replay by key, and fetch", async () => {
    const a = await post({ fieldId: "f05", name: "No-till and cover", practice: reg }, "k1"), b = await post({ fieldId: "f05", name: "x", practice: reg }, "k1");
    expect(a.status).toBe(201); expect(b.status).toBe(200); expect(b.body.id).toBe(a.body.id); expect(a.body.projected.socSeries).toHaveLength(11); expect(a.body.projected.socEnd).toBeGreaterThan(a.body.projected.soc0);
    expect((await j(`/v1/scenarios/${a.body.id}`)).body.name).toBe("No-till and cover"); expect((await j("/v1/scenarios/none")).status).toBe(404);
  });
  it("needs a key, a real field, a valid practice and a sensible horizon", async () => {
    expect((await post({ fieldId: "f05", practice: reg }, null)).status).toBe(400); expect((await post({ fieldId: "zz", practice: reg }, "a")).status).toBe(404);
    expect((await post({ fieldId: "f05", practice: { ...reg, rotation: ["wheat"] } }, "b")).status).toBe(422); expect((await post({ fieldId: "f05", practice: { ...reg, tillage: "plough" } }, "c")).status).toBe(422);
    expect((await post({ fieldId: "f05", practice: reg, years: 99 }, "d")).status).toBe(422); expect((await post({ fieldId: "f05", practice: { ...reg, rotation: MONOCULTURE } }, "e")).status).toBe(201);
    expect((await j("/v1/scenarios", { method: "POST", headers: { "idempotency-key": "z" }, body: "{" })).status).toBe(400);
  });
});
