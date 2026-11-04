/* =========================================================
   ProcPBR：コードで描いている模様（石畳・切石・六角タイル・陶板）の、法線・AO・粗さの画像を作る（手続き的なPBR）
   ・作り方：模様の「形」（石の並び・目地の幅・角の面取り）を、色の画像と同じ並びで高さにして（石＝1、目地＝0、角はなだらか）、
     そこから法線（高さの傾き）・AO（まわりより低い所＝目地を暗く）・粗さ（目地を粗く、石の上は少し滑らか）を計算する
   ・色の画像の明暗からは作らない（環境パックの注意「画像の明暗から法線を自動捏造しない」に従う）
   ・計測・制作された本物のPBRではない。報告では「コードで作った手続き的なPBR」と書く
   ・高画質（quality＝'high'）だけで使う。低画質では何もしない（材質も画像もそのまま）。URL の ?pbr=off で付けない（撮り比べ用）
   ・画像：normal（RGB＝法線。OpenGL の向き）と orm（R＝AO・G＝粗さ。three.js の aoMap は R、roughnessMap は G を読む）
   ========================================================= */
import * as THREE from 'three';
import { rng } from './EnvKit3D.js';

let ON = false;
export function setPBRQuality(q) { let off = false; try { off = /[?&]pbr=off\b/.test(location.search || ''); } catch (e) { /* なし */ } ON = q === 'high' && !off; }   // ?pbr=off：比べるとき用（付けない）
export function pbrOn() { return ON; }
export const PBR_STATS = { made: [], ms: 0 };

const CACHE = {};
// heightFn(x, y)：画素の中心での高さ 0〜1（画像は上下左右がつながる前提）。o.depth：石の高さ（画素）＝法線の強さ
export function pbrMaps(key, w, h, heightFn, o) {
  if (!ON || typeof document === 'undefined') return null; if (CACHE[key]) return CACHE[key];
  o = o || {}; const t0 = performance.now(); const depth = o.depth || 3; const N = w * h;
  const Hm = new Float32Array(N); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) Hm[y * w + x] = heightFn(x + 0.5, y + 0.5);
  const at = (x, y) => Hm[((y + h) % h) * w + ((x + w) % w)];
  // まわりの平均（AO 用。箱ぼかしを2回）
  const blur = (src, r) => { const a = new Float32Array(N), b = new Float32Array(N); const k = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let d = -r; d <= r; d++) s += src[y * w + ((x + d + w) % w)]; a[y * w + x] = s * k; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0; for (let d = -r; d <= r; d++) s += a[((y + d + h) % h) * w + x]; b[y * w + x] = s * k; }
    return b; };
  const r = Math.max(2, Math.round(o.aoRadius || 3)); const B = blur(blur(Hm, r), r);
  const cn = document.createElement('canvas'); cn.width = w; cn.height = h; const gn = cn.getContext('2d'); const In = gn.createImageData(w, h);
  const co = document.createElement('canvas'); co.width = w; co.height = h; const go = co.getContext('2d'); const Io = go.createImageData(w, h);
  const aoK = o.ao === undefined ? 1.8 : o.ao, rough0 = o.rough0 === undefined ? 0.86 : o.rough0, rough1 = o.rough1 === undefined ? 1.0 : o.rough1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4;
    // 画像の y は下向き。テクスチャの v は上向き（flipY）なので、v の傾きは y の傾きの逆
    const gx = (at(x + 1, y) - at(x - 1, y)) * 0.5 * depth, gy = (at(x, y + 1) - at(x, y - 1)) * 0.5 * depth;
    let nx = -gx, ny = gy, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    In.data[p] = (nx * 0.5 + 0.5) * 255; In.data[p + 1] = (ny * 0.5 + 0.5) * 255; In.data[p + 2] = (nz * 0.5 + 0.5) * 255; In.data[p + 3] = 255;
    const ao = Math.max(0.3, Math.min(1, 1 - aoK * Math.max(0, B[i] - Hm[i]) - (1 - Hm[i]) * (o.mortarAO || 0.12)));
    const ro = rough0 + (rough1 - rough0) * (1 - Hm[i]);
    Io.data[p] = ao * 255; Io.data[p + 1] = Math.min(1, ro) * 255; Io.data[p + 2] = 0; Io.data[p + 3] = 255;
  }
  gn.putImageData(In, 0, 0); go.putImageData(Io, 0, 0);
  const mk = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.userData.procPBR = key; return t; };
  const out = { normal: mk(cn), orm: mk(co), depth, key }; CACHE[key] = out; PBR_STATS.made.push(key); PBR_STATS.ms += performance.now() - t0; return out;
}
// 材質に付ける（法線の強さ ns。粗さは材質の roughness に画像の G が掛かる）
export function applyPBR(m, maps, o) {
  if (!m || !maps) return m; o = o || {}; const ns = o.normalScale === undefined ? 1 : o.normalScale;
  m.normalMap = maps.normal; m.normalScale = new THREE.Vector2(ns, ns); m.aoMap = maps.orm; m.aoMapIntensity = o.aoIntensity === undefined ? 1 : o.aoIntensity; m.roughnessMap = maps.orm;
  if (o.roughness !== undefined) m.roughness = o.roughness; m.userData.procPBR = maps.key; m.needsUpdate = true; return m;
}

