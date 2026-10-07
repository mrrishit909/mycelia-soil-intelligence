"use client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { CROPS, SEASON, activation, cropGrowth, fieldHealth, healthColor, hex, runScenario, currentPractice, edgeFraction, mulberry32, rainEvent, LAYERS_CM, SOIL, THICKNESS_CM } from "@mycelia/domain";
import type { Practice } from "@mycelia/schemas";
import type { Data } from "../data";
import { base, SCALE, toScene } from "../data";
import { live, set, state, useStore } from "../store";
import { Nutrients, Strands, useStrandData, wordmarkMask } from "./Strands";

const healthOf = (data: Data, id: string, projected: boolean) => {
  const f = data.farm.fields.find((x) => x.id === id)!, s = data.soils.find((x) => x.fieldId === id)!, soc = s.layers.filter((l) => l.depthCm <= 30).reduce((a, l, _, arr) => a + l.organicCarbon / arr.length, 0);
  if (!projected) return fieldHealth(f, soc, s.layers[0].ph);
  const p: Practice = state.applied[id] ?? currentPractice(f); return runScenario(f, s, p, 10).projected.healthEnd;
};
const GROUND_FRAG = /* glsl */ `varying vec2 vUv; uniform vec3 uColor; uniform float uWet; uniform float uCracks; uniform float uA;
  vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)))) * 43758.5453); }
  void main(){ vec2 p = vUv * 46.0; vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0; for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){ vec2 g = vec2(float(x), float(y)); vec2 o = h2(i + g); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    float crack = smoothstep(0.06, 0.0, d2 - d1) * uCracks; vec3 c = mix(uColor, uColor * 0.35, uWet * 0.6); c = mix(c, vec3(0.03, 0.02, 0.015), crack); gl_FragColor = vec4(c, uA); }`;

function Ground() {
  const mat = useMemo(() => new THREE.ShaderMaterial({ transparent: true, vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: GROUND_FRAG, uniforms: { uColor: { value: new THREE.Color("#8a6b45") }, uWet: { value: 0 }, uCracks: { value: 1 }, uA: { value: 1 } } }), []);
  const target = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => { const s = state; target.set(SEASON[s.season].ground).multiplyScalar(0.55); const u = mat.uniforms; if (!s.introDone) { u.uColor.value.set("#8a6b45"); u.uCracks.value = 1; } else { u.uColor.value.lerp(target, 1 - Math.exp(-dt * 3)); u.uCracks.value += ((s.view === "farm" ? 0 : 0.15) - u.uCracks.value) * 0.05; } if (s.introDone) live.groundK += ((s.view === "water" || s.view === "soil" || s.view === "carbon" ? 0.1 : 1) - live.groundK) * 0.1; u.uWet.value = live.rainK; u.uA.value = live.groundK; });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={mat}><planeGeometry args={[220, 220]} /></mesh>;
}

