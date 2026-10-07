// MYCELIA API: the blueprint's section 12 contract over the generated farm, using the same domain package as the browser. Scenarios are idempotent.
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { rainEvent, runScenario, validatePractice, availableWater, infiltrationCapacity, LAYERS_CM } from "../../../packages/domain/src/index.ts";
import type { Farm, FieldSoil, Scenario } from "../../../packages/schemas/src/index.ts";
const load = <T,>(n: string) => JSON.parse(readFileSync(new URL(`../../../data/generated/${n}.json`, import.meta.url), "utf8")) as T;
export const openapi = { openapi: "3.1.0", info: { title: "MYCELIA API", version: "1.0.0", description: "Synthetic farm data." }, paths: {
  "/v1/farms/{id}": { get: {} }, "/v1/fields/{id}": { get: {} }, "/v1/fields/{id}/soil": { get: {} }, "/v1/fields/{id}/water": { get: { summary: "Rain event: ?rain=mm/h (0-120) &hours=1-24" } },
  "/v1/scenarios": { post: { summary: "Run and store a scenario; Idempotency-Key required" } }, "/v1/scenarios/{id}": { get: {} } } };
export function build() {
  const farm = load<Farm>("farm"), soils = load<FieldSoil[]>("soil"), scenarios = new Map<string, Scenario>(), byKey = new Map<string, Scenario>();
  const send = (res: ServerResponse, code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,idempotency-key", "access-control-allow-methods": "GET,POST,OPTIONS" }); res.end(JSON.stringify(body)); };
  const err = (res: ServerResponse, code: number, error: string, details?: string[]) => send(res, code, { error, details });
  async function body(req: IncomingMessage) { let s = ""; for await (const c of req) { s += c; if (s.length > 20_000) throw new RangeError("body too large"); } return s ? JSON.parse(s) : {}; }
  const server: Server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url ?? "/", "http://x"), p = u.pathname.replace(/\/+$/, "") || "/", m = req.method ?? "GET"; let g: RegExpMatchArray | null;
      if (m === "OPTIONS") return send(res, 204, {});
      if (p === "/openapi.json") return send(res, 200, openapi); if (p === "/healthz") return send(res, 200, { ok: true });
      if ((g = p.match(/^\/v1\/farms\/([\w-]+)$/)) && m === "GET") return g[1] === farm.id ? send(res, 200, farm) : err(res, 404, "no such farm");
      if ((g = p.match(/^\/v1\/fields\/(f\d+)(?:\/(soil|water))?$/)) && m === "GET") {
        const f = farm.fields.find((x) => x.id === g![1]), s = soils.find((x) => x.fieldId === g![1]); if (!f || !s) return err(res, 404, "no such field");
        if (!g[2]) return send(res, 200, f); if (g[2] === "soil") return send(res, 200, s);
        const rain = Number(u.searchParams.get("rain") ?? 20), hours = Number(u.searchParams.get("hours") ?? 2);
        if (!Number.isFinite(rain) || rain < 0 || rain > 120 || !Number.isInteger(hours) || hours < 1 || hours > 24) return err(res, 400, "rain must be 0-120 mm/h and hours a whole number 1-24");
        const soc = s.layers.filter((l) => l.depthCm <= 30).reduce((a, l, _, arr) => a + l.organicCarbon / arr.length, 0), start = s.layers.map((l) => l.moisture);
        const r = rainEvent(f.soilType, soc, start, rain, hours); return send(res, 200, { ...r, startMoisture: start, depthsCm: LAYERS_CM, availableWaterMm: availableWater(f.soilType, r.moisture), capacityMmH: infiltrationCapacity(f.soilType, soc) });
      }
      if (p === "/v1/scenarios" && m === "POST") {
        const key = req.headers["idempotency-key"]; if (typeof key !== "string" || !key) return err(res, 400, "Idempotency-Key header required");
        const prior = byKey.get(key); if (prior) return send(res, 200, prior);
        const b = await body(req), f = farm.fields.find((x) => x.id === b.fieldId), s = soils.find((x) => x.fieldId === b.fieldId); if (!f || !s) return err(res, 404, "no such field");
        const years = b.years ?? 10; if (!Number.isInteger(years) || years < 1 || years > 30) return err(res, 422, "years must be a whole number 1-30");
        const pr = b.practice; if (!pr || !["conventional", "no-till"].includes(pr.tillage) || typeof pr.cover !== "boolean" || typeof pr.compost !== "boolean" || !Array.isArray(pr.rotation)) return err(res, 422, "practice needs tillage, cover, compost and a rotation");
        const errs = validatePractice(pr); if (errs.length) return err(res, 422, "invalid practice", errs);
        const sc = runScenario(f, s, pr, years, `sc-${scenarios.size + 1}`, String(b.name ?? "Scenario").slice(0, 80)); scenarios.set(sc.id, sc); byKey.set(key, sc); return send(res, 201, sc);
      }
      if ((g = p.match(/^\/v1\/scenarios\/([\w-]+)$/)) && m === "GET") { const s = scenarios.get(g[1]); return s ? send(res, 200, s) : err(res, 404, "no such scenario"); }
      return err(res, 404, "not found");
    } catch (e) { return err(res, e instanceof SyntaxError || e instanceof RangeError ? 400 : 500, e instanceof Error ? e.message : "error"); }
  });
  return { server, listen: (port = 8650) => new Promise<number>((r) => server.listen(port, () => r((server.address() as { port: number }).port))), close: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }) };
}
if (import.meta.url === `file://${process.argv[1]}`) build().listen().then((p) => console.log(`MYCELIA API on :${p}`));
