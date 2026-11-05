// v7.6 異空間（ゼロメア）：フィールドの周りの海を「宇宙空間」に見せる
// ・2D のマップ定義 def.space76 が true のフィールドだけ（いまは world_machine＝ゼロメア）。マップのタイル（水）は変えない＝通行・乗り物・セーブは同じ
// ・空（LightingManager の空の球）と水面（のぞき窓）で、同じ星空の関数（見る向き＝カメラから画素への向き）を描く → 境目が見えない
// ・星（3段の大きさ・またたき）・紫と青の星雲・空に大きな惑星と輪。水面の岸のそばは青白く光る縁（島が浮いて見える）
// ・浮かぶ岩（小島・結晶つき・上下にゆれる）を、岸から離れた所に少し置く
// ・GPU での実際の見た目は、作業環境のヘッドレス Chromium（ソフトウェア描画）で撮った画像でだけ確認（実機の GPU は未確認）
import * as THREE from 'three';

export const SPACE_GLSL = `
float s76h(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float s76n(vec3 x) { vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(s76h(i), s76h(i + vec3(1.0, 0.0, 0.0)), f.x), mix(s76h(i + vec3(0.0, 1.0, 0.0)), s76h(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(s76h(i + vec3(0.0, 0.0, 1.0)), s76h(i + vec3(1.0, 0.0, 1.0)), f.x), mix(s76h(i + vec3(0.0, 1.0, 1.0)), s76h(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
float s76fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * s76n(p); p *= 2.03; a *= 0.5; } return s; }
float s76stars(vec3 d, float sc, float th, float t) {
  vec3 p = d * sc; vec3 i = floor(p); vec3 f = fract(p) - 0.5; float h = s76h(i); if (h < th) return 0.0;
  vec3 o = vec3(s76h(i + 7.1), s76h(i + 3.3), s76h(i + 5.7)) - 0.5; float r = length(f - o * 0.5);
  float tw = 0.7 + 0.3 * sin(t * (1.3 + h * 3.0) + h * 40.0);
  return smoothstep(0.16, 0.0, r) * tw * (0.35 + 0.65 * (h - th) / (1.0 - th)); }
vec3 space76(vec3 d, float t) {
  d = normalize(d);
  float n = s76fbm(d * 2.1 + vec3(0.0, 0.0, t * 0.003)); float n2 = s76fbm(d * 4.2 + 11.0);
  vec3 c = mix(vec3(0.010, 0.010, 0.040), vec3(0.030, 0.020, 0.085), n);
  c += vec3(0.32, 0.10, 0.45) * pow(smoothstep(0.45, 0.85, n), 2.0) * 0.6;
  c += vec3(0.05, 0.26, 0.45) * pow(smoothstep(0.52, 0.9, n2), 2.0) * 0.5;
  float s = s76stars(d, 70.0, 0.90, t) + s76stars(d, 150.0, 0.93, t) * 0.75 + s76stars(d, 32.0, 0.975, t) * 1.5;
  c += mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.86, 0.72), s76h(floor(d * 70.0) + 2.0)) * s;
  return c; }
vec3 space76sky(vec3 d, float t) {
  d = normalize(d); vec3 c = space76(d, t);
  vec3 pd = normalize(vec3(-0.55, 0.30, -0.78)); float cd = dot(d, pd);
  if (cd > 0.9) {
    vec3 tU = normalize(cross(pd, vec3(0.0, 1.0, 0.0))); vec3 tV = cross(tU, pd);
    vec2 q = vec2(dot(d, tU), dot(d, tV)) / 0.12; float r2 = dot(q, q);
    vec2 rq = vec2(q.x * 0.94 + q.y * 0.34, (q.y * 0.94 - q.x * 0.34) * 3.4); float rr = length(rq);
    float ring = smoothstep(1.32, 1.42, rr) * smoothstep(2.15, 2.0, rr) * (0.6 + 0.4 * sin(rr * 38.0));
    if (r2 < 1.0) {
      vec3 nrm = vec3(q, sqrt(1.0 - r2)); float li = clamp(dot(nrm, normalize(vec3(0.65, 0.45, 0.6))), 0.0, 1.0);
      float band = s76n(vec3(q.x * 2.0, q.y * 9.0, 3.0)); vec3 pc = mix(vec3(0.30, 0.20, 0.52), vec3(0.78, 0.58, 0.86), band);
      c = pc * (0.05 + li * 0.95) + vec3(0.25, 0.35, 0.7) * pow(1.0 - nrm.z, 3.0) * 0.5;
      if (rq.y > 0.0) ring = 0.0;
    }
    c = mix(c, vec3(0.78, 0.72, 0.9) * 0.75, ring * 0.65);
  }
  return c; }
`;

