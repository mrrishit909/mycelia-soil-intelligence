"use client";
import { useMemo } from "react";
import { CROPS, SEASONS, SEASON, SLOTS, SOIL, availableWater, edgeFraction, fieldHealth, habitatScore, healthColor, hex, infiltrationCapacity, rainEvent, runScenario, scoreRotation, shortestPath, validateRotation, validatePractice, currentPractice, projectSOC, LAYERS_CM, type Season } from "@mycelia/domain";
import type { Field, FieldSoil, Practice } from "@mycelia/schemas";
import type { Data } from "../data";
import { PRESETS, set, state, useStore, VIEWS, type View } from "../store";

const go = (v: View) => { if (v !== state.view) { set({ prevView: state.view, view: v }); history.replaceState(null, "", `#${v}`); } };
const f1 = (n: number) => n.toFixed(1), f2 = (n: number) => n.toFixed(2), pct = (n: number) => Math.round(n * 100) + "%";
const soc30 = (s: FieldSoil) => s.layers.filter((l) => l.depthCm <= 30).reduce((a, l, _, arr) => a + l.organicCarbon / arr.length, 0);
const cropLabel = (id: string) => CROPS.find((c) => c.id === id)?.label ?? id;
const healthNow = (f: Field, s: FieldSoil) => fieldHealth(f, soc30(s), s.layers[0].ph);
const healthProj = (f: Field, s: FieldSoil, p: Practice | undefined) => runScenario(f, s, p ?? currentPractice(f), 10).projected.healthEnd;
function useCtx(data: Data) { const s = useStore(); const f = data.farm.fields.find((x) => x.id === s.fieldId)!, soil = data.soils.find((x) => x.fieldId === s.fieldId)!, draft = s.draft ?? PRESETS.regenerative; return { s, f, soil, draft }; }
const Swatch = ({ h }: { h: number }) => <i className="sw" style={{ background: hex(healthColor(h)) }} aria-hidden />;

