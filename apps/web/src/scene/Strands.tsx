"use client";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { PTS, buildStrands } from "@mycelia/domain";
import type { Data } from "../data";
import { live, state } from "../store";

const VERT = /* glsl */ `
attribute vec3 aA; attribute vec3 aC; attribute vec3 aB; attribute vec2 aT;
uniform float uM1; uniform float uM2; uniform float uGrow; uniform float uTime; uniform float uPulse; uniform vec3 uBlock;
varying float vFade; varying float vPulse;
void main(){
  vec3 p = mix(mix(aA, aC, smoothstep(0.0,1.0,uM1)), aB, smoothstep(0.0,1.0,uM2));
  float vis = smoothstep(aT.y * 0.8, aT.y * 0.8 + 0.25, uGrow) * (1.0 - smoothstep(aT.x * 0.9, 1.0, 1.0 - (uGrow * 1.3 - aT.y * 0.8)) * 0.0);
  vFade = vis * (0.35 + 0.65 * (1.0 - aT.x * 0.6));
  vPulse = smoothstep(0.0, 0.15, 1.0 - abs(fract(uPulse - aT.y) - aT.x)) ;
  p += 0.04 * vec3(sin(uTime * 0.8 + aT.y * 40.0 + aT.x * 6.0), cos(uTime * 0.7 + aT.y * 31.0), sin(uTime * 0.6 + aT.y * 23.0)) * (1.0 - uM2);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FRAG = /* glsl */ `
