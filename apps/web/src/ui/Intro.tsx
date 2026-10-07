"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { live, set, state, useStore } from "../store";

// Steps (blueprint section 3): 0 dry cracked field, 1 the raindrop falls into a crack, 2 roots, channels and the living network, 3 the network branches into the wordmark,
// 4 pull back: the network becomes property boundaries and field links, 5 the map's panels grow in from the farm's centre.
const CAP = ["A dry field. One crack.", "", "Roots, water channels, and a network that was always there.", "The network spells its name.", "Pull back: the strands are the field boundaries, and the links between neighbours.", ""];
export default function Intro() {
  const s = useStore(), tl = useRef<gsap.core.Timeline | null>(null), [cap, setCap] = useState(""); const root = document.documentElement;
  const finish = () => { tl.current?.kill(); Object.assign(live, { grow: 1, m1: 1, m2: 1, block: 0, fieldsK: 1, drop: -1, groundK: 1 }); live.cam.set(0, 40, 36); live.look.set(0, 0, 0); root.style.setProperty("--grow", "4000px"); set({ introDone: true, introStep: 99 }); };
  useEffect(() => {
    if (state.reduced) return; gsap.ticker.lagSmoothing(0);
    Object.assign(live, { grow: 0, m1: 0, m2: 0, block: 0, fieldsK: 0, drop: -1, groundK: 1 }); live.cam.set(9, 12, 34); live.look.set(1.5, 0, 6); live.dropPos.set(1.5, 7, 6); root.style.setProperty("--grow", "0px");
    const t = gsap.timeline({ defaults: { ease: "power1.inOut" }, onComplete: finish }); tl.current = t; const step = (n: number) => () => { set({ introStep: n }); setCap(CAP[n]); };
    t.call(step(0), [], 0).to(live.cam, { x: 4, y: 7, z: 17, duration: 3.2, ease: "power1.out" }, 0).to(live.look, { x: 1.5, y: 0, z: 6, duration: 3.2 }, 0)
      .call(step(1), [], 2.4).set(live, { drop: 0 }, 2.4).to(live.dropPos, { y: 0.1, duration: 1.0, ease: "power2.in" }, 2.4)
      .to(live.dropPos, { y: -5, z: 6, duration: 2.4, ease: "power1.out" }, 3.4).to(live.cam, { x: 2.2, y: -1.5, z: 9.5, duration: 2.8 }, 3.4).to(live.look, { x: 1.5, y: -4, z: 5.5, duration: 2.8 }, 3.4)
      .to(live, { block: 0.35, duration: 2 }, 3.6).to(live, { grow: 0.35, duration: 2 }, 4)
      .call(step(2), [], 6.2).set(live, { drop: -1 }, 6.2).to(live, { grow: 1, duration: 4.5, ease: "power1.out" }, 6.2)
      .to(live.cam, { x: -3, y: -4.5, z: 2, duration: 4.5 }, 6.2).to(live.look, { x: 4, y: -6, z: -3, duration: 4.5 }, 6.2)
      .to(live.cam, { x: 5, y: -3.5, z: -2.5, duration: 3.4, ease: "sine.inOut" }, 10.7).to(live.look, { x: -2, y: -6.5, z: 2, duration: 3.4 }, 10.7)
      .call(step(3), [], 14.1).to(live, { m1: 1, duration: 3.2, ease: "power2.inOut" }, 14.1).to(live.cam, { x: 0, y: 7, z: 22, duration: 3.4, ease: "power2.inOut" }, 14.1).to(live.look, { x: 0, y: 8, z: 0, duration: 3.4 }, 14.1).to(live, { block: 0.1, duration: 2 }, 14.1)
      .call(step(4), [], 18.2).to(live, { m2: 1, duration: 3.0, ease: "power2.inOut" }, 18.2).to(live, { fieldsK: 1, duration: 2.4, ease: "power2.out" }, 19).to(live, { block: 0, duration: 1.5 }, 18.2)
      .to(live.cam, { x: 0, y: 40, z: 36, duration: 3.2, ease: "power2.inOut" }, 18.2).to(live.look, { x: 0, y: 0, z: 0, duration: 3.2 }, 18.2)
      .call(step(5), [], 21.5).to({ v: 0 }, { v: 4000, duration: 1.8, ease: "power2.in", onUpdate() { root.style.setProperty("--grow", `${(this.targets()[0] as { v: number }).v}px`); } }, 21.5);
    return () => { t.kill(); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = () => { const t = tl.current; if (t && t.time() < 18.2) t.seek(18.2); else finish(); };
  if (s.introDone) return null;
  if (s.reduced) { const fr = [["Dry ground", "A cracked field under muted sun."], ["Underground", "A raindrop finds the crack: roots, water, a living network."], ["The name", "The network spells MYCELIA."], ["The map", "Its strands are the field boundaries, and the links between neighbours."]];
    return (<div className="intro intro-static" role="dialog" aria-label="Opening story" data-testid="intro"><ol>{fr.map(([a, b], i) => <li key={i}><b>{a}</b> {b}</li>)}</ol><button className="btn primary" onClick={finish} data-testid="skip-intro">Enter the farm</button></div>); }
  return (<div className="intro" data-testid="intro" data-step={s.introStep}><p className="caption" role="status">{cap}</p><button className="btn skip" onClick={skip} data-testid="skip-intro" autoFocus>Skip intro</button></div>);
}
