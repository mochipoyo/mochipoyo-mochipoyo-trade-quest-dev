/* =========================================================
   TerrainBuilder3D：2D版のタイル（GameMap.tiles）から地面・道・草・木・小物を組み立てる
   ・座標：タイル x → ワールド X、タイル y → ワールド Z、高さ → Y（1タイル＝1単位、タイル中心は +0.5）
   ・地面：1枚の格子（村の中は細かく、遠くほど粗く）。高さは heightAt() に一本化（キャラクターの足元も同じ関数）
   ・塗り分け：タイルから作った「スプラット」テクスチャ（石畳／土／畑／花の多い草地）＋ノイズで境界を崩す
   ・村の中（歩ける範囲）は平ら。外周の森→丘→遠くの山へ少しずつ高くなる。出口の道は外へ続く
   ・草：束（3枚の板）を GPU インスタンスで多数置き、風で揺らす。木・小物もインスタンス化し、区画（チャンク）ごとに分けて画面外を省く
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4, textTexture } from '../engine/Materials.js';
import { MODELS } from '../assets/manifest.js';

/* ---------- ノイズ ---------- */
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y, oct) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < (oct || 4); i++) { s += a * vnoise(x * f, y * f); n += a; f *= 2.03; a *= 0.5; } return s / n; }
function ridged(x, y) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)); n += a; f *= 2.1; a *= 0.5; } return Math.pow(s / n, 2.2); }
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function segDist(px, pz, s) { const dx = s.x1 - s.x0, dz = s.z1 - s.z0; const L = dx * dx + dz * dz; let t = L ? ((px - s.x0) * dx + (pz - s.z0) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); const x = s.x0 + dx * t, z = s.z0 + dz * t; return Math.hypot(px - x, pz - z); }
export function rngFrom(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// シェーダー用の周期ノイズ（256×256・タイル可能）
function noiseTexture() {
  const N = 256, data = new Uint8Array(N * N * 4);
  const per = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const H = (i, j) => hash2(((i % p) + p) % p, ((j % p) + p) % p); const a = H(xi, yi), b = H(xi + 1, yi), c = H(xi, yi + 1), d = H(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0, a = 0.5, n = 0; for (let o = 0; o < 5; o++) { const p = 8 << o; s += a * per(x / N * p, y / N * p, p); n += a; a *= 0.5; }
    const v = Math.round(s / n * 255); const i = (y * N + x) * 4; data[i] = v; data[i + 1] = Math.round(per(x / N * 32, y / N * 32, 32) * 255); data[i + 2] = Math.round(hash2(x, y) * 255); data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
// 草の葉（アルファつき）
function bladeTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128); const r = rngFrom(7);
  for (let i = 0; i < 34; i++) {
    const x = 6 + r() * 116, w = 3.5 + r() * 4.5, h = 50 + r() * 74, bend = (r() - 0.5) * 30;
    const grd = g.createLinearGradient(0, 128, 0, 128 - h); grd.addColorStop(0, '#4f7a2c'); grd.addColorStop(0.55, '#7fae3e'); grd.addColorStop(1, '#bfe06a');
    g.fillStyle = grd; g.beginPath(); g.moveTo(x - w, 128); g.quadraticCurveTo(x + bend * 0.4, 128 - h * 0.5, x + bend, 128 - h); g.quadraticCurveTo(x + bend * 0.4 + w * 0.3, 128 - h * 0.5, x + w, 128); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function flowerTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = '#3f6a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 64); g.quadraticCurveTo(30, 40, 32, 24); g.stroke();
  g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.ellipse(32 + Math.cos(a) * 8, 18 + Math.sin(a) * 8, 6, 4, a, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#ffd040'; g.beginPath(); g.arc(32, 18, 4.5, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const ROADLIKE = { road: 1, stone: 1, bld_door: 1, floor_stone: 1, bridge: 1 };
const TREE_TILES = { tree: 1, forest: 1 };

export class TerrainBuilder3D {
  constructor(mats, models, quality) { this.mats = mats; this.models = models; this.quality = quality || 'high'; this.noise = noiseTexture(); this.time = { value: 0 }; this.day = { value: 1 }; }

  async build(map) {
    const W = map.w, H = map.h, OUT = 22, R = 170;
    const hi = this.quality === 'high';
    const group = new THREE.Group(); group.name = 'terrain';
    const rnd = rngFrom(1234 + W * 31 + H);
    const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '_out' : map.tile(x, y);
    // ---- 出口の道（マップの端にあるワープ）を外へ延ばす
    const corridors = [];
    const edge = map.warps.filter((w) => w.x <= 1 || w.y <= 1 || w.x >= W - 2 || w.y >= H - 2);
    const groups = {};
    edge.forEach((w) => { const side = w.y >= H - 2 ? 'S' : w.y <= 1 ? 'N' : w.x <= 1 ? 'W' : 'E'; (groups[side] = groups[side] || []).push(w); });
    Object.keys(groups).forEach((side) => {
      const ws = groups[side]; const ax = ws.reduce((s, w) => s + w.x, 0) / ws.length + 0.5, az = ws.reduce((s, w) => s + w.y, 0) / ws.length + 0.5;
      const dx = side === 'E' ? 1 : side === 'W' ? -1 : 0, dz = side === 'S' ? 1 : side === 'N' ? -1 : 0;
      const half = side === 'S' || side === 'N' ? (Math.max(...ws.map((w) => w.x)) - Math.min(...ws.map((w) => w.x)) + 1) / 2 : (Math.max(...ws.map((w) => w.y)) - Math.min(...ws.map((w) => w.y)) + 1) / 2;
      // 少し曲がりながら外へ
      const pts = [[ax, az]]; let x = ax, z = az;
      for (let i = 1; i <= 5; i++) { x += dx * 5 + (dz ? (vnoise(i * 1.7, 3) - 0.5) * 3.2 : 0); z += dz * 5 + (dx ? (vnoise(i * 1.7, 9) - 0.5) * 3.2 : 0); pts.push([x, z]); }
      for (let i = 0; i < pts.length - 1; i++) corridors.push({ x0: pts[i][0], z0: pts[i][1], x1: pts[i + 1][0], z1: pts[i + 1][1], half, side });
    });
    this.corridors = corridors;
    const corrDist = (x, z) => { let d = 1e9; for (const c of corridors) d = Math.min(d, segDist(x, z, c) - c.half); return d; };
    // ---- 高さ
    const cx0 = 2, cz0 = 2, cx1 = W - 2, cz1 = H - 2;
    const outside = (x, z) => { const dx = Math.max(cx0 - x, 0, x - cx1), dz = Math.max(cz0 - z, 0, z - cz1); return Math.hypot(dx, dz); };
    const heightAt = (x, z) => {
      const d = outside(x, z); if (d <= 0.001) return 0;
      const cf = smooth(0.8, 4.5, corrDist(x, z));
      const k = smooth(0.4, 7.5, d);
      const hills = ((fbm(x * 0.06 + 3.1, z * 0.06 + 1.7) - 0.42) * 3.4 + d * 0.16);
      let h = k * Math.max(-0.1, hills) * (0.25 + 0.75 * cf);
      const m = smooth(24, 62, d); if (m > 0) h += m * (ridged(x * 0.017 + 4, z * 0.017 + 8) * 38 + 5 + fbm(x * 0.05, z * 0.05) * 4);
      return h;
    };
    this.heightAt = heightAt;

    // ---- 地面の格子（近くは細かく、遠くは粗く）
    const axis = (lo, hi_, min, max) => { const a = []; const st = hi ? 0.5 : 1; for (let v = lo; v <= hi_ + 1e-6; v += st) a.push(v); let v = lo, s = 1; while (v > min) { v -= s; s = Math.min(s * 1.35, 12); a.unshift(Math.max(v, min)); } v = hi_; s = 1; while (v < max) { v += s; s = Math.min(s * 1.35, 12); a.push(Math.min(v, max)); } return a; };
    const xs = axis(-OUT, W + OUT, W / 2 - R, W / 2 + R), zs = axis(-OUT, H + OUT, H / 2 - R, H / 2 + R);
    const nx = xs.length, nz = zs.length;
    const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; const x = xs[i], z = zs[j]; pos[k * 3] = x; pos[k * 3 + 1] = heightAt(x, z); pos[k * 3 + 2] = z; uv[k * 2] = x / 4; uv[k * 2 + 1] = z / 4; }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.userData.own = true;

    // ---- スプラット（4テクセル／タイル）：R=石畳 G=土 B=畑 A=花の多い草地
    const SP = 4, sx0 = -OUT, sz0 = -OUT, SW = (W + OUT * 2) * SP, SH = (H + OUT * 2) * SP;
    const sp = new Float32Array(SW * SH * 4);
    for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
      const x = sx0 + (i + 0.5) / SP, z = sz0 + (j + 0.5) / SP; const tx = Math.floor(x), tz = Math.floor(z); const t = T(tx, tz); const o = (j * SW + i) * 4;
      let r = 0, g = 0, b = 0, a = 0;
      if (t === '_out') {
        const cd = corrDist(x, z);
        if (cd < 0) { const along = Math.min(1, outside(x, z) / 16); r = 1 - smooth(0.25, 0.9, along); g = 1; }   // 外へ続く道：石畳 → 土の道
        else if (cd < 1.2) g = 0.7;
        else g = smooth(0.52, 0.75, fbm(x * 0.21, z * 0.21)) * 0.9;   // 森の地面（土が見える所）
        a = smooth(0.55, 0.7, fbm(x * 0.12 + 40, z * 0.12)) * 0.8;
      } else if (ROADLIKE[t]) { r = 1; }
      else if (t === 'crops') { b = 1; g = 0.5; }
      else if (t === 'bld_block') { g = 1; }
      else if (TREE_TILES[t]) { g = 0.55 + fbm(x * 0.3, z * 0.3) * 0.4; }
      else if (t === 'grass2' || t === 'flowerbed') a = 1;
      else if (t === 'well') { r = 0.9; }
      // 道や建物のまわりは踏み固められた土
      if (t !== '_out' && !ROADLIKE[t] && t !== 'bld_block') {
        let near = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = T(tx + dx, tz + dz); if (ROADLIKE[n]) near = Math.max(near, 0.42); if (n === 'bld_block' || n === 'bld_door') near = Math.max(near, 0.6); }
        g = Math.max(g, near * (0.6 + fbm(x * 0.9, z * 0.9) * 0.6));
      }
      sp[o] = r; sp[o + 1] = g; sp[o + 2] = b; sp[o + 3] = a;
    }
    // ぼかし（横・縦の箱フィルタ×2）
    const tmp = new Float32Array(sp.length);
    const blur = (src, dst, dx, dy, rad) => { for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) { for (let c = 0; c < 4; c++) { let s = 0, n = 0; for (let k = -rad; k <= rad; k++) { const ii = Math.min(SW - 1, Math.max(0, i + k * dx)), jj = Math.min(SH - 1, Math.max(0, j + k * dy)); s += src[(jj * SW + ii) * 4 + c]; n++; } dst[(j * SW + i) * 4 + c] = s / n; } } };
    blur(sp, tmp, 1, 0, 2); blur(tmp, sp, 0, 1, 2); blur(sp, tmp, 1, 0, 1); blur(tmp, sp, 0, 1, 1);
    const sp8 = new Uint8Array(sp.length); for (let i = 0; i < sp.length; i++) sp8[i] = Math.round(Math.max(0, Math.min(1, sp[i])) * 255);
    const splat = new THREE.DataTexture(sp8, SW, SH, THREE.RGBAFormat); splat.magFilter = THREE.LinearFilter; splat.minFilter = THREE.LinearFilter; splat.wrapS = splat.wrapT = THREE.ClampToEdgeWrapping; splat.needsUpdate = true;
    this.splatAt = (x, z) => { const i = Math.floor((x - sx0) * SP), j = Math.floor((z - sz0) * SP); if (i < 0 || j < 0 || i >= SW || j >= SH) return [0, 0, 0, 0]; const o = (j * SW + i) * 4; return [sp[o], sp[o + 1], sp[o + 2], sp[o + 3]]; };

    // ---- 地面のマテリアル（標準マテリアルを拡張して塗り分け）
    const M = this.mats; const tx = M.tex;
    const cobbleH = await new THREE.TextureLoader().loadAsync(M.base + 'textures/cobble_height.jpg').catch(() => null);
    if (cobbleH) { cobbleH.wrapS = cobbleH.wrapT = THREE.RepeatWrapping; }
    const mat = new THREE.MeshStandardMaterial({ map: tx.grass_albedo, normalMap: tx.grass_normal, roughness: 0.95, metalness: 0 });
    const U = { uSplat: { value: splat }, uSplatOrigin: { value: new THREE.Vector2(sx0, sz0) }, uSplatSize: { value: new THREE.Vector2(SW / SP, SH / SP) }, uNoise: { value: this.noise }, uDirt: { value: tx.dirt_albedo }, uDirtN: { value: tx.dirt_normal }, uCobble: { value: tx.cobble_albedo }, uCobbleN: { value: tx.cobble_normal }, uCobbleH: { value: cobbleH || this.noise }, uTime: this.time, uDay: this.day };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vSlope; varying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlope = objectNormal.y; vH = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSlope; varying float vH; uniform sampler2D uSplat, uNoise, uDirt, uDirtN, uCobble, uCobbleN, uCobbleH; uniform vec2 uSplatOrigin, uSplatSize; uniform float uTime, uDay;')
        .replace('#include <map_fragment>', `
          vec2 wp = vMapUv * 4.0;
          vec4 sp = texture2D(uSplat, (wp - uSplatOrigin) / uSplatSize);
          float n1 = texture2D(uNoise, wp * 0.031).r; float n2 = texture2D(uNoise, wp * 0.19).r; float n3 = texture2D(uNoise, wp * 0.011 + 0.3).g;
          vec3 gA = texture2D(map, wp / 3.1).rgb; vec3 gB = texture2D(map, wp / 7.3 + vec2(0.37, 0.11)).rgb;
          vec3 grass = mix(gA, gB, 0.42);
          grass *= mix(vec3(0.80, 0.93, 0.66), vec3(1.12, 1.06, 0.80), smoothstep(0.25, 0.75, n1));
          grass = mix(grass, grass * vec3(1.08, 1.12, 0.78), sp.a * 0.8);
          vec3 dirt = texture2D(uDirt, wp / 2.7).rgb * mix(0.85, 1.1, n2);
          float furrow = 0.75 + 0.25 * sin(wp.x * 6.2832 * 1.5);
          vec3 soil = texture2D(uDirt, wp / 1.6).rgb * vec3(0.55, 0.43, 0.34) * furrow;
          float hc = texture2D(uCobbleH, wp / 2.0).r;
          vec3 cob = texture2D(uCobble, wp / 2.0).rgb * mix(0.9, 1.08, n1);
          float wDirt = smoothstep(0.30, 0.62, sp.g + (n2 - 0.5) * 0.5);
          float wSoil = smoothstep(0.35, 0.6, sp.b + (n2 - 0.5) * 0.15);
          float wCob = smoothstep(0.42, 0.58, sp.r + (hc - 0.5) * 0.34 + (n2 - 0.5) * 0.12);
          float rock = smoothstep(0.86, 0.6, vSlope);
          vec3 col = mix(grass, dirt, wDirt);
          col = mix(col, soil, wSoil);
          col = mix(col, cob, wCob);
          col = mix(col, dirt * vec3(0.62, 0.6, 0.6) + vec3(0.04), rock);
          col = mix(col, vec3(0.9, 0.93, 0.98), smoothstep(26.0, 34.0, vH + n3 * 6.0));
          float cloud = smoothstep(0.48, 0.72, texture2D(uNoise, wp * 0.009 + vec2(uTime * 0.0035, uTime * 0.0016)).r);
          col *= 1.0 - cloud * 0.22 * uDay;
          diffuseColor *= vec4(col, 1.0);
        `)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(0.96, 0.9, wDirt), 0.78 - hc * 0.15, wCob);')
        .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', `
          vec3 nG = texture2D(normalMap, wp / 3.1).xyz * 2.0 - 1.0;
          vec3 nD = texture2D(uDirtN, wp / 2.7).xyz * 2.0 - 1.0;
          vec3 nC = texture2D(uCobbleN, wp / 2.0).xyz * 2.0 - 1.0;
          vec3 mapN = normalize(mix(mix(nG, nD, wDirt), nC * vec3(1.4, 1.4, 1.0), wCob));`);
    };
    mat.customProgramCacheKey = () => 'terrain-splat-v1';
    const ground = new THREE.Mesh(geo, mat); ground.receiveShadow = true; ground.castShadow = false; ground.name = 'ground'; group.add(ground);

    // ---- 区画（チャンク）
    const chunkKey = () => 'all';
    const buckets = new Map();   // key → { id → [Matrix4] }
    const put = (id, m, x, z) => { const k = chunkKey(x, z); if (!buckets.has(k)) buckets.set(k, {}); const b = buckets.get(k); (b[id] = b[id] || []).push(m); };

    // ---- 木（マップ内の木タイル＋外周の森）
    const isPassableTile = (t) => t !== '_out' && !TREE_TILES[t];
    const nearMapOpen = (x, z, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const t = T(Math.floor(x + dx), Math.floor(z + dz)); if (isPassableTile(t) && t !== 'bld_block') return true; } return false; };
    const pines = ['tree_pine_a', 'tree_pine_b', 'tree_pine_c'], oaks = hi ? ['tree_oak_a', 'tree_oak_b', 'tree_oak_c'] : ['tree_oak_a'];
    const exclude = this.exclude = [];   // 入口の門など木を置かない所 {x,z,r}
    const blockedByExclude = (x, z) => exclude.some((e) => Math.hypot(x - e.x, z - e.z) < e.r);
    this.trees = [];
    const placeTree = (x, z, inMap) => {
      if (corrDist(x, z) < 1.4 || blockedByExclude(x, z)) return;
      const y = heightAt(x, z);
      const pick = rnd(); const d = outside(x, z);
      const id = (inMap ? pick < 0.5 : pick < (d < 10 ? 0.28 : 0.12)) ? oaks[Math.floor(rnd() * oaks.length)] : pines[Math.floor(rnd() * pines.length)];
      const s = (0.78 + rnd() * 0.5) * (id.startsWith('tree_oak') ? 0.95 : 1.0) * (inMap ? 0.95 : 1.05);
      this.trees.push({ id, m: M4(x, y - 0.05, z, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.06, s), x, z, t: rnd() });
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = T(x, y);
      if (TREE_TILES[t]) { placeTree(x + 0.5 + (rnd() - 0.5) * 0.5, y + 0.5 + (rnd() - 0.5) * 0.5, true); if (!nearMapOpen(x + 0.5, y + 0.5, 1) && rnd() < 0.35) placeTree(x + rnd(), y + rnd(), true); }
    }
    const step = hi ? 1.3 : 1.8;
    for (let z = -OUT - 14; z < H + OUT + 14; z += step) for (let x = -OUT - 14; x < W + OUT + 14; x += step) {
      const px = x + (rnd() - 0.5) * step * 0.9, pz = z + (rnd() - 0.5) * step * 0.9;
      if (px >= 0 && pz >= 0 && px < W && pz < H) continue;
      const d = outside(px, pz); if (d > (hi ? 34 : 24)) continue;
      const clearing = fbm(px * 0.09 + 11, pz * 0.09 + 5); if (clearing < 0.36 && d > 4) continue;
      if (d > 16 && rnd() < 0.45) continue;
      placeTree(px, pz, false);
    }
    // ---- 小物（タイルの種類ごと）
    const props = []; const lampSpots = []; const chests = [];
    const roadDir = (x, y) => { let best = null; for (let r = 1; r <= 4 && !best; r++) for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { if (!best && ROADLIKE[T(x + dx * r, y + dz * r)]) best = [dx, dz]; } return best || [0, 1]; };
    const yawToward = (d) => Math.atan2(d[0], d[1]);   // モデルの +Z を d へ向ける
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = T(x, y); const cx = x + 0.5, cz = y + 0.5;
      switch (t) {
        case 'lamp': { const d = roadDir(x, y); const yaw = yawToward(d) - Math.PI / 2; put('lamppost', M4(cx, 0, cz, yaw), cx, cz); lampSpots.push({ pos: new THREE.Vector3(cx + d[0] * 0.5, 2.0, cz + d[1] * 0.5), color: 0xffb05a, power: 1.0, dist: 9 }); break; }
        case 'bench': { const d = roadDir(x, y); put('bench', M4(cx, 0, cz, yawToward(d)), cx, cz); break; }
        case 'well': put('well', M4(cx, 0, cz, 0, 0, 0, 0.62), cx, cz); break;
        case 'barrel': put('barrel', M4(cx + (rnd() - 0.5) * 0.15, 0, cz + (rnd() - 0.5) * 0.15, rnd() * 6.28), cx, cz); break;
        case 'crate': put('crate', M4(cx, 0, cz, rnd() * 0.6 - 0.3), cx, cz); if (rnd() < 0.5) put('crate', M4(cx + 0.05, 0.54, cz - 0.05, rnd() * 1.2, 0, 0, 0.7), cx, cz); break;
        case 'flowerbed': put('flowerbed', M4(cx, 0, cz, Math.floor(rnd() * 4) * Math.PI / 2), cx, cz); break;
        case 'crops': put('crops', M4(cx, 0.02, cz, 0, 0, 0, 1.0, 0.9 + rnd() * 0.3, 1.0), cx, cz); break;
        case 'sign': { const d = roadDir(x, y); put('sign', M4(cx, 0, cz, yawToward(d)), cx, cz); break; }
        case 'fence': {
          let hx = 0, hz = 0; for (const k of [-2, -1, 1, 2]) { if (T(x + k, y) === 'fence') hx++; if (T(x, y + k) === 'fence') hz++; }
          put('fence', M4(cx + (hz > hx ? 0 : 0.03), 0, cz, hz > hx ? Math.PI / 2 : 0), cx, cz); break;
        }
        case 'bush': put('bush_a', M4(cx, 0, cz, rnd() * 6.28, 0, 0, 0.95 + rnd() * 0.35), cx, cz); break;
        case 'tree_small': put(rnd() < 0.5 ? 'tree_oak_c' : 'tree_oak_b', M4(cx, 0, cz, rnd() * 6.28, 0, 0, 0.42 + rnd() * 0.1), cx, cz); break;
        case 'chest': case 'chest_open': chests.push({ x, y }); break;
        default: break;
      }
    }
    // 森の縁：岩・茂み
    for (let i = 0; i < (hi ? 220 : 90); i++) {
      const a = rnd() * Math.PI * 2; const px = W / 2 + Math.cos(a) * (W / 2 + 1 + rnd() * 14), pz = H / 2 + Math.sin(a) * (H / 2 + 1 + rnd() * 14);
      if (px > 1 && pz > 1 && px < W - 1 && pz < H - 1) continue; if (corrDist(px, pz) < 0.6 || blockedByExclude(px, pz)) continue;
      const id = rnd() < 0.55 ? 'bush_a' : (rnd() < 0.5 ? 'rock_a' : 'rock_b');
      put(id, M4(px, heightAt(px, pz) - 0.05, pz, rnd() * 6.28, 0, 0, 0.6 + rnd() * 0.8), px, pz);
    }
    this.buckets = buckets; this.put = put;
    return { group, heightAt, lampSpots, chests, corridors, splat, finalize: () => this.finalize(group, map) };
  }

  // 置き場所が全部決まってから（建物・門のぶんも put したあと）インスタンス化する
  async finalize(group, map) {
    const jobs = [];
    for (const [key, ids] of this.buckets) {
      for (const id of Object.keys(ids)) {
        const cast = !/^rock_|^bush_/.test(id);
        jobs.push(this.models.instanced(id, ids[id], { castShadow: cast }).then((g) => { g.name = 'chunk_' + key + '_' + id; group.add(g); }));
      }
    }
    await Promise.all(jobs);
    await this.buildTrees(group);
    this.buildGrass(group, map);
  }

  // ---- 木：1つの BatchedMesh に全種類（近景・遠景の2段階 LOD）を入れる → 描画1回（影も1回）、木ごとに画面外を省く
  async buildTrees(group) {
    const list = this.trees; if (!list.length) return;
    const ids = [...new Set(list.map((t) => t.id))];
    const geos = {}; let verts = 0;
    for (const id of ids) {
      const lodId = MODELS[id].lod;
      const g0 = (await this.models.partsOf(id))[0]; const g1 = lodId ? (await this.models.partsOf(lodId))[0] : null;
      if (!g0) continue; geos[id] = { g0: g0.geometry, g1: g1 ? g1.geometry : g0.geometry, mat: g0.material };
      verts += g0.geometry.attributes.position.count + (g1 ? g1.geometry.attributes.position.count : 0);
    }
    const mat = Object.values(geos)[0].mat;
    const bm = new THREE.BatchedMesh(list.length, verts, verts * 2, mat); bm.name = 'trees'; bm.castShadow = true; bm.receiveShadow = true; bm.sortObjects = false;
    const gid = {}; for (const id of Object.keys(geos)) gid[id] = { l0: bm.addGeometry(geos[id].g0), l1: bm.addGeometry(geos[id].g1) };
    const c = new THREE.Color();
    this.treeInst = [];
    for (const t of list) { const g = gid[t.id]; if (!g) continue; const iid = bm.addInstance(g.l1); bm.setMatrixAt(iid, t.m); c.setHSL(0.0, 0.0, 0.86 + t.t * 0.22); bm.setColorAt(iid, c); this.treeInst.push({ iid, x: t.x, z: t.z, g, lod: 1 }); }
    bm.computeBoundingSphere(); bm.computeBoundingBox();
    group.add(bm); this.treeBatch = bm;
  }
  // 主人公の近くの木だけ精細なモデルにする
  updateLod(focus) {
    if (!this.treeInst || !focus) return; const R = this.quality === 'high' ? 24 : 15; const R2 = R * R;
    if (this._lodAt && Math.abs(this._lodAt.x - focus.x) + Math.abs(this._lodAt.z - focus.z) < 1.5) return; this._lodAt = { x: focus.x, z: focus.z };
    for (const t of this.treeInst) { const dx = t.x - focus.x, dz = t.z - focus.z; const want = (dx * dx + dz * dz < R2) ? 0 : 1; if (want !== t.lod) { this.treeBatch.setGeometryIdAt(t.iid, want ? t.g.l1 : t.g.l0); t.lod = want; } }
  }

  // ---- 草の束（風で揺れる）と小さな花
  buildGrass(group, map) {
    const hi = this.quality === 'high'; const W = map.w, H = map.h;
    const rnd = rngFrom(99);
    const blade = this.bladeTex || (this.bladeTex = bladeTexture());
    const g1 = new THREE.PlaneGeometry(0.62, 0.42, 1, 2); g1.translate(0, 0.21, 0);
    const parts = []; for (let k = 0; k < 3; k++) { const g = g1.clone(); g.rotateY(k * Math.PI / 3); parts.push(g); }
    const clump = mergeSimple(parts); clump.userData.own = true;
    // 法線を上向きに（地面と同じ明るさで見える）
    const nrm = clump.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
    const mat = new THREE.MeshStandardMaterial({ map: blade, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 1, color: 0xffffff });
    const time = this.time;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time;
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float sway = sin(uTime * 1.9 + ip.x * 0.55 + ip.z * 0.35) * 0.5 + sin(uTime * 3.1 + ip.x * 1.3) * 0.25;
          transformed.x += sway * 0.09 * uv.y * uv.y; transformed.z += sway * 0.05 * uv.y * uv.y;
        #endif`);
    };
    mat.customProgramCacheKey = () => 'grass-v1';
    const per = hi ? 7 : 2.5; const CH = 16;
    const chunks = new Map();
    const add = (x, z, s, c) => { const k = Math.floor(x / CH) + ',' + Math.floor(z / CH); if (!chunks.has(k)) chunks.set(k, []); chunks.get(k).push([x, z, s, c]); };
    const col = new THREE.Color();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = map.tile(x, y); if (t !== 'grass' && t !== 'grass2') continue;
      const n = Math.floor(per * (t === 'grass2' ? 1.2 : 1) + rnd());
      for (let i = 0; i < n; i++) {
        const px = x + rnd(), pz = y + rnd(); const s = this.splatAt(px, pz); if (s[0] > 0.25 || s[1] > 0.5) continue;
        col.setHSL(0.2 + rnd() * 0.06, 0.25 + rnd() * 0.2, 0.62 + rnd() * 0.2);
        add(px, pz, 0.7 + rnd() * 0.65, col.clone());
      }
    }
    // 外周（森の手前）にも少し
    for (let i = 0; i < (hi ? 2600 : 700); i++) {
      const px = -6 + rnd() * (W + 12), pz = -6 + rnd() * (H + 12); if (px > 1 && pz > 1 && px < W - 1 && pz < H - 1) continue;
      const s = this.splatAt(px, pz); if (s[0] > 0.2) continue; col.setHSL(0.21 + rnd() * 0.04, 0.3, 0.52 + rnd() * 0.14); add(px, pz, 0.8 + rnd() * 0.6, col.clone());
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const [k, list] of chunks) {
      const mesh = new THREE.InstancedMesh(clump, mat, list.length);
      list.forEach(([x, z, s, c], i) => { e.set(0, rnd() * Math.PI, 0); q.setFromEuler(e); v.set(x, this.heightAt(x, z) - 0.02, z); sc.set(s, s * (0.8 + rnd() * 0.5), s); m4.compose(v, q, sc); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, c); });
      mesh.castShadow = false; mesh.receiveShadow = true; mesh.computeBoundingSphere(); mesh.name = 'grass_' + k; group.add(mesh);
    }
    // 花（花の多い草地・花壇の周り）
    const ftex = this.flowerTex || (this.flowerTex = flowerTexture());
    const fg = new THREE.PlaneGeometry(0.16, 0.22); fg.translate(0, 0.11, 0); const fg2 = fg.clone(); fg2.rotateY(Math.PI / 2); const fgeo = mergeSimple([fg, fg2]);
    const fn = fgeo.attributes.normal; for (let i = 0; i < fn.count; i++) fn.setXYZ(i, 0, 1, 0);
    const fmat = new THREE.MeshStandardMaterial({ map: ftex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    fmat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '')); };
    const flowers = [];
    const palette = [0xffffff, 0xffe066, 0xff8fb0, 0xc9a0ff, 0x8fc8ff, 0xff9a5a];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = map.tile(x, y); const near = t === 'grass2' ? 1 : 0; if (!near && !(t === 'grass' && rnd() < 0.12)) continue;
      const n = near ? (hi ? 7 : 3) : 1; for (let i = 0; i < n; i++) { const px = x + rnd(), pz = y + rnd(); const s = this.splatAt(px, pz); if (s[0] > 0.2 || s[1] > 0.45) continue; flowers.push([px, pz, palette[Math.floor(rnd() * palette.length)]]); }
    }
    if (flowers.length) {
      const fm = new THREE.InstancedMesh(fgeo, fmat, flowers.length); const c = new THREE.Color();
      flowers.forEach(([x, z, h], i) => { e.set(0, rnd() * Math.PI, 0); q.setFromEuler(e); const s = 0.8 + rnd() * 0.6; v.set(x, this.heightAt(x, z), z); sc.set(s, s, s); m4.compose(v, q, sc); fm.setMatrixAt(i, m4); fm.setColorAt(i, c.setHex(h)); });
      fm.castShadow = false; fm.receiveShadow = true; fm.computeBoundingSphere(); fm.name = 'flowers'; group.add(fm);
    }
  }

  // ---- 村の入口の門（出口の道の上）
  gate(group, name) {
    const S = this.corridors.filter((c) => c.side === 'S'); if (!S.length) return;
    const c = S[0]; const x = c.x0, z = c.z0 - 0.7; const half = c.half + 0.35;
    const M = this.mats; const b = new Batch(); const timber = M.get('timber'), stone = M.get('stonewall'), roof = M.roof('#7a4a32');
    for (const sx of [-1, 1]) {
      b.add(stone, box(0.7, 0.5, 0.7, 1), M4(x + sx * half, 0.25, z));
      b.add(timber, box(0.32, 3.4, 0.32, 1), M4(x + sx * half, 0.5 + 1.7, z));
      b.add(timber, box(0.14, 1.3, 0.14, 1), M4(x + sx * (half - 0.5), 3.1, z, 0, 0, sx * 0.75));
      this.exclude.push({ x: x + sx * half, z, r: 1.4 });
    }
    b.add(timber, box(half * 2 + 1.0, 0.3, 0.36, 1), M4(x, 3.75, z));
    b.add(timber, box(half * 2 + 0.6, 0.22, 0.3, 1), M4(x, 3.2, z));
    // 小さな屋根
    for (const s of [1, -1]) b.add(roof, box(half * 2 + 1.5, 0.08, 0.75, 1), M4(x, 4.12, z + s * 0.3, 0, s * 0.55, 0));
    b.build(group);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.55), new THREE.MeshStandardMaterial({ map: textTexture(name || 'ようこそ'), roughness: 0.8 }));
    plate.position.set(x, 3.48, z + 0.2); group.add(plate);
    const back = plate.clone(); back.rotation.y = Math.PI; back.position.z = z - 0.2; group.add(back);
    for (const sx of [-1, 1]) this.put('wall_lantern', M4(x + sx * (half - 0.2), 2.6, z + 0.2, Math.PI), x, z);
    return [{ pos: new THREE.Vector3(x, 2.6, z + 0.6), color: 0xffb05a, power: 1.1, dist: 9 }];
  }

  update(t, day) { this.time.value = t; this.day.value = day; }
}

// 位置・法線・UV だけの単純な結合（BufferGeometryUtils を使わない軽量版）
function mergeSimple(list) {
  const geos = list.map((g) => g.index ? g.toNonIndexed() : g);
  let n = 0; geos.forEach((g) => { n += g.attributes.position.count; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2); let o = 0;
  geos.forEach((g) => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); UV.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); out.computeBoundingSphere(); return out;
}