function Fields({ data }: { data: Data }) {
  const refs = useRef<Record<string, THREE.Mesh | null>>({}), outl = useRef<Record<string, THREE.Line | null>>({}), heights = useRef<Record<string, number>>({});
  const geos = useMemo(() => Object.fromEntries(data.farm.fields.map((f) => { const sh = new THREE.Shape(f.polygon.map(([x, y]) => new THREE.Vector2((x - data.farm.extent.w / 2) * SCALE, (y - data.farm.extent.h / 2) * SCALE))); const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return [f.id, g]; })), [data]);
  const lines = useMemo(() => Object.fromEntries(data.farm.fields.map((f) => { const pts = f.polygon.map(([x, y]) => { const [a, b] = toScene(x, y, data.farm); return new THREE.Vector3(a, 0, b); }); pts.push(pts[0].clone()); return [f.id, new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: "#EFE5CB", transparent: true, opacity: 0.5 }))]; })), [data]);
  const col = useMemo(() => new THREE.Color(), []), graph = useMemo(() => Object.fromEntries(data.farm.fields.map((f) => [f.id, f.neighbours])), [data]);
  useFrame((st, dt) => {
    const s = state, tNow = performance.now() / 1000 - s.activationAt;
    const act = s.sources.length ? activation(graph, s.sources, tNow) : {};
    for (const f of data.farm.fields) {
      const m = refs.current[f.id]; if (!m) continue; const h = healthOf(data, f.id, s.showProjected), mt = m.material as THREE.MeshStandardMaterial;
      const match = (!s.filterCrop || f.crop === s.filterCrop) && h >= s.minHealth, tgtH = (0.25 + h * 0.012) * live.fieldsK, sel = f.id === s.fieldId && s.introDone;
      heights.current[f.id] = (heights.current[f.id] ?? 0) + (tgtH - (heights.current[f.id] ?? 0)) * (s.reduced ? 1 : 1 - Math.exp(-dt * 4)); m.scale.y = Math.max(0.001, heights.current[f.id]);
      const c = healthColor(h); mt.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); const a = (act[f.id] ?? 0) * (match ? 1 : 0); mt.emissive.set("#E8C86A"); mt.emissiveIntensity = a * 0.7 + (sel ? 0.18 + (s.pauseMotion ? 0 : 0.06 * Math.sin(st.clock.elapsedTime * 2)) : 0);
      const op = (s.view === "soil" || s.view === "water" || s.view === "carbon") && s.introDone ? (sel ? 0 : 0.25) : match || (!s.sources.length && !s.filterCrop && s.minHealth === 0) ? 1 : 0.35; mt.opacity += (op - mt.opacity) * 0.2; mt.depthWrite = mt.opacity > 0.9; m.visible = live.fieldsK > 0.01;
      const ln = outl.current[f.id]; if (ln) { const bio = s.view === "biodiversity"; const e = edgeFraction(f); (ln.material as THREE.LineBasicMaterial).color.set(bio ? hex(healthColor(30 + e * 140)) : "#EFE5CB"); (ln.material as THREE.LineBasicMaterial).opacity = bio ? 0.95 : sel ? 0.9 : 0.35; ln.position.y = heights.current[f.id] + 0.02; ln.visible = live.fieldsK > 0.01; void col; }
    }
  });
  return (<>{data.farm.fields.map((f) => (<group key={f.id}><mesh ref={(m) => { refs.current[f.id] = m; }} geometry={geos[f.id]} scale={[1, 0.001, 1]} onPointerDown={(e) => { if (state.introDone && state.view !== "soil" && state.view !== "water" && state.view !== "carbon") { e.stopPropagation(); set({ fieldId: f.id }); } }}><meshStandardMaterial transparent roughness={0.9} /></mesh><primitive object={lines[f.id]} ref={(l: THREE.Line) => { outl.current[f.id] = l; }} /></group>))}</>);
}

