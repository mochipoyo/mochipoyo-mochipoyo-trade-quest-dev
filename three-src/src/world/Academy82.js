/* =========================================================
   Academy82（v8.2）：ボラティリティア学院の本校舎の外観（中庭を囲む左右の翼棟・本館の塔・渡り廊下）
   ・依頼（2026-11-07 14:39）：「中庭を囲む本校舎・左右翼棟・塔・渡り廊下」「石造アーチ・木の長机・縦長窓・星図・浮く灯り」「既存作品の校章・寮名・人物を持ち込まない」
   ・学院の町の地図（2D の建物の足元）は変えない。建物を 3 階建ての石の棟（尖頭の縦長窓・控え壁・急な石板の屋根・角の小尖塔）にし、
     西の 3 棟（講義室・本館・古代文明研究室）と東の 3 棟（大図書館・量子物理研究室・意識研究所）を、通り道の上の渡り廊下（2 階の高さ。下は歩ける）でつなぐ → 中庭を囲む 2 つの長い翼棟に見える
   ・本館（va_main）：真ん中に高い塔（天球の文字盤と尖塔）と、アーチの大きな玄関。扉の先は玄関ホール（js/data/academy82.js）
   ・天文観測室（va_obs）は前の形（観測塔の青銅のドーム）のまま
   ========================================================= */
import * as THREE from 'three';
import { plain, Merge } from '../environment/EnvKit3D.js';
import { wallTex } from '../environment/recipes/tex82.js';

const M = (hex, o) => { o = o || {}; return plain(hex, { std: { roughness: o.r !== undefined ? o.r : 0.85, metalness: o.m || 0 }, emissive: o.glow ? (o.gc || hex) : undefined, ei: o.glow || undefined, keepGlow: !!o.glow, window: !!o.win }); };
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const WINGS = { va_lecture: 7, va_main: 9, va_ancient: 7, va_library: 8, va_quantum: 7, va_mind: 7, va_dorm: 6, va_under: 4.5 };
export function isAcademy82(map, b) { return map && map.id === 'volatilia' && WINGS[b.id] !== undefined; }