// ---- 模様の高さ（色の画像の描き方と同じ並び） ----
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// 石畳・切石（geo.js の drawSetts と同じ：段ごとに半分ずらす。目地は 1.5 画素ずつ）。bevel：角の面取りの幅（画素）
export function settsHeight(cw, ch, seed, bevel) {
  bevel = bevel || Math.max(2, Math.min(cw, ch) * 0.12); const r = rng(seed || cw * 7 + ch); const tilt = new Map();
  const st = (row, col) => { const k = row * 4096 + col; if (!tilt.has(k)) tilt.set(k, [0.9 + r() * 0.1, (r() - 0.5) * 0.12, (r() - 0.5) * 0.12]); return tilt.get(k); };
  return (x, y) => {
    const row = Math.floor(y / ch); const off = (row % 2) * cw / 2; const xx = x + off; const col = Math.floor(xx / cw); const lx = xx - col * cw, ly = y - row * ch;
    const d = Math.min(lx - 1.5, cw - 1.5 - lx, ly - 1.5, ch - 1.5 - ly); if (d <= 0) return 0;
    const t = st(row, col); const u = lx / cw - 0.5, v = ly / ch - 0.5;
    return sstep(0, bevel, d) * (t[0] + t[1] * u + t[2] * v);
  };
}
// 六角のタイル（node_city.js の drawHex と同じ：頂点が 0°・60°…、隙間 2.2 画素）
export function hexHeight(R, bevel) {
  bevel = bevel || 3; const dy = Math.sqrt(3) * R; const ap = (R - 2.2) * Math.cos(Math.PI / 6);
  const N = [[Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)], [0, 1], [Math.cos(5 * Math.PI / 6), Math.sin(5 * Math.PI / 6)]];
  return (x, y) => {
    let best = -1e9; const i0 = Math.round(x / (1.5 * R));
    for (let i = i0 - 1; i <= i0 + 1; i++) { const cx = i * 1.5 * R; const oy = (((i % 2) + 2) % 2) ? dy / 2 : 0; const j0 = Math.round((y - oy) / dy);
      for (let j = j0 - 1; j <= j0 + 1; j++) { const cy = j * dy + oy; const px = x - cx, py = y - cy; let m = 0; for (const n of N) m = Math.max(m, Math.abs(px * n[0] + py * n[1])); best = Math.max(best, ap - m); } }
    return best <= 0 ? 0 : sstep(0, bevel, best);
  };
}
// 陶板（node_city.js の drawCeramic：128 画素の板が 2×2。目地は 0・127・128・255 の線、四隅の留め具）
export function ceramicHeight() {
  return (x, y) => { const lx = x % 128, ly = y % 128; const d = Math.min(lx - 1, 127 - lx, ly - 1, 127 - ly); if (d <= 0) return 0; let h = sstep(0, 3, d);
    for (const c of [10, 118]) for (const e of [10, 118]) { const q = Math.hypot(lx - c, ly - e); if (q < 3) h -= 0.25 * (1 - q / 3); }
    return h; };
}