function Crops({ data }: { data: Data }) {
  const ref = useRef<THREE.InstancedMesh>(null), N = 40, tmp = useMemo(() => new THREE.Object3D(), []), spots = useMemo(() => { const r = mulberry32(5); return data.farm.fields.map((f) => Array.from({ length: N }, () => { const u = r(), v = r(), [a, b, c, d] = f.polygon.map(([x, y]) => toScene(x, y, data.farm)); const p1 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], p2 = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u]; return [p1[0] + (p2[0] - p1[0]) * v, p1[1] + (p2[1] - p1[1]) * v] as [number, number]; })); }, [data]);
  const cur = useRef<number[]>(data.farm.fields.map(() => 0)), colour = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => {
    const m = ref.current; if (!m) return; const s = state;
    data.farm.fields.forEach((f, fi) => { const crop = CROPS.find((c) => c.id === f.crop)!, g = cropGrowth(f.crop, s.season) * crop.heightM * live.fieldsK * (s.view === "soil" || s.view === "water" || s.view === "carbon" ? (f.id === s.fieldId ? 0 : 0.3) : 1) * (s.introDone ? 1 : 0); cur.current[fi] += (g - cur.current[fi]) * (s.reduced ? 1 : 1 - Math.exp(-dt * 2));
      const top = (0.25 + healthOf(data, f.id, s.showProjected) * 0.012) * live.fieldsK; spots[fi].forEach(([x, z], k) => { tmp.position.set(x, top, z); tmp.scale.set(0.16, Math.max(0.001, cur.current[fi] * 2.2), 0.16); tmp.updateMatrix(); m.setMatrixAt(fi * N + k, tmp.matrix); colour.set(crop.family === "legume" ? "#92A85E" : crop.family === "cereal" ? "#E8C86A" : crop.family === "brassica" ? "#d9c94e" : "#536B3C"); m.setColorAt(fi * N + k, colour); }); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, 12 * N]} frustumCulled={false}><coneGeometry args={[1, 1, 5]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>;
}

function Cutaway({ data, sets }: { data: Data; sets: ReturnType<typeof useStrandData> }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/soil-cutaway.glb`), root = useRef<THREE.Group>(null), model = useMemo(() => gltf.scene.clone(true), [gltf]);
  const mats = useMemo(() => { const m = new Map<string, THREE.MeshStandardMaterial>(); model.traverse((o) => { const x = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (x && x.name) { x.transparent = true; m.set(x.name, x); } }); return m; }, [model]);
  const wet = useRef<THREE.Mesh[]>([]), rain = useRef<THREE.Points>(null), tint = useMemo(() => new THREE.Color(), []);
  const wetMeshes = useMemo(() => LAYERS_CM.map((_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(19.6, 1, 13.4), new THREE.MeshBasicMaterial({ color: "#4a8fd0", transparent: true, opacity: 0, depthWrite: false })); const cum = THICKNESS_CM.slice(0, i).reduce((a, b) => a + b, 0), cy = -((cum + THICKNESS_CM[i] / 2) / 100) * 14; m.scale.y = (THICKNESS_CM[i] / 100) * 14; m.position.set(0, cy, -0.6); wet.current[i] = m; return m; }), []);
  const rainGeo = useMemo(() => { const g = new THREE.BufferGeometry(), n = 400, p = new Float32Array(n * 3), r = mulberry32(3); for (let i = 0; i < n; i++) { p[i * 3] = (r() - 0.5) * 19; p[i * 3 + 1] = r() * 16; p[i * 3 + 2] = (r() - 0.5) * 13; } g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g; }, []);
  const results = useRef<{ key: string; moist: number[][] }>({ key: "", moist: [] });
  useFrame((st, dt) => {
    const s = state, g = root.current!, f = data.farm.fields.find((x) => x.id === s.fieldId)!, [fx, fz] = toScene(f.centroid[0], f.centroid[1], data.farm), soilView = s.introDone && (s.view === "soil" || s.view === "water" || s.view === "carbon");
    const tp = s.introDone ? new THREE.Vector3(fx, 0, fz) : new THREE.Vector3(0, 0, 0), ts = s.introDone ? 0.56 : 1; live.blockPos.lerp(tp, s.reduced || !s.introDone ? 1 : 1 - Math.exp(-dt * 3)); live.blockScale += (ts - live.blockScale) * (s.introDone ? 1 - Math.exp(-dt * 3) : 1);
    g.position.copy(live.blockPos); g.scale.setScalar(live.blockScale);
    const op = !s.introDone ? live.block : soilView ? 0.5 : 0; for (const k of ["TopsoilMat", "SubsoilMat", "BedrockMat", "RockMat"]) { const m = mats.get(k); if (m) { m.opacity += (op - m.opacity) * 0.15; m.depthWrite = m.opacity > 0.9; } }
    g.visible = op > 0.01 || (mats.get("TopsoilMat")?.opacity ?? 0) > 0.01;
    // roots: only the crop family of the selected field; the others are hidden
    const fam = CROPS.find((c) => c.id === f.crop)?.family, want = fam === "legume" ? "legume" : fam === "brassica" ? "brassica" : "cereal";
    for (const k of ["cereal", "legume", "brassica"]) { const o = model.getObjectByName(`RootSystem_${k}`); if (o) o.visible = !s.introDone || k === want; }
    // layers coloured by carbon in the carbon view, by moisture in the water view
    const soil = data.soils.find((x) => x.fieldId === s.fieldId)!;
    ["Topsoil", "Subsoil"].forEach((n, i) => { const m = mats.get(n + "Mat"); if (m && s.introDone) { const l = soil.layers[i === 0 ? 1 : 3]; m.color.lerp(tint.setRGB(0.09 + l.organicCarbon * -0.01, 0.07 + l.organicCarbon * 0.006, 0.05), 0.1); } });
    // water: the moisture timeline for the current rain setting, animated by rain.t
    const key = `${s.fieldId}|${s.rain.mm}|${s.rain.hours}`; if (results.current.key !== key) { const soc = soil.layers.filter((l) => l.depthCm <= 30).reduce((a, l, _, arr) => a + l.organicCarbon / arr.length, 0), start = soil.layers.map((l) => l.moisture); results.current = { key, moist: [start, ...Array.from({ length: s.rain.hours }, (_, h) => rainEvent(f.soilType, soc, start, s.rain.mm, h + 1).moisture)] }; }
    const hr = Math.min(s.rain.hours, s.rain.t * s.rain.hours), i0 = Math.floor(hr), i1 = Math.min(s.rain.hours, i0 + 1), k = hr - i0;
    wetMeshes.forEach((m, i) => { const mo = results.current.moist[i0][i] * (1 - k) + results.current.moist[i1][i] * k, wp = SOIL[f.soilType].wp; m.visible = s.view === "water" && s.introDone; (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.min(0.45, (mo - wp) / 0.4)); });
    live.rainK += ((s.view === "water" && s.rain.t > 0 && s.rain.t < 1.02 ? 1 : 0) - live.rainK) * 0.05;
    if (rain.current) { rain.current.visible = s.view === "water" && s.introDone && s.rain.playing; const p = rain.current.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * (4 + (s.rain.mm / 120) * 14); if (y < 0) y += 16; p.setY(i, y); } p.needsUpdate = true; }
    void st;
  });
  useFrame((_, dt) => { if (state.rain.playing) { const t = state.rain.t + dt / (state.rain.hours * 1.6); if (t >= 1) set({ rain: { ...state.rain, t: 1, playing: false } }); else set({ rain: { ...state.rain, t } }); } });
  return (
    <group ref={root}>
      <primitive object={model} />{wetMeshes.map((m, i) => <primitive key={i} object={m} />)}
      <Strands sets={sets} mode="block" /><Nutrients sets={sets} mode="block" />
      <points ref={rain} geometry={rainGeo} position={[0, 0.3, 0]}><pointsMaterial color="#9ec6ff" size={0.12} transparent opacity={0.7} /></points>
    </group>
  );
}

function Links({ data }: { data: Data }) {
  const obj = useMemo(() => { const seen = new Set<string>(), pts: THREE.Vector3[] = [], pair: [string, string][] = []; for (const f of data.farm.fields) for (const n of f.neighbours) { const k = [f.id, n].sort().join(); if (seen.has(k)) continue; seen.add(k); const m = data.farm.fields.find((x) => x.id === n)!, [a, b] = toScene(f.centroid[0], f.centroid[1], data.farm), [c, d] = toScene(m.centroid[0], m.centroid[1], data.farm); pts.push(new THREE.Vector3(a, 1.7, b), new THREE.Vector3(c, 1.7, d)); pair.push([f.id, n]); }
    const g = new THREE.BufferGeometry().setFromPoints(pts); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pts.length * 3), 3)); return { line: new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })), pair }; }, [data]);
  const graph = useMemo(() => Object.fromEntries(data.farm.fields.map((f) => [f.id, f.neighbours])), [data]);
  useFrame(() => { const s = state, act = s.sources.length ? activation(graph, s.sources, performance.now() / 1000 - s.activationAt) : {}, c = obj.line.geometry.attributes.color as THREE.BufferAttribute; obj.pair.forEach(([a, b], i) => { const v = Math.min(act[a] ?? 0, act[b] ?? 0); for (let k = 0; k < 2; k++) c.setXYZ(i * 2 + k, 0.2 + 0.7 * v, 0.2 + 0.6 * v, 0.1 + 0.2 * v); }); c.needsUpdate = true; obj.line.visible = s.introDone && s.view === "farm"; });
  return <primitive object={obj.line} />;
}

function Drop() {
  const m = useRef<THREE.Mesh>(null); useFrame(() => { if (m.current) { m.current.visible = live.drop >= 0 && !state.introDone; m.current.position.copy(live.dropPos); } });
  return <mesh ref={m} visible={false}><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color="#bfe2ff" emissive="#6fb0ff" emissiveIntensity={1.4} transparent opacity={0.9} /></mesh>;
}

function Rig() {
  const { camera, size } = useThree(), cam = camera as THREE.PerspectiveCamera, want = useMemo(() => new THREE.Vector3(), []), look = useMemo(() => new THREE.Vector3(), []), cur = useRef({ p: new THREE.Vector3(0, 30, 30), l: new THREE.Vector3() });
  useFrame((_, dt) => {
    const s = state, data = (window as unknown as { __mData: Data }).__mData, f = data.farm.fields.find((x) => x.id === s.fieldId)!, [fx, fz] = toScene(f.centroid[0], f.centroid[1], data.farm), wide = size.width > 900;
    if (!s.introDone) { want.copy(live.cam); look.copy(live.look); } else {
      switch (s.view) {
        case "farm": want.set(0, 40, 36); look.set(0, 0, 0); break; case "biodiversity": want.set(0, 46, 9); look.set(0, 0, 0); break;
        case "soil": want.set(fx, -3.0, fz + 12.5); look.set(fx, -3.6, fz); break; case "water": want.set(fx + 6, 3.5, fz + 11); look.set(fx, -3, fz); break;
        case "carbon": want.set(fx, -3.0, fz + 12.5); look.set(fx, -3.6, fz); break; default: want.set(fx, 15, fz + 17); look.set(fx, 0, fz);
      }
    }
    const k = !s.introDone || s.reduced ? 1 : 1 - Math.exp(-dt * 2.2); cur.current.p.lerp(want, k); cur.current.l.lerp(look, k);
    cam.position.copy(cur.current.p); cam.lookAt(cur.current.l); cam.near = 0.1; cam.far = 600; cam.fov = 50;
    const shift = wide && s.introDone ? size.width * 0.1 : 0; cam.setViewOffset(size.width, size.height, shift, 0, size.width, size.height); cam.updateProjectionMatrix();
  });
  return null;
}
function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null), tmp = useMemo(() => new THREE.Color(), []);
  useFrame((_, dt) => { const l = sun.current; if (!l) return; const S = SEASON[state.season], e = (S.sunElevationDeg * Math.PI) / 180, k = 1 - Math.exp(-dt * 3); l.position.lerp(new THREE.Vector3(Math.cos(e) * 60, Math.sin(e) * 60, 25), k); l.color.lerp(tmp.set(S.sun), k); l.intensity += ((!state.introDone ? 1.6 : 2.4) - l.intensity) * 0.05; });
  return <><ambientLight intensity={0.55} color="#EFE5CB" /><directionalLight ref={sun} position={[40, 40, 25]} intensity={2} /><hemisphereLight args={["#92A85E", "#18140F", 0.5]} /></>;
}
function Lifecycle() {
  const { setFrameloop, gl } = useThree();
  useEffect(() => { const vis = () => setFrameloop(document.hidden ? "never" : "always"), lost = (e: Event) => { e.preventDefault(); set({ gfx: "poster" }); };
    document.addEventListener("visibilitychange", vis); gl.domElement.addEventListener("webglcontextlost", lost); (window as unknown as { __myceliaStats: () => unknown }).__myceliaStats = () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures });
    return () => { document.removeEventListener("visibilitychange", vis); gl.domElement.removeEventListener("webglcontextlost", lost); }; }, [setFrameloop, gl]);
  return null;
}

export default function Scene({ data }: { data: Data }) {
  useStore(); (window as unknown as { __mData: Data; __mLive: typeof live }).__mData = data; (window as unknown as { __mLive: typeof live }).__mLive = live;
  const mask = useMemo(() => wordmarkMask(), []), sets = useStrandData(data, mask);
  return (
    <Canvas className="stage" data-testid="stage" dpr={[1, 1.5]} camera={{ fov: 50, position: [0, 30, 30] }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl, scene }) => { gl.setClearColor("#18140F"); scene.fog = new THREE.FogExp2("#18140F", 0.004); }}>
      <Lights /><Rig /><Ground /><Fields data={data} /><Crops data={data} /><Links data={data} /><Cutaway data={data} sets={sets} /><Strands sets={sets} mode="world" /><Nutrients sets={sets} mode="world" /><Drop /><Lifecycle />
    </Canvas>
  );
}
