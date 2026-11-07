/* =========================================================
   LandmarkBuilder3D（v6.6）：フィールドの町・城・洞窟・塔を、場所ごとの固有デザイン（js/data/designs.js の LOCATION_DESIGNS）から組み立てる
   ・形（silhouette）・屋根（roofStyle）・建材の色（materials）・装飾（decoration）・周りの環境（environment）を読む。2D の地図の建物絵と同じデータ
   ・大きさ：入口のマスを中心に約3×3マス（＝「触れたら入る」範囲 World.landmarkFoot と同じ）。入口・門・洞窟の口は南（+Z）向き
   ・描画回数を抑える：頂点色つきの共通マテリアル（壁・石・屋根・木・布・金属・岩…）に、マップ内の全目印をまとめて結合する
   ・夜：窓（userData.window）が灯り、光る部品（たいまつ・結晶・ネオン）が強まり、町・城は上空に町明かりのにじみ（userData.nightGlow）と点光源の候補
   ・見た目だけ（当たり判定・出入りは2D版のまま）。デザインがない場所・組み立てに失敗した場所は従来の Blender の目印モデル
   ========================================================= */
import * as THREE from 'three';
import { box, M4, softTexture } from '../engine/Materials.js';
import { addCutout } from '../engine/Cutout.js';
import { Nature81 } from './Nature81.js';
import { rngFrom } from './TerrainBuilder3D.js';

const TAU = Math.PI * 2;
function hstr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// '#rrggbb' / 'rgba(r,g,b,a)' / 数値 → THREE.Color
function toColor(v, fb) {
  if (v === undefined || v === null || v === '') v = fb;
  if (typeof v === 'number') return new THREE.Color(v);
  const s = String(v); const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
  if (m) return new THREE.Color().setRGB(+m[1] / 255, +m[2] / 255, +m[3] / 255, THREE.SRGBColorSpace);
  try { return new THREE.Color(s); } catch (e) { return new THREE.Color(fb || 0x888888); }
}
function hexOf(v, fb) { return toColor(v, fb).getHex(); }
function mixHex(a, b, t) { return toColor(a).lerp(toColor(b), t).getHex(); }
function shadeHex(a, k) { const c = toColor(a); c.multiplyScalar(k); return c.getHex(); }
function colorize(g, hex) {
  const c = toColor(hex); const n = g.attributes.position.count; const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
// 三角柱（切妻の妻壁）：棟は X 方向、底は y=0・奥行き d、高さ h
function prism(w, h, d) {
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
  const P = [
    [x0, 0, z1], [x0, h, 0], [x0, 0, z0], [x1, 0, z0], [x1, h, 0], [x1, 0, z1],
    [x0, 0, z1], [x1, 0, z1], [x1, h, 0], [x0, 0, z1], [x1, h, 0], [x0, h, 0],
    [x0, 0, z0], [x0, h, 0], [x1, h, 0], [x0, 0, z0], [x1, h, 0], [x1, 0, z0]
  ];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
  const uv = []; for (const p of P) uv.push(p[0] + p[2], p[1]); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}
// でこぼこの岩（正二十面体を雑音で崩す。頂点の位置だけで決まるので面のすき間ができない）
function rockGeo(detail, seed, amp) {
  const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position;
  const n3 = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (n3(Math.round(x * 50) / 50, Math.round(y * 50) / 50, Math.round(z * 50) / 50) - 0.5) * amp;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals(); return g;
}

// 光の色（窓・たいまつ・結晶・ネオン）は、この中のいちばん近い色にまとめる
const GLOW_PAL = [0xffc070, 0xff8a2a, 0xff3a3a, 0xfff2b0, 0x7ae8ff, 0xc8f0ff, 0xb88aff, 0xff8ad0, 0x6ad8a0, 0xffd84a, 0x4a8aff, 0xf8f8f8];
function quant(v, fb) { const c = toColor(v, fb); let best = GLOW_PAL[0], bd = 1e9; const t = new THREE.Color(); for (const h of GLOW_PAL) { t.setHex(h); const d = (t.r - c.r) ** 2 + (t.g - c.g) ** 2 + (t.b - c.b) ** 2; if (d < bd) { bd = d; best = h; } } return best; }
// 頂点色つきの共通マテリアル（Materials ごとに1組）
function kitMaterials(mats) {
  if (mats._lmKit) return mats._lmKit;
  const mk = (name, base, o) => {
    let m;
    if (base) { m = mats.get(base).clone(); m.userData = {}; } else m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    m.color = new THREE.Color(0xffffff); m.vertexColors = true; if (o) Object.assign(m, o); m.name = 'lm_' + name; addCutout(m); return m;
  };
  // 描画回数を抑えるため、材質は少数にまとめる（壁・木・暗い穴は無地の「solid」、石垣と屋根だけ模様つき）。色は頂点色
  const solid = mk('solid', null, { roughness: 0.88 }), metal = mk('metal', null, { roughness: 0.38, metalness: 0.55 });
  const K = {
    plaster: solid, stone: mk('stone', 'stonewall'), roof: mk('roof', 'shingles'), wood: solid, timber: solid,
    flat: solid, rock: mk('rock', null, { roughness: 0.95, flatShading: true }), metal,
    cloth: mk('cloth', null, { roughness: 1, side: THREE.DoubleSide }), dark: solid, shiny: metal,
    _win: {}, _glow: {}, _halo: {}
  };
  // 窓：昼は暗い色、夜は灯る（LightingManager.windowMats）。光の色は少数の色にまとめる（マテリアル＝描画回数を増やさない）
  K.win = (hex, base) => { const g = quant(hex, 0xffc070), b = base ? 'face' : 'pane'; const k = g + '/' + b; if (!K._win[k]) { const m = new THREE.MeshStandardMaterial({ color: base ? 0xf0ead8 : 0x2a241c, emissive: g, emissiveIntensity: 0.25, roughness: 0.3 }); m.userData.window = true; m.name = 'lm_win_' + k; addCutout(m); K._win[k] = m; } return K._win[k]; };
  // 光る部品：夜に強まる（LightingManager.glowMats）。色は少数の色にまとめ、強さは共通
  K.glow = (hex) => { const g = quant(hex, 0xffb04a); if (!K._glow[g]) { const c = new THREE.Color(g); const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.6, roughness: 0.4 }); m.userData.bld = true; m.name = 'lm_glow_' + g.toString(16); addCutout(m); K._glow[g] = m; } return K._glow[g]; };
  // 町明かりのにじみ：夜だけ見える（LightingManager.nightMats）
  K.halo = (hex) => { const key = quant(hex, 0xffc070); if (!K._halo[key]) { const c = new THREE.Color(key); const m = new THREE.SpriteMaterial({ map: softTexture('rgba(' + Math.round(c.r * 255) + ',' + Math.round(c.g * 255) + ',' + Math.round(c.b * 255) + ',1)', 64), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }); m.userData.nightGlow = 0.42; K._halo[key] = m; } return K._halo[key]; };
  mats._lmKit = K; return K;
}