function stoneM() { return wallTex('ashlar_arch', '#d6cfc0', '#9a9080', {}); }
export function buildAcademyWing82(b) {
  const g = new THREE.Group(); g.name = 'academy82_' + b.id; const mg = new Merge(); const add = (m, gg) => mg.add(m, gg); const mgNo = new Merge(); const addNo = (m, gg) => mgNo.add(m, gg);
  const stone = stoneM(), trim = M('#8a8070', { r: 0.8 }), slate = M('#3a4656', { r: 0.7 }), win = M('#1a1612', { glow: 1.1, gc: '#ffd8a0', win: true }), dark = M('#0e0c0a', { r: 1 }), brass = M('#b8904a', { r: 0.35, m: 0.7 }), sky = M('#1e2a4a', { glow: 0.4, gc: '#3a5aa0' });
  const x0 = b.x + 0.1, z0 = b.y + 0.15, W = b.w - 0.2, D = b.h - 0.75; const H = WINGS[b.id]; const cx = x0 + W / 2, cz = z0 + D / 2; const dx = b.doorAbs.x + 0.5, fz = z0 + D;
  const sb = (w, h, d, x, y, z) => { const gg = box(w, h, d, x, y, z); const p = gg.attributes.position, n = gg.attributes.normal, u = gg.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); if (ay > 0.5) u.setXY(i, p.getX(i) / 3, p.getZ(i) / 3); else if (ax > 0.5) u.setXY(i, p.getZ(i) / 3, p.getY(i) / 3); else u.setXY(i, p.getX(i) / 3, p.getY(i) / 3); } add(stone, gg); };
  sb(W, H, D, cx, H / 2, cz); add(trim, box(W + 0.2, 0.25, D + 0.2, cx, H, cz)); add(trim, box(W + 0.1, 0.18, D + 0.1, cx, 0.09, cz));
  // 屋根（急な石板・長い向きに棟）
  const ridgeX = W >= D; const span = ridgeX ? D : W, len = ridgeX ? W : D; const rh = span * 0.75; const sh = new THREE.Shape(); sh.moveTo(-span / 2 - 0.2, 0); sh.lineTo(span / 2 + 0.2, 0); sh.lineTo(0, rh); sh.closePath();
  const rg = new THREE.ExtrudeGeometry(sh, { depth: len + 0.3, bevelEnabled: false }); rg.translate(0, 0, -(len + 0.3) / 2); if (ridgeX) rg.rotateY(Math.PI / 2); rg.translate(cx, H + 0.12, cz); add(slate, rg);
  // 屋根窓・角の小尖塔
  for (const [px, pz] of [[x0, z0], [x0 + W, z0], [x0, z0 + D], [x0 + W, z0 + D]]) { add(stone, new THREE.CylinderGeometry(0.22, 0.26, 1.6, 8).translate(px, H + 0.8, pz)); add(slate, new THREE.ConeGeometry(0.3, 1.2, 8).translate(px, H + 2.2, pz)); }
  // 正面（南）：控え壁と、階ごとの尖頭の縦長窓
  const floors = Math.max(2, Math.floor(H / 2.8));
  for (let x = x0 + 0.9; x < x0 + W - 0.6; x += 1.3) {
    if (Math.abs(x - dx) < 1.2) continue;
    for (let f = 0; f < floors; f++) { const y = 1.4 + f * (H - 1.6) / floors; addNo(win, box(0.42, 1.25, 0.05, x, y, fz + 0.02)); const ar = new THREE.CircleGeometry(0.21, 8, 0, Math.PI); ar.translate(x, y + 0.62, fz + 0.021); addNo(win, ar); add(trim, box(0.6, 0.08, 0.1, x, y - 0.66, fz + 0.04)); }
    add(stone, box(0.24, H * 0.85, 0.35, x + 0.65, H * 0.42, fz + 0.15));
  }
  // 玄関：アーチと階段
  add(trim, new THREE.TorusGeometry(0.75, 0.12, 6, 12, Math.PI).translate(dx, 2.0, fz + 0.06)); addNo(dark, box(1.4, 2.0, 0.06, dx, 1.0, fz + 0.03)); const arc = new THREE.CircleGeometry(0.7, 10, 0, Math.PI); arc.translate(dx, 2.0, fz + 0.031); addNo(dark, arc);
  // 本館：真ん中の高い塔（天球の文字盤・尖塔・浮く灯り）と大玄関
  if (b.id === 'va_main') {
    const tx = dx, tz = z0 + D * 0.45, TH = H + 8; sb(3.2, TH, 3.2, tx, TH / 2, tz); add(trim, box(3.5, 0.3, 3.5, tx, TH, tz));
    add(slate, new THREE.ConeGeometry(2.4, 5.5, 4).rotateY(Math.PI / 4).translate(tx, TH + 2.75, tz)); add(brass, new THREE.CylinderGeometry(0.05, 0.08, 1.6, 6).translate(tx, TH + 6.2, tz)); add(brass, new THREE.SphereGeometry(0.22, 10, 8).translate(tx, TH + 7.1, tz));
    add(sky, new THREE.CircleGeometry(1.15, 24).translate(tx, TH - 2.2, tz + 1.62)); add(brass, new THREE.TorusGeometry(1.15, 0.07, 6, 28).translate(tx, TH - 2.2, tz + 1.63)); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(brass, box(0.06, 0.2, 0.04, tx + Math.cos(a) * 0.95, TH - 2.2 + Math.sin(a) * 0.95, tz + 1.65)); }
    add(brass, new THREE.TorusGeometry(0.8, 0.04, 6, 24).rotateX(0.5).translate(tx, TH - 2.2, tz + 1.7)); add(brass, new THREE.TorusGeometry(0.6, 0.04, 6, 24).rotateY(0.9).translate(tx, TH - 2.2, tz + 1.7));   // 天球の目盛り（学院の徽章の形）
    for (let i = 0; i < 4; i++) addNo(win, box(0.4, 1.4, 0.05, tx, 2.5 + i * 2.4, tz + 1.62));
    add(trim, box(3.4, 0.4, 1.2, dx, 3.6, fz + 0.6)); for (const s of [-1, 1]) add(stone, new THREE.CylinderGeometry(0.2, 0.24, 3.4, 10).translate(dx + s * 1.4, 1.7, fz + 0.9));   // 大玄関の柱と庇
    for (let i = 0; i < 3; i++) { const o = new THREE.SphereGeometry(0.16, 10, 8); o.translate(dx - 1.2 + i * 1.2, 4.6 + (i % 2) * 0.3, fz + 1.0); addNo(M('#cfe4ff', { glow: 1.8 }), o); }   // 浮く灯り
  }
  mg.build(g); mgNo.build(g, { shadow: false });
  return { group: g, lights: [{ pos: new THREE.Vector3(dx, 2.8, fz + 1.2), color: 0xffd8a0, power: 0.8, dist: 7 }], smokes: [], props: [] };
}

