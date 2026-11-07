/* =========================================================
   Nature81（v8.1）：フィールドと町の木・茂み・岩・岩山を、コードで作る形と質感にする
   ・2026-11-07 09:00 の依頼「添付の画像を参考に、岩山・山・木・森をリアルな質感と造形に（町の中の木や岩も）」
     参考にしたのは形の考え方だけ（層の重なった岩・角ばった塊・岩の上の苔と雪・幹と枝・葉の房・垂れた針葉樹の枝）。
     添付の画像や市販の素材そのものは使っていない。模様（樹皮・葉・針葉・岩肌）も、ここで描いている（計測した本物の質感ではない）
   ・前の木・岩のモデル（3d/models/tree_*.glb・rock_*.glb・bush_a.glb）は消していない。URL に ?nature=glb を付けると前のモデルで表示する
   ・木：幹と枝（筒）＋葉の房（葉を描いた板を房のまわりに重ねる）。葉の板の法線は樹冠の中心から外向き（ふんわりした陰影）。
     針葉樹は段ごとに垂れた枝の板。ヤシは弓なりの幹と葉。枯れ木は二段の枝分かれ。茂みは低い葉の房
     色は頂点の色（樹冠の内側と下を暗く）×葉の模様（灰色で描いて、木の種類ごとに色を付ける）。葉は風で少し揺れる
     近景（精細）と遠景（簡略）の 2 段。すべての木が 1 つの材質を使う（BatchedMesh で 1 回の描画のまま）
   ・岩：ノイズでゆがめた多面体を、いくつかの平面で切って角ばった面に。rock_b は層（段）の重なった岩。上を向いた面に苔
   ・岩山（フィールドの mountain のマス）：角ばった岩の塊を 5〜8 個寄せた岩山。上を向いた面に雪（雪の地域）・すその草・砂岩の地域は層の帯
     近景・遠景の 2 段（WorldBuilder3D が主人公との距離で切り替える）
   ・質感：樹皮・葉・針葉・岩肌をキャンバスに描く。高画質では樹皮と岩肌に、模様の高さから作った法線（ProcPBR と同じ考え方）を付ける
   ========================================================= */
import * as THREE from 'three';
import { addCutout } from '../engine/Cutout.js';