/* ---------------- 部品の組み立て（1つの目印＝1つの Kit） ---------------- */
class Kit {
  constructor(K, batch, origin, seed, env, scale, ry) {
    const S = this.S = scale || 1; this.ry = ry || 0;
    this.K = K; this.b = batch; this.O = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z).multiply(new THREE.Matrix4().makeRotationY(this.ry)).multiply(new THREE.Matrix4().makeScale(S, S, S)); this.o = origin.clone();
    this.r = rngFrom(seed); this.lights = []; this.smokes = []; this.sprites = []; this.env = env || {};
  }
  add(mat, g, m, hex) { colorize(g, hex === undefined || hex === null ? 0xffffff : hex); const T = this.O.clone(); if (m) T.multiply(m); this.b.add(mat, g, T); }
  W(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.O); }   // 目印の座標 → ワールド座標（向き・倍率を含む）
  light(x, y, z, hex, power, dist) { this.lights.push({ pos: this.W(x, y, z), color: hexOf(hex, 0xffb05a), power: power || 1, dist: (dist || 6) * this.S }); }
  smoke(x, y, z) { this.smokes.push(this.W(x, y, z)); }
  halo(y, s, hex) { const sp = new THREE.Sprite(this.K.halo(hexOf(hex, 0xffc070))); sp.position.copy(this.W(0, y, 0)); sp.scale.set(s * this.S, s * 0.7 * this.S, s * this.S); sp.renderOrder = 5; this.sprites.push(sp); }
  sprite(mat, x, y, z, sx, sy) { const sp = new THREE.Sprite(mat); sp.position.copy(this.W(x, y, z)); sp.scale.set(sx * this.S, sy * this.S, sx * this.S); this.sprites.push(sp); return sp; }
  model(id, x, z, ry, s, y) { if (!this.env.put) return; const v = this.W(x, 0, z); const wy = y !== undefined ? this.o.y + y * this.S : (this.env.heightAt ? this.env.heightAt(v.x, v.z) : this.o.y); this.env.put(id, M4(v.x, wy, v.z, (ry || 0) + this.ry, 0, 0, (s || 1) * this.S), v.x, v.z); }
  R(a, b) { return a + (b - a) * this.r(); }

  // 家：x,z 中心・幅 w（X）・奥行き d（Z）・壁の高さ h。o：wall roof style glow mat(plaster|stone|wood|metal) ry door chimney stilts snow rh
  house(x, z, w, d, h, o) {
    o = o || {}; const K = this.K; const base = M4(x, o.y || 0, z, o.ry || 0); const P = (lx, ly, lz, rx, rz, sx, sy, sz) => base.clone().multiply(M4(lx, ly, lz, 0, rx || 0, rz || 0, sx, sy, sz));
    const wallM = K[o.mat || 'plaster'] || K.plaster, wall = hexOf(o.wall, 0xeee2c8), roofC = hexOf(o.roof, 0xa8483a), style = o.style || 'gable';
    let y0 = 0;
    if (o.stilts) { y0 = o.stilts; for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.add(K.timber, box(0.06, y0 + 0.05, 0.06), P(sx * (w / 2 - 0.04), (y0 + 0.05) / 2 - 0.05, sz * (d / 2 - 0.04)), 0x6a4a2e); this.add(K.wood, box(w + 0.16, 0.04, d + 0.16, 0.5), P(0, y0, 0), 0x8a6a42); }
    else this.add(K.stone, box(w + 0.05, 0.06, d + 0.05, 0.5), P(0, 0.03, 0), hexOf(o.base, 0x8a8276));
    this.add(wallM, box(w, h, d, 0.6), P(0, y0 + h / 2, 0), wall);
    // 角の柱（木造）
    if (o.timbered) for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.add(K.timber, box(0.045, h, 0.045), P(sx * w / 2, y0 + h / 2, sz * d / 2), hexOf(o.wood, 0x6a4a2e));
    // 窓（正面・背面・側面）と扉
    const wm = K.win(hexOf(o.glow, 0xffc070)); const nW = Math.max(1, Math.floor(w / 0.3)); const wy = y0 + h * 0.58, ww = 0.085, wh = Math.min(0.12, h * 0.26);
    for (let i = 0; i < nW; i++) {
      const wx = -w / 2 + (i + 0.5) * w / nW; const door = o.door !== false && Math.abs(wx - (o.doorX || 0)) < 0.12 && h < 0.75;
      if (!door) this.add(wm, box(ww, wh, 0.02), P(wx, wy, d / 2 + 0.008));
      this.add(wm, box(ww, wh, 0.02), P(wx, wy, -d / 2 - 0.008));
      if (h >= 0.75) for (let yy = wy + 0.26; yy < y0 + h - 0.12; yy += 0.26) { this.add(wm, box(ww, wh, 0.02), P(wx, yy, d / 2 + 0.008)); this.add(wm, box(ww, wh, 0.02), P(wx, yy, -d / 2 - 0.008)); }
    }
    if (d >= 0.3) for (const sx of [-1, 1]) this.add(wm, box(0.02, wh, ww), P(sx * (w / 2 + 0.008), wy, 0));
    if (o.door !== false) { this.add(K.wood, box(0.13, Math.min(0.24, h * 0.5), 0.025), P(o.doorX || 0, y0 + Math.min(0.12, h * 0.25), d / 2 + 0.012), hexOf(o.doorC, 0x4a2e1a)); }
    // 屋根
    this.roof(P, w, d, y0 + h, style, roofC, o);
    if (o.chimney) { const cx = w * 0.28, cz = -d * 0.12; const ch = (o.rh || d * 0.5) * 0.9 + 0.12; this.add(K.stone, box(0.08, ch, 0.08, 0.3), P(cx, y0 + h + ch / 2, cz), 0x7a7268); const wp = new THREE.Vector3(cx, y0 + h + ch + 0.05, cz).applyMatrix4(base); this.smoke(wp.x, wp.y, wp.z); }
    return { top: y0 + h };
  }
  roof(P, w, d, y, style, roofC, o) {
    const K = this.K; const ov = 0.06;
    const gable = (rh, thick, mat, col) => {
      const a = Math.atan2(rh, d / 2); const half = d / 2 + ov; const L = half / Math.cos(a);
      this.add(K[o.mat || 'plaster'] || K.plaster, prism(w, rh, d), P(0, y, 0), hexOf(o.wall, 0xeee2c8));
      for (const s of [1, -1]) {
        const cz = s * half / 2, cy = y + rh - (half / 2) * Math.tan(a);
        this.add(mat, box(w + ov * 2, thick, L, 0.4), P(0, cy + Math.cos(a) * thick / 2, cz + s * Math.sin(a) * thick / 2, s * a), col);
      }
      if (o.snow) for (const s of [1, -1]) { const cz = s * half / 2, cy = y + rh - (half / 2) * Math.tan(a); this.add(K.flat, box(w + ov * 2, 0.03, L * 0.9), P(0, cy + Math.cos(a) * (thick + 0.02), cz * 0.95 + s * Math.sin(a) * (thick + 0.02), s * a), 0xf4f8ff); }
      return { a, L, half };
    };
    switch (style) {
      case 'thatch': { const r = gable(o.rh || d * 0.62, 0.08, K.roof, roofC); this.add(K.wood, new THREE.CylinderGeometry(0.035, 0.035, w + 0.16, 6), P(0, y + (o.rh || d * 0.62) + 0.02, 0, 0, Math.PI / 2), shadeHex(roofC, 0.7)); break; }
      case 'steep': gable(o.rh || d * 0.95, 0.045, K.roof, roofC); break;
      case 'iron': gable(o.rh || d * 0.42, 0.04, K.metal, roofC); break;
      case 'pediment': gable(o.rh || d * 0.3, 0.05, K.stone, roofC); break;
      case 'patched': { const r = gable(o.rh || d * 0.5, 0.045, K.roof, roofC); for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; this.add(K.wood, box(0.14, 0.012, 0.12), P(this.R(-w / 3, w / 3), y + (o.rh || d * 0.5) * 0.5 + 0.03, s * d * 0.25, s * r.a), hexOf(o.patch, 0x9a7a4a)); } break; }
      case 'broken': { const rh = o.rh || d * 0.5; const a = Math.atan2(rh, d / 2); const half = d / 2 + ov; const L = half / Math.cos(a); this.add(K[o.mat || 'stone'] || K.stone, prism(w * 0.7, rh * 0.8, d), P(-w * 0.15, y, 0), hexOf(o.wall, 0xb0a898)); this.add(K.roof, box(w * 0.55, 0.04, L), P(-w * 0.2, y + rh * 0.5, half / 2, a), roofC); break; }
      case 'hip': case 'pyramid': { const rh = o.rh || Math.max(w, d) * (style === 'pyramid' ? 0.75 : 0.45); this.add(K.roof, new THREE.ConeGeometry(Math.SQRT1_2, 1, 4), P(0, y + rh / 2, 0, 0, 0, w + ov * 2, rh, d + ov * 2).multiply(M4(0, 0, 0, Math.PI / 4)), roofC); break; }
      case 'flat': { this.add(K.stone, box(w + 0.04, 0.05, d + 0.04, 0.4), P(0, y + 0.025, 0), shadeHex(hexOf(o.wall, 0xdddddd), 0.85)); for (const s of [1, -1]) { this.add(K.stone, box(w + 0.04, 0.06, 0.03), P(0, y + 0.08, s * (d / 2 + 0.005)), hexOf(o.wall, 0xdddddd)); this.add(K.stone, box(0.03, 0.06, d + 0.04), P(s * (w / 2 + 0.005), y + 0.08, 0), hexOf(o.wall, 0xdddddd)); } break; }
      case 'dome': { const r = Math.min(w, d) * 0.5; this.add(K.stone, new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.06, 16), P(0, y + 0.03, 0), hexOf(o.wall, 0xdddddd)); this.add(K.shiny, new THREE.SphereGeometry(r * 0.9, 16, 8, 0, TAU, 0, Math.PI / 2), P(0, y + 0.06, 0, 0, 0, 1, (o.rh || r) / r, 1), roofC); if (o.finial !== false) this.add(K.metal, new THREE.ConeGeometry(0.025, 0.14, 6), P(0, y + 0.06 + (o.rh || r) * 0.9 + 0.06, 0), 0xd8b04a); break; }
      case 'spire': { const r = Math.min(w, d) * 0.62; const rh = o.rh || r * 2.6; this.add(K.roof, new THREE.ConeGeometry(r, rh, 8), P(0, y + rh / 2, 0), roofC); break; }
      case 'spike': { const r = Math.min(w, d) * 0.5; const rh = o.rh || r * 3.2; this.add(K.metal, new THREE.ConeGeometry(r, rh, 6), P(0, y + rh / 2, 0), roofC); for (const s of [-1, 1]) this.add(K.metal, new THREE.ConeGeometry(r * 0.3, rh * 0.45, 5), P(s * w * 0.4, y + rh * 0.22, 0), roofC); break; }
      case 'shed': { const rh = o.rh || d * 0.28; const a = Math.atan2(rh, d); const L = (d + ov * 2) / Math.cos(a); this.add(K.roof, box(w + ov * 2, 0.04, L), P(0, y + rh / 2 + 0.02, 0, a), roofC); break; }
      case 'sawtooth': { const n = Math.max(2, Math.round(w / 0.32)); const sw = w / n; const rh = o.rh || 0.2; const wm = K.win(hexOf(o.glow, 0xffd090)); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * sw; const a = Math.atan2(rh, d); const L = d / Math.cos(a); this.add(K.metal, box(sw * 0.98, 0.03, L), P(x, y + rh / 2, 0, -a), roofC); this.add(wm, box(sw * 0.9, rh * 0.8, 0.02), P(x, y + rh * 0.45, d / 2 - 0.01)); } break; }
      case 'leaf': { const r = Math.max(w, d) * 0.62; this.add(K.rock, rockGeo(1, 3, 0.35), P(0, y + r * 0.35, 0, 0, 0, r, r * 0.55, r), hexOf(o.roof, 0x4f8a3a)); break; }
      case 'tent': break;
      default: gable(o.rh || d * 0.5, 0.045, K.roof, roofC);
    }
  }
  // 円い塔：top＝cone|dome|crenel|flat|lamp|spike
  tower(x, z, r, h, o) {
    o = o || {}; const K = this.K; const wallM = K[o.mat || 'stone'] || K.stone; const y0 = o.y || 0;
    if (o.bands) { const n = o.bands.length; for (let i = 0; i < n; i++) this.add(wallM, new THREE.CylinderGeometry(r * (1 - 0.1 * (i + 1) / n), r * (1 - 0.1 * i / n), h / n, 12), M4(x, y0 + h / n * (i + 0.5), z), hexOf(o.bands[i])); }
    else this.add(wallM, new THREE.CylinderGeometry(r * 0.9, r, h, 12, 1), M4(x, y0 + h / 2, z), hexOf(o.wall, 0xc8c0b4));
    const wm = K.win(hexOf(o.glow, 0xffc070)); const nl = Math.max(1, Math.floor(h / 0.42));
    for (let k = 0; k < nl; k++) { const yy = y0 + h * (0.35 + 0.5 * k / Math.max(1, nl)); for (const a of [0, 2.1, -2.1]) this.add(wm, box(0.06, 0.1, 0.02), M4(x + Math.sin(a) * r * 0.93, yy, z + Math.cos(a) * r * 0.93, a)); }
    const top = o.top || 'cone'; const roofC = hexOf(o.roof, 0x3f5f9f); const yt = y0 + h;
    if (top === 'cone') { const rh = o.rh || r * 2.6; this.add(K.roof, new THREE.ConeGeometry(r * 1.2, rh, 10), M4(x, yt + rh / 2, z), roofC); this.add(K.metal, new THREE.SphereGeometry(0.025, 6, 4), M4(x, yt + rh + 0.02, z), 0xd8b04a); }
    else if (top === 'dome') { this.add(K.shiny, new THREE.SphereGeometry(r * 1.02, 12, 6, 0, TAU, 0, Math.PI / 2), M4(x, yt, z), roofC); }
    else if (top === 'crenel' || top === 'flat') { this.add(wallM, new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.08, 12), M4(x, yt + 0.04, z), hexOf(o.wall, 0xc8c0b4)); if (top === 'crenel') for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; this.add(wallM, box(0.06, 0.07, 0.06), M4(x + Math.sin(a) * r * 1.05, yt + 0.115, z + Math.cos(a) * r * 1.05, a), hexOf(o.wall, 0xc8c0b4)); } }
    else if (top === 'lamp') { const g = hexOf(o.glow, 0xfff2a0); this.add(K.glow(g, 1.6), new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.18, 10), M4(x, yt + 0.09, z)); this.add(K.metal, new THREE.ConeGeometry(r * 0.95, 0.2, 10), M4(x, yt + 0.28, z), roofC); this.light(x, yt + 0.1, z, g, 1.4, 8); }
    else if (top === 'spike') { const rh = o.rh || r * 4; this.add(K.metal, new THREE.ConeGeometry(r * 0.95, rh, 6), M4(x, yt + rh / 2, z), roofC); }
    return yt;
  }
  // 城壁（四角）：前（+Z）の中央に門。corner＝角の塔の屋根
  walls(w, d, h, o) {
    o = o || {}; const K = this.K; const wallM = K[o.mat || 'stone'] || K.stone; const c = hexOf(o.wall, 0xd8d2c8); const t = 0.1; const gw = o.gate || 0.64;   // v7.9.3 門を広く（前 0.42）
    const seg = (x, z, len, alongX) => { this.add(wallM, box(alongX ? len : t, h, alongX ? t : len, 0.4), M4(x, h / 2, z), c); const n = Math.floor(len / 0.13); for (let i = 0; i < n; i += 2) { const u = -len / 2 + (i + 0.5) * len / n; this.add(wallM, box(alongX ? len / n : t * 1.1, 0.06, alongX ? t * 1.1 : len / n), M4(alongX ? x + u : x, h + 0.03, alongX ? z : z + u), c); } };
    seg(0, -d / 2, w, true); seg(-w / 2, 0, d, false); seg(w / 2, 0, d, false);
    const side = (w - gw) / 2; seg(-w / 2 + side / 2, d / 2, side, true); seg(w / 2 - side / 2, d / 2, side, true);
    // v7.9.3 門：城壁より高い楼門（石のアーチ・両開きの扉・上げた落とし格子・張り出した胸壁）と、左右の太い塔。夜は門灯
    const ow = gw * 0.6, ar = ow / 2, rh = h * 0.72, apex = rh + ar, Hg = Math.max(h * 2.05, apex + 0.24), gd = 0.36, zf = d / 2 + gd / 2 - 0.02;
    const pw = (gw - ow) / 2 + 0.04; const lite = shadeHex(c, 1.12), dk = shadeHex(c, 0.78);
    for (const s of [-1, 1]) this.add(wallM, box(pw, Hg, gd, 0.4), M4(s * (ow / 2 + pw / 2), Hg / 2, d / 2), c);
    this.add(wallM, box(ow, Hg - apex, gd, 0.4), M4(0, apex + (Hg - apex) / 2, d / 2), c);
    const sp = new THREE.Shape(); sp.moveTo(-ar, 0); sp.lineTo(-ar, ar + 0.004); sp.lineTo(ar, ar + 0.004); sp.lineTo(ar, 0); sp.absarc(0, 0, ar, 0, Math.PI, false);
    this.add(wallM, new THREE.ExtrudeGeometry(sp, { depth: gd, bevelEnabled: false, curveSegments: 10 }), M4(0, rh, d / 2 - gd / 2), c);
    this.add(K.stone, new THREE.TorusGeometry(ar + 0.025, 0.022, 5, 12, Math.PI), M4(0, rh, zf + 0.004), lite);   // 迫石
    this.add(K.stone, box(0.05, 0.06, 0.03), M4(0, apex + 0.02, zf + 0.01), lite);   // 要石
    // 扉（アーチの形・少し奥）と鉄の帯
    const ds = new THREE.Shape(); ds.moveTo(-ar, -rh); ds.lineTo(-ar, 0); ds.absarc(0, 0, ar, Math.PI, 0, true); ds.lineTo(ar, -rh); ds.lineTo(-ar, -rh);
    this.add(o.gateGlow ? K.glow(o.gateGlow, 1.4) : K.wood, new THREE.ExtrudeGeometry(ds, { depth: 0.012, bevelEnabled: false, curveSegments: 10 }), M4(0, rh, zf - 0.07), o.gateGlow ? undefined : 0x5a3820);
    if (!o.gateGlow) { this.add(K.metal, box(0.008, apex - 0.01, 0.006), M4(0, (apex - 0.01) / 2, zf - 0.055), 0x2a2a30); for (const y of [rh * 0.25, rh * 0.62]) this.add(K.metal, box(ow - 0.02, 0.012, 0.006), M4(0, y, zf - 0.055), 0x2a2a30); }
    // 上げた落とし格子（アーチの上の方に下の歯）
    for (let i = 0; i <= 5; i++) { const x = -ar + 0.02 + i * (ow - 0.04) / 5; const top = Math.sqrt(Math.max(0, ar * ar - x * x)); const y0 = rh + 0.02; const len = rh + top - y0; if (len < 0.02) continue; this.add(K.metal, box(0.01, len, 0.01), M4(x, y0 + len / 2, zf - 0.03), 0x34343c); this.add(K.metal, new THREE.ConeGeometry(0.008, 0.03, 4), M4(x, y0 - 0.015, zf - 0.03, 0, Math.PI), 0x34343c); }
    // 張り出した胸壁（持ち送り＋凸凹）
    for (let x = -gw / 2 + 0.03; x <= gw / 2 - 0.02; x += 0.07) this.add(wallM, box(0.03, 0.05, 0.05), M4(x, Hg - 0.025, zf + 0.02), dk);
    this.add(wallM, box(gw + 0.04, 0.03, gd + 0.08), M4(0, Hg + 0.015, d / 2 + 0.04), c);
    const nm = Math.max(5, Math.round(gw / 0.08)); for (let i = 0; i < nm; i += 2) { const x = -gw / 2 + (i + 0.5) * gw / nm; this.add(wallM, box(gw / nm, 0.07, 0.04), M4(x, Hg + 0.065, zf + 0.04), c); }
    // 旗（紋章の色＝屋根の色）
    for (const s of [-1, 1]) { this.add(K.cloth, box(0.1, 0.26, 0.004), M4(s * (ow / 2 + pw / 2), Hg - 0.19, zf + 0.012), hexOf(o.roof, 0x2a4f9a)); this.add(K.metal, box(0.06, 0.04, 0.006), M4(s * (ow / 2 + pw / 2), Hg - 0.15, zf + 0.016), 0xd8b04a); }
    // 左右の太い塔（城壁より高い）
    for (const s of [-1, 1]) this.tower(s * (gw / 2 + 0.12), d / 2 + 0.03, 0.165, Hg + 0.26, { top: o.gateTop || 'crenel', wall: c, roof: o.roof, glow: o.glow, mat: o.mat });
    if (o.lamps !== false) for (const s of [-1, 1]) { this.add(K.glow(hexOf(o.glow, 0xffb04a), 1.2), new THREE.SphereGeometry(0.03, 6, 4), M4(s * (ow / 2 + 0.04), rh * 0.9, zf + 0.05)); }
    this.light(0, h * 1.1, d / 2 + 0.3, hexOf(o.glow, 0xffb04a), 1.1, 6);
    // 角の塔
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.tower(sx * w / 2, sz * d / 2, 0.13, h * 1.5, { top: o.corner || 'cone', wall: c, roof: o.roof, glow: o.glow, mat: o.mat, rh: o.cornerRh });
    // 堀
    if (o.moat) { const mc = 0x3a6aa8; const mw = 0.14; for (const s of [-1, 1]) { this.add(K.shiny, box(w + 0.5, 0.02, mw), M4(0, 0.012, s * (d / 2 + 0.2)), mc); this.add(K.shiny, box(mw, 0.02, d + 0.26), M4(s * (w / 2 + 0.2), 0.012, 0), mc); } this.add(K.wood, box(gw * 0.66, 0.03, 0.34), M4(0, 0.03, d / 2 + 0.22), 0x7a5a32); for (const s of [-1, 1]) { const x = s * gw * 0.31; const a = Math.atan2(h * 0.62, 0.36); this.add(K.metal, new THREE.CylinderGeometry(0.006, 0.006, Math.hypot(h * 0.62, 0.36), 4), M4(x, 0.03 + h * 0.31, d / 2 + 0.2, 0, -(Math.PI / 2 - a)), 0x34343c); } }   // v7.9.3 跳ね橋（鎖つき）
  }
  // 岩山（洞窟の丘）：rx ry rz・色（rockD→rock→rockL）・雪
  mound(x, z, rx, ry, rz, o) {
    o = o || {}; const g = Nature81.on() ? Nature81.chunk(o.seed || 1, 2, { amp: 0.2, planes: 7 }) : rockGeo(2, o.seed || 1, o.amp || 0.32); const p = g.attributes.position; const n = p.count; const col = new Float32Array(n * 3);   // v8.1 角ばった塊（Nature81）
    const cD = toColor(o.rockD, 0x5e574e), cM = toColor(o.rock, 0x8c8478), cL = toColor(o.rockL, 0xb4ab9c), cS = toColor(o.snow || 0xf4f6ff), tmp = new THREE.Color();
    for (let i = 0; i < n; i++) { const yy = p.getY(i); if (yy < -0.2) p.setY(i, -0.2); const t = Math.max(0, Math.min(1, (yy + 0.2) / 1.2)); if (o.snow && t > 0.72) tmp.copy(cS); else if (t < 0.5) tmp.copy(cD).lerp(cM, t * 2); else tmp.copy(cM).lerp(cL, (t - 0.5) * 2); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b; }
    g.computeVertexNormals(); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const T = this.O.clone().multiply(M4(x, ry * 0.2 - 0.02, z, o.ry || 0, 0, 0, rx, ry, rz)); this.b.add(this.K.rock, g, T);
  }
  // 洞窟の口（南向き）：暗い半円＋奥の闇。timber：木枠
  mouth(x, z, w, h, o) {
    o = o || {}; const K = this.K;
    this.add(K.dark, new THREE.CircleGeometry(0.5, 16, 0, Math.PI), M4(x, 0.0, z, 0, 0, 0, w, h * 2, 1), 0x0a0806);
    this.add(K.dark, box(w * 0.8, h * 0.9, 0.3), M4(x, h * 0.45, z - 0.16), 0x050403);
    if (o.timber) { const c = hexOf(o.wood, 0x6a4426); for (const s of [-1, 1]) this.add(K.timber, box(0.06, h * 1.05, 0.06), M4(x + s * w * 0.42, h * 0.52, z + 0.02, 0, 0, s * 0.06), c); this.add(K.timber, box(w * 1.0, 0.07, 0.07), M4(x, h * 1.02, z + 0.02), c); }
  }
  peak(x, z, r, h, o) {
    o = o || {}; const g = new THREE.ConeGeometry(r, h, 7, 3); const p = g.attributes.position; const n = p.count; const col = new Float32Array(n * 3);
    const cD = toColor(o.rockD, 0x5a5248), cM = toColor(o.rock, 0x8a7e70), cL = toColor(o.rockL, 0xb6aa98), cS = toColor(o.snow || 0xf4f6ff), tmp = new THREE.Color(); const seed = o.seed || 1;
    for (let i = 0; i < n; i++) { const yy = p.getY(i); const t = (yy + h / 2) / h; if (t > 0.02 && t < 0.98) { const a = Math.sin(p.getX(i) * 9 + seed) * Math.cos(p.getZ(i) * 7 + seed); p.setX(i, p.getX(i) * (1 + a * 0.12)); p.setZ(i, p.getZ(i) * (1 + a * 0.12)); } if (o.snow && t > 0.68) tmp.copy(cS); else if (t < 0.5) tmp.copy(cD).lerp(cM, t * 2); else tmp.copy(cM).lerp(cL, (t - 0.5) * 2); col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); const g3 = g.toNonIndexed(); g3.computeVertexNormals();   // 頂点色は toNonIndexed で引き継がれる（面ごとの法線＝ローポリの岩肌）
    this.b.add(this.K.rock, g3, this.O.clone().multiply(M4(x, h / 2 - 0.02, z, o.ry || 0)));
  }
  tree(x, z, s, o) {
    o = o || {}; const K = this.K;
    if (Nature81.on() && this.env && this.env.put) { const id = o.pine ? (o.snow ? 'tree_snowpine' : ['tree_pine_a', 'tree_pine_b', 'tree_pine_c'][Math.floor(this.r() * 3)]) : ['tree_oak_a', 'tree_oak_b', 'tree_oak_c'][Math.floor(this.r() * 3)]; this.model(id, x, z, this.r() * 6.28, (o.pine ? 0.25 : 0.27) * s); return; }   // v8.1 フィールドの木と同じ形（Nature81）
    const leaf = hexOf(o.leaf, 0x3f7a34), leafL = hexOf(o.leafL, mixHex(leaf, 0xffffff, 0.18));
    this.add(K.wood, new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.42 * s, 6), M4(x, 0.21 * s, z), hexOf(o.wood, 0x5a3a22));
    if (o.pine) { for (let i = 0; i < 3; i++) this.add(K.rock, new THREE.ConeGeometry((0.3 - i * 0.07) * s, 0.36 * s, 7), M4(x, (0.42 + i * 0.2) * s, z), i === 2 && o.snow ? 0xf0f4ff : i ? leafL : leaf); return; }
    this.add(K.rock, rockGeo(1, x * 7 + z, 0.3), M4(x, 0.55 * s, z, this.r() * 6, 0, 0, 0.3 * s, 0.26 * s, 0.3 * s), leaf);
    this.add(K.rock, rockGeo(1, x * 3 + z * 5, 0.3), M4(x + 0.08 * s, 0.68 * s, z - 0.05 * s, 0, 0, 0, 0.2 * s), leafL);
  }
  palm(x, z, s) { const K = this.K; const lean = (this.r() - 0.5) * 0.3; this.add(K.wood, new THREE.CylinderGeometry(0.025 * s, 0.04 * s, 0.6 * s, 6), M4(x, 0.3 * s, z, 0, 0, lean), 0x8a6a42); const tx = x - Math.sin(lean) * 0.6 * s, ty = 0.6 * s; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + this.r() * 0.4; this.add(K.cloth, box(0.07 * s, 0.01 * s, 0.34 * s), M4(tx + Math.sin(a) * 0.15 * s, ty - 0.03 * s, z + Math.cos(a) * 0.15 * s, a, 0.35), i % 2 ? 0x3f8a3a : 0x5aa040); } }
  lamp(x, z, h, hex, power) { const K = this.K; this.add(K.metal, new THREE.CylinderGeometry(0.012, 0.016, h, 5), M4(x, h / 2, z), 0x3a3a42); this.add(K.glow(hexOf(hex, 0xffb04a), 1.6), new THREE.SphereGeometry(0.035, 8, 5), M4(x, h + 0.02, z)); this.light(x, h, z, hex || 0xffb04a, power || 0.7, 5); }
  torch(x, z, h, hex) { const K = this.K; this.add(K.wood, new THREE.CylinderGeometry(0.014, 0.018, h, 5), M4(x, h / 2, z), 0x5a3a22); this.add(K.glow(hexOf(hex, 0xff9a3a), 2.0), new THREE.ConeGeometry(0.04, 0.1, 6), M4(x, h + 0.05, z)); this.light(x, h + 0.05, z, hex || 0xff9a3a, 0.9, 5); }
  fire(x, z, s, hex) { const K = this.K; for (let i = 0; i < 3; i++) this.add(K.wood, box(0.2 * s, 0.035 * s, 0.035 * s), M4(x, 0.02 * s, z, i * 1.05), 0x5a3a22); this.add(K.glow(hexOf(hex, 0xff8a2a), 2.2), new THREE.ConeGeometry(0.07 * s, 0.2 * s, 7), M4(x, 0.11 * s, z)); this.light(x, 0.2, z, hex || 0xff8a2a, 1.2, 6); }
  flag(x, z, h, hex, o) { o = o || {}; const K = this.K; this.add(K.metal, new THREE.CylinderGeometry(0.01, 0.012, h, 5), M4(x, (o.y || 0) + h / 2, z), 0x4a4a52); this.add(K.cloth, box(0.2, 0.12, 0.006), M4(x + 0.1, (o.y || 0) + h - 0.07, z, o.ry || 0), hexOf(hex, 0xd83a3a)); }
  crystal(x, z, h, hex, o) { o = o || {}; this.add(this.K.glow(hexOf(hex, 0x9ad8ff), 1.1), new THREE.OctahedronGeometry(0.5, 0), M4(x, (o.y || 0) + h / 2, z, o.ry || this.r() * 3, o.tilt || 0, 0, h * 0.28, h, h * 0.28)); }
  column(x, z, r, h, hex, o) { o = o || {}; const K = this.K; const y0 = o.y || 0; const c = hexOf(hex, 0xeeeae0); this.add(K.stone, new THREE.CylinderGeometry(r, r, h, 8), M4(x, y0 + h / 2, z), c); this.add(K.stone, box(r * 2.6, 0.035, r * 2.6), M4(x, y0 + h + 0.017, z), c); this.add(K.stone, box(r * 2.6, 0.03, r * 2.6), M4(x, y0 + 0.015, z), c); }
  steps(w, d, n, sh, hex, o) { o = o || {}; for (let i = 0; i < n; i++) this.add(this.K.stone, box(w - i * (o.dw || 0.14), sh, d - i * (o.dd || 0.14), 0.4), M4(o.x || 0, sh * (i + 0.5), o.z || 0), shadeHex(hexOf(hex, 0xc8c0b0), 1 - i * 0.04)); return sh * n; }
  ring(x, y, z, R, tube, hex, inner, k) { this.add(this.K.stone, new THREE.TorusGeometry(R, tube, 8, 28), M4(x, y, z), hexOf(hex, 0xa8a2b8)); if (inner) { this.add(this.K.glow(hexOf(inner, 0x8ae0ff), k || 1.6), new THREE.CircleGeometry(R * 0.9, 24), M4(x, y, z + 0.005)); this.light(x, y, z + 0.3, inner, 1.2, 6); } }
  gear(x, y, z, r, hex) { const K = this.K; const c = hexOf(hex, 0x6a6a76); this.add(K.metal, new THREE.CylinderGeometry(r, r, 0.05, 16), M4(x, y, z, 0, Math.PI / 2), c); this.add(K.metal, new THREE.CylinderGeometry(r * 0.25, r * 0.25, 0.08, 10), M4(x, y, z + 0.01, 0, Math.PI / 2), shadeHex(c, 0.7)); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; this.add(K.metal, box(r * 0.22, r * 0.22, 0.05), M4(x + Math.cos(a) * r, y + Math.sin(a) * r, z, 0, 0, a), c); } }
  clock(x, y, z, r, o) { o = o || {}; const K = this.K; this.add(K.win(hexOf(o.glow, 0xffe8b0), hexOf(o.face, 0xf4ecd8)), new THREE.CircleGeometry(r, 20), M4(x, y, z)); this.add(K.metal, new THREE.TorusGeometry(r, r * 0.1, 6, 20), M4(x, y, z), 0xd8b04a); const ha = o.moving === false ? 0.6 : 2.1; this.add(K.dark, box(r * 0.08, r * 0.62, 0.012), M4(x, y, z + 0.008, 0, 0, ha).multiply(M4(0, r * 0.3, 0)), 0x1a1410); this.add(K.dark, box(r * 0.08, r * 0.82, 0.012), M4(x, y, z + 0.012, 0, 0, -0.9).multiply(M4(0, r * 0.4, 0)), 0x1a1410); }
  tent(x, z, r, h, hex, o) { o = o || {}; const K = this.K; this.add(K.cloth, new THREE.ConeGeometry(r, h, o.seg || 7, 1, true), M4(x, h / 2, z, o.ry || 0), hexOf(hex, 0xd8c8a0)); this.add(K.dark, new THREE.CircleGeometry(r * 0.35, 8, 0, Math.PI), M4(x, 0.0, z + r * 0.72, 0, -0.35, 0, 1, 1.4, 1), 0x2a1e14); this.add(K.wood, new THREE.CylinderGeometry(0.008, 0.008, h * 0.25, 4), M4(x, h + h * 0.1, z), 0x5a3a22); }
  path(x0, z0, x1, z1, wdt, hex) { const L = Math.hypot(x1 - x0, z1 - z0); this.add(this.K.flat, box(wdt, 0.012, L), M4((x0 + x1) / 2, 0.006, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0)), hexOf(hex, 0xb8a078)); }
  fence(pts, hex) { const K = this.K; const c = hexOf(hex, 0x8a6a42); for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const L = Math.hypot(bx - ax, bz - az); const ry = Math.atan2(bx - ax, bz - az); this.add(K.wood, box(0.018, 0.018, L), M4((ax + bx) / 2, 0.1, (az + bz) / 2, ry), c); this.add(K.wood, box(0.018, 0.018, L), M4((ax + bx) / 2, 0.05, (az + bz) / 2, ry), c); const n = Math.max(1, Math.round(L / 0.16)); for (let k = 0; k <= n; k++) { const t = k / n; this.add(K.wood, box(0.025, 0.14, 0.025), M4(ax + (bx - ax) * t, 0.07, az + (bz - az) * t), c); } } }
  crops(x, z, w, d, hex) { const K = this.K; this.add(K.flat, box(w, 0.02, d), M4(x, 0.01, z), 0x6a4a2a); for (let i = 0; i < 4; i++) this.add(K.rock, box(w * 0.9, 0.05, d / 8), M4(x, 0.04, z - d / 2 + (i + 0.5) * d / 4), hexOf(hex, 0x6aa040)); }
  stake(x, z, h, hex) { this.add(this.K.wood, new THREE.ConeGeometry(0.03, h, 5), M4(x, h / 2, z), hexOf(hex, 0x6a4a2e)); }
  boat(x, z, ry, hex) { const K = this.K; const b = M4(x, 0.02, z, ry || 0); const P = (lx, ly, lz, rx, rz, sx, sy, sz) => b.clone().multiply(M4(lx, ly, lz, 0, rx || 0, rz || 0, sx, sy, sz)); this.add(K.wood, new THREE.CylinderGeometry(0.09, 0.05, 0.42, 8, 1, false, 0, Math.PI), P(0, 0.03, 0, Math.PI / 2, 0), hexOf(hex, 0x7a4a2a)); this.add(K.wood, new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), P(0, 0.2, 0), 0x5a3a22); this.add(K.cloth, box(0.005, 0.22, 0.16), P(0, 0.24, 0.03), 0xf2ead8); }
  pier(x, z, len, ry) { const K = this.K; const b = M4(x, 0, z, ry || 0); this.add(K.wood, box(0.16, 0.025, len), b.clone().multiply(M4(0, 0.03, len / 2)), 0x8a6a42); for (let i = 0; i <= 3; i++) for (const s of [-1, 1]) this.add(K.timber, box(0.025, 0.12, 0.025), b.clone().multiply(M4(s * 0.07, 0.0, i * len / 3)), 0x5a3a22); }
  stone(x, z, s, hex) { if (Nature81.on() && this.env && this.env.put) { this.model(this.r() < 0.5 ? 'rock_a' : 'rock_b', x, z, this.r() * 6.28, s * 1.15); return; }   // v8.1 フィールドの岩と同じ形
    this.add(this.K.rock, rockGeo(1, x * 13 + z * 7, 0.4), M4(x, s * 0.35, z, this.r() * 6, 0, 0, s * 0.6, s * 0.7, s * 0.5), hexOf(hex, 0x8a8478)); }
}