// 水面（のぞき窓）の材質：色の r＝岸のそばの度合い（0〜1）
export function voidMaterial(time) {
  const m = new THREE.ShaderMaterial({
    vertexColors: true, fog: false,
    uniforms: { uTime: time },
    vertexShader: 'varying vec3 vW; varying float vRim; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vRim = color.r; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uTime; varying vec3 vW; varying float vRim;\n' + SPACE_GLSL +
      '\nvoid main(){ vec3 d = normalize(vW - cameraPosition); vec3 c = space76(d, uTime); float rim = smoothstep(0.02, 0.85, vRim); float wv = 0.65 + 0.35 * sin(vW.x * 1.7 + vW.z * 1.3 + uTime * 1.4);' +
      ' c += vec3(0.30, 0.55, 1.0) * rim * rim * 0.75 * wv + vec3(0.55, 0.30, 0.95) * rim * 0.22; gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}'
  });
  m.userData.keepGlow = true; m.name = 'space76_void'; return m;
}

// 浮かぶ岩（小島）：岸から 5 マス以上離れた水のマスから、ハッシュで選ぶ（最大 n 個）
export function floatingRocks(map, isWater, n, hash) {
  const g = new THREE.Group(); g.name = 'space76_rocks'; const animated = [];
  const W = map.w, H = map.h; const far = (x, z) => { for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) { const xx = x + dx, zz = z + dz; if (xx >= 0 && zz >= 0 && xx < W && zz < H && !isWater(xx, zz)) return false; } return true; };
  const rock = new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.95, flatShading: true });
  const top = new THREE.MeshStandardMaterial({ color: 0x5a6a5a, roughness: 1, flatShading: true });
  const crys = new THREE.MeshStandardMaterial({ color: 0x9ad8ff, emissive: 0x4ab8ff, emissiveIntensity: 1.6, roughness: 0.2 }); crys.userData.keepGlow = true;
  const cands = [];
  for (let z = 2; z < H - 2; z += 3) for (let x = 2; x < W - 2; x += 3) { if (!isWater(x, z) || !far(x, z)) continue; cands.push([x, z, hash(x, z)]); }
  cands.sort((a, b) => a[2] - b[2]);
  const picked = [];
  for (const c of cands) { if (picked.length >= n) break; if (picked.some((p) => Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) < 12)) continue; picked.push(c); }
  picked.forEach(([x, z, h], i) => {
    const s = 0.5 + (h * 7.31 % 1) * 1.1; const o = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 1.6 * s, 7, 2), rock); body.rotation.x = Math.PI; body.position.y = -0.8 * s; o.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.92 * s, 0.9 * s, 0.22 * s, 7), top); cap.position.y = 0.02; o.add(cap);
    if (i % 2 === 0) { const c1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 * s, 0), crys); c1.scale.set(0.7, 1.8, 0.7); c1.position.set(0.2 * s, 0.4 * s, -0.1 * s); o.add(c1); }
    o.position.set(x + 0.5, 0.6 + (h * 13.7 % 1) * 1.6, z + 0.5); o.rotation.y = h * 6.28;
    g.add(o); animated.push({ kind: 'bob', obj: o, base: o.position.y, ph: h * 6.28, amp: 0.18 });
  });
  return { group: g, animated, count: picked.length };
}