// 渡り廊下（通り道の上・2 階の高さ。下は歩ける）：西の翼と東の翼の棟どうし
export function buildAcademyBridges82(map, group) {
  if (!map || map.id !== 'volatilia') return 0; const B = {}; (map.buildings || []).forEach((b) => { B[b.id] = b; });
  const pairs = [['va_lecture', 'va_main'], ['va_main', 'va_ancient'], ['va_library', 'va_quantum'], ['va_quantum', 'va_mind']];
  const mg = new Merge(); const add = (m, gg) => mg.add(m, gg); const stone = stoneM(), trim = M('#8a8070', { r: 0.8 }), slate = M('#3a4656', { r: 0.7 }), win = M('#1a1612', { glow: 1.1, gc: '#ffd8a0', win: true }); let n = 0;
  for (const [a, c] of pairs) {
    const A = B[a], C = B[c]; if (!A || !C) continue; const top = A.y < C.y ? A : C, bot = A.y < C.y ? C : A;
    const xa = Math.max(top.x, bot.x) + 0.6, xb = Math.min(top.x + top.w, bot.x + bot.w) - 0.6; if (xb - xa < 1.5) continue; const z0 = top.y + top.h - 0.6, z1 = bot.y + 0.15; if (z1 - z0 < 0.5) continue;
    const w = Math.min(3.0, xb - xa), cx = (xa + xb) / 2, cz = (z0 + z1) / 2, L = z1 - z0; const y0 = 2.9, h = 2.2;
    add(stone, box(w, h, L, cx, y0 + h / 2, cz)); add(slate, box(w + 0.3, 0.2, L + 0.1, cx, y0 + h + 0.1, cz)); add(trim, box(w + 0.1, 0.25, L, cx, y0, cz));
    const ar = new THREE.TorusGeometry(w / 2, 0.18, 6, 12, Math.PI); ar.rotateY(Math.PI / 2); for (const zz of [z0 + 0.1, z1 - 0.1]) { const a2 = ar.clone(); a2.rotateY(-Math.PI / 2); a2.translate(cx, y0 - 0.1, zz); }
    for (let zz = z0 + 0.6; zz < z1 - 0.3; zz += 1.0) for (const s of [-1, 1]) { const wg = box(0.05, 0.9, 0.42, cx + s * (w / 2 + 0.01), y0 + 1.1, zz); add(win, wg); }
    n++;
  }
  if (n) { const g = new THREE.Group(); g.name = 'academy82_bridges'; mg.build(g); group.add(g); }
  return n;
}

// 手前の翼棟を低くする（3 階建ての翼棟は、北の狭い通路にいる主人公と扉をカメラから隠す → その翼棟だけ 1 階ぶんの高さまで下げる。離れると戻す）
// GameBridge が毎フレーム呼ぶ（pos は主人公の位置：x・z はマス）。翼棟の北の端が主人公の南 8 マスより近く、左右が重なるとき
export function academyCutaway82(ms, pos) {
  const W = ms && ms.academyWings82; if (!W || !W.length || !pos) return 0; let n = 0;
  for (const w of W) {
    const occ = w.z0 > pos.z - 0.2 && w.z0 - pos.z < 8 && pos.x > w.x0 - 3 && pos.x < w.x1 + 3; const tgt = occ ? 0.3 : 1; const s = w.group.scale.y;
    if (occ) n++; if (Math.abs(s - tgt) > 0.003) w.group.scale.y = s + (tgt - s) * 0.2; else if (s !== tgt) w.group.scale.y = tgt;
  }
  return n;
}