/* ---------------- 形ごとの組み立て ---------------- */
const has = (D, k) => (D.decoration || []).includes(k) || (D.environment || []).includes(k);
function col(D, k, fb) { const m = D.materials || {}; return m[k] !== undefined ? m[k] : fb; }

const VILLAGE_LAYOUT = [   // x, z, w, d, h, ry
  [-0.72, -0.42, 0.62, 0.48, 0.42, 0.18], [0.7, -0.58, 0.58, 0.46, 0.4, -0.14], [-0.05, -1.0, 0.74, 0.52, 0.5, 0], [-0.98, 0.48, 0.5, 0.42, 0.36, 0.35], [0.95, 0.3, 0.5, 0.4, 0.36, -0.3]
];
function village(k, D) {
  const S = D.silhouette, rs = D.roofStyle; const wall = col(D, 'wall', '#e8d2a6'), roof = col(D, 'roof', '#c8a24e'), roofD = col(D, 'roofD', roof), glow = col(D, 'glow', '#ffc070');
  const faded = S === 'faded_village'; const pale = (h) => faded ? mixHex(h, '#c8c8cc', 0.55) : h;
  if (S === 'tree_village') {   // 巨木と木の家・吊り橋
    if (Nature81.on() && k.env && k.env.put) k.model('tree_oak_c', 0, -0.35, 0.3, 0.66);   // v8.1 巨木もフィールドの木と同じ形（Nature81）
    else {
      k.add(k.K.wood, new THREE.CylinderGeometry(0.2, 0.32, 1.6, 9), M4(0, 0.8, -0.35), hexOf(col(D, 'wood', '#6a4426')));
      for (const [x, y, z, s] of [[0, 1.75, -0.35, 0.95], [-0.45, 1.5, -0.2, 0.62], [0.45, 1.55, -0.45, 0.66], [0.05, 1.45, 0.15, 0.6]]) k.add(k.K.rock, rockGeo(1, x * 9 + z, 0.3), M4(x, y, z, k.r() * 6, 0, 0, s, s * 0.62, s), hexOf(col(D, 'roof', '#4f8a3a')));
    }
    k.house(-0.8, 0.15, 0.48, 0.4, 0.36, { wall, roof: col(D, 'roof'), style: 'leaf', glow, ry: 0.4, mat: 'wood', stilts: 0.18 });
    k.house(0.82, 0.05, 0.46, 0.4, 0.34, { wall, roof: col(D, 'roof'), style: 'leaf', glow, ry: -0.35, mat: 'wood', stilts: 0.18 });
    k.house(0, -0.35, 0.36, 0.3, 0.3, { wall, roof: roofD, style: 'leaf', glow, mat: 'wood', y: 0.75, door: false });
    k.add(k.K.wood, box(0.62, 0.02, 0.07), M4(-0.42, 0.45, -0.05, 0.45, 0, -0.35), hexOf(col(D, 'wood', '#6a4426')));
    k.add(k.K.wood, box(0.62, 0.02, 0.07), M4(0.42, 0.45, -0.15, -0.35, 0, 0.35), hexOf(col(D, 'wood', '#6a4426')));
    for (const [x, z] of [[-0.45, 0.55], [0.45, 0.5], [0, 0.75]]) k.lamp(x, z, 0.32, col(D, 'accent', '#e8c86a'), 0.6);
    k.path(0, 1.45, 0, 0.3, 0.24, 0x9a8058);
    for (const [x, z] of [[-1.3, -0.9], [1.25, -1.0], [-1.25, 1.1]]) k.tree(x, z, 1.10, { leaf: k.r() < 0.5 ? '#3f7a34' : '#4f8a3a' });
    k.halo(1.0, 3.6, glow); k.light(0, 1.0, 0.2, glow, 1.3, 6); return;
  }
  if (S === 'shore_hut') {   // 浜辺の見張り小屋
    k.house(-0.1, -0.15, 0.62, 0.5, 0.4, { wall, roof, style: 'shed', glow, mat: 'wood', stilts: 0.22, timbered: true, wood: col(D, 'wood') });
    const wet = (x, z) => !k.env.water || k.env.water(k.W(x, 0, z).x, k.W(x, 0, z).z);
    k.lamp(0.32, 0.25, 0.5, glow, 0.8); if (wet(0.8, 0.75)) k.boat(0.8, 0.75, 0.6); if (wet(0.9, 0.9)) k.pier(0.55, 0.15, 0.9, 0.5);
    for (const [x, z, s] of [[-0.9, 0.6, 0.22], [-1.1, -0.4, 0.3], [0.95, -0.7, 0.26]]) k.stone(x, z, s, '#7a7268');
    k.halo(0.8, 2.6, glow); k.light(0, 0.8, 0.2, glow, 1.0, 5); return;
  }
  if (S === 'stilt_shacks') {   // 海賊の高床小屋・ドクロの旗
    const L = [[-0.75, -0.35, 0.5, 0.42, 0.34, 0.2], [0.65, -0.5, 0.54, 0.44, 0.36, -0.2], [0, -1.0, 0.6, 0.46, 0.4, 0], [0.95, 0.45, 0.44, 0.38, 0.3, -0.4]];
    L.forEach((h, i) => k.house(h[0], h[1], h[2], h[3], h[4], { wall: i % 2 ? col(D, 'wallD', wall) : wall, roof: i % 2 ? roofD : roof, style: 'shed', glow, ry: h[5], mat: 'wood', stilts: 0.24, timbered: true }));
    k.add(k.K.wood, box(1.5, 0.025, 0.14), M4(0, 0.24, -0.25, 0.05), 0x8a6a42); k.add(k.K.wood, box(0.14, 0.025, 1.2), M4(0.05, 0.24, 0.35), 0x8a6a42);
    k.add(k.K.wood, new THREE.CylinderGeometry(0.015, 0.018, 1.3, 5), M4(-0.3, 0.9, -0.75), 0x5a3a22); k.flag(-0.3, -0.75, 1.5, '#1a1a1a'); k.add(k.K.flat, new THREE.CircleGeometry(0.028, 8), M4(-0.2, 1.43, -0.744), 0xf0f0f0);
    for (const [x, z] of [[-0.35, 0.55], [-0.25, 0.7], [0.4, 0.75]]) k.add(k.K.wood, new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), M4(x, 0.06, z), 0x7a5230);
    k.boat(-1.0, 0.85, -0.5, '#4a3a2a'); k.lamp(0.3, 0.35, 0.5, col(D, 'accent', '#ffb04a'), 0.8);
    k.halo(0.9, 3.2, '#ffb04a'); k.light(0, 0.9, 0.2, '#ffb04a', 1.1, 6); return;
  }
  // 農村・生存者の村・消えかけた村
  const style = rs === 'patched' ? 'patched' : rs === 'thatch' ? 'thatch' : rs === 'gable' ? 'gable' : 'gable';
  VILLAGE_LAYOUT.forEach((h, i) => {
    if (S === 'faded_village' && i === 4) return;
    const rc = i === 2 ? roofD : (i % 2 ? roof : mixHex(roof, roofD, 0.4));
    k.house(h[0], h[1], h[2], h[3], h[4], { wall: pale(i % 3 === 1 ? col(D, 'wallD', wall) : wall), roof: pale(rc), style, glow: faded ? '#c8d0ff' : glow, ry: h[5], timbered: style === 'thatch', wood: col(D, 'wood'), chimney: i === 2 && !faded, mat: S === 'survivor_village' ? 'stone' : 'plaster', patch: col(D, 'patch'), rh: style === 'thatch' ? h[3] * 0.62 : undefined });
  });
  k.path(0, 1.45, 0, -0.55, 0.26, faded ? 0xb8b4ae : 0xb89a6a);
  if (S === 'farm_village') {
    k.crops(0.95, 0.95, 0.62, 0.5, '#7ab048'); k.fence([[0.6, 0.66], [1.3, 0.66], [1.3, 1.24], [0.6, 1.24]], col(D, 'wood'));
    k.add(k.K.stone, new THREE.CylinderGeometry(0.1, 0.11, 0.12, 10), M4(0.18, 0.06, -0.12), 0x9a9288); k.add(k.K.wood, box(0.26, 0.02, 0.02), M4(0.18, 0.28, -0.12), 0x6a4a2e); for (const s of [-1, 1]) k.add(k.K.wood, box(0.02, 0.26, 0.02), M4(0.18 + s * 0.11, 0.14, -0.12), 0x6a4a2e);
    k.add(k.K.wood, box(0.02, 0.36, 0.02), M4(1.15, 0.18, 1.02), 0x6a4a2e); k.add(k.K.wood, box(0.18, 0.02, 0.02), M4(1.15, 0.27, 1.02), 0x6a4a2e); k.add(k.K.cloth, box(0.1, 0.1, 0.06), M4(1.15, 0.24, 1.02), hexOf(col(D, 'accent', '#e86a6a')));
    for (const [x, z] of [[-0.45, -0.1], [0.4, -0.25], [-0.6, 0.85]]) k.add(k.K.rock, box(0.16, 0.05, 0.08), M4(x, 0.03, z), hexOf(col(D, 'accent', '#e86a6a')));
    for (const [x, z] of [[-1.3, -0.95], [1.3, -1.05], [-0.6, -1.4], [0.65, -1.35]]) k.tree(x, z, 0.92, { leaf: k.r() < 0.5 ? '#3f7a34' : '#4f8a3a' });
    k.lamp(-0.22, 0.6, 0.36, glow, 0.6); k.lamp(0.22, 0.6, 0.36, glow, 0.6);
  } else if (S === 'survivor_village') {
    k.fire(0.1, 0.1, 1.0, glow); k.fence([[-1.35, 0.95], [-0.35, 1.25]], '#6a5a4a'); k.fence([[0.35, 1.25], [1.35, 0.95]], '#6a5a4a');
    for (const [x, z] of [[-1.3, -1.0], [1.25, -1.1]]) k.stone(x, z, 0.28, '#6a6460');
  } else if (S === 'faded_village') {
    for (const [x, z] of [[1.0, 0.3], [1.15, 0.55]]) k.add(k.K.stone, box(0.3, 0.08, 0.06), M4(x, 0.04, z, 0.4), 0xa8a8ac);
  }
  k.halo(0.85, 3.8, faded ? '#c8d0ff' : glow); k.light(0, 0.9, 0.3, faded ? '#a8b8ff' : glow, faded ? 0.6 : 1.3, 6);
}