uniform vec3 uColor; uniform vec3 uHot; uniform float uOpacity; varying float vFade; varying float vPulse;
void main(){ vec3 c = mix(uColor, uHot, clamp(vPulse, 0.0, 1.0)); gl_FragColor = vec4(c, vFade * uOpacity * (0.5 + 0.8 * vPulse)); if (gl_FragColor.a < 0.01) discard; }`;

export function useStrandData(data: Data, mask: { px: Uint8Array; w: number; h: number }) { return useMemo(() => buildStrands(data.guides, data.farm, mask.px, mask.w, mask.h, 900, 0.02), [data, mask]); }
export function wordmarkMask(): { px: Uint8Array; w: number; h: number } {
  const c = document.createElement("canvas"); c.width = 640; c.height = 160; const g = c.getContext("2d")!; g.fillStyle = "#000"; g.fillRect(0, 0, 640, 160); g.fillStyle = "#fff"; g.font = "800 128px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("MYCELIA", 320, 84);
  const d = g.getImageData(0, 0, 640, 160).data, px = new Uint8Array(640 * 160); for (let i = 0; i < px.length; i++) px[i] = d[i * 4]; return { px, w: 640, h: 160 };
}

/** One strand system. `mode` "world" morphs underground -> wordmark -> farm map with the intro; "block" stays in the underground arrangement (used inside the cutaway). */
export function Strands({ sets, mode }: { sets: ReturnType<typeof useStrandData>; mode: "world" | "block" }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), n = sets.count, idx: number[] = [];
    g.setAttribute("position", new THREE.BufferAttribute(sets.a, 3)); g.setAttribute("aA", new THREE.BufferAttribute(sets.a, 3)); g.setAttribute("aC", new THREE.BufferAttribute(sets.c, 3)); g.setAttribute("aB", new THREE.BufferAttribute(sets.b, 3)); g.setAttribute("aT", new THREE.BufferAttribute(sets.t, 2));
    for (let s = 0; s < n; s++) for (let k = 0; k < PTS - 1; k++) idx.push(s * PTS + k, s * PTS + k + 1); g.setIndex(idx); return g;
  }, [sets]);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uM1: { value: 0 }, uM2: { value: 0 }, uGrow: { value: 1 }, uTime: { value: 0 }, uPulse: { value: 0 }, uBlock: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color("#EFE5CB") }, uHot: { value: new THREE.Color("#E8C86A") }, uOpacity: { value: 0.8 } } }), []);
  useFrame((st) => {
    const u = mat.uniforms; u.uTime.value = state.pauseMotion ? 0 : st.clock.elapsedTime;
    if (mode === "world") { u.uM1.value = live.m1; u.uM2.value = live.m2; u.uGrow.value = live.grow; u.uOpacity.value = state.introDone ? (state.view === "farm" || state.view === "biodiversity" ? 0.5 : 0.12) : 0.85; }
    else { u.uM1.value = 0; u.uM2.value = 0; u.uGrow.value = 1; u.uOpacity.value = (state.view === "soil" || state.view === "water" || state.view === "carbon") && state.introDone ? 0.85 : 0; }
    const pa = (performance.now() / 1000 - state.pulseAt); u.uPulse.value = pa >= 0 && pa < 3 ? pa * 0.7 : -5;
  });
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

/** Nutrient particles riding the strands: positions come from three float textures so they follow the same morph. */
export function Nutrients({ sets, mode }: { sets: ReturnType<typeof useStrandData>; mode: "world" | "block" }) {
  const { geo, mat } = useMemo(() => {
    const n = sets.count, tex = (arr: Float32Array) => { const d = new Float32Array(n * PTS * 4); for (let i = 0; i < n * PTS; i++) { d[i * 4] = arr[i * 3]; d[i * 4 + 1] = arr[i * 3 + 1]; d[i * 4 + 2] = arr[i * 3 + 2]; d[i * 4 + 3] = 1; } const t = new THREE.DataTexture(d, PTS, n, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };
    const g = new THREE.BufferGeometry(), m = 2, pos = new Float32Array(n * m * 3), ph = new Float32Array(n * m * 2); for (let s = 0; s < n; s++) for (let j = 0; j < m; j++) { ph[(s * m + j) * 2] = s; ph[(s * m + j) * 2 + 1] = j / m + (s % 7) / 7; }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aS", new THREE.BufferAttribute(ph, 2));
    const mt = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { tA: { value: tex(sets.a) }, tC: { value: tex(sets.c) }, tB: { value: tex(sets.b) }, uM1: { value: 0 }, uM2: { value: 0 }, uTime: { value: 0 }, uOn: { value: 1 }, uGrow: { value: 1 } },
      vertexShader: `attribute vec2 aS; uniform sampler2D tA; uniform sampler2D tC; uniform sampler2D tB; uniform float uM1; uniform float uM2; uniform float uTime; uniform float uGrow; varying float vA;
        vec3 at(float s, float f){ float k = clamp(f, 0.0, 7.999); float i = floor(k); float u = k - i; vec3 a0 = mix(mix(texelFetch(tA, ivec2(int(i), int(s)), 0).xyz, texelFetch(tC, ivec2(int(i), int(s)), 0).xyz, smoothstep(0.0,1.0,uM1)), texelFetch(tB, ivec2(int(i), int(s)), 0).xyz, smoothstep(0.0,1.0,uM2)); vec3 a1 = mix(mix(texelFetch(tA, ivec2(int(i)+1, int(s)), 0).xyz, texelFetch(tC, ivec2(int(i)+1, int(s)), 0).xyz, smoothstep(0.0,1.0,uM1)), texelFetch(tB, ivec2(int(i)+1, int(s)), 0).xyz, smoothstep(0.0,1.0,uM2)); return mix(a0, a1, u); }
        void main(){ float f = fract(uTime * 0.12 + aS.y) * 8.0; vec3 p = at(aS.x, f); vA = sin(3.14159 * f / 8.0) * smoothstep(0.0, 0.3, uGrow); gl_PointSize = 4.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform float uOn; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(1.0, 0.86, 0.45, (1.0 - r * 2.0) * vA * uOn); }` });
    return { geo: g, mat: mt };
  }, [sets]);
  useFrame((st) => { const u = mat.uniforms; u.uTime.value = state.pauseMotion ? 0 : st.clock.elapsedTime; if (mode === "world") { u.uM1.value = live.m1; u.uM2.value = live.m2; u.uGrow.value = live.grow; u.uOn.value = state.introDone ? 0.0 : 1; } else { u.uM1.value = 0; u.uM2.value = 0; u.uGrow.value = 1; u.uOn.value = (state.view === "soil" || state.view === "water" || state.view === "carbon") && state.introDone ? 1 : 0; } });
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={6} />;
}