function Farm({ data }: { data: Data }) {
  const { s } = useCtx(data), crops = [...new Set(data.farm.fields.map((f) => f.crop))].sort();
  const rows = data.farm.fields.map((f) => { const so = data.soils.find((x) => x.fieldId === f.id)!, now = healthNow(f, so), proj = healthProj(f, so, s.applied[f.id]); return { f, so, now, proj, match: (!s.filterCrop || f.crop === s.filterCrop) && (s.showProjected ? proj : now) >= s.minHealth }; });
  const avg = (k: "now" | "proj") => Math.round(rows.reduce((a, r) => a + r[k], 0) / rows.length), applied = Object.keys(s.applied).length;
  const spread = (ids: string[]) => set({ sources: ids, activationAt: performance.now() / 1000 });
  return (<section aria-labelledby="h-farm"><h2 id="h-farm">{data.farm.name}</h2>
    <p className="lede">Twelve fields, {data.farm.fields.reduce((a, f) => a + f.areaHa, 0).toFixed(0)} ha, all synthetic. Height and colour are soil health, 0 to 100. A filter lights the matching fields and the glow travels along the links between neighbours.</p>
    <dl className="spec"><div><dt>Average health now</dt><dd data-testid="avg-now">{avg("now")}</dd></div><div><dt>Projected in 10 years</dt><dd data-testid="avg-proj">{avg("proj")}</dd></div><div><dt>Fields with a changed practice</dt><dd data-testid="applied-count">{applied}</dd></div></dl>
    <div className="row2"><label>Crop <select value={s.filterCrop} onChange={(e) => { set({ filterCrop: e.target.value }); spread(rows.filter((r) => !e.target.value || r.f.crop === e.target.value).map((r) => r.f.id)); }} data-testid="filter-crop"><option value="">All</option>{crops.map((c) => <option key={c} value={c}>{cropLabel(c)}</option>)}</select></label>
      <label>Health at least <input type="range" min={0} max={90} step={5} value={s.minHealth} onChange={(e) => { set({ minHealth: Number(e.target.value) }); spread(rows.filter((r) => (s.showProjected ? r.proj : r.now) >= Number(e.target.value)).map((r) => r.f.id)); }} data-testid="filter-health" /><output>{s.minHealth}</output></label></div>
    <label className="chk"><input type="checkbox" checked={s.showProjected} onChange={(e) => set({ showProjected: e.target.checked })} data-testid="projected" /> Show projected state in 10 years (with the practice you applied)</label>
    <table className="tbl" data-testid="field-table"><thead><tr><th>Field</th><th>Crop</th><th>Soil</th><th>Health</th></tr></thead><tbody>{rows.map((r) => (
      <tr key={r.f.id} className={`${r.f.id === s.fieldId ? "on" : ""} ${r.match ? "" : "dim"}`}><td><button className="link" onClick={() => set({ fieldId: r.f.id })} data-testid={`field-${r.f.id}`}>{r.f.name}</button></td><td>{cropLabel(r.f.crop)}</td><td>{SOIL[r.f.soilType].label}</td>
        <td data-testid={`health-${r.f.id}`}><Swatch h={s.showProjected ? r.proj : r.now} />{s.showProjected ? <>{r.now} → <b>{r.proj}</b></> : r.now}</td></tr>))}</tbody></table>
    <div className="row2"><button className="btn" onClick={() => spread([s.fieldId])} data-testid="spread">Spread from {data.farm.fields.find((f) => f.id === s.fieldId)!.name}</button><button className="btn ghost" onClick={() => { set({ sources: [], filterCrop: "", minHealth: 0 }); }}>Clear</button></div></section>);
}
function Soil({ data }: { data: Data }) {
  const { s, f, soil } = useCtx(data), fam = CROPS.find((c) => c.id === f.crop)!.family, max = { organicCarbon: 4, moisture: 0.45, ph: 8, nitrogen: 60 };
  const go2 = (id: string) => { const path = shortestPath(Object.fromEntries(data.farm.fields.map((x) => [x.id, x.neighbours])), s.fieldId, id); set({ pulse: path, pulseAt: performance.now() / 1000 }); setTimeout(() => set({ fieldId: id }), s.reduced ? 0 : 1300); };
  return (<section aria-labelledby="h-soil"><h2 id="h-soil">Soil profile · {f.name}</h2>
    <p className="lede">{SOIL[f.soilType].label}, {cropLabel(f.crop)} ({fam === "legume" ? "tap-rooted legume" : fam === "brassica" ? "deep brassica taproot" : "fibrous cereal roots"}), {f.tillage}. The block is the field's soil; the cream strands are the fungal network.</p>
    <table className="tbl prof" data-testid="soil-table"><thead><tr><th>Depth</th><th>Carbon %</th><th>Moisture</th><th>pH</th><th>N kg/ha</th></tr></thead><tbody>{soil.layers.map((l) => (<tr key={l.depthCm}><td>{l.depthCm} cm</td>
      <td><span className="bar"><i style={{ width: pct(l.organicCarbon / max.organicCarbon), background: "#92A85E" }} /></span>{f2(l.organicCarbon)}</td><td><span className="bar"><i style={{ width: pct(l.moisture / max.moisture), background: "#6fa8d8" }} /></span>{pct(l.moisture)}</td><td>{f1(l.ph)}</td><td>{l.nitrogen}</td></tr>))}</tbody></table>
    <p className="faint">Carbon in the top 30 cm: <b data-testid="soc30">{f2(soc30(soil))}%</b>. Plant-available water in the top metre: {availableWater(f.soilType, soil.layers.map((l) => l.moisture))} mm.</p>
    <h3>Go to a neighbouring field, underground</h3><div className="row2" data-testid="neighbours">{f.neighbours.map((n) => <button key={n} className="btn" onClick={() => go2(n)} data-testid={`go-${n}`}>{data.farm.fields.find((x) => x.id === n)!.name}</button>)}</div></section>);
}
function Water({ data }: { data: Data }) {
  const { s, f, soil } = useCtx(data), start = soil.layers.map((l) => l.moisture), reg = useMemo(() => runScenario(f, soil, PRESETS.regenerative, 10).projected.socEnd, [f, soil]);
  const a = rainEvent(f.soilType, soc30(soil), start, s.rain.mm, s.rain.hours), b = rainEvent(f.soilType, reg, start, s.rain.mm, s.rain.hours);
  const row = (k: string, x: number, y: number, u = "mm") => <tr><td>{k}</td><td data-testid={`w-${k}`}>{x} {u}</td><td>{y} {u}</td></tr>;
  return (<section aria-labelledby="h-water"><h2 id="h-water">Water · {f.name}</h2>
    <p className="lede">A steady storm on today's soil, beside the same storm after ten years of the regenerative practice. More carbon opens the soil: the same rain soaks in instead of running off.</p>
    <div className="row2"><label>Rain <input type="range" min={5} max={120} step={5} value={s.rain.mm} onChange={(e) => set({ rain: { ...s.rain, mm: Number(e.target.value), t: 0, playing: false } })} data-testid="rain-mm" /><output>{s.rain.mm} mm/h</output></label>
      <label>Hours <input type="range" min={1} max={12} step={1} value={s.rain.hours} onChange={(e) => set({ rain: { ...s.rain, hours: Number(e.target.value), t: 0, playing: false } })} data-testid="rain-hours" /><output>{s.rain.hours} h</output></label></div>
    <div className="row2"><button className="btn primary" onClick={() => set({ rain: { ...s.rain, t: 0, playing: true } })} data-testid="rain-play">Play the storm</button><button className="btn" onClick={() => set({ rain: { ...s.rain, t: 1, playing: false } })}>Show the end</button></div>
    <table className="tbl" data-testid="water-table"><thead><tr><th></th><th>Now ({f2(soc30(soil))}% C)</th><th>After 10 y ({f2(reg)}% C)</th></tr></thead><tbody>{row("Capacity", a.capacityMmH, b.capacityMmH, "mm/h")}{row("Infiltrated", a.infiltratedMm, b.infiltratedMm)}{row("Runoff", a.runoffMm, b.runoffMm)}{row("Drained", a.drainedMm, b.drainedMm)}{row("Available water", availableWater(f.soilType, a.moisture), availableWater(f.soilType, b.moisture))}</tbody></table>
    <p className="faint">Rain total {a.rainMm} mm. Moisture by layer is shown in the block as blue bands growing with the storm.</p></section>);
}
function Carbon({ data }: { data: Data }) {
  const { s, f, soil, draft } = useCtx(data), cur = currentPractice(f), hist = soil.socHistory, W = 520, H = 220, x0 = 2021, x1 = 2036, y1 = 4.2;
  const sc = runScenario(f, soil, draft, 10), cc = runScenario(f, soil, cur, 10), X = (y: number) => 30 + ((y - x0) / (x1 - x0)) * (W - 50), Y = (v: number) => H - 24 - (v / y1) * (H - 44);
  const path = (pts: { year: number; soc: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${X(p.year).toFixed(1)},${Y(p.soc).toFixed(1)}`).join(" ");
  const twigs = (pts: { year: number; soc: number }[], dir: number) => pts.filter((_, i) => i % 2 === 1).map((p, i) => <path key={p.year} className="twig" style={{ animationDelay: `${0.6 + i * 0.12}s` }} d={`M${X(p.year)},${Y(p.soc)} l${5 * dir},${12 + (i % 3) * 3}`} pathLength={1} />);
  const setD = (p: Partial<Practice>) => set({ draft: { ...draft, ...p } }), key = `${s.fieldId}|${JSON.stringify(draft)}`;
  return (<section aria-labelledby="h-carbon"><h2 id="h-carbon">Carbon · {f.name}</h2>
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Soil carbon in ${f.name}: ${f2(cc.projected.soc0)} percent now, ${f2(cc.projected.socEnd)} in 2036 on the current practice, ${f2(sc.projected.socEnd)} with the scenario`} data-testid="carbon-chart" key={key}>
      {[0, 1, 2, 3, 4].map((v) => <g key={v}><line x1="30" x2={W - 20} y1={Y(v)} y2={Y(v)} className="grid" /><text x="4" y={Y(v) + 4} className="ax">{v}%</text></g>)}{[2021, 2026, 2031, 2036].map((y) => <text key={y} x={X(y)} y={H - 6} className="ax" textAnchor="middle">{y}</text>)}
      <line x1={X(2026)} x2={X(2026)} y1="10" y2={H - 24} className="now" />
      <path d={path(hist)} className="root hist" pathLength={1} /><path d={path(cc.projected.socSeries)} className="root cur" pathLength={1} /><path d={path(sc.projected.socSeries)} className="root scn" pathLength={1} />{twigs(sc.projected.socSeries, 1)}{twigs(cc.projected.socSeries, -1)}</svg>
    <p className="legend"><i className="k hist" /> measured 2021-25 <i className="k cur" /> current practice <i className="k scn" /> scenario</p>
    <dl className="spec"><div><dt>2036, current practice</dt><dd data-testid="soc-cur">{f2(cc.projected.socEnd)}%</dd></div><div><dt>2036, scenario</dt><dd data-testid="soc-scn">{f2(sc.projected.socEnd)}%</dd></div><div><dt>Health 2036, current</dt><dd>{cc.projected.healthEnd}</dd></div><div><dt>Health 2036, scenario</dt><dd data-testid="health-scn">{sc.projected.healthEnd}</dd></div></dl>
    <div className="row2"><label>Tillage <select value={draft.tillage} onChange={(e) => setD({ tillage: e.target.value as Practice["tillage"] })} data-testid="sc-tillage"><option value="conventional">Conventional</option><option value="no-till">No-till</option></select></label>
      <label className="chk"><input type="checkbox" checked={draft.cover} onChange={(e) => setD({ cover: e.target.checked })} data-testid="sc-cover" /> Cover crop</label><label className="chk"><input type="checkbox" checked={draft.compost} onChange={(e) => setD({ compost: e.target.checked })} data-testid="sc-compost" /> Compost</label></div>
    <div className="row2"><button className="btn" onClick={() => set({ draft: { ...PRESETS.regenerative } })} data-testid="preset-regen">Regenerative preset</button><button className="btn" onClick={() => set({ draft: { ...PRESETS.monoculture } })}>Monoculture preset</button>
      <button className="btn primary" onClick={() => { set({ applied: { ...s.applied, [f.id]: draft }, showProjected: true }); go("farm"); }} data-testid="apply">Apply to {f.name} and see the farm</button></div>
    <p className="faint">First-order model with invented parameters: it shows direction and rough size, not a forecast.</p></section>);
}
function Rotation({ data }: { data: Data }) {
  const { f, soil, draft } = useCtx(data), v = validateRotation(draft.rotation), sc = scoreRotation(draft.rotation), errs = validatePractice(draft), out = runScenario(f, soil, draft, 10), slot = (i: number) => `Year ${Math.floor(i / 2) + 1} ${i % 2 ? "autumn" : "spring"}`;
  return (<section aria-labelledby="h-rot"><h2 id="h-rot">Crop rotation · {f.name}</h2><p className="lede">Eight seasons over four years. The same crop twice in a row, or two brassicas, is refused; a rotation with no legume is allowed but warned about.</p>
    <div className="slots" data-testid="slots">{draft.rotation.map((c, i) => (<label key={i}>{slot(i)}<select value={c} onChange={(e) => { const r = [...draft.rotation]; r[i] = e.target.value; set({ draft: { ...draft, rotation: r } }); }} data-testid={`slot-${i}`}>{CROPS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>))}</div>
    {v.errors.map((e) => <p key={e} className="warn" role="alert" data-testid="rot-error">{e}</p>)}{v.warnings.map((w) => <p key={w} className="note" data-testid="rot-warning">{w}</p>)}
    <dl className="spec"><div><dt>Diversity</dt><dd data-testid="diversity">{pct(sc.diversity)}</dd></div><div><dt>Nitrogen balance</dt><dd data-testid="nbal">{sc.nBalance > 0 ? "+" : ""}{sc.nBalance} kg/ha</dd></div><div><dt>Legume seasons</dt><dd>{sc.legumeSeasons}</dd></div><div><dt>Carbon in 2036</dt><dd>{errs.length ? "n/a" : f2(out.projected.socEnd) + "%"}</dd></div></dl>
    <div className="row2"><button className="btn" onClick={() => set({ draft: { ...draft, rotation: [...PRESETS.regenerative.rotation] } })} data-testid="rot-regen">Regenerative rotation</button><button className="btn" onClick={() => set({ draft: { ...draft, rotation: [...currentPractice(f).rotation] } })}>This field's current rotation</button></div>
    <p className="faint">{SLOTS} seasons. Crops, nitrogen fixation and carbon inputs are invented demo values.</p></section>);
}
function Biodiversity({ data }: { data: Data }) {
  const { s } = useCtx(data); const rows = data.farm.fields.map((f) => { const sc = scoreRotation(s.applied[f.id]?.rotation ?? f.rotation); return { f, edge: edgeFraction(f), score: habitatScore(f, sc.diversity) }; }).sort((a, b) => b.score - a.score);
  return (<section aria-labelledby="h-bio"><h2 id="h-bio">Biodiversity</h2><p className="lede">Habitat score blends how much of each field's edge is hedgerow (it saturates at half the perimeter) with the diversity of its rotation. On the map the outlines glow with the edge share.</p>
    <table className="tbl" data-testid="bio-table"><thead><tr><th>Field</th><th>Hedgerow</th><th>Habitat</th></tr></thead><tbody>{rows.map((r) => (<tr key={r.f.id} className={r.f.id === s.fieldId ? "on" : ""}><td><button className="link" onClick={() => set({ fieldId: r.f.id })}>{r.f.name}</button></td><td>{pct(r.edge)} of {Math.round(r.f.perimeterM)} m</td><td data-testid={`hab-${r.f.id}`}><Swatch h={r.score * 100} />{f2(r.score)}</td></tr>))}</tbody></table></section>);
}

export default function Panels({ data }: { data: Data }) {
  const s = useStore(), idx = VIEWS.findIndex((v) => v.id === s.view), V = s.view;
  return (
    <div className="ui" data-testid="hud">
      <header className="top"><span className="brand">MYCELIA</span><div className="seasons" role="radiogroup" aria-label="Season">{SEASONS.map((x: Season) => <button key={x} role="radio" aria-checked={s.season === x} className={s.season === x ? "on" : ""} onClick={() => set({ season: x })} data-testid={`season-${x}`}>{SEASON[x].label}</button>)}</div>
        <button className="btn ghost" aria-pressed={s.pauseMotion} onClick={() => set({ pauseMotion: !s.pauseMotion })} data-testid="pause-motion">{s.pauseMotion ? "Resume motion" : "Pause motion"}</button></header>
      <nav className="rail" aria-label="Views"><svg className="trunk" width="14" height={VIEWS.length * 64} aria-hidden><path d={`M7,10 L7,${VIEWS.length * 64 - 10}`} /></svg>{VIEWS.map((v, i) => (<button key={v.id} className={i === idx ? "on" : ""} aria-current={i === idx ? "page" : undefined} onClick={() => go(v.id)} data-testid={`nav-${v.id}`}><i /><b>{v.label}</b><small>{v.blurb}</small></button>))}</nav>
      <main className={`panel ${s.reduced ? "" : "grow-in"}`} key={V} tabIndex={-1}>
        {V === "farm" && <Farm data={data} />}{V === "soil" && <Soil data={data} />}{V === "water" && <Water data={data} />}{V === "carbon" && <Carbon data={data} />}{V === "rotation" && <Rotation data={data} />}{V === "biodiversity" && <Biodiversity data={data} />}
      </main>
    </div>
  );
}
void infiltrationCapacity; void projectSOC; void LAYERS_CM;