function port_(k, D) {
  const S = D.silhouette; const wall = col(D, 'wall', '#f2e6cc'), roof = col(D, 'roof', '#d0603a'), roofD = col(D, 'roofD', roof), glow = col(D, 'glow', '#ffc070'); const snow = S === 'snow_port';
  const style = D.roofStyle === 'steep' ? 'steep' : 'gable';
  // 真ん中の通り（x≒0）は空ける：港町は北から入ることが多い（出たときに立つマスが建物の中にならないように）
  const L = [[-0.8, -0.55, 0.58, 0.46, 0.46, 0.1], [0.78, -0.7, 0.62, 0.48, 0.55, -0.05], [0.85, 0.05, 0.5, 0.42, 0.42, -0.2], [-0.95, 0.3, 0.5, 0.42, 0.38, 0.3], [-0.45, -1.15, 0.42, 0.36, 0.4, 0]];
  // v7.9.2 家は陸にだけ建てる（海が西や北にある港町で、海の上に家が建ち、そこに停めた船を隠していた：地球の世界の港町マリナ）
  const dry = (x, z) => !k.env.water || !k.env.water(k.W(x, 0, z).x, k.W(x, 0, z).z);
  L.forEach((h, i) => dry(h[0], h[1]) && k.house(h[0], h[1], h[2], h[3], h[4], { wall: i % 2 ? col(D, 'wallD', wall) : wall, roof: i % 2 ? roofD : roof, style, glow, ry: h[5], timbered: true, wood: col(D, 'wood'), snow, chimney: i === 1 }));
  // 灯台（港の目印）
  const lhB = snow ? [col(D, 'ice', '#bfe8ff'), '#f4f8ff', col(D, 'ice', '#bfe8ff'), '#f4f8ff'] : ['#f4f0e8', col(D, 'stripe', '#d83a3a'), '#f4f0e8', col(D, 'stripe', '#d83a3a')];
  k.tower(1.05, 0.65, 0.16, 1.15, { bands: lhB, top: 'lamp', roof: '#3a3a42', glow: snow ? '#c8f0ff' : '#fff2a0' });
  // 桟橋・小舟：海（水のマス）があるときだけ（氷港など陸に囲まれた入口では置かない）
  const wet = (x, z) => !k.env.water || k.env.water(k.W(x, 0, z).x, k.W(x, 0, z).z);
  if (wet(-0.6, 1.3) || wet(-0.2, 1.4)) k.pier(-0.45, 0.65, 0.85, -0.25);
  for (const [x, z, ry, c] of [[-0.85, 1.25, 0.9, snow ? '#5a4a3a' : '#7a4a2a'], [0.2, 1.3, -0.7, '#3a6a9a'], [-1.25, 0.9, 0.3, '#7a4a2a']]) if (wet(x, z)) k.boat(x, z, ry, c);
  if (has(D, 'awnings')) for (const [x, c] of [[-0.3, col(D, 'stripe', '#d83a3a')], [0.32, col(D, 'accent', '#3a8ad8')]]) { k.add(k.K.cloth, box(0.3, 0.015, 0.22), M4(x, 0.3, 0.42, 0, 0.3), hexOf(c)); for (const s of [-1, 1]) k.add(k.K.wood, box(0.015, 0.3, 0.015), M4(x + s * 0.13, 0.15, 0.5), 0x6a4a2e); }
  if (snow) { for (const [x, z] of [[-1.3, -1.0], [1.3, -1.1]]) k.tree(x, z, 1.0, { pine: true, snow: true, leaf: '#2f5a4a' }); for (let i = 0; i < 5; i++) k.add(k.K.shiny, new THREE.ConeGeometry(0.012, 0.07, 4), M4(-1.0 + i * 0.12, 0.32, 0.56, 0, Math.PI), 0xdff4ff); }
  else for (const [x, z] of [[-1.3, -1.05], [1.35, -0.9]]) { const leaf = k.r() < 0.5 ? '#3f7a34' : '#4f8a3a'; if (dry(x, z)) k.tree(x, z, 0.99, { leaf }); }   /* 乱数の順番は前と同じ（陸の木の色を変えない） */
  k.lamp(-0.15, 0.25, 0.36, glow, 0.6); k.lamp(0.45, 0.2, 0.36, glow, 0.6);
  k.halo(0.95, 3.8, glow); k.light(0, 0.9, 0.2, glow, 1.3, 6);
}

