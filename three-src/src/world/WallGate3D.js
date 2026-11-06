/* =========================================================
   v7.9.3 町の城門（城壁の切れ目の出口）：城壁（castle_wall）に囲まれた町の、外へ出る出口の上に石の楼門を建てる
   ・対象：町（kind 'town'）の地図の端の出口（ワープの並び）で、その両わきが城壁のマスのもの（リヴェル城下町の南の門など）。近未来・機械の町（ネオン・ドックなど）は除く（world/MapScene3D.js）
   ・砂漠の町は砂岩の色で、塔の屋根なし
   ・形：左右に城壁より高い四角い塔（胸壁・円錐の屋根）、出口の上に半楕円のアーチの門の建物（迫石・上げた落とし格子の歯・胸壁）、
     町の名の額・紋章の旗・門灯。通り道（出口のマス）の上は高さ 2.7 まで空けてある
   ・見た目だけ：通れるマス・出口の位置・当たり判定は前と同じ（2D 版の地図から決める）
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4, textTexture } from '../engine/Materials.js';

const WALLT = { castle_wall: 1 };
// 出口のまとまり：[{ side, a0, a1, v0, v1 }]（side＝S/N/E/W、a＝辺に沿った範囲、v＝城壁の厚みの範囲）
export function findWallGates(map) {
  const W = map.w, H = map.h; const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '_out' : map.tile(x, y));
  const defs = window.MAP_DEFS || {}; const out = [];
  const exits = (map.def && map.def.warps || []).filter((w) => { const d = defs[w.to]; return d && (d.kind === 'field' || d.region); });
  const sides = { S: [], N: [], E: [], W: [] };
  exits.forEach((w) => { if (w.y >= H - 2) sides.S.push(w); else if (w.y <= 1) sides.N.push(w); else if (w.x >= W - 2) sides.E.push(w); else if (w.x <= 1) sides.W.push(w); });
  for (const side of ['S', 'N', 'E', 'W']) {
    const horiz = side === 'S' || side === 'N'; const along = [...new Set(sides[side].map((w) => (horiz ? w.x : w.y)))].sort((a, b) => a - b); if (!along.length) continue;
    // 続いている範囲ごと
    const runs = []; let s0 = along[0], p = along[0]; for (let i = 1; i <= along.length; i++) { if (i < along.length && along[i] === p + 1) { p = along[i]; continue; } runs.push([s0, p]); if (i < along.length) { s0 = along[i]; p = along[i]; } }
    for (const [a0, a1] of runs) {
      const vs = []; for (let k = 0; k < 4; k++) { const v = side === 'S' ? H - 1 - k : side === 'N' ? k : side === 'E' ? W - 1 - k : k; const t0 = horiz ? T(a0 - 1, v) : T(v, a0 - 1), t1 = horiz ? T(a1 + 1, v) : T(v, a1 + 1); if (WALLT[t0] && WALLT[t1]) vs.push(v); else if (vs.length) break; }
      if (!vs.length || a1 - a0 + 1 > 8) continue; out.push({ side, a0, a1, v0: Math.min(...vs), v1: Math.max(...vs) });
    }
  }
  return out;
}

// 紋章の旗（地の色＝地域の屋根の色）
const CREST = {};
function crestTexture(base) {
  if (CREST[base]) return CREST[base]; const c = document.createElement('canvas'); c.width = 128; c.height = 320; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 290); g.beginPath(); g.moveTo(0, 290); g.lineTo(64, 320); g.lineTo(128, 290); g.fill();
  g.fillStyle = '#e8c15a'; g.fillRect(0, 0, 128, 10); g.fillRect(0, 0, 8, 290); g.fillRect(120, 0, 8, 290);
  g.beginPath(); g.moveTo(30, 90); g.lineTo(98, 90); g.lineTo(98, 150); g.quadraticCurveTo(98, 196, 64, 214); g.quadraticCurveTo(30, 196, 30, 150); g.closePath(); g.fill();
  g.fillStyle = base; g.beginPath(); g.moveTo(40, 100); g.lineTo(88, 100); g.lineTo(88, 150); g.quadraticCurveTo(88, 186, 64, 200); g.quadraticCurveTo(40, 186, 40, 150); g.closePath(); g.fill();
  g.fillStyle = '#f4f0e0'; g.beginPath(); g.moveTo(64, 112); g.lineTo(76, 140); g.lineTo(64, 186); g.lineTo(52, 140); g.closePath(); g.fill(); g.fillRect(48, 136, 32, 7);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; CREST[base] = t; return t;
}
export function buildWallGates(map, ctx) {
  if (!map || map.kind !== 'town') return { n: 0 };
  const th0 = ctx.theme || {}; if (th0.region === 'neon' || /machine/.test(th0.place || '') || th0.modern) return { n: 0 };   // 錆雨市・機械の町は石の楼門にしない
  const gates = findWallGates(map); if (!gates.length) return { n: 0 };
  const M = ctx.mats; const theme = ctx.theme || {}; const b = new Batch(); const lamps = [];
  const desert = theme.region === 'desert';
  const stone = M.tinted('stonewall', theme.region === 'dark' ? '#6a6070' : desert ? '#d8b88a' : '#c8c0b4'), lite = M.tinted('stonewall', theme.region === 'dark' ? '#8a8090' : desert ? '#ecd6ae' : '#e4ded2');
  const roof = M.roof(theme.roof || '#3f4f8a'), iron = M.get('iron'), gold = M.get('gold'), dark = M.tinted('planks', '#2a1c12');
  const bannerMat = new THREE.MeshStandardMaterial({ map: crestTexture(theme.roof || '#2a4f9a'), roughness: 0.95, side: THREE.DoubleSide });
  const WALLH = 2.6;
  for (const g of gates) {
    const L = g.a1 - g.a0 + 1; const depth = g.v1 - g.v0 + 1; const ca = (g.a0 + g.a1 + 1) / 2, cv = (g.v0 + g.v1 + 1) / 2;
    const ry = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 }[g.side];
    const cx = g.side === 'S' || g.side === 'N' ? ca : cv, cz = g.side === 'S' || g.side === 'N' ? cv : ca;
    const base = M4(cx, 0, cz, ry); const P = (...a) => base.clone().multiply(M4(...a));   // M4 と同じ引数（x, y, z, ry, rx, rz, …）
    // ローカル：x＝辺に沿う（-L/2〜L/2 が通り道）、z＝外へ（+）、y＝上
    const D = depth + 0.3, ow = L, rh = 2.7, ry2 = Math.min(1.1, ow * 0.28), apex = rh + ry2, Hb = Math.max(WALLH + 1.9, apex + 1.0);
    // アーチの門の建物（通り道の上）：半楕円をくり抜いた形を押し出す
    const sp = new THREE.Shape(); sp.moveTo(-ow / 2, rh); sp.lineTo(-ow / 2, Hb); sp.lineTo(ow / 2, Hb); sp.lineTo(ow / 2, rh); sp.absellipse(0, rh, ow / 2, ry2, 0, Math.PI, false);
    const sg = new THREE.ExtrudeGeometry(sp, { depth: D, bevelEnabled: false, curveSegments: 16 }); const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5, uv.getY(i) * 0.5);
    b.add(stone, sg, P(0, 0, -D / 2));
    // 迫石（半楕円にそって）・要石
    for (const zf of [D / 2 + 0.01, -D / 2 - 0.01]) {
      const n = 11; for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; const x = Math.cos(t) * (ow / 2 + 0.12), y = rh + Math.sin(t) * (ry2 + 0.12); b.add(lite, box(0.32, 0.22, 0.12, 1), P(x, y, zf, 0, 0, t - Math.PI / 2)); }
      b.add(lite, box(0.4, 0.5, 0.16, 1), P(0, apex + 0.15, zf));
    }
    // 上げた落とし格子の歯（外側）
    const pz = D / 2 - 0.25; const nb = Math.max(6, Math.round(ow / 0.32));
    for (let i = 0; i <= nb; i++) { const x = -ow / 2 + 0.1 + i * (ow - 0.2) / nb; const top = ry2 * Math.sqrt(Math.max(0, 1 - (2 * x / ow) * (2 * x / ow))); const y0 = rh + 0.05; const len = top - 0.02; if (len > 0.08) b.add(iron, box(0.07, len, 0.07, 1), P(x, y0 + len / 2, pz)); b.add(iron, new THREE.ConeGeometry(0.06, 0.24, 4), P(x, y0 - 0.12, pz, 0, Math.PI)); }
    b.add(iron, box(ow - 0.1, 0.07, 0.07, 1), P(0, rh + 0.12, pz));
    // 胸壁（両側の面）と持ち送り
    const nm = Math.max(5, Math.round((ow + 2.6) / 0.6)); const tw = ow + 2.6;
    for (const s of [1, -1]) { for (let i = 0; i < nm; i += 2) { const x = -tw / 2 + (i + 0.5) * tw / nm; b.add(stone, box(tw / nm, 0.5, 0.3, 1), P(x, Hb + 0.25, s * (D / 2 - 0.15))); }
      for (let x = -ow / 2 + 0.2; x <= ow / 2 - 0.1; x += 0.5) b.add(stone, box(0.2, 0.36, 0.3, 1), P(x, Hb - 0.3, s * (D / 2 + 0.12))); }
    b.add(stone, box(ow + 0.2, 0.18, D + 0.5, 1), P(0, Hb - 0.05, 0));
    // 左右の四角い塔（城壁のマスの上）
    const ts = Math.min(1.5, depth + 0.4), th = Hb + 1.4;
    for (const s of [-1, 1]) { const tx = s * (ow / 2 + ts / 2 - 0.05);
      b.add(stone, box(ts, th, ts, 2), P(tx, th / 2, 0)); b.add(lite, box(ts + 0.12, 0.2, ts + 0.12, 1), P(tx, th * 0.45, 0));
      for (const [ux, uz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) b.add(stone, box(0.32, 0.45, 0.32, 1), P(tx + ux * (ts / 2 - 0.16), th + 0.22, uz * (ts / 2 - 0.16)));
      if (!desert) { const cone = new THREE.ConeGeometry(ts * 0.62, ts * 1.6, 4); cone.rotateY(Math.PI / 4); b.add(roof, cone, P(tx, th + 0.45 + ts * 0.8, 0)); b.add(gold, new THREE.SphereGeometry(0.08, 8, 6), P(tx, th + 0.45 + ts * 1.6 + 0.04, 0)); }   // 砂漠の町は屋根なし（胸壁だけ）
      for (const zf of [ts / 2 + 0.01, -ts / 2 - 0.01]) for (const y of [th * 0.32, th * 0.66]) b.add(dark, box(0.1, 0.55, 0.04, 1), P(tx, y, zf));   // 矢狭間
    }
    // 額（町の名）・旗・門灯（外側と内側）
    const name = (map.name || '').replace(/（.*?）/g, '');
    for (const s of [1, -1]) {
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(ow + 0.4, 3.2), 0.6), new THREE.MeshStandardMaterial({ map: textTexture(name || '城門'), roughness: 0.8 }));
      const pp = new THREE.Vector3(0, apex + 0.75, s * (D / 2 + 0.04)).applyMatrix4(base); plate.position.copy(pp); plate.rotation.y = ry + (s < 0 ? Math.PI : 0); ctx.group.add(plate);
      for (const k of [-1, 1]) { const bp = new THREE.Vector3(k * (ow / 2 + ts / 2 - 0.05), Hb - 0.4, s * (ts / 2 + 0.03)).applyMatrix4(base);
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.9), bannerMat); ban.position.copy(bp).add(new THREE.Vector3(0, -0.95, 0)); ban.rotation.y = ry + (s < 0 ? Math.PI : 0); ban.castShadow = true; ctx.group.add(ban); }
      for (const k of [-1, 1]) { const lp = new THREE.Vector3(k * (ow / 2 + 0.25), 2.3, s * (D / 2 + 0.06)); const wp = lp.clone().applyMatrix4(base); if (ctx.put) ctx.put('wall_lantern', M4(wp.x, wp.y, wp.z, ry + (s < 0 ? 0 : Math.PI)), wp.x, wp.z); }
      lamps.push({ pos: new THREE.Vector3(0, 2.6, s * (D / 2 + 0.8)).applyMatrix4(base), color: 0xffb05a, power: 1.1, dist: 9 });
    }
  }
  b.build(ctx.group);
  return { n: gates.length, lamps, gates };
}