/* ---------------- 乱数・ノイズ ---------------- */
function mulberry(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function h2(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function h3(x, y, z, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519) ^ Math.imul(s | 0, 3266489917); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const fade = (t) => t * t * (3 - 2 * t);
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// 2D の値ノイズ（px, py：くり返しの周期。0 でくり返さない）
function vn2(x, y, s, px, py) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = fade(x - xi), yf = fade(y - yi);
  const W = (a, p) => (p ? ((a % p) + p) % p : a);
  const a = h2(W(xi, px), W(yi, py), s), b = h2(W(xi + 1, px), W(yi, py), s), c = h2(W(xi, px), W(yi + 1, py), s), d = h2(W(xi + 1, px), W(yi + 1, py), s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm2(x, y, s, oct, px, py) { let sum = 0, amp = 0.5, f = 1, nr = 0; for (let i = 0; i < oct; i++) { sum += amp * vn2(x * f, y * f, s + i * 17, px ? px * f : 0, py ? py * f : 0); nr += amp; amp *= 0.5; f *= 2; } return sum / nr; }
function vn3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), xf), L(c(0, 1, 0), c(1, 1, 0), xf), yf), L(L(c(0, 0, 1), c(1, 0, 1), xf), L(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}
function fbm3(x, y, z, s, oct) { let sum = 0, amp = 0.5, f = 1, nr = 0; for (let i = 0; i < oct; i++) { sum += amp * vn3(x * f, y * f, z * f, s + i * 31); nr += amp; amp *= 0.5; f *= 2.03; } return sum / nr; }

/* ---------------- 設定 ---------------- */
let HI = true;
const WIND = { value: 0 };
let ticking = false;
function tick() { WIND.value = performance.now() / 1000; requestAnimationFrame(tick); }
export const Nature81 = {
  stats: { textures: 0, ms: 0, geos: {} },
  // ?nature=glb：前の木・岩のモデル（GLB）で表示する
  on() { try { if (/[?&]nature=glb\b/.test(location.search || '')) return false; } catch (e) { /* なし */ } return typeof document !== 'undefined'; },
  setQuality(q) { HI = q !== 'low'; },
  has(id) { return !!SPEC[id] && Nature81.on(); },
  parts(id) { return makeParts(id); },
  mountainGeo, rockMaterial, treeMaterial,
  // 大樹の樹冠：塊 lobes＝[[x, y, z, r], ...]（ワールド座標）のまわりに葉の板。返すのは [geometry, material]
  crown(lobes, seed) { return [crownGeo(lobes, seed || 7), treeMaterial()]; },
  // 目印（LandmarkBuilder3D）の丘：角ばった塊の形だけ（位置・平らな法線）。色は呼ぶ側で付ける
  chunk(seed, detail, o) { const g = rockChunk(seed, detail, o); g.computeVertexNormals(); return g; }
};

/* ---------------- 模様（キャンバス） ---------------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// 葉の模様のまとめ（アトラス）：左の帯＝樹皮、右側＝葉の房 2 種・針葉の枝・雪の針葉の枝・ヤシの葉・小枝
const AT = { S: 1024 };
const REG = {   // キャンバスの画素（S = 1024 のとき）
  bark: [0, 0, 256, 1024], leafA: [256, 0, 384, 384], leafB: [640, 0, 384, 384], needle: [256, 384, 384, 320], needleSnow: [640, 384, 384, 320],
  frond: [256, 704, 768, 160], twig: [256, 864, 384, 160], leafC: [640, 864, 384, 160]
};
function regUV(name) { const r = REG[name]; const S = 1024; return { u0: r[0] / S, u1: (r[0] + r[2]) / S, v0: 1 - (r[1] + r[3]) / S, v1: 1 - r[1] / S }; }

function barkHeight(W, H) {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x / W * 4, Y = y / H * 8;
    const v = fbm2(X * 3, Y * 0.75, 3, 5, 12, 6);
    const f = Math.pow(Math.abs(Math.sin(X * Math.PI * 3 + v * 5.0)), 0.6);   // 縦の割れ目
    const plate = fbm2(X * 6, Y * 1.5, 9, 3, 24, 12);
    out[y * W + x] = Math.max(0, Math.min(1, 0.15 + f * 0.6 + (plate - 0.5) * 0.5 + (v - 0.5) * 0.3));
  }
  return out;
}
function drawLeafCluster(g, R, sc, seed, n) {
  const [rx, ry, rw, rh] = R.map((v) => v * sc); const rnd = mulberry(seed); const cx = rx + rw / 2, cy = ry + rh / 2;
  const L = []; for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2; const rr = Math.sqrt(rnd()); const k = 0.86 + 0.14 * Math.sin(a * 3 + seed); L.push({ a, rr: rr * k, r1: rnd(), r2: rnd(), r3: rnd() }); }
  L.sort((p, q) => p.rr - q.rr);
  // 中の小枝（暗い）
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI * 2; g.strokeStyle = 'rgb(62,58,52)'; g.lineWidth = 2.2 * sc; g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(cx + Math.cos(a + 0.3) * rw * 0.18, cy + Math.sin(a + 0.3) * rh * 0.18, cx + Math.cos(a) * rw * 0.36, cy + Math.sin(a) * rh * 0.36); g.stroke(); }
  for (const p of L) {
    const x = cx + Math.cos(p.a) * p.rr * rw * 0.42, y = cy + Math.sin(p.a) * p.rr * rh * 0.42;
    const len = rw * (0.06 + p.r1 * 0.035), wid = len * (0.38 + p.r2 * 0.12); const rot = p.a + (p.r3 - 0.5) * 1.3;
    const lum = Math.round(92 + 115 * p.rr + 40 * (p.r2 - 0.5)); const l2 = Math.min(255, lum + 26);
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgb(' + lum + ',' + lum + ',' + lum + ')'; g.beginPath(); g.moveTo(-len * 0.2, 0); g.quadraticCurveTo(len * 0.35, -wid, len, 0); g.quadraticCurveTo(len * 0.35, wid, -len * 0.2, 0); g.fill();
    g.strokeStyle = 'rgba(30,30,30,0.35)'; g.lineWidth = 0.8 * sc; g.stroke();
    g.strokeStyle = 'rgb(' + l2 + ',' + l2 + ',' + l2 + ')'; g.lineWidth = 0.9 * sc; g.beginPath(); g.moveTo(-len * 0.1, 0); g.lineTo(len * 0.85, 0); g.stroke();
    g.restore();
  }
}
function drawNeedles(g, R, sc, seed, snow) {
  const [rx, ry, rw, rh] = R.map((v) => v * sc); const rnd = mulberry(seed);
  const bx = rx + rw / 2, by = ry + rh - 4 * sc, tx = rx + rw / 2 + (rnd() - 0.5) * rw * 0.06, ty = ry + 6 * sc;   // 下（根元）→ 上（先）
  const P = (t) => [bx + (tx - bx) * t + Math.sin(t * Math.PI) * rw * 0.03, by + (ty - by) * t];
  const twigs = [];
  for (let k = 0; k < 13; k++) { const t = 0.08 + k / 13 * 0.82; const side = k % 2 ? 1 : -1; const [sx, sy] = P(t); const len = rw * (0.44 - t * 0.26) * (0.85 + rnd() * 0.3); const ang = -Math.PI / 2 + side * (0.95 + rnd() * 0.25); twigs.push({ sx, sy, ex: sx + Math.cos(ang) * len, ey: sy + Math.sin(ang) * len * 0.8 }); }
  const needle = (x, y, dx, dy, lum, col) => { g.strokeStyle = col || ('rgb(' + lum + ',' + lum + ',' + lum + ')'); g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); };
  g.lineCap = 'round';
  const green = (k) => { const c = [[38, 74, 44], [48, 88, 50], [30, 62, 40], [58, 96, 56]][k % 4]; return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
  const doLine = (x0, y0, x1, y1, dens) => {
    const L = Math.hypot(x1 - x0, y1 - y0); const ux = (x1 - x0) / L, uy = (y1 - y0) / L; const n = Math.round(L / (2.2 * sc) * dens);
    for (let i = 0; i < n; i++) { const t = i / n; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; const ln = (9 + rnd() * 7) * sc * (1 - t * 0.35);
      for (const s of [-1, 1]) { const a = Math.atan2(uy, ux) + s * (0.75 + rnd() * 0.35); g.lineWidth = (1.3 + rnd() * 0.6) * sc; const lum = Math.round(70 + rnd() * 120 * (0.5 + t * 0.5)); needle(x, y, Math.cos(a) * ln, Math.sin(a) * ln, lum, snow ? green(i + (s > 0 ? 1 : 0)) : null); } }
  };
  g.strokeStyle = snow ? 'rgb(70,52,40)' : 'rgb(60,56,50)'; g.lineWidth = 3 * sc; g.beginPath(); for (let i = 0; i <= 10; i++) { const [x, y] = P(i / 10); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
  for (const w of twigs) { g.lineWidth = 1.6 * sc; g.strokeStyle = snow ? 'rgb(70,52,40)' : 'rgb(70,66,58)'; g.beginPath(); g.moveTo(w.sx, w.sy); g.lineTo(w.ex, w.ey); g.stroke(); doLine(w.sx, w.sy, w.ex, w.ey, 1.0); }
  { let px = bx, py = by; for (let i = 1; i <= 12; i++) { const [x, y] = P(i / 12); doLine(px, py, x, y, 1.2); px = x; py = y; } }
  if (snow) {   // 枝の上に積もった雪（上の面＝画像の上ではなく、枝の板の表に白いかたまり）
    for (const w of twigs) { const n = 4; for (let i = 0; i < n; i++) { if (rnd() < 0.2) continue; const t = 0.2 + i / n * 0.75; const x = w.sx + (w.ex - w.sx) * t, y = w.sy + (w.ey - w.sy) * t; const r = (6 + rnd() * 6) * sc;
      g.fillStyle = 'rgb(196,212,226)'; g.beginPath(); g.ellipse(x, y + r * 0.25, r * 1.25, r * 0.75, Math.atan2(w.ey - w.sy, w.ex - w.sx), 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgb(242,247,251)'; g.beginPath(); g.ellipse(x, y, r * 1.1, r * 0.62, Math.atan2(w.ey - w.sy, w.ex - w.sx), 0, Math.PI * 2); g.fill(); } }
  }
}
function drawFrond(g, R, sc, seed) {
  const [rx, ry, rw, rh] = R.map((v) => v * sc); const rnd = mulberry(seed); const cy = ry + rh / 2;
  g.lineCap = 'round'; g.strokeStyle = 'rgb(150,150,140)'; g.lineWidth = 3 * sc; g.beginPath(); g.moveTo(rx + 4 * sc, cy); g.lineTo(rx + rw - 6 * sc, cy); g.stroke();
  for (let i = 0; i < 48; i++) { const t = 0.06 + i / 48 * 0.9; const x = rx + rw * t; const len = rh * 0.48 * (1 - Math.pow(t, 1.6) * 0.75) * (0.85 + rnd() * 0.2);
    for (const s of [-1, 1]) { const lum = Math.round(120 + rnd() * 90); g.strokeStyle = 'rgb(' + lum + ',' + lum + ',' + lum + ')'; g.lineWidth = (5.5 - t * 3) * sc; g.beginPath(); g.moveTo(x, cy); g.quadraticCurveTo(x + len * 0.35, cy + s * len * 0.5, x + len * 0.6, cy + s * len * 0.95); g.stroke(); } }
}
function drawTwigs(g, R, sc, seed) {
  const [rx, ry, rw, rh] = R.map((v) => v * sc); const rnd = mulberry(seed); g.lineCap = 'round';
  const br = (x, y, a, len, w, d) => { if (d > 4 || len < 3 * sc) return; const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len; const lum = 90 + d * 18; g.strokeStyle = 'rgb(' + lum + ',' + (lum - 4) + ',' + (lum - 10) + ')'; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1); g.stroke();
    br(x1, y1, a - 0.35 - rnd() * 0.3, len * (0.62 + rnd() * 0.15), w * 0.68, d + 1); br(x1, y1, a + 0.3 + rnd() * 0.3, len * (0.55 + rnd() * 0.15), w * 0.62, d + 1); };
  br(rx + rw / 2, ry + rh - 2 * sc, -Math.PI / 2, rh * 0.42, 5 * sc, 0);
}
function drawLeafStrip(g, R, sc, seed) {   // 茂みの下の草と小さな葉（遠景の房にも使う）
  const [rx, ry, rw, rh] = R.map((v) => v * sc); const rnd = mulberry(seed); g.lineCap = 'round';
  for (let i = 0; i < 140; i++) { const x = rx + rnd() * rw, y = ry + rh; const h = rh * (0.35 + rnd() * 0.6); const lean = (rnd() - 0.5) * h * 0.6; const lum = Math.round(90 + rnd() * 120); g.strokeStyle = 'rgb(' + lum + ',' + lum + ',' + lum + ')'; g.lineWidth = (1.5 + rnd() * 2) * sc; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h); g.stroke(); }
}
// 模様の高さ（0〜1）から法線の画像を作る（色の明暗からは作らない。ProcPBR と同じ考え方）
function normalTex(Hm, w, h, depth, repeat) {
  const c = canvas(w, h); const g = c.getContext('2d'); const id = g.createImageData(w, h); const at = (x, y) => Hm[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const gx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * depth, gy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * depth; const L = Math.hypot(gx, gy, 1); const p = (y * w + x) * 4; id.data[p] = (-gx / L * 0.5 + 0.5) * 255; id.data[p + 1] = (gy / L * 0.5 + 0.5) * 255; id.data[p + 2] = (1 / L * 0.5 + 0.5) * 255; id.data[p + 3] = 255; }
  g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
let ATLAS = null, ATLAS_N = null;
function atlas() {
  if (ATLAS) return ATLAS; const t0 = performance.now();
  const S = HI ? 1024 : 512; const sc = S / 1024; const c = canvas(S, S); const g = c.getContext('2d'); g.clearRect(0, 0, S, S);
  // 樹皮
  const [bx, by, bw, bh] = REG.bark.map((v) => v * sc); const BH = barkHeight(bw, bh); const id = g.createImageData(bw, bh);
  for (let i = 0; i < bw * bh; i++) { const v = BH[i]; const a = 0.32 + v * 0.55; id.data[i * 4] = Math.min(255, a * 255 * 1.02); id.data[i * 4 + 1] = a * 255; id.data[i * 4 + 2] = a * 255 * 0.97; id.data[i * 4 + 3] = 255; }
  g.putImageData(id, bx, by);
  drawLeafCluster(g, REG.leafA, sc, 11, HI ? 300 : 200); drawLeafCluster(g, REG.leafB, sc, 29, HI ? 260 : 180);
  drawNeedles(g, REG.needle, sc, 5, false); drawNeedles(g, REG.needleSnow, sc, 9, true);
  drawFrond(g, REG.frond, sc, 3); drawTwigs(g, REG.twig, sc, 7); drawLeafStrip(g, REG.leafC, sc, 13);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  ATLAS = tex;
  if (HI) {   // 樹皮の法線（模様の高さから）。葉のところは平ら
    const cn = canvas(S, S); const gn = cn.getContext('2d'); gn.fillStyle = 'rgb(128,128,255)'; gn.fillRect(0, 0, S, S); const nd = gn.createImageData(bw, bh);
    const at = (x, y) => BH[((y + bh) % bh) * bw + ((x + bw) % bw)];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const gx = (at(x + 1, y) - at(x - 1, y)) * 2.2, gy = (at(x, y + 1) - at(x, y - 1)) * 2.2; let nx = -gx, ny = gy, nz = 1; const L = Math.hypot(nx, ny, nz); const p = (y * bw + x) * 4; nd.data[p] = (nx / L * 0.5 + 0.5) * 255; nd.data[p + 1] = (ny / L * 0.5 + 0.5) * 255; nd.data[p + 2] = (nz / L * 0.5 + 0.5) * 255; nd.data[p + 3] = 255; }
    gn.putImageData(nd, bx, by); const tn = new THREE.CanvasTexture(cn); tn.colorSpace = THREE.NoColorSpace; tn.anisotropy = 4; ATLAS_N = tn;
  }
  Nature81.stats.textures++; Nature81.stats.ms += performance.now() - t0; return ATLAS;
}
// 岩肌（くり返す）：ノイズ＋割れ目＋かすかな層。色は灰色（地域の岩の色は頂点の色とインスタンスの色で付く）
let ROCK = null;
function rockTex() {
  if (ROCK) return ROCK; const t0 = performance.now();
  const W = HI ? 512 : 256; const Hm = new Float32Array(W * W); const c = canvas(W, W); const g = c.getContext('2d'); const id = g.createImageData(W, W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const X = x / W * 6, Y = y / W * 6;
    const base = fbm2(X, Y, 1, 5, 6, 6);
    const cr = Math.abs(fbm2(X * 2, Y * 2, 7, 4, 12, 12) * 2 - 1); const crack = sstep(0.07, 0.0, cr);
    const strata = 0.5 + 0.5 * Math.sin((Y / 6) * Math.PI * 2 * 5 + base * 4);
    const grain = vn2(X * 16, Y * 16, 21, 96, 96);
    const hgt = Math.max(0, Math.min(1, base * 0.75 + strata * 0.12 + grain * 0.13 - crack * 0.45)); Hm[y * W + x] = hgt;
    let a = 0.76 + (base - 0.5) * 0.7 + (strata - 0.5) * 0.07 + (grain - 0.5) * 0.12 - crack * 0.32;
    if (h2(x, y, 5) > 0.992) a += 0.12;   // 地衣の点
    a = Math.max(0.28, Math.min(1.0, a)); const p = (y * W + x) * 4; id.data[p] = a * 255 * 1.03; id.data[p + 1] = a * 255; id.data[p + 2] = a * 255 * 0.95; id.data[p + 3] = 255;
  }
  g.putImageData(id, 0, 0); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  ROCK = { map: tex, normal: HI ? normalTex(Hm, W, W, 4.5, true) : null }; Nature81.stats.textures++; Nature81.stats.ms += performance.now() - t0; return ROCK;
}

/* ---------------- 材質 ---------------- */
let TREE_M = null, ROCK_M = null;
function treeMaterial() {
  if (TREE_M) return TREE_M;
  const m = new THREE.MeshStandardMaterial({ map: atlas(), vertexColors: true, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8, metalness: 0 });
  if (ATLAS_N) { m.normalMap = ATLAS_N; m.normalScale = new THREE.Vector2(1, 1); }
  m.name = 'nature81_tree';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = WIND;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wind; uniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { float ph = 0.0;
      #ifdef USE_BATCHING
        ph += batchingMatrix[3].x * 0.71 + batchingMatrix[3].z * 0.93;
      #endif
      #ifdef USE_INSTANCING
        ph += instanceMatrix[3].x * 0.71 + instanceMatrix[3].z * 0.93;
      #endif
        float k = wind * 0.05;
        transformed.x += sin(uWind * 1.7 + ph + position.y * 0.8) * k + sin(uWind * 4.3 + ph * 2.0 + position.x * 3.0) * k * 0.25;
        transformed.z += cos(uWind * 1.3 + ph * 1.3 + position.y * 0.6) * k * 0.7; }`);
    // 葉の板は両面とも「樹冠の外向き」の法線のまま（裏から見ても暗くならない）
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  };
  m.customProgramCacheKey = () => 'nature81-tree-v1';
  addCutout(m); if (!ticking && typeof requestAnimationFrame !== 'undefined') { ticking = true; requestAnimationFrame(tick); }
  TREE_M = m; return m;
}
function rockMaterial() {
  if (ROCK_M) return ROCK_M; const R = rockTex();
  const m = new THREE.MeshStandardMaterial({ map: R.map, vertexColors: true, roughness: 0.93, metalness: 0 });
  if (R.normal) { m.normalMap = R.normal; m.normalScale = new THREE.Vector2(1.1, 1.1); }
  m.name = 'nature81_rock'; addCutout(m); ROCK_M = m; return m;
}

/* ---------------- 形の組み立て ---------------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const LIN = (hex) => new THREE.Color(hex);   // sRGB → 線形（ColorManagement）
class GB {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; this.w = []; this.i = []; }
  v(p, n, u, v, col, w) { this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, v); this.c.push(col.r, col.g, col.b); this.w.push(w || 0); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setAttribute('wind', new THREE.Float32BufferAttribute(this.w, 1));
    g.setIndex(this.i); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  }
}
// 筒（幹・枝）：pts（中心の点）・rad（半径）。樹皮の帯（アトラスの左）を一周に 1 回。v は長さに合わせる（vScale：1 マスあたり）
function tube(B, pts, rad, seg, col, opt) {
  opt = opt || {}; const R = regUV('bark'); const rings = []; let len = 0; const T = new THREE.Vector3(), N = new THREE.Vector3(), Bn = new THREE.Vector3();
  let prevN = null;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]; T.subVectors(b, a).normalize();
    if (!prevN) { N.copy(Math.abs(T.y) > 0.9 ? V(1, 0, 0) : UP).cross(T).normalize(); } else { N.copy(prevN).sub(T.clone().multiplyScalar(prevN.dot(T))).normalize(); }
    prevN = N.clone(); Bn.crossVectors(T, N).normalize();
    if (k) len += pts[k].distanceTo(pts[k - 1]);
    const row = [];
    for (let s = 0; s <= seg; s++) {
      const ang = s / seg * Math.PI * 2; const d = N.clone().multiplyScalar(Math.cos(ang)).addScaledVector(Bn, Math.sin(ang));
      const p = pts[k].clone().addScaledVector(d, rad[k]); const ao = (opt.ao ? opt.ao(pts[k], k) : 1);
      const cc = col.clone().multiplyScalar(ao * (0.92 + 0.16 * h2(s, k, 3)));
      row.push(B.v(p, d, R.u0 + (R.u1 - R.u0) * (s / seg), R.v0 + Math.min(0.98, (opt.v0 || 0) + len * (opt.vScale || 0.28)) * (R.v1 - R.v0), cc, opt.wind ? opt.wind(pts[k], k) : 0));
    }
    rings.push(row);
  }
  for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < seg; s++) { const a = rings[k][s], b = rings[k][s + 1], c = rings[k + 1][s + 1], d = rings[k + 1][s]; B.tri(a, b, c); B.tri(a, c, d); }
  return len;
}
// 板（葉の房・枝の板）：中心 c・横 ax・縦 ay（単位）・幅 w・高さ h・模様の場所 reg。nf(p)：法線、cf(p)：色、wf(p)：揺れ
function card(B, c, ax, ay, w, h, reg, nf, cf, wf, flip) {
  const R = regUV(reg); const P = [c.clone().addScaledVector(ax, -w / 2).addScaledVector(ay, -h / 2), c.clone().addScaledVector(ax, w / 2).addScaledVector(ay, -h / 2), c.clone().addScaledVector(ax, w / 2).addScaledVector(ay, h / 2), c.clone().addScaledVector(ax, -w / 2).addScaledVector(ay, h / 2)];
  const UVs = flip ? [[R.u1, R.v0], [R.u0, R.v0], [R.u0, R.v1], [R.u1, R.v1]] : [[R.u0, R.v0], [R.u1, R.v0], [R.u1, R.v1], [R.u0, R.v1]];
  const id = P.map((p, k) => B.v(p, nf(p), UVs[k][0], UVs[k][1], cf(p), wf ? wf(p) : 0)); B.tri(id[0], id[1], id[2]); B.tri(id[0], id[2], id[3]);
}
// 板の向き：法線 nrm に垂直な 2 方向
function frame(nrm, rnd) { const t = Math.abs(nrm.y) > 0.92 ? V(1, 0, 0) : UP; const ax = t.clone().cross(nrm).normalize(); const ay = nrm.clone().cross(ax).normalize(); const r = rnd() * Math.PI * 2; const c = Math.cos(r), s = Math.sin(r); return [ax.clone().multiplyScalar(c).addScaledVector(ay, s), ay.clone().multiplyScalar(c).addScaledVector(ax, -s)]; }
function randDir(rnd) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u); return V(r * Math.cos(a), u, r * Math.sin(a)); }

/* ---------------- 木の種類 ---------------- */
const PAL = {
  oak: ['#5a8a30', '#73a23a', '#486f2c', '#82ae44'], bush: ['#558430', '#689834', '#466c2a'], pine: ['#3d6e38', '#4b7f40', '#355f37', '#5a8b4a'], palm: ['#5d8c2e', '#77a23a', '#4c7a28'],
  barkOak: '#6a5038', barkPine: '#6b4a34', barkPalm: '#8c7a5e', barkDead: '#7c746a', snow: '#e9eff4'
};
const SPEC = {
  tree_oak_a: { kind: 'oak', seed: 11, h: 3.4, crown: [1.25, 1.0] }, tree_oak_b: { kind: 'oak', seed: 23, h: 3.1, crown: [1.35, 0.95] }, tree_oak_c: { kind: 'oak', seed: 37, h: 4.4, crown: [1.2, 1.35] },
  tree_pine_a: { kind: 'pine', seed: 5, h: 4.0 }, tree_pine_b: { kind: 'pine', seed: 7, h: 3.6 }, tree_pine_c: { kind: 'pine', seed: 9, h: 4.4 },
  tree_palm: { kind: 'palm', seed: 3, h: 3.2 }, tree_dead: { kind: 'dead', seed: 13, h: 3.2 }, tree_snowpine: { kind: 'snowpine', seed: 17, h: 2.9 },
  bush_a: { kind: 'bush', seed: 19 }, rock_a: { kind: 'rock', seed: 31 }, rock_b: { kind: 'rock', seed: 43, strata: true }
};
['tree_oak_a', 'tree_oak_b', 'tree_oak_c', 'tree_pine_a', 'tree_pine_b', 'tree_pine_c', 'tree_palm', 'tree_dead', 'tree_snowpine'].forEach((id) => { SPEC[id + '_lod1'] = Object.assign({}, SPEC[id], { lod: 1 }); });

function oak(sp) {
  const B = new GB(); const rnd = mulberry(sp.seed * 7 + (sp.lod ? 1 : 0) * 0); const far = !!sp.lod; const bark = LIN(PAL.barkOak);
  const H = sp.h, th = H * (0.42 + rnd() * 0.06); const lean = V((rnd() - 0.5) * 0.25, 0, (rnd() - 0.5) * 0.25);
  const top = V(lean.x, th, lean.z); const [crx, cry] = sp.crown; const C = V(lean.x * 1.3, th + cry * 0.62, lean.z * 1.3);
  // 幹（根元を少し太く）
  const tp = [], tr = []; const NS = far ? 3 : 5; for (let k = 0; k <= NS; k++) { const t = k / NS; tp.push(V(lean.x * t * t + (k && k < NS ? (rnd() - 0.5) * 0.05 : 0), th * t, lean.z * t * t)); tr.push((0.2 - 0.09 * t) * (k === 0 ? 1.35 : 1)); }
  tube(B, tp, tr, far ? 5 : 8, bark, { ao: (p) => 0.7 + 0.3 * Math.min(1, p.y / 1.2) });
  // 枝と房
  const clusters = []; const nb = far ? 0 : 5;
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + rnd() * 0.6; const el = 0.55 + rnd() * 0.35; const sy = th * (0.68 + rnd() * 0.3); const len = 0.75 + rnd() * 0.45;
    const s = V(lean.x * 0.8, sy, lean.z * 0.8); const d = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); const tip = s.clone().addScaledVector(d, len); const mid = s.clone().addScaledVector(d, len * 0.5).add(V(0, 0.08, 0));
    if (i < nb) tube(B, [s, mid, tip], [0.075, 0.05, 0.028], 5, bark, { ao: () => 0.85 });
    clusters.push(V(tip.x * 1.05, tip.y + 0.12, tip.z * 1.05)); }
  clusters.push(C.clone().add(V(0, cry * 0.55, 0))); clusters.push(C.clone().add(V(rnd() - 0.5, cry * 0.15, rnd() - 0.5).multiply(V(0.6, 1, 0.6))));
  if (!far) for (let i = 0; i < 3; i++) { const d = randDir(rnd); d.y = Math.abs(d.y) * 0.6 + 0.1; clusters.push(C.clone().add(d.multiply(V(crx * 0.6, cry * 0.5, crx * 0.6)))); }
  const pal = PAL.oak.map(LIN); const nrm = (p) => { const q = V((p.x - C.x) / (crx * crx), (p.y - C.y) / (cry * cry) + 0.35, (p.z - C.z) / (crx * crx)); return q.normalize(); };
  const per = far ? 5 : HI ? 22 : 15; const rc = far ? 0.8 : 0.62;
  clusters.forEach((cc, ci) => {
    for (let k = 0; k < per; k++) {
      // 房の表面に、外を向いた板（ふくらんだ葉のかたまり）。少しだけ内側にも
      const off = randDir(rnd); off.y = off.y * 0.75 + 0.12; off.normalize(); const inner = k % 5 === 4; const p = cc.clone().addScaledVector(off, rc * (inner ? 0.35 : 0.72 + rnd() * 0.22));
      const nn = off.clone().multiplyScalar(inner ? 0.3 : 0.85).add(randDir(rnd).multiplyScalar(inner ? 0.9 : 0.45)).normalize();
      const [ax, ay] = frame(nn, rnd); const sz = rc * (far ? 2.1 : 1.08) * (0.8 + rnd() * 0.35); const base = pal[(ci + k) % pal.length].clone().multiplyScalar(0.9 + rnd() * 0.18);
      const col = (q) => { const e = V((q.x - C.x) / crx, (q.y - C.y) / cry, (q.z - C.z) / crx); const r = Math.min(1.25, e.length()); const lc = q.distanceTo(cc) / rc; const ao = (0.38 + 0.52 * Math.min(1, r) + 0.22 * Math.max(-0.6, Math.min(1, e.y))) * (0.72 + 0.32 * Math.min(1, lc)); return base.clone().multiplyScalar(Math.max(0.28, Math.min(1.15, ao))); };
      card(B, p, ax, ay, sz, sz, k % 3 === 2 ? 'leafB' : 'leafA', nrm, col, (q) => Math.max(0, Math.min(1, (q.y - th * 0.6) / (H - th * 0.6))), rnd() < 0.5);
    }
  });
  return B.geo();
}
function crownGeo(lobes, seed) {
  const B = new GB(); const rnd = mulberry(seed); const pal = PAL.oak.map(LIN);
  let cx = 0, cy = 0, cz = 0, R = 0; for (const l of lobes) { cx += l[0]; cy += l[1]; cz += l[2]; } cx /= lobes.length; cy /= lobes.length; cz /= lobes.length; for (const l of lobes) R = Math.max(R, Math.hypot(l[0] - cx, l[1] - cy, l[2] - cz) + l[3]);
  const C = V(cx, cy, cz); const nrm = (p) => V(p.x - cx, (p.y - cy) * 1.2 + R * 0.3, p.z - cz).normalize();
  lobes.forEach((l, li) => { const cc = V(l[0], l[1], l[2]); const rc = l[3]; const n = Math.round((HI ? 26 : 16) * Math.min(2.2, rc / 0.9));
    for (let k = 0; k < n; k++) { const off = randDir(rnd); off.y = off.y * 0.8 + 0.1; off.normalize(); const inner = k % 5 === 4; const p = cc.clone().addScaledVector(off, rc * (inner ? 0.4 : 0.78 + rnd() * 0.2));
      const nn = off.clone().multiplyScalar(inner ? 0.3 : 0.85).add(randDir(rnd).multiplyScalar(inner ? 0.9 : 0.45)).normalize(); const [ax, ay] = frame(nn, rnd); const sz = (0.85 + rnd() * 0.45) * Math.min(1.6, 0.6 + rc * 0.45); const base = pal[(li + k) % pal.length].clone().multiplyScalar(0.9 + rnd() * 0.18);
      const col = (q) => { const e = q.clone().sub(C).divideScalar(R); const ao = (0.4 + 0.5 * Math.min(1, e.length()) + 0.2 * Math.max(-0.6, Math.min(1, e.y))) * (0.72 + 0.32 * Math.min(1, q.distanceTo(cc) / rc)); return base.clone().multiplyScalar(Math.max(0.28, Math.min(1.15, ao))); };
      card(B, p, ax, ay, sz, sz, k % 3 === 2 ? 'leafB' : 'leafA', nrm, col, (q) => Math.max(0, Math.min(1, (q.y - (cy - R)) / (2 * R))) * 0.5, rnd() < 0.5); } });
  return B.geo();
}
function pine(sp, snow) {
  const B = new GB(); const rnd = mulberry(sp.seed * 13); const far = !!sp.lod; const bark = LIN(PAL.barkPine);
  const H = sp.h; const tp = [], tr = []; for (let k = 0; k <= (far ? 2 : 5); k++) { const t = k / (far ? 2 : 5); tp.push(V((rnd() - 0.5) * 0.03, H * 0.97 * t, (rnd() - 0.5) * 0.03)); tr.push(0.14 - 0.125 * t); }
  tube(B, tp, tr, far ? 5 : 7, bark, { ao: (p) => 0.75 + 0.25 * Math.min(1, p.y / 1.5) });
  const pal = (snow ? ['#eef3f6', '#e2e9ee', '#d8e0e6'] : PAL.pine).map(LIN); const reg = snow ? 'needleSnow' : 'needle';
  const NW = far ? 5 : HI ? 12 : 10; const y0 = H * 0.14, y1 = H * 0.9; const per = far ? 5 : HI ? 7 : 6;
  for (let i = 0; i < NW; i++) {
    const t = i / (NW - 1); const y = y0 + (y1 - y0) * t; const L = (1.12 * Math.pow(1 - t, 0.85) + 0.22) * (H / 4.0) * (far ? 1.08 : 1); const droop = 0.32 * (1 - t) + 0.1; const rot = rnd() * Math.PI * 2;
    for (let k = 0; k < per; k++) {
      const a = rot + k / per * Math.PI * 2 + (rnd() - 0.5) * 0.3; const dir = V(Math.cos(a), -droop * (0.8 + rnd() * 0.4), Math.sin(a)).normalize();
      const root = V(Math.cos(a) * 0.06, y, Math.sin(a) * 0.06); const c = root.clone().addScaledVector(dir, L * 0.5);
      const ax = V(-Math.sin(a), 0, Math.cos(a)); const w = L * 0.78 + 0.14;
      const nf = (p) => V(p.x, Math.max(0.35, L * 0.9), p.z).normalize();
      const col = (p) => { const r = Math.hypot(p.x, p.z) / (L + 0.1); const ao = (0.5 + 0.55 * Math.min(1, r)) * (0.78 + 0.26 * t); return pal[(i + k) % pal.length].clone().multiplyScalar(Math.min(1.1, ao)); };
      const wf = (p) => Math.min(1, Math.hypot(p.x, p.z) / (L + 0.1)) * (0.4 + 0.6 * t);
      card(B, c, ax, dir, w, L, reg, nf, col, wf, rnd() < 0.5);
      if (!far && HI && i % 2 === 0) { const ax2 = ax.clone().applyAxisAngle(dir, 1.15); card(B, c.clone().add(V(0, 0.04, 0)), ax2, dir, w * 0.62, L * 0.92, reg, nf, col, wf, true); }
    }
  }
  // 先端（縦の十字の板）
  for (const r of [0, Math.PI / 2]) { const ax = V(Math.cos(r), 0, Math.sin(r)); card(B, V(0, H * 0.93, 0), ax, UP, 0.42 * (H / 4), 0.75 * (H / 4), reg, (p) => V(p.x * 2, 1, p.z * 2).normalize(), () => pal[0].clone().multiplyScalar(1.02), () => 1); }
  return B.geo();
}
function palm(sp) {
  const B = new GB(); const rnd = mulberry(sp.seed * 5); const far = !!sp.lod; const bark = LIN(PAL.barkPalm); const H = sp.h;
  const n = far ? 3 : 8; const tp = [], tr = []; for (let k = 0; k <= n; k++) { const t = k / n; tp.push(V(0.45 * t * t, H * t, 0.12 * t * t)); tr.push(0.14 - 0.05 * t); }
  tube(B, tp, tr, far ? 5 : 7, bark, { ao: (p, k) => (k % 2 ? 0.82 : 1.0), vScale: 0.3 });
  const top = tp[tp.length - 1]; const pal = PAL.palm.map(LIN); const NF = far ? 6 : 10;
  for (let i = 0; i < NF; i++) {
    const a = i / NF * Math.PI * 2 + rnd() * 0.3; const L = 1.45 + rnd() * 0.35; const W = 0.62; const segs = far ? 2 : 3; const R = regUV('frond');
    let prev = null; for (let s = 0; s <= segs; s++) {
      const t = s / segs; const r = L * t; const y = top.y + 0.35 * Math.sin(t * Math.PI * 0.9) - 0.75 * t * t; const p = V(top.x + Math.cos(a) * r, y, top.z + Math.sin(a) * r);
      const side = V(-Math.sin(a), 0.15, Math.cos(a)).normalize(); const nrm = V(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3).normalize(); const col = pal[i % pal.length].clone().multiplyScalar(0.75 + 0.3 * t);
      const u = R.u0 + (R.u1 - R.u0) * t; const ia = B.v(p.clone().addScaledVector(side, -W / 2 * (1 - t * 0.5)), nrm, u, R.v0, col, t), ib = B.v(p.clone().addScaledVector(side, W / 2 * (1 - t * 0.5)), nrm, u, R.v1, col, t);
      if (prev) { B.tri(prev[0], ia, ib); B.tri(prev[0], ib, prev[1]); } prev = [ia, ib];
    }
  }
  if (!far) for (let i = 0; i < 3; i++) { const a = i * 2.1; const g = new THREE.IcosahedronGeometry(0.1, 0); const p = g.attributes.position; const Rb = regUV('bark'); const nut = LIN('#5a3e22'); const c0 = V(top.x + Math.cos(a) * 0.14, top.y - 0.12, top.z + Math.sin(a) * 0.14); const base = B.p.length / 3;
    for (let j = 0; j < p.count; j++) { const q = V(p.getX(j), p.getY(j), p.getZ(j)); B.v(q.clone().add(c0), q.clone().normalize(), Rb.u0 + 0.1, Rb.v0 + 0.2, nut, 0); } for (let j = 0; j < p.count; j += 3) B.tri(base + j, base + j + 1, base + j + 2); }
  return B.geo();
}
function dead(sp) {
  const B = new GB(); const rnd = mulberry(sp.seed * 3); const far = !!sp.lod; const bark = LIN(PAL.barkDead); const H = sp.h;
  const tp = [], tr = []; for (let k = 0; k <= (far ? 2 : 5); k++) { const t = k / (far ? 2 : 5); tp.push(V(Math.sin(t * 2.2) * 0.12, H * 0.82 * t, Math.cos(t * 1.7) * 0.06 - 0.06)); tr.push(0.16 - 0.12 * t); }
  tube(B, tp, tr, far ? 4 : 7, bark, { ao: (p) => 0.7 + 0.3 * Math.min(1, p.y / 1.5) });
  const tips = [];
  const branch = (s, d, len, r, depth) => { const e = s.clone().addScaledVector(d, len); const m = s.clone().addScaledVector(d, len * 0.5).add(V((rnd() - 0.5) * 0.12, 0.05, (rnd() - 0.5) * 0.12)); tube(B, [s, m, e], [r, r * 0.7, r * 0.35], far ? 3 : depth ? 3 : 5, bark, { ao: () => 0.9 });
    if (depth < (far ? 1 : 2)) for (let k = 0; k < 2; k++) { const nd = d.clone().add(V((rnd() - 0.5) * 1.1, 0.35 + rnd() * 0.3, (rnd() - 0.5) * 1.1)).normalize(); branch(e, nd, len * 0.58, r * 0.55, depth + 1); } else tips.push(e); };
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + rnd() * 0.7; const y = H * (0.45 + i * 0.1); const s = V(Math.sin((y / (H * 0.82)) * 2.2) * 0.12, y, 0); branch(s, V(Math.cos(a), 0.55 + rnd() * 0.3, Math.sin(a)).normalize(), 0.85 + rnd() * 0.35, 0.065, 0); }
  if (!far) for (const [ti, t] of tips.entries()) for (const r of (ti % 2 ? [0.8] : [0, 1.57])) { const ax = V(Math.cos(r), 0, Math.sin(r)); card(B, t.clone().add(V(0, 0.14, 0)), ax, UP, 0.34, 0.34, 'twig', (p) => V(p.x, 1, p.z).normalize(), () => bark.clone().multiplyScalar(1.1), () => 0.6); }
  return B.geo();
}
function bush(sp) {
  const B = new GB(); const rnd = mulberry(sp.seed); const pal = PAL.bush.map(LIN); const C = V(0, 0.32, 0);
  const nrm = (p) => V(p.x - C.x, (p.y - C.y) + 0.25, p.z - C.z).normalize();
  for (let c = 0; c < 6; c++) { const a = c / 6 * Math.PI * 2 + rnd() * 0.5; const cc = V(Math.cos(a) * 0.28, 0.3 + rnd() * 0.22, Math.sin(a) * 0.28 * 0.8); if (c === 5) cc.set(0, 0.55, 0);
    for (let k = 0; k < 12; k++) { const p = cc.clone().addScaledVector(randDir(rnd), 0.12 + rnd() * 0.12); p.y = Math.max(0.14, p.y); const nn = randDir(rnd).add(V(p.x, p.y - 0.2, p.z)).normalize(); const [ax, ay] = frame(nn, rnd); const sz = 0.5 + rnd() * 0.18; const base = pal[(c + k) % pal.length].clone().multiplyScalar(0.88 + rnd() * 0.2);
      card(B, p, ax, ay, sz, sz, k % 2 ? 'leafA' : 'leafB', nrm, (q) => base.clone().multiplyScalar(Math.max(0.35, Math.min(1.1, 0.45 + q.y * 0.9))), (q) => Math.min(1, q.y * 1.2) * 0.6, rnd() < 0.5); } }
  // 根元の草
  for (let k = 0; k < 4; k++) { const a = k * 0.8; const ax = V(Math.cos(a), 0, Math.sin(a)); card(B, V(0, 0.13, 0), ax, UP, 1.0, 0.26, 'leafC', () => UP.clone(), () => pal[1].clone().multiplyScalar(0.8), () => 0.3); }
  return B.geo();
}

/* ---------------- 岩・岩山 ---------------- */
// 角ばった塊：多面体（icosahedron）→ ノイズでゆがめる → 平面で切る（面を作る）→ 層（strata）。sx, sy, sz：大きさ
function rockChunk(seed, detail, o) {
  o = o || {}; const rnd = mulberry(seed); const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position;
  const planes = []; const np = o.planes === undefined ? 7 : o.planes; for (let i = 0; i < np; i++) { const n = randDir(rnd); if (o.flatTop && i === 0) n.set((rnd() - 0.5) * 0.3, 1, (rnd() - 0.5) * 0.3).normalize(); planes.push({ n, d: 0.62 + rnd() * 0.3 }); }
  const amp = o.amp === undefined ? 0.2 : o.amp; const so = seed * 0.37;
  for (let i = 0; i < p.count; i++) {
    const q = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let r = 1 + (fbm3(q.x * 1.6 + so, q.y * 1.6, q.z * 1.6 - so, seed, 3) - 0.5) * 2 * amp; q.multiplyScalar(r);
    for (const pl of planes) { const k = q.dot(pl.n); if (k > pl.d) q.addScaledVector(pl.n, pl.d - k); }
    if (o.strata) { const st = o.strata; const layer = Math.floor((q.y + 1) / st); const f = (q.y + 1) / st - layer; const jit = 1 + (h2(layer, seed, 9) - 0.5) * 0.22; const e = sstep(0.82, 1.0, f) * 0.06; q.x *= jit - e; q.z *= jit - e; }
    if (q.y < -0.55) q.y = -0.55 + (q.y + 0.55) * 0.15;   // 下を平らに（地面に座る）
    p.setXYZ(i, q.x * (o.sx || 1), q.y * (o.sy || 1), q.z * (o.sz || 1));
  }
  return g;
}
// 頂点の色・UV（面ごとの箱の投影）・平らな法線。col(p, n)：色
function finishRock(g, col, uvScale) {
  const ng = g.index ? g.toNonIndexed() : g; ng.computeVertexNormals(); const p = ng.attributes.position, n = ng.attributes.normal; const uv = new Float32Array(p.count * 2), c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i); const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    for (let j = 0; j < 3; j++) { const k = i + j; const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
      uv[k * 2] = u * uvScale; uv[k * 2 + 1] = v * uvScale; const cc = col(V(x, y, z), V(nx, ny, nz)); c[k * 3] = cc.r; c[k * 3 + 1] = cc.g; c[k * 3 + 2] = cc.b; }
  }
  ng.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); ng.setAttribute('color', new THREE.BufferAttribute(c, 3)); ng.computeBoundingSphere(); ng.computeBoundingBox(); return ng;
}
function rockGeo(sp) {
  const strata = !!sp.strata;
  const g = rockChunk(sp.seed, HI ? 2 : 1, { amp: strata ? 0.12 : 0.22, planes: strata ? 5 : 8, strata: strata ? 0.28 : 0, flatTop: strata, sx: 0.52, sy: strata ? 0.42 : 0.4, sz: strata ? 0.56 : 0.5 });
  g.translate(0, strata ? 0.2 : 0.18, 0);
  const base = LIN('#c9c4bb'), moss = LIN('#7f9a52'), dark = LIN('#8a857c');
  return finishRock(g, (q, nn) => { const nz = fbm3(q.x * 3, q.y * 3, q.z * 3, sp.seed, 3); let cc = base.clone().lerp(dark, sstep(0.15, -0.05, q.y) * 0.7 + (nz - 0.5) * 0.5);
    if (strata) cc.multiplyScalar(0.9 + 0.12 * Math.sin(q.y * 38));
    const m = sstep(0.62, 0.9, nn.y) * sstep(0.35, 0.6, nz + 0.1); if (m > 0) cc.lerp(moss, m * 0.75); return cc; }, 1.6);
}
// 岩山：unit（高さ 1・半径 0.95）。o：{ rock, grass, snow, strata }。variant 0..2・lod 0（近景）1（遠景）
const MTN = {};
function mountainGeo(o, variant, lod) {
  const key = [o.rock, o.grass, o.snow ? 1 : 0, o.strata ? 1 : 0, variant, lod, HI ? 1 : 0].join('|'); if (MTN[key]) return MTN[key];
  const rnd = mulberry(101 + variant * 57); const parts = []; const far = lod === 1;
  const chunks = [{ x: 0, z: 0, h: 1.0, r: 0.76, main: true }]; const HY = 2.5; const nRing = far ? 3 : 6;   /* HY：縦は 2.5 倍で作る（WorldBuilder3D が 1/2.5 に縮めて置く＝ゆがみが少ない） */
  for (let i = 0; i < nRing; i++) { const a = i / nRing * Math.PI * 2 + rnd() * 0.5; const d = 0.52 + rnd() * 0.28; chunks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, h: 0.26 + rnd() * 0.4, r: 0.4 + rnd() * 0.18 }); }
  if (!far) for (let i = 0; i < 2; i++) { const a = rnd() * Math.PI * 2; chunks.push({ x: Math.cos(a) * 0.18, z: Math.sin(a) * 0.18, h: 0.7 + rnd() * 0.2, r: 0.34 }); }
  for (const [ci, ch] of chunks.entries()) {
    const det = far ? (ch.main ? 1 : 0) : HI ? (ch.main ? 2 : 1) : (ch.main ? 1 : 0);
    const g = rockChunk(variant * 1000 + ci * 17 + 5, det, { amp: 0.18, planes: ch.main ? 7 : 6, strata: o.strata ? 0.22 : 0, flatTop: ch.main ? rnd() < 0.4 : rnd() < 0.7 });
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const t = (y + 0.55) / 1.55; const taper = 1 - 0.26 * Math.max(0, t); p.setXYZ(i, ch.x + x * ch.r * taper, (Math.max(0, t) * ch.h - 0.02) * HY, ch.z + z * ch.r * taper); }
    parts.push(g.index ? g.toNonIndexed() : g);
  }
  // 結合
  let n = 0; for (const g of parts) n += g.attributes.position.count; const pos = new Float32Array(n * 3); let k = 0; for (const g of parts) { pos.set(g.attributes.position.array, k); k += g.attributes.position.array.length; }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rock = LIN(o.rock), dark = rock.clone().multiplyScalar(0.78), light = rock.clone().lerp(LIN('#ffffff'), 0.26), snow = LIN('#f2f6fa'), snowS = LIN('#c6d4e2'), grass = LIN(o.grass).multiplyScalar(0.7);
  const geo = finishRock(mg, (q, nn) => {
    const nz = fbm3(q.x * 4, q.y * 4, q.z * 4, 77 + variant, 3);
    let cc = rock.clone().lerp(nz > 0.5 ? light : dark, Math.abs(nz - 0.5) * 1.4);
    if (o.strata) cc.multiplyScalar(0.86 + 0.18 * (0.5 + 0.5 * Math.sin(q.y * 18 + nz * 3)));
    const yy = q.y / 2.5; cc.multiplyScalar(0.8 + 0.2 * sstep(0.0, 0.35, yy));   // すそを暗く
    if (yy < 0.16 && nn.y > 0.3) cc.lerp(grass, sstep(0.16, 0.04, yy) * sstep(0.3, 0.7, nn.y));
    if (o.snow) { const s = sstep(-0.12, 0.3, nn.y + (nz - 0.5) * 0.6) * sstep(0.26, 0.5, yy + (nz - 0.5) * 0.15); if (s > 0) cc.lerp(nn.y > 0.35 ? snow : snowS, Math.min(1, s * 1.35)); }
    return cc;
  }, 2.2);
  geo.setAttribute('wind', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
  Nature81.stats.geos['mtn' + lod] = geo.attributes.position.count / 3;
  MTN[key] = geo; return geo;
}

/* ---------------- 部品 ---------------- */
const PARTS = {};
function makeParts(id) {
  if (PARTS[id]) return PARTS[id]; const sp = SPEC[id]; if (!sp) return [];
  let geo, mat;
  if (sp.kind === 'rock') { geo = rockGeo(sp); mat = rockMaterial(); }
  else {
    mat = treeMaterial();
    geo = sp.kind === 'oak' ? oak(sp) : sp.kind === 'pine' ? pine(sp, false) : sp.kind === 'snowpine' ? pine(sp, true) : sp.kind === 'palm' ? palm(sp) : sp.kind === 'dead' ? dead(sp) : bush(sp);
  }
  Nature81.stats.geos[id] = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  PARTS[id] = [{ geometry: geo, material: mat }]; return PARTS[id];
}