function city(k, D) {
  const S = D.silhouette; const wall = col(D, 'wall', '#eef0f6'), wallD = col(D, 'wallD', wall), roof = col(D, 'roof', '#3f6fc8'), roofD = col(D, 'roofD', roof), accent = col(D, 'accent', '#f0c84a'), glow = col(D, 'glow', '#ffc070');
  const banner = col(D, 'banner', accent);
  const walled = ['castle_town', 'admin_city', 'capital', 'clock_city', 'winter_city', 'desert_city', 'arcane_city', 'casino_city'].includes(S);
  const roofStyle = { castle_town: 'gable', admin_city: 'flat', capital: 'hip', clock_city: 'pyramid', winter_city: 'steep', desert_city: 'flat', arcane_city: 'spire', casino_city: 'flat', future_city: 'flat' }[S] || 'gable';
  if (walled) k.walls(2.5, 2.2, 0.42, { wall: S === 'desert_city' ? wall : wallD === wall ? wall : mixHex(wall, wallD, 0.35), roof, glow, corner: S === 'desert_city' ? 'dome' : S === 'casino_city' ? 'dome' : S === 'admin_city' ? 'crenel' : 'cone', moat: S === 'castle_town', gateTop: S === 'castle_town' ? 'cone' : 'crenel', mat: S === 'desert_city' ? 'plaster' : 'stone', gateGlow: S === 'casino_city' ? col(D, 'neon', '#4ae8ff') : null });
  // 城下の家（壁の内側・四隅寄り）
  const inner = [[-0.8, 0.45, 0.42, 0.34, 0.34], [0.8, 0.45, 0.42, 0.34, 0.34], [-0.85, -0.2, 0.4, 0.34, 0.36], [0.85, -0.2, 0.4, 0.34, 0.36]];
  if (walled) inner.forEach((h, i) => k.house(h[0], h[1], h[2], h[3], h[4], { wall: i % 2 ? wallD : wall, roof: i % 2 ? roofD : roof, style: roofStyle, glow, mat: S === 'desert_city' ? 'plaster' : S === 'winter_city' ? 'stone' : 'plaster', snow: S === 'winter_city', ry: (i % 2 ? -1 : 1) * 0.08 }));
  k.path(0, 1.5, 0, 0.3, 0.26, S === 'desert_city' ? 0xd8c090 : 0xb8b0a0);
  // 中心の建物（場所ごとに違う）
  if (S === 'castle_town') {   // 白い王城・青い尖塔5本
    k.house(0, -0.45, 0.9, 0.62, 0.95, { wall, roof, style: 'flat', glow, mat: 'stone', door: true });
    for (const [x, z, h] of [[-0.38, -0.2, 1.25], [0.38, -0.2, 1.25], [-0.38, -0.72, 1.35], [0.38, -0.72, 1.35]]) k.tower(x, z, 0.12, h, { top: 'cone', wall, roof, glow });
    k.tower(0, -0.45, 0.16, 1.7, { top: 'cone', wall, roof, glow, rh: 0.6 }); k.flag(0, -0.45, 0.5, banner, { y: 2.25 });
    for (const s of [-1, 1]) k.add(k.K.cloth, box(0.1, 0.32, 0.008), M4(s * 0.22, 0.62, -0.13), hexOf(banner));
    k.add(k.K.metal, new THREE.CircleGeometry(0.07, 12), M4(0, 0.82, -0.135), hexOf(accent));
  } else if (S === 'admin_city') {   // 税務庁舎・監視塔（トレディア：相場の掲示板）
    k.house(0, -0.45, 1.1, 0.6, 0.85, { wall, roof: wallD, style: 'flat', glow, mat: 'stone' });
    for (let i = 0; i < 6; i++) k.column(-0.45 + i * 0.18, -0.1, 0.03, 0.55, wall);
    k.add(k.K.stone, prism(1.15, 0.18, 0.2), M4(0, 0.58, -0.08), hexOf(wall));
    for (const s of [-1, 1]) k.tower(s * 0.7, -0.75, 0.1, 1.45, { top: 'crenel', wall: wallD, roof, glow });
    for (const s of [-1, 1]) k.flag(s * 0.3, -0.75, 0.45, banner, { y: 0.9 });
    if (D.id === 'tradia') { k.add(k.K.dark, box(0.5, 0.26, 0.02), M4(0, 0.6, -0.14), 0x101820); for (let i = 0; i < 5; i++) k.add(k.K.glow(i % 2 ? '#4ad87a' : '#ff5a5a', 1.4), box(0.06, 0.04 + i * 0.03, 0.01), M4(-0.18 + i * 0.09, 0.52 + i * 0.015, -0.128)); }
  } else if (S === 'capital') {   // 大宮殿の大ドーム・大理石の柱・官庁街
    k.house(0, -0.45, 1.0, 0.66, 0.6, { wall, roof: wallD, style: 'flat', glow, mat: 'stone' });
    k.add(k.K.stone, new THREE.CylinderGeometry(0.28, 0.3, 0.22, 16), M4(0, 0.75, -0.45), hexOf(wall)); k.add(k.K.shiny, new THREE.SphereGeometry(0.29, 16, 8, 0, TAU, 0, Math.PI / 2), M4(0, 0.86, -0.45), hexOf(roof)); k.add(k.K.metal, new THREE.ConeGeometry(0.03, 0.2, 6), M4(0, 1.22, -0.45), hexOf(accent));
    for (let i = 0; i < 7; i++) k.column(-0.42 + i * 0.14, -0.08, 0.028, 0.5, '#f8f4ea');
    k.add(k.K.stone, prism(1.0, 0.16, 0.2), M4(0, 0.53, -0.06), hexOf(wall));
    for (const s of [-1, 1]) { k.house(s * 0.62, -0.95, 0.42, 0.3, 0.5, { wall: wallD, roof, style: 'hip', glow, mat: 'stone', door: false }); k.flag(s * 0.45, -0.1, 0.7, banner); }
  } else if (S === 'clock_city') {   // 巨大な時計塔・鐘楼2本・歯車
    k.house(0, -0.5, 0.42, 0.42, 1.5, { wall, roof, style: 'pyramid', glow, mat: 'stone', rh: 0.5 });
    k.clock(0, 1.22, -0.285, 0.15, { glow: '#ffe8b0', face: '#f4ecd8' });
    for (const s of [-1, 1]) { k.tower(s * 0.55, -0.7, 0.1, 1.05, { top: 'cone', wall: wallD, roof, glow }); k.add(k.K.metal, new THREE.SphereGeometry(0.05, 8, 6), M4(s * 0.55, 0.92, -0.6), 0xd8b04a); }
    k.gear(0.5, 0.35, 0.35, 0.14, '#9a8a6a');
  } else if (S === 'winter_city') {   // 冬の石造都市・記憶の結晶
    k.house(0, -0.45, 0.8, 0.56, 0.62, { wall, roof, style: 'steep', glow, mat: 'stone', snow: true, chimney: true });
    for (const s of [-1, 1]) k.tower(s * 0.5, -0.8, 0.11, 1.1, { top: 'cone', wall: wallD, roof, glow, rh: 0.5 });
    k.crystal(0, 0.15, 0.45, col(D, 'crystal', '#a8e8ff')); for (const s of [-1, 1]) k.crystal(s * 0.18, 0.2, 0.26, col(D, 'crystal', '#a8e8ff'), { tilt: s * 0.3 });
    k.light(0, 0.4, 0.2, col(D, 'crystal', '#a8e8ff'), 0.9, 5);
  } else if (S === 'desert_city') {   // 砂岩の大ドーム・ミナレット・アーチ門・ヤシ
    k.house(0, -0.45, 0.8, 0.6, 0.5, { wall, roof: wall, style: 'flat', glow, mat: 'plaster' });
    k.add(k.K.plaster, new THREE.CylinderGeometry(0.26, 0.26, 0.14, 16), M4(0, 0.57, -0.45), hexOf(wall)); k.add(k.K.shiny, new THREE.SphereGeometry(0.27, 16, 8, 0, TAU, 0, Math.PI / 2), M4(0, 0.64, -0.45, 0, 0, 0, 1, 1.25, 1), hexOf(roof));
    for (const s of [-1, 1]) { k.tower(s * 0.55, -0.75, 0.07, 1.2, { top: 'dome', wall, roof: accent, glow, mat: 'plaster' }); }
    for (const [x, z] of [[-1.45, 0.7], [1.45, 0.75], [-1.4, -0.9]]) k.palm(x, z, 0.99);
    if (has(D, 'cloth')) for (const [x, c] of [[-0.35, col(D, 'cloth', '#d84a4a')], [0.35, col(D, 'accent', '#3a8ad8')]]) k.add(k.K.cloth, box(0.24, 0.015, 0.18), M4(x, 0.26, 0.15, 0, 0.25), hexOf(c));
  } else if (S === 'arcane_city') {   // 魔法の結晶・浮遊する建物・光る魔法塔3本
    k.tower(0, -0.5, 0.17, 1.35, { top: 'cone', wall, roof, glow, rh: 0.7 }); k.crystal(0, -0.5, 0.36, col(D, 'crystal', '#9ad8ff'), { y: 2.1 });
    for (const [x, z] of [[-0.6, -0.65], [0.6, -0.65]]) { k.tower(x, z, 0.11, 1.0, { top: 'cone', wall: wallD, roof: roofD, glow }); k.crystal(x, z, 0.22, col(D, 'crystal2', '#d08aff'), { y: 1.6 }); }
    for (const [x, z, y] of [[-0.5, 0.15, 0.8], [0.55, 0.05, 0.95]]) { k.house(x, z, 0.3, 0.26, 0.24, { wall, roof, style: 'spire', glow, y, door: false }); k.add(k.K.rock, rockGeo(1, x * 5, 0.4), M4(x, y - 0.06, z, 0, Math.PI, 0, 0.17, 0.16, 0.15), 0x6a5a7a); }
    k.add(k.K.glow(glow, 1.0), new THREE.TorusGeometry(0.42, 0.012, 4, 32), M4(0, 0.02, 0.5, 0, Math.PI / 2)); k.light(0, 0.6, -0.3, glow, 1.2, 6);
  } else if (S === 'casino_city') {   // 金色の塔とネオン・ルーレットの看板
    k.house(0, -0.45, 0.9, 0.6, 0.7, { wall, roof: wallD, style: 'flat', glow: col(D, 'neon', '#4ae8ff'), mat: 'stone' });
    for (const s of [-1, 1]) k.tower(s * 0.4, -0.75, 0.12, 1.35, { top: 'dome', wall: roof, roof, glow, mat: 'metal' });
    k.tower(0, -0.6, 0.15, 1.15, { top: 'dome', wall: roof, roof: accent, glow, mat: 'metal' });
    k.add(k.K.glow(col(D, 'neon', '#4ae8ff'), 1.8), box(0.92, 0.03, 0.02), M4(0, 0.74, -0.14)); k.add(k.K.glow(accent, 1.8), box(0.92, 0.03, 0.02), M4(0, 0.06, -0.14));
    k.add(k.K.glow(roof, 1.4), new THREE.CircleGeometry(0.12, 16), M4(0, 0.42, -0.142)); for (let i = 0; i < 8; i++) k.add(k.K.dark, box(0.012, 0.11, 0.01), M4(0, 0.42, -0.135, 0, 0, i / 8 * Math.PI), i % 2 ? 0xd83a3a : 0x1a1a1a);
    k.light(0, 0.6, 0.0, col(D, 'neon', '#4ae8ff'), 1.4, 6); k.light(0, 0.6, 0.6, accent, 1.0, 5);
  } else if (S === 'future_city') {   // 白い幾何学建築・発光する回路・ドーム
    const glowC = col(D, 'glow', '#4ae8ff');
    for (const [x, z, w, h] of [[-0.7, -0.6, 0.44, 0.9], [0.7, -0.6, 0.44, 1.2], [0, -0.9, 0.5, 0.7], [-0.85, 0.35, 0.36, 0.5], [0.85, 0.35, 0.36, 0.6]]) k.house(x, z, w, w * 0.9, h, { wall, roof: wallD, style: 'flat', glow: glowC, mat: 'flat' });
    k.add(k.K.shiny, new THREE.SphereGeometry(0.4, 18, 9, 0, TAU, 0, Math.PI / 2), M4(0, 0, -0.15), hexOf(roof)); k.add(k.K.glow(glowC, 1.6), new THREE.TorusGeometry(0.41, 0.012, 4, 36), M4(0, 0.02, -0.15, 0, Math.PI / 2));
    k.tower(0.35, 0.55, 0.05, 1.6, { top: 'flat', wall, roof, glow: glowC, mat: 'flat' }); k.add(k.K.glow(glowC, 1.6), new THREE.TorusGeometry(0.11, 0.015, 4, 20), M4(0.35, 1.5, 0.55, 0, Math.PI / 2));
    for (const [x0, z0, x1, z1] of [[0, 1.4, 0, 0.3], [-1.2, 0.0, -0.4, 0.0], [0.4, 0.0, 1.2, 0.0], [-0.7, 0.0, -0.7, -0.3]]) { const L = Math.hypot(x1 - x0, z1 - z0); k.add(k.K.glow(glowC, 1.3), box(0.025, 0.01, L), M4((x0 + x1) / 2, 0.012, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0))); }
    k.light(0, 0.7, 0.2, glowC, 1.3, 6);
  }
  if (S === 'forge_town') {   // 溶岩の水路・巨大な炉・炎の煙突3本・鉄骨
    const metal = col(D, 'metal', '#6a6a76'), lava = col(D, 'lava', '#ff6a1a');
    k.house(0, -0.6, 0.95, 0.6, 0.62, { wall, roof, style: 'iron', glow, mat: 'stone' });
    k.add(k.K.glow(glow, 2.2), new THREE.CircleGeometry(0.16, 14, 0, Math.PI), M4(0, 0.0, -0.29)); k.light(0, 0.3, -0.1, lava, 1.4, 6);
    for (const x of [-0.3, 0.05, 0.38]) { k.add(k.K.stone, new THREE.CylinderGeometry(0.05, 0.06, 0.75, 8), M4(x, 1.05, -0.75), hexOf(wallD)); k.add(k.K.glow(lava, 2.0), new THREE.ConeGeometry(0.05, 0.14, 7), M4(x, 1.48, -0.75)); k.smoke(x, 1.6, -0.75); }
    for (const [x, z, ry] of [[-0.85, 0.2, 0.25], [0.85, 0.1, -0.25], [-0.8, -0.85, 0], [0.8, -0.85, 0]]) k.house(x, z, 0.44, 0.36, 0.38, { wall: wallD, roof, style: 'iron', glow, mat: 'stone', ry, chimney: true });
    k.add(k.K.glow(lava, 1.6), box(0.1, 0.012, 1.4), M4(0.45, 0.012, 0.7)); k.add(k.K.glow(lava, 1.6), box(1.0, 0.012, 0.1), M4(-0.1, 0.012, 0.05));
    for (const s of [-1, 1]) k.add(k.K.metal, box(0.04, 0.9, 0.04), M4(s * 1.15, 0.45, -0.3), hexOf(metal)); k.add(k.K.metal, box(2.34, 0.04, 0.04), M4(0, 0.9, -0.3), hexOf(metal)); k.add(k.K.metal, box(0.03, 1.15, 0.03), M4(0, 0.47, -0.3, 0, 0, 1.18), hexOf(metal));
    k.halo(0.9, 4.0, lava); k.light(0, 0.9, 0.5, lava, 1.2, 6); return;
  }
  if (S === 'industrial_town') {   // 黒ずんだ石の工業都市・のこぎり屋根・煙突4本
    const metal = col(D, 'metal', '#6a6a76');
    k.house(-0.2, -0.65, 1.1, 0.56, 0.5, { wall, roof: col(D, 'roofD', '#3a3a42'), style: 'sawtooth', glow, mat: 'stone' });
    for (let i = 0; i < 4; i++) { const x = -0.55 + i * 0.3; k.add(k.K.stone, new THREE.CylinderGeometry(0.045, 0.06, 1.0, 8), M4(x, 0.5, -1.05), 0x5a4a44); k.add(k.K.stone, box(0.11, 0.04, 0.11), M4(x, 1.0, -1.05), 0x3a3030); k.smoke(x, 1.12, -1.05); }
    for (const [x, z, ry] of [[-0.85, 0.3, 0.2], [0.85, 0.25, -0.2], [0.75, -0.55, 0]]) k.house(x, z, 0.42, 0.36, 0.38, { wall: wallD, roof, style: 'gable', glow, mat: 'stone', ry, chimney: true });
    k.add(k.K.glow(glow, 2.0), box(0.3, 0.16, 0.02), M4(-0.2, 0.15, -0.36)); k.light(-0.2, 0.3, -0.2, glow, 1.2, 6);
    for (const s of [-1, 1]) k.add(k.K.metal, box(0.025, 0.02, 2.6), M4(s * 0.08 + 0.15, 0.012, 0.2), hexOf(metal));
    k.halo(0.9, 4.0, glow); k.light(0, 0.9, 0.5, glow, 1.2, 6); return;
  }
  if (S === 'uniform_blocks') {   // まったく同じ白い住居の区画
    const glowC = col(D, 'glow', '#7ae0ff');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i === 1 && j === 2) continue; k.house(-0.8 + i * 0.8, -0.95 + j * 0.72, 0.42, 0.4, 0.42, { wall, roof: wall, style: 'flat', glow: glowC, mat: 'flat' }); }
    k.fence([[-1.4, 1.3], [-1.4, -1.4], [1.4, -1.4], [1.4, 1.3]], '#c8d0d8'); k.tower(1.3, 1.25, 0.04, 0.9, { top: 'flat', wall: '#e8eef4', glow: glowC, mat: 'flat' }); k.add(k.K.glow(glowC, 1.8), new THREE.SphereGeometry(0.04, 8, 6), M4(1.3, 0.98, 1.25));
    k.halo(0.8, 3.6, glowC); k.light(0, 0.8, 0.3, glowC, 1.0, 6); return;
  }
  if (S === 'bazaar' || S === 'camp' || S === 'war_camp') {   // 天幕の市場・野営地・前線基地
    const cl = [col(D, 'cloth', '#d8c8a0'), col(D, 'cloth2', '#8aa0c8'), col(D, 'cloth3', col(D, 'clothD', '#a89870')), col(D, 'clothD', '#a89870')];
    const T = [[-0.75, -0.5, 0.36, 0.55], [0.75, -0.55, 0.38, 0.6], [0, -1.0, 0.44, 0.72], [-0.95, 0.45, 0.3, 0.46], [0.95, 0.4, 0.3, 0.46]];
    T.forEach((t, i) => k.tent(t[0], t[1], t[2], t[3], cl[i % cl.length], { ry: i * 0.7, seg: S === 'war_camp' ? 6 : 8 }));
    if (S === 'bazaar') { for (const [x, z, c] of [[-0.35, 0.25, cl[0]], [0.35, 0.25, cl[2]]]) { k.add(k.K.cloth, box(0.34, 0.015, 0.26), M4(x, 0.32, z, 0, 0.2), hexOf(c)); for (const s of [-1, 1]) k.add(k.K.wood, box(0.015, 0.32, 0.015), M4(x + s * 0.15, 0.16, z + 0.1), 0x6a4a2e); } for (let i = 0; i < 4; i++) k.add(k.K.win('#ffffff', '#c8d8e8'), box(0.07, 0.1, 0.01), M4(-0.6 + i * 0.4, 0.2, 0.62 + (i % 2) * 0.05, i * 0.4)); for (const [x, z] of [[-1.4, -0.95], [1.45, -0.8], [1.4, 1.0]]) k.palm(x, z, 0.92); }
    else { k.fire(0, 0.1, 1.0, glow); k.flag(0.3, -0.25, 0.9, col(D, 'banner', cl[1])); for (const [x, z] of [[-0.35, 0.55], [0.4, 0.6]]) k.add(k.K.wood, box(0.14, 0.12, 0.12), M4(x, 0.06, z, 0.3), 0x8a6a42); }
    if (S === 'war_camp') { for (let i = 0; i <= 18; i++) { const a = Math.PI * 0.62 + i / 18 * Math.PI * 1.76; if (Math.abs(Math.sin(a) - 1) < 0.01) continue; const x = Math.cos(a) * 1.35, z = -Math.sin(a) * 1.25; if (z > 1.0 && Math.abs(x) < 0.3) continue; k.stake(x, z, 0.32, '#5a4030'); } k.tower(-1.05, -1.0, 0.09, 0.9, { top: 'flat', wall: '#6a4a2e', mat: 'wood', glow }); k.torch(-0.3, 1.0, 0.36, glow); k.torch(0.3, 1.0, 0.36, glow); }
    k.halo(0.8, 3.6, glow); k.light(0, 0.8, 0.3, glow, 1.2, 6); return;
  }
  k.halo(1.2, 4.6, glow); k.light(0, 1.2, 0.3, glow, 1.5, 7);
}

