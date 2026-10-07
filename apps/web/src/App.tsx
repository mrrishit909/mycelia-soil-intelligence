"use client";
import { useEffect, useState } from "react";
import { loadData, base, type Data } from "./data";
import { set, state, useStore, VIEWS } from "./store";
import { SEASONS, type Season } from "@mycelia/domain";
import Intro from "./ui/Intro";
import Panels from "./ui/Panels";
import Scene from "./scene/Scene";
const webglOk = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2")); } catch { return false; } };
export default function App() {
  const s = useStore(); const [data, setData] = useState<Data | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search), rm = matchMedia("(prefers-reduced-motion: reduce)").matches || q.get("motion") === "reduced", view = VIEWS.find((v) => v.id === q.get("view"))?.id, skip = q.get("skip") === "1" || !!view;
    const season = SEASONS.find((x) => x === q.get("season")) as Season | undefined;
    set({ reduced: rm, pauseMotion: rm, gfx: q.get("gfx") === "off" || !webglOk() ? "poster" : "webgl", ...(view ? { view } : {}), ...(q.get("field") ? { fieldId: q.get("field")! } : {}), ...(season ? { season } : {}), ...(q.get("projected") === "1" ? { showProjected: true } : {}), ...(skip ? { introDone: true, introStep: 99 } : {}) });
    if (skip) document.documentElement.style.setProperty("--grow", "4000px");
    loadData().then(setData).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => { const f = () => { const v = VIEWS.find((x) => x.id === location.hash.slice(1)); if (v && v.id !== state.view) set({ prevView: state.view, view: v.id }); }; addEventListener("hashchange", f); f(); return () => removeEventListener("hashchange", f); }, []);
  if (err) return <div className="boot" role="alert">Could not load data: {err}</div>;
  if (!data) return <div className="boot" role="status">Waiting for rain…</div>;
  return (
    <div className="app" data-view={s.view} data-intro={s.introDone ? "done" : "running"} data-gfx={s.gfx} data-season={s.season}>
      {s.gfx === "webgl" ? <Scene data={data} /> : <div className="poster" style={{ backgroundImage: `url(${base}/posters/soil.png)` }} role="img" aria-label="Still of the soil cutaway: topsoil, subsoil and bedrock with three crop root systems and water channels" data-testid="poster" />}
      <div className="vignette" aria-hidden /><Panels data={data} />{!s.introDone && <Intro />}
    </div>
  );
}
