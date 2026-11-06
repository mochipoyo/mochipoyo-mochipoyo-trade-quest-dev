/* =========================================================
   Crest81（v8.1）：門や正面の壁にかける紋章の盾と垂れ幕（定義の crests81：[{ x, y, face, kind, h, banner }]。js/data/remake81-*.js）
   ・face：紋章の向き（'s' 南向き＝北へ歩く人に見える／'n'／'e'／'w'）。x, y はマスの座標（小数も可）。h は地面からの高さ
   ・kind：'rivel'（リヴェル：紺の地に白い川の波と金の塔）・'meridian'（学院：濃い青の地に真鍮の天球の目盛りと縦の子午線）
   ・banner：true なら紋章の両わきに縦長の垂れ幕。見た目だけ（通れるマスは変えない）。光は足さない。形は 1 つの Batch
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4 } from '../engine/Materials.js';

const MAT = new Map();
function mat(hex, o) {
  o = o || {}; const key = hex + '|' + [o.rough, o.metal, o.glow].join(','); if (MAT.has(key)) return MAT.get(key);
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: o.rough !== undefined ? o.rough : 0.7, metalness: o.metal || 0, side: THREE.DoubleSide });
  if (o.glow) { m.emissive = new THREE.Color(hex); m.emissiveIntensity = o.glow; m.userData.keepGlow = true; }
  m.name = 'crest81_' + key; MAT.set(key, m); return m;
}
const YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const PAL = {
  rivel: { field: '#1d3a6e', rim: '#d8b04a', cloth: '#22427a', band: '#e8e2d0' },
  meridian: { field: '#1b2a4a', rim: '#c8a050', cloth: '#26365c', band: '#c8a050' }
};
export function buildCrests81(map, ctx) {
  const L = (map && map.def && map.def.crests81) || []; if (!L.length) return { n: 0 };
  const b = new Batch(); const H = ctx.heightAt || (() => 0); let n = 0;
  for (const c of L) {
    const P = PAL[c.kind] || PAL.rivel; const yaw = YAW[c.face || 's'] || 0; const s = c.size || 1;
    const y0 = H(c.x, c.y) + (c.h || 3.2);
    const base = new THREE.Matrix4().makeTranslation(c.x, y0, c.y).multiply(new THREE.Matrix4().makeRotationY(yaw));
    const add = (m, g, lx, ly, lz, rz) => b.add(m, g, base.clone().multiply(M4(lx * s, ly * s, lz, 0, 0, rz || 0)));
    const field = mat(P.field, { rough: 0.8 }), rim = mat(P.rim, { rough: 0.35, metal: 0.75 }), white = mat('#eef0f4', { rough: 0.8 }), gold = mat('#e0b84a', { rough: 0.35, metal: 0.7 });
    // 盾（円い地・金の縁）
    const disc = new THREE.CylinderGeometry(0.62 * s, 0.62 * s, 0.08, 28); disc.rotateX(Math.PI / 2); add(field, disc, 0, 0, 0.06);
    const ring = new THREE.TorusGeometry(0.62 * s, 0.05 * s, 6, 32); add(rim, ring, 0, 0, 0.1);
    if (c.kind === 'meridian') {
      // 天球の目盛り（12）・内側の輪・縦の子午線・小さな星
      const inner = new THREE.TorusGeometry(0.4 * s, 0.03 * s, 6, 28); add(rim, inner, 0, 0, 0.12);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const r = 0.5; b.add(rim, box(0.03 * s, (i % 3 ? 0.08 : 0.14) * s, 0.03), base.clone().multiply(M4(Math.sin(a) * r * s, Math.cos(a) * r * s, 0.12, 0, 0, -a))); }
      add(rim, box(0.035 * s, 1.0 * s, 0.03), 0, 0, 0.14); add(gold, box(0.07 * s, 0.07 * s, 0.03), 0.18, 0.16, 0.15, Math.PI / 4);
      const tilt = new THREE.TorusGeometry(0.4 * s, 0.02 * s, 4, 28); tilt.rotateY(1.2); add(rim, tilt, 0, 0, 0.12, 0.41);
    } else {
      // 白い川の波（ジグザグの帯）と金の塔（胸壁つき）
      for (let i = 0; i < 6; i++) add(white, box(0.2 * s, 0.06 * s, 0.03), -0.42 + i * 0.17, -0.26 + (i % 2 ? 0.05 : -0.05), 0.12, i % 2 ? -0.5 : 0.5);
      add(gold, box(0.26 * s, 0.42 * s, 0.03), 0, 0.08, 0.12); for (const mx of [-0.1, 0, 0.1]) add(gold, box(0.06 * s, 0.08 * s, 0.03), mx, 0.33, 0.12);
      add(field, box(0.07 * s, 0.12 * s, 0.035), 0, 0.0, 0.135);   // 塔の門
    }
    // 垂れ幕（両わき）
    if (c.banner) {
      const cloth = mat(P.cloth, { rough: 0.95 }), band = mat(P.band, { rough: 0.8 }), pole = mat('#5a3a1a', { rough: 0.8 });
      for (const sx of [-1.05, 1.05]) {
        add(pole, box(0.86 * s, 0.05 * s, 0.05), sx, 0.95, 0.06); add(cloth, box(0.7 * s, 1.9 * s, 0.03), sx, 0.0, 0.04);
        add(band, box(0.7 * s, 0.1 * s, 0.035), sx, 0.62, 0.045); add(band, box(0.7 * s, 0.1 * s, 0.035), sx, -0.62, 0.045);
        const dot = new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.03, 16); dot.rotateX(Math.PI / 2); add(rim, dot, sx, 0.05, 0.06);
        for (const t of [-0.25, 0, 0.25]) add(cloth, box(0.14 * s, 0.16 * s, 0.03), sx + t, -1.02, 0.04, Math.PI / 4);   // 裾のぎざぎざ
      }
    }
    n++;
  }
  const g = new THREE.Group(); g.name = 'crests81'; b.build(g); ctx.group.add(g);
  return { n };
}