function fortress(k, D) {
  const S = D.silhouette; const wall = col(D, 'wall', '#4a4a52'), wallD = col(D, 'wallD', wall), roof = col(D, 'roof', '#2a2a32'), glow = col(D, 'glow', '#ff5a2a');
  const demon = S === 'demon_castle';
  k.walls(2.6, 2.3, 0.6, { wall: mixHex(wall, wallD, 0.3), roof, glow, corner: 'spike', cornerRh: 0.75, gateTop: 'spike', mat: 'stone', gateGlow: demon ? col(D, 'glow', '#ff2a3a') : null });
  k.house(0, -0.45, 1.0, 0.7, 0.9, { wall, roof, style: 'flat', glow, mat: 'stone', door: false });
  if (demon) {   // 黒曜石の巨大尖塔・禍々しい城門
    k.tower(0, -0.5, 0.2, 1.7, { top: 'spike', wall: wallD, roof, glow, rh: 1.2 });
    for (const [x, z, h] of [[-0.42, -0.25, 1.25], [0.42, -0.25, 1.25], [-0.4, -0.8, 1.4], [0.4, -0.8, 1.4]]) k.tower(x, z, 0.11, h, { top: 'spike', wall: wallD, roof, glow, rh: 0.7 });
    k.add(k.K.glow(col(D, 'glow2', glow), 1.5), new THREE.CircleGeometry(0.09, 3), M4(0, 0.7, -0.095)); k.light(0, 0.4, 1.4, glow, 1.6, 7);
    for (const s of [-1, 1]) k.add(k.K.metal, new THREE.ConeGeometry(0.03, 0.25, 5), M4(s * 0.1, 0.78, -0.08, 0, 0, s * 0.6), 0xd8d0c0);
  } else {   // 鉄壁・巨大な歯車・鎖
    for (const [x, z] of [[-0.42, -0.2], [0.42, -0.2]]) k.tower(x, z, 0.14, 1.3, { top: 'spike', wall: col(D, 'metal', '#6a6a76'), roof, glow, mat: 'metal', rh: 0.45 });
    k.gear(0, 0.52, -0.07, 0.22, col(D, 'metal', '#6a6a76')); k.gear(-0.75, 0.32, 1.19, 0.15, col(D, 'chain', '#8a8a92'));
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) k.add(k.K.metal, new THREE.TorusGeometry(0.025, 0.007, 4, 8), M4(s * 0.17, 0.5 - i * 0.05, 1.19, i % 2 ? Math.PI / 2 : 0), hexOf(col(D, 'chain', '#8a8a92')));
    for (let i = 0; i < 8; i++) k.add(k.K.metal, new THREE.SphereGeometry(0.012, 5, 4), M4(-0.42 + i * 0.12, 0.8, -0.095), hexOf(col(D, 'rivet', '#9a9aa2')));
  }
  k.halo(1.3, 4.8, glow); k.light(0, 1.0, 0.3, glow, 1.4, 7);
}

function cave(k, D) {
  const S = D.silhouette; const rock = col(D, 'rock', '#8c8478'), rockL = col(D, 'rockL', '#b4ab9c'), rockD = col(D, 'rockD', '#5e574e'), glow = col(D, 'glow', '#ff9a3a');
  const R = { rock, rockL, rockD };
  if (S === 'wreck') {   // 岩礁に乗り上げた沈没船
    for (const [x, z, s] of [[-0.7, 0.2, 0.42], [0.75, -0.2, 0.5], [0.0, -0.75, 0.55], [-0.95, -0.7, 0.3]]) k.mound(x, z, s, s * 0.7, s, Object.assign({ seed: x * 5 + z }, R));
    const b = M4(0.05, 0.25, 0.15, 0.5, 0, 0.32); const P = (lx, ly, lz, rx, rz, sx, sy, sz) => b.clone().multiply(M4(lx, ly, lz, 0, rx || 0, rz || 0, sx, sy, sz));
    k.add(k.K.wood, new THREE.CylinderGeometry(0.32, 0.18, 1.5, 10, 1, false, 0, Math.PI), P(0, 0, 0, Math.PI / 2, 0), hexOf(col(D, 'wood', '#5a3a22')));
    k.add(k.K.wood, box(0.5, 0.03, 1.3), P(0, 0.02, 0), hexOf(col(D, 'woodL', '#8a6a42')));
    k.add(k.K.wood, new THREE.CylinderGeometry(0.02, 0.025, 1.1, 6), P(0, 0.55, 0.1, 0.25), 0x4a3020); k.add(k.K.cloth, box(0.006, 0.4, 0.34), P(0.02, 0.62, 0.18, 0.25, 0.1), hexOf(col(D, 'sail', '#d8ccb0')));
    k.add(k.K.dark, new THREE.CircleGeometry(0.12, 10), P(0.17, -0.02, 0.35, 0, Math.PI / 2), 0x050403);
    return;
  }
  if (S === 'mist_rocks') {   // 霧に包まれた岩の島
    k.mound(0, -0.45, 0.85, 0.9, 0.7, Object.assign({ seed: 5 }, R));
    for (const [x, z, s, h] of [[-0.85, -0.25, 0.45, 1.2], [0.85, -0.45, 0.45, 1.4], [0.95, 0.45, 0.3, 0.6], [-1.0, 0.5, 0.28, 0.5]]) k.mound(x, z, s, h * 0.6, s * 0.8, Object.assign({ seed: x * 3 + z * 11 }, R));
    k.mouth(0, 0.28, 0.4, 0.32, {});
    const mist = k.K.halo('#d8e0ea').clone(); mist.blending = THREE.NormalBlending; mist.opacity = 0.55; mist.userData = {};
    for (const [x, y, z, s] of [[0, 0.3, 0.3, 2.6], [-0.7, 0.6, -0.4, 2.0], [0.8, 0.5, -0.3, 2.2]]) k.sprite(mist, x, y, z, s, s * 0.45);
    return;
  }
  // ふつうの洞窟・竜脈・噴気孔・鉱山
  k.mound(0, -0.5, 1.25, 1.05, 0.95, Object.assign({ seed: hstr(D.id) % 97 }, R));
  for (const [x, z, s] of [[-1.05, 0.35, 0.36], [1.1, 0.25, 0.42], [0.8, -1.0, 0.45]]) k.mound(x, z, s, s * 0.8, s, Object.assign({ seed: x * 7 + z }, R));
  const timber = has(D, 'timber') || S === 'mine';
  k.mouth(0, 0.64, 0.5, 0.42, { timber, wood: col(D, 'wood') });
  if (has(D, 'torches') || S === 'mine') { k.torch(-0.36, 0.78, 0.36, glow); k.torch(0.36, 0.78, 0.36, glow); }
  if (S === 'mine') {   // 鉱山鉄道・トロッコ・鉱石
    const metal = col(D, 'metal', '#6a6a76');
    for (const s of [-1, 1]) k.add(k.K.metal, box(0.02, 0.02, 1.0), M4(s * 0.09, 0.012, 1.05), hexOf(metal)); for (let i = 0; i < 6; i++) k.add(k.K.wood, box(0.26, 0.012, 0.04), M4(0, 0.006, 0.6 + i * 0.18), 0x5a3a22);
    k.add(k.K.metal, box(0.22, 0.12, 0.3), M4(0.0, 0.1, 1.2), hexOf(metal)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(k.K.dark, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8), M4(sx * 0.11, 0.04, 1.2 + sz * 0.09, 0, 0, Math.PI / 2), 0x2a2a2a);
    for (let i = 0; i < 4; i++) k.add(k.K.glow(col(D, 'glow', '#ffb04a'), 0.9), new THREE.OctahedronGeometry(0.035, 0), M4(0.0 + (i - 1.5) * 0.05, 0.19, 1.2 + (i % 2) * 0.05));
    k.lamp(0.45, 0.85, 0.4, col(D, 'glow', '#ffb04a'), 0.7);
  }
  if (S === 'vein_cave') {   // 赤い竜脈が光る
    for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; k.add(k.K.glow(glow, 1.6), box(0.025, 0.42 + k.r() * 0.3, 0.025), M4(Math.sin(a) * 0.95, 0.35 + k.r() * 0.3, -0.35 + Math.cos(a) * 0.82, a, 0.3, (k.r() - 0.5) * 1.2)); }
    k.light(0, 0.4, 0.8, glow, 1.2, 6);
  }
  if (S === 'vent_cave') {   // 灰色の岩と噴気孔
    for (const [x, z] of [[-0.6, -0.1], [0.55, -0.3], [0.1, -0.95]]) { k.add(k.K.dark, new THREE.CylinderGeometry(0.06, 0.09, 0.08, 8), M4(x, 0.85 + (z + 0.3) * -0.3, z), 0x2a2420); k.add(k.K.glow(glow, 1.4), new THREE.CircleGeometry(0.05, 8), M4(x, 0.9 + (z + 0.3) * -0.3, z, 0, -Math.PI / 2)); k.smoke(x, 1.0 + (z + 0.3) * -0.3, z); }
    k.light(0, 0.5, 0.8, glow, 0.9, 5);
  }
  if (S === 'cave' && !has(D, 'torches')) k.light(0, 0.4, 0.8, glow, 0.6, 4);
}

function pass(k, D) {
  const S = D.silhouette; const R = { rock: col(D, 'rock', '#8a7e70'), rockL: col(D, 'rockL', '#b6aa98'), rockD: col(D, 'rockD', '#5a5248') };
  const canyon = S === 'sand_canyon';
  if (canyon) {   // 砂嵐が吹き抜ける岩の回廊（台地の岩壁）
    for (const s of [-1, 1]) { k.mound(s * 0.85, -0.2, 0.6, 1.1, 1.1, Object.assign({ seed: s * 17, amp: 0.18 }, R)); k.mound(s * 0.95, 0.75, 0.42, 0.7, 0.45, Object.assign({ seed: s * 29, amp: 0.2 }, R)); }
    k.path(0, 1.45, 0, -1.2, 0.36, hexOf(col(D, 'sand', '#e6c88c')));
    if (has(D, 'bones')) { k.add(k.K.flat, box(0.18, 0.025, 0.025), M4(0.15, 0.015, 0.4, 0.5), 0xe8e0d0); for (let i = 0; i < 3; i++) k.add(k.K.flat, new THREE.TorusGeometry(0.05, 0.01, 4, 8, Math.PI), M4(0.15 + i * 0.04, 0.02, 0.4, 0.5, 0, Math.PI / 2), 0xe8e0d0); }
    return;
  }
  // 山あいの峠道：左右の峰・道・道しるべ（関門・関所は門柱）
  const snow = col(D, 'snow', null) && !/ash|灰/.test(D.architectureStyle || '') ? col(D, 'snow') : (/灰/.test(D.architectureStyle || '') ? '#c8c4c0' : null);
  k.peak(-0.82, -0.45, 0.68, 1.7, Object.assign({ seed: 3, snow }, R)); k.peak(0.85, -0.55, 0.72, 1.95, Object.assign({ seed: 7, snow }, R)); k.peak(0.05, -1.15, 0.6, 1.4, Object.assign({ seed: 11, snow }, R));
  k.peak(-1.15, 0.55, 0.36, 0.7, Object.assign({ seed: 13 }, R)); k.peak(1.15, 0.5, 0.34, 0.65, Object.assign({ seed: 17 }, R));
  k.path(0, 1.45, 0, -0.75, 0.3, 0xa8987a);
  const wood = hexOf(col(D, 'wood', '#6a4426'));
  if (has(D, 'gatepost')) { for (const s of [-1, 1]) k.add(k.K.timber, box(0.07, 0.62, 0.07), M4(s * 0.3, 0.31, 0.25), wood); k.add(k.K.timber, box(0.74, 0.07, 0.08), M4(0, 0.6, 0.25), wood); k.add(k.K.timber, box(0.66, 0.05, 0.05), M4(0, 0.5, 0.25), wood); k.torch(-0.42, 0.4, 0.34, '#ffb04a'); k.torch(0.42, 0.4, 0.34, '#ffb04a'); }
  if (has(D, 'signpost')) { k.add(k.K.timber, box(0.035, 0.4, 0.035), M4(0.32, 0.2, 0.75), wood); k.add(k.K.wood, box(0.22, 0.07, 0.02), M4(0.38, 0.34, 0.75, 0, 0, 0.08), 0xa8865a); }
}

function forest(k, D) {
  const S = D.silhouette; const leaf = col(D, 'leaf', '#2f6a2e'), leafL = col(D, 'leafL', '#4f8f3a'), wood = col(D, 'wood', '#5a3a22'), glow = col(D, 'glow', '#bfffa0');
  const snowy = S === 'spirit_forest';
  // 絡み合う木々のアーチ（入口の上で枝が交わる）
  for (const s of [-1, 1]) {
    k.add(k.K.wood, new THREE.CylinderGeometry(0.07, 0.13, 1.2, 7), M4(s * 0.42, 0.55, 0.3, 0, 0, -s * 0.22), hexOf(wood));
    k.add(k.K.wood, new THREE.CylinderGeometry(0.04, 0.07, 0.6, 6), M4(s * 0.18, 1.12, 0.3, 0, 0, -s * 1.1), hexOf(wood));
  }
  if (Nature81.on() && k.env && k.env.put) { for (const [x, z, sc] of [[-0.62, 0.05, 0.42], [0.62, -0.02, 0.44], [-0.3, -0.42, 0.4], [0.36, -0.45, 0.42], [0, -0.1, 0.36]]) k.model(snowy ? 'tree_snowpine' : ['tree_oak_a', 'tree_oak_b', 'tree_oak_c'][Math.floor(k.r() * 3)], x, z, k.r() * 6.28, sc); }   // v8.1 森の入口の木もフィールドの木と同じ形
  else for (const [x, y, z, s, c] of [[0, 1.3, 0.3, 0.5, leafL], [-0.55, 1.15, 0.15, 0.55, leaf], [0.55, 1.2, 0.1, 0.55, leaf], [-0.3, 1.25, -0.25, 0.5, leafL], [0.35, 1.3, -0.3, 0.5, leaf]]) k.add(k.K.rock, rockGeo(1, x * 9 + z * 3, 0.32), M4(x, y, z, k.r() * 6, 0, 0, s, s * 0.6, s), hexOf(snowy && y > 1.25 ? mixHex(c, '#ffffff', 0.55) : c));
  k.add(k.K.dark, new THREE.CircleGeometry(0.5, 14, 0, Math.PI), M4(0, 0, 0.1, 0, 0, 0, 0.6, 1.5, 1), 0x0e140c);
  for (const [x, z, s] of [[-1.05, -0.55, 1.1], [1.0, -0.7, 1.2], [-0.45, -1.15, 1.0], [0.5, -1.15, 1.05], [-1.25, 0.6, 0.8], [1.25, 0.55, 0.8]]) k.tree(x, z, s, { leaf: k.r() < 0.5 ? leaf : leafL, wood, pine: snowy, snow: snowy });
  // ほたる・精霊の光
  for (let i = 0; i < 7; i++) k.add(k.K.glow(glow, 1.8), new THREE.SphereGeometry(0.022, 6, 4), M4(k.R(-0.8, 0.8), k.R(0.25, 0.95), k.R(-0.2, 0.8)));
  k.light(0, 0.5, 0.6, glow, 0.8, 5);
}

function ruins(k, D) {
  const S = D.silhouette; const wall = col(D, 'wall', '#a8a090'), wallD = col(D, 'wallD', '#7a7266'), moss = col(D, 'moss', '#5a7a3a'), glow = col(D, 'glow', '#6ad8a0');
  if (S === 'old_city') {   // 崩れかけた高層の旧都市
    for (const [x, z, w, h, ry] of [[-0.75, -0.55, 0.42, 1.5, 0.1], [0.6, -0.7, 0.46, 1.9, -0.1], [-0.05, -1.05, 0.5, 1.2, 0], [0.95, 0.3, 0.34, 0.8, 0.3], [-0.95, 0.4, 0.34, 0.7, -0.2]]) {
      k.house(x, z, w, w * 0.9, h, { wall: k.r() < 0.5 ? wall : wallD, roof: wallD, style: 'flat', glow, mat: 'stone', ry, door: false });
      k.add(k.K.stone, prism(w, 0.18, w * 0.9), M4(x, h, z, ry, 0, 0.5), hexOf(wallD));
      k.add(k.K.rock, box(w * 0.95, 0.06, w * 0.5), M4(x, h * (0.3 + k.r() * 0.4), z + w * 0.46, ry), hexOf(moss));
    }
    for (const s of [-1, 1]) k.add(k.K.stone, box(0.1, 0.5, 0.1), M4(s * 0.26, 0.25, 0.6), hexOf(wallD)); k.add(k.K.stone, box(0.42, 0.08, 0.12), M4(-0.04, 0.52, 0.6, 0, 0, 0.12), hexOf(wall)); k.add(k.K.dark, box(0.42, 0.46, 0.02), M4(0, 0.23, 0.56), 0x0a0c0a);
    for (let i = 0; i < 6; i++) k.stone(k.R(-0.9, 0.9), k.R(0.5, 1.2), 0.12 + k.r() * 0.08, wallD);
    k.light(0, 0.5, 0.4, glow, 0.8, 5); return;
  }
  // 崩れた石造りの街と時計塔
  for (const [x, z, w, d, h] of [[-0.8, -0.45, 0.6, 0.46, 0.4], [0.75, -0.6, 0.56, 0.44, 0.36], [-0.95, 0.45, 0.48, 0.4, 0.3]]) k.house(x, z, w, d, h, { wall, roof: col(D, 'roof', '#6a5a4a'), style: 'broken', glow: '#a0a0a0', mat: 'stone', door: false });
  k.add(k.K.stone, box(0.32, 1.25, 0.32), M4(0.1, 0.62, -1.0), hexOf(wall)); k.add(k.K.stone, prism(0.32, 0.22, 0.32), M4(0.1, 1.25, -1.0, 0, 0, 0.35), hexOf(wallD));
  k.clock(0.1, 1.0, -0.835, 0.11, { moving: false, glow: '#c8c0a0', face: '#d8d0bc' });
  for (const [x, z, h] of [[-0.3, 0.3, 0.35], [0.45, 0.25, 0.5], [0.95, 0.4, 0.22]]) { k.column(x, z, 0.04, h, wall); k.add(k.K.rock, box(0.1, 0.03, 0.1), M4(x, h * 0.6, z + 0.03), hexOf(moss)); }
  for (let i = 0; i < 7; i++) k.stone(k.R(-1.2, 1.2), k.R(-0.2, 1.2), 0.1 + k.r() * 0.1, wallD);
  k.add(k.K.rock, box(1.8, 0.012, 0.3), M4(0, 0.006, 0.9), hexOf(moss));
}

function bunker(k, D) {
  const S = D.silhouette; const glow = col(D, 'glow', '#7ae8ff');
  if (S === 'factory') {   // のこぎり屋根と搬送路の自動工場
    const wall = col(D, 'wall', '#8a8a92'), roof = col(D, 'roof', '#4a4a52'), metal = col(D, 'metal', '#6a6a76');
    k.house(0, -0.45, 1.6, 0.9, 0.55, { wall, roof, style: 'sawtooth', glow: '#ffe0a0', mat: 'stone', door: false });
    k.add(k.K.dark, box(0.46, 0.36, 0.02), M4(0, 0.18, 0.0), 0x14141a); k.add(k.K.glow(glow, 1.2), box(0.5, 0.03, 0.025), M4(0, 0.38, 0.01));
    k.add(k.K.metal, box(0.3, 0.06, 1.3), M4(0, 0.15, 0.7), hexOf(metal)); for (let i = 0; i < 5; i++) k.add(k.K.metal, box(0.26, 0.012, 0.03), M4(0, 0.185, 0.15 + i * 0.25), 0x2a2a30); for (let i = 0; i < 3; i++) k.add(k.K.wood, box(0.13, 0.1, 0.13), M4(0, 0.24, 0.35 + i * 0.4), 0x9a7a4a);
    k.add(k.K.stone, new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8), M4(0.65, 0.55, -0.85), hexOf(metal)); k.smoke(0.65, 1.2, -0.85);
    k.add(k.K.glow(col(D, 'glow', '#ff4a4a'), 2.0), new THREE.SphereGeometry(0.05, 8, 6), M4(-0.6, 0.66, 0.0)); k.light(-0.6, 0.7, 0.1, col(D, 'glow', '#ff4a4a'), 0.8, 5);
    k.halo(0.8, 3.4, '#ffe0a0'); return;
  }
  // 岩山に埋め込まれた研究所：丘＋コンクリートの正面＋金庫の扉（光る輪）＋配管
  const R = { rock: col(D, 'rock', '#7a7268'), rockL: col(D, 'rockL', '#a49a8c'), rockD: col(D, 'rockD', '#4e4840') };
  k.mound(0, -0.5, 1.3, 0.95, 1.0, Object.assign({ seed: hstr(D.id) % 53, amp: 0.28 }, R));
  const metal = col(D, 'metal', '#8a9098');
  k.add(k.K.stone, box(0.9, 0.55, 0.5), M4(0, 0.27, 0.35), 0x9a9aa0); k.add(k.K.stone, box(1.0, 0.06, 0.6), M4(0, 0.57, 0.35), 0x7a7a80);
  k.add(k.K.metal, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), M4(0, 0.25, 0.61, 0, Math.PI / 2), hexOf(metal)); k.add(k.K.glow(glow, 1.6), new THREE.TorusGeometry(0.2, 0.014, 4, 24), M4(0, 0.25, 0.64)); k.add(k.K.metal, box(0.05, 0.16, 0.02), M4(0, 0.25, 0.645), 0x4a4a52);
  for (const s of [-1, 1]) { k.add(k.K.metal, new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), M4(s * 0.6, 0.25, 0.2, 0, Math.PI / 2), hexOf(metal)); k.add(k.K.metal, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), M4(s * 0.6, 0.5, 0.62), hexOf(metal)); }
  for (const s of [-1, 1]) { k.add(k.K.glow(glow, 1.6), box(0.04, 0.04, 0.02), M4(s * 0.32, 0.48, 0.61)); }
  k.light(0, 0.4, 0.9, glow, 1.0, 5);
}

function temple(k, D) {
  const S = D.silhouette; const wall = col(D, 'wall', '#e4dcd0'), wallD = col(D, 'wallD', '#b4aa98'), roof = col(D, 'roof', '#c8b890'), accent = col(D, 'accent', '#e8c040'), glow = col(D, 'glow', '#ffe88a');
  if (S === 'altar') {   // 火口のふちの石の祭壇：石の環・かがり火・竜の角
    const st = col(D, 'stone', '#6a5a58'), stD = col(D, 'stoneD', '#3e3432'), lava = col(D, 'lava', '#ff8a2a');
    k.add(k.K.rock, rockGeo(1, 5, 0.25), M4(0, 0.05, -0.1, 0, 0, 0, 1.3, 0.25, 1.15), hexOf(stD));
    k.steps(1.3, 1.1, 3, 0.1, st, { z: -0.1 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; const x = Math.cos(a) * 0.48, z = -0.1 + Math.sin(a) * 0.4; if (z > 0.2 && Math.abs(x) < 0.25) continue; k.add(k.K.stone, box(0.1, 0.42, 0.08), M4(x, 0.5, z, -a), hexOf(st)); }
    for (const s of [-1, 1]) { k.add(k.K.stone, new THREE.CylinderGeometry(0.06, 0.04, 0.16, 8), M4(s * 0.3, 0.38, 0.25), hexOf(stD)); k.add(k.K.glow(lava, 2.2), new THREE.ConeGeometry(0.06, 0.16, 7), M4(s * 0.3, 0.54, 0.25)); k.light(s * 0.3, 0.6, 0.3, lava, 1.0, 5); }
    for (const s of [-1, 1]) k.add(k.K.stone, new THREE.ConeGeometry(0.06, 0.7, 6), M4(s * 0.45, 0.6, -0.65, 0, 0.35, -s * 0.45), 0xe8dcc8);
    k.add(k.K.glow(lava, 1.4), new THREE.CircleGeometry(0.16, 12), M4(0, 0.31, -0.1, 0, -Math.PI / 2));
    k.halo(0.8, 3.0, lava); return;
  }
  if (S === 'cape_shrine') {   // 岬の小さな祠・石灯籠
    const R = { rock: col(D, 'rock', '#6e6670'), rockL: col(D, 'rockL', '#9a929c'), rockD: shadeHex(col(D, 'rock', '#6e6670'), 0.7) };
    k.mound(0, -0.4, 1.1, 0.5, 0.95, Object.assign({ seed: 21, amp: 0.25 }, R));
    k.house(0, -0.45, 0.5, 0.4, 0.34, { wall: col(D, 'wall', '#a49a90'), roof: col(D, 'roof', '#5a4a6a'), style: 'gable', glow, y: 0.42, mat: 'wood', timbered: true });
    for (const s of [-1, 1]) { const x = s * 0.32, z = 0.15; k.add(k.K.stone, box(0.05, 0.18, 0.05), M4(x, 0.36, z), 0x8a847a); k.add(k.K.glow(glow, 1.6), box(0.08, 0.07, 0.08), M4(x, 0.48, z)); k.add(k.K.stone, new THREE.ConeGeometry(0.07, 0.06, 4), M4(x, 0.55, z, Math.PI / 4), 0x7a746a); k.light(x, 0.5, z + 0.1, glow, 0.7, 4); }
    k.path(0, 1.4, 0, 0.3, 0.2, 0x8a847a);
    k.halo(0.8, 2.6, glow); return;
  }
  if (S === 'mirage_temple') {   // 砂から現れる古代遺跡・黄金の塔・ピラミッド
    k.steps(2.2, 2.0, 4, 0.14, wall, { z: -0.3, dw: 0.38, dd: 0.34 });
    k.add(k.K.stone, new THREE.ConeGeometry(0.72, 1.0, 4), M4(0, 0.56 + 0.5, -0.35, Math.PI / 4), hexOf(wallD));
    k.tower(0, -0.35, 0.07, 0.5, { y: 1.45, top: 'cone', wall: roof, roof, glow, mat: 'metal', rh: 0.3 });
    k.add(k.K.dark, box(0.26, 0.3, 0.04), M4(0, 0.71, 0.4), 0x1a1208); k.add(k.K.glow(accent, 1.2), box(0.5, 0.03, 0.02), M4(0, 0.6, 0.66));
    for (const s of [-1, 1]) { k.column(s * 0.62, 0.75, 0.05, 0.6, wall); k.add(k.K.glow(glow, 1.0), box(0.06, 0.06, 0.06), M4(s * 0.62, 0.68, 0.75)); }
    for (const [x, z] of [[-1.35, 0.8], [1.4, 0.7]]) k.palm(x, z, 0.88);
    k.light(0, 0.8, 0.8, glow, 1.0, 6); k.halo(1.0, 3.4, glow); return;
  }
  // 列柱の神殿（時の神殿）・天空神殿（雲の土台・浮かぶ石柱・金の装飾）
  const sky = S === 'sky_temple';
  if (sky) { for (const [x, z, s] of [[0, -0.2, 1.3], [-0.7, 0.4, 0.7], [0.75, 0.35, 0.75]]) k.add(k.K.rock, rockGeo(1, x * 7 + 1, 0.35), M4(x, 0.08, z, 0, 0, 0, s, 0.22, s * 0.8), 0xf4f6fa); }
  const top = k.steps(1.7, 1.4, 3, 0.1, wall, { z: -0.25, dw: 0.16, dd: 0.14, x: 0 });
  k.house(0, -0.35, 0.95, 0.65, 0.62, { wall, roof, style: 'pediment', glow, mat: 'stone', y: top, rh: 0.24 });
  const nc = has(D, 'columns6') ? 6 : 5;
  for (let i = 0; i < nc; i++) k.column(-0.42 + i * 0.84 / (nc - 1), 0.05, 0.035, 0.62, wall, { y: top });
  k.add(k.K.stone, box(1.0, 0.06, 0.16), M4(0, top + 0.65, 0.05), hexOf(wall)); k.add(k.K.stone, prism(1.0, 0.2, 0.16), M4(0, top + 0.68, 0.05), hexOf(wall));
  k.add(k.K.metal, box(1.02, 0.025, 0.17), M4(0, top + 0.69, 0.05), hexOf(accent));
  if (has(D, 'hourglass')) { const y = top + 0.3; k.add(k.K.glow(glow, 1.4), new THREE.ConeGeometry(0.08, 0.14, 8), M4(0, y + 0.07, -0.02, 0, Math.PI)); k.add(k.K.glow(glow, 1.4), new THREE.ConeGeometry(0.08, 0.14, 8), M4(0, y - 0.07, -0.02)); }
  if (sky || has(D, 'floating_pillars')) for (const [x, y, z] of [[-1.05, 0.9, -0.6], [1.05, 1.0, -0.5], [-0.9, 0.7, 0.75]]) { k.column(x, z, 0.05, 0.42, wall, { y }); k.add(k.K.metal, box(0.14, 0.02, 0.14), M4(x, y + 0.45, z), hexOf(accent)); }
  k.light(0, top + 0.4, 0.4, glow, 1.0, 6); k.halo(1.0, 3.4, glow);
}

function towerFamily(k, D) {
  const S = D.silhouette; const wall = col(D, 'wall', '#c8c0b4'), wallD = col(D, 'wallD', wall), roof = col(D, 'roof', '#6a3a8a'), roofD = col(D, 'roofD', roof), glow = col(D, 'glow', '#ffd28a'), accent = col(D, 'accent', '#e8c040');
  k.add(k.K.stone, new THREE.CylinderGeometry(0.62, 0.7, 0.08, 16), M4(0, 0.04, -0.15), hexOf(shadeHex(wallD, 0.9)));
  if (S === 'lighthouse') {   // 紅白の灯台
    const R = { rock: '#7a7268', rockL: '#a49a8c', rockD: '#4e4840' }; k.mound(0, -0.15, 0.8, 0.35, 0.7, Object.assign({ seed: 9 }, R));
    k.tower(0, -0.15, 0.24, 1.9, { bands: [wall, col(D, 'stripe', '#d83a3a'), wall, col(D, 'stripe', '#d83a3a'), wall], top: 'lamp', roof: col(D, 'roof', '#3a3a42'), glow, y: 0.2 });
    k.house(0.45, 0.25, 0.36, 0.3, 0.28, { wall, roof: col(D, 'stripe', '#d83a3a'), style: 'gable', glow: '#ffc070' });
    k.halo(2.1, 2.8, glow); return;
  }
  if (S === 'observatory') {   // 望遠鏡のドームを載せた観測塔
    k.tower(0, -0.15, 0.3, 1.6, { top: 'flat', wall, roof, glow });
    k.add(k.K.shiny, new THREE.SphereGeometry(0.34, 16, 8, 0, TAU, 0, Math.PI / 2), M4(0, 1.68, -0.15), hexOf(roof)); k.add(k.K.dark, box(0.1, 0.3, 0.6), M4(0, 1.82, 0.0, 0, -0.5), 0x101018);
    k.add(k.K.metal, new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8), M4(0, 1.95, 0.15, 0, -0.8), hexOf(col(D, 'metal', '#8a8a92')));
    for (let i = 0; i < 5; i++) k.add(k.K.glow(glow, 1.8), new THREE.OctahedronGeometry(0.03, 0), M4(k.R(-0.9, 0.9), k.R(1.8, 2.5), k.R(-0.8, 0.3)));
    k.house(0.55, 0.3, 0.38, 0.3, 0.3, { wall: wallD, roof, style: 'dome', glow }); k.halo(1.4, 2.8, glow); return;
  }
  if (S === 'academy') {   // 天文台と図書館の学院・アーチの門・旗
    k.house(0, -0.45, 1.0, 0.56, 0.62, { wall, roof: roofD, style: 'gable', glow, mat: 'stone' });
    k.add(k.K.stone, new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16), M4(0, 0.98, -0.45), hexOf(wall)); k.add(k.K.shiny, new THREE.SphereGeometry(0.23, 16, 8, 0, TAU, 0, Math.PI / 2), M4(0, 1.08, -0.45), hexOf(roof));
    k.tower(0.7, -0.75, 0.13, 1.25, { top: 'dome', wall, roof, glow });
    for (const s of [-1, 1]) { k.add(k.K.stone, box(0.08, 0.5, 0.08), M4(s * 0.24, 0.25, 0.55), hexOf(wall)); k.flag(s * 0.45, 0.3, 0.75, accent); }
    k.add(k.K.stone, new THREE.TorusGeometry(0.24, 0.04, 6, 14, Math.PI), M4(0, 0.5, 0.55), hexOf(wall));
    k.path(0, 1.4, 0, -0.15, 0.24, 0xc8c0a8); for (const [x, z] of [[-1.2, 0.5], [1.25, 0.6]]) k.tree(x, z, 0.88, { leaf: '#3f7a34' });
    k.halo(1.0, 3.2, glow); k.light(0, 0.8, 0.3, glow, 1.1, 6); return;
  }
  if (S === 'archive_tower') {   // 封印の紋章を刻んだ書庫塔
    k.house(0, -0.15, 0.62, 0.62, 1.7, { wall, roof, style: 'pyramid', glow: col(D, 'glow', '#ff8aa8'), mat: 'stone', rh: 0.6 });
    k.add(k.K.glow(col(D, 'glow', '#ff8aa8'), 1.2), new THREE.TorusGeometry(0.18, 0.02, 4, 24), M4(0, 1.2, 0.165)); k.add(k.K.glow(col(D, 'glow', '#ff8aa8'), 1.2), new THREE.CircleGeometry(0.05, 6), M4(0, 1.2, 0.17));
    for (const s of [-1, 1]) k.add(k.K.metal, box(0.04, 0.5, 0.04), M4(s * 0.2, 0.25, 0.4, 0, 0, s * 0.6), hexOf(accent));
    k.halo(1.5, 3.0, col(D, 'glow', '#ff8aa8')); return;
  }
  if (S === 'frozen_clock') {   // 氷に覆われた巨大時計塔・止まった針
    const ice = col(D, 'ice', '#dff4ff');
    k.house(0, -0.15, 0.56, 0.56, 1.75, { wall, roof, style: 'spire', glow, mat: 'stone', rh: 0.9 });
    k.clock(0, 1.42, 0.135, 0.18, { moving: !!D.moving, glow, face: col(D, 'clock', '#e8f6ff') });
    for (let i = 0; i < 9; i++) k.add(k.K.shiny, new THREE.ConeGeometry(0.02, 0.1 + k.r() * 0.08, 4), M4(-0.26 + i * 0.065, 1.7, 0.29, 0, Math.PI), hexOf(ice));
    for (const [x, z, h] of [[-0.42, 0.2, 0.42], [0.45, 0.15, 0.36], [-0.3, -0.5, 0.5], [0.4, -0.45, 0.3]]) k.crystal(x, z, h, ice);
    k.halo(1.6, 3.0, glow); return;
  }
  // 時の神殿（tower_icon の temple）は temple() へ
  k.tower(0, -0.15, 0.3, 1.7, { top: 'cone', wall, roof, glow }); k.halo(1.4, 2.8, glow);
}

function portal(k, D) {
  const st = col(D, 'stone', '#a8a2b8'), stL = col(D, 'stoneL', '#d0cce0'), stD = col(D, 'stoneD', '#6e6884'), glow = col(D, 'glow', '#8ae0ff'), glow2 = col(D, 'glow2', '#c88aff');
  k.add(k.K.stone, new THREE.CylinderGeometry(0.75, 0.82, 0.1, 18), M4(0, 0.05, -0.2), hexOf(stD));
  for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.1 + i / 6 * Math.PI * 1.2 + Math.PI; const x = Math.cos(a) * 0.95, z = -0.2 + Math.sin(a) * 0.82; k.add(k.K.stone, box(0.16, 0.5 + (i % 2) * 0.2, 0.12), M4(x, 0.3, z, -a + Math.PI / 2), hexOf(i % 2 ? st : stL)); }
  k.ring(0, 0.62, -0.1, 0.48, 0.07, st, glow, 1.6);
  k.add(k.K.glow(glow2, 1.4), new THREE.TorusGeometry(0.3, 0.02, 4, 24), M4(0, 0.62, -0.08));
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; k.add(k.K.glow(i % 2 ? glow : glow2, 1.2), box(0.06, 0.008, 0.06), M4(Math.cos(a) * 0.62, 0.105, -0.2 + Math.sin(a) * 0.55, a)); }
  if (has(D, 'tech_frame')) for (const s of [-1, 1]) k.add(k.K.metal, box(0.06, 1.1, 0.06), M4(s * 0.58, 0.55, -0.1), 0x8a9098);
  k.halo(0.7, 2.8, glow);
}

function rift(k, D) {
  const R = { rock: col(D, 'rock', '#3a3048'), rockL: col(D, 'rockL', '#5a4a6e'), rockD: col(D, 'rockD', '#1e1828') }; const glow = col(D, 'glow', '#b84aff');
  for (const [x, z, s, h] of [[-0.7, -0.3, 0.5, 0.9], [0.7, -0.4, 0.55, 1.0], [0, -1.0, 0.5, 0.8], [-1.0, 0.5, 0.3, 0.4], [1.0, 0.5, 0.32, 0.45]]) k.mound(x, z, s, h * 0.7, s * 0.7, Object.assign({ seed: x * 13 + z }, R));
  for (let i = 0; i < 5; i++) k.add(k.K.glow(glow, 2.0), box(0.05 - i * 0.006, 1.0 - i * 0.12, 0.02), M4(-0.05 + i * 0.03, 0.55 - i * 0.03, -0.1 + i * 0.02, 0, 0, (i % 2 ? 1 : -1) * 0.18));
  k.add(k.K.glow(glow, 1.6), box(0.06, 0.012, 1.1), M4(0.05, 0.01, 0.45, 0.2));
  const mist = k.K.halo(hexOf(glow)).clone(); mist.blending = THREE.NormalBlending; mist.opacity = 0.45; mist.userData = {}; k.sprite(mist, 0, 0.5, 0, 2.6, 1.2);
  k.light(0, 0.6, 0.3, glow, 1.2, 6);
}

const FAMILY = {
  farm_village: village, tree_village: village, survivor_village: village, faded_village: village, shore_hut: village, stilt_shacks: village,
  port_town: port_, snow_port: port_,
  castle_town: city, admin_city: city, capital: city, clock_city: city, winter_city: city, desert_city: city, arcane_city: city, casino_city: city, future_city: city,
  forge_town: city, industrial_town: city, uniform_blocks: city, bazaar: city, camp: city, war_camp: city,
  iron_fortress: fortress, demon_castle: fortress,
  cave: cave, vein_cave: cave, vent_cave: cave, mine: cave, mist_rocks: cave, wreck: cave,
  mountain_pass: pass, sand_canyon: pass,
  forest_arch: forest, spirit_forest: forest,
  ruins: ruins, old_city: ruins,
  bunker: bunker, factory: bunker,
  temple: temple, mirage_temple: temple, sky_temple: temple, altar: temple, cape_shrine: temple,
  lighthouse: towerFamily, observatory: towerFamily, academy: towerFamily, archive_tower: towerFamily, frozen_clock: towerFamily,
  portal: portal, void_rift: rift
};
export const LANDMARK_FAMILIES = Object.keys(FAMILY);
// 目印全体の倍率（1＝約3×3マス）。触れたら入る範囲（入口のまわり8マス）より少し大きく見せる
export const LM_SCALE = 1.9;

export class LandmarkBuilder3D {
  constructor(mats, scale) { this.mats = mats; this.K = kitMaterials(mats); this.scale = scale || LM_SCALE; this.stats = { built: 0, failed: [] }; }
  // design：LocationDesign.resolve(...).design。origin：入口のマスの中心（地面の高さ）。env：{ put, heightAt }。face：正面（出てくる側）[dx,dy]
  //   目印の中心は入口から正面の反対へ 0.5 マス（触れたら入る範囲 World.landmarkFoot の中心）。向きは正面へ回す（港は海側＝南のまま）
  // 戻り値：{ lights, smokes, sprites } または null（その形の組み立てがない・失敗した → 呼び出し側が従来のモデルを置く）
  build(design, origin, batch, env, face) {
    const fn = design && FAMILY[design.silhouette]; if (!fn) return null;
    const f = face || [0, 1]; const port = fn === port_; const ry = port ? 0 : Math.atan2(f[0], f[1]);
    const o = origin.clone(); o.x -= f[0] * 0.5; o.z -= f[1] * 0.5;
    const k = new Kit(this.K, batch, o, hstr(design.id || design.silhouette), env, this.scale, ry);
    // 失敗しても途中までの形が残らないように、いったん別の Batch に作ってから移す
    const tmp = { lists: new Map(), add(mat, g, m) { const gg = g.index ? g.toNonIndexed() : g.clone(); if (m) gg.applyMatrix4(m); if (!this.lists.has(mat)) this.lists.set(mat, []); this.lists.get(mat).push(gg); } };
    k.b = tmp;
    try { fn(k, design); }
    catch (e) { this.stats.failed.push((design.id || '?') + ': ' + (e && e.message)); return null; }
    for (const [mat, list] of tmp.lists) for (const g of list) batch.add(mat, g, null);
    this.stats.built++;
    return { lights: k.lights, smokes: k.smokes, sprites: k.sprites };
  }
}
