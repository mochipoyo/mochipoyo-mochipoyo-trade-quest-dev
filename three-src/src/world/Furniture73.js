/* =========================================================
   Furniture73（v7.3）：屋内の家具を、形から作る（見た目だけ。当たり判定は 2D 版のタイルのまま）
   ・本棚（bookshelf）：枠と4段の棚に、色・高さ・厚みのちがう本が並ぶ（ところどころ傾いた本・横に積んだ本）。背表紙の帯
   ・台所：かまど（stove。鍋とやかん・火の光）・流し（sink。水の面と蛇口）・食器棚（cupboard。皿とびん）
   ・トイレ（toilet）：便器とタンク・床のタイル・紙
   ・町のテーマ（js/data/placedecor70.js）で色と材料を変える：近未来・機械・娯楽＝白と金属、砂漠＝素焼き、氷＝白木と石、王都・魔導＝大理石と金、ほか＝木と陶器
   ・向き：歩けるとなりのマスの方（手前＝南を優先）を正面にする
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4 } from '../engine/Materials.js';
import { addCutout } from '../engine/Cutout.js';

const MAT = new Map();
function mat(hex, o) {
  o = o || {}; const key = hex + '|' + [o.rough, o.metal, o.glow, o.opacity].join(','); if (MAT.has(key)) return MAT.get(key);
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: o.rough !== undefined ? o.rough : 0.7, metalness: o.metal || 0 });
  if (o.glow) { m.emissive = new THREE.Color(hex); m.emissiveIntensity = o.glow; m.userData.keepGlow = true; }
  if (o.opacity) { m.transparent = true; m.opacity = o.opacity; }
  m.name = 'furn73_' + key; addCutout(m); MAT.set(key, m); return m;
}
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const BOOK = ['#b8343a', '#2f5fae', '#2f8a5a', '#d8a83a', '#7a4ab8', '#e8e0cc', '#c8642a', '#1f7a8a', '#5a3a2a', '#9a2a5a'];
const STYLE = {
  modern: { wood: '#d8dce2', dark: '#3a4048', ceramic: '#f4f6f8', metal: '#a8b0b8', accent: '#46e0ff', floor: '#e8ecf0' },
  clay: { wood: '#b8784a', dark: '#7a4a2a', ceramic: '#e8d0b0', metal: '#8a6a4a', accent: '#e8a040', floor: '#d8b890' },
  frost: { wood: '#d8c8a8', dark: '#6a7a8a', ceramic: '#f4f8fc', metal: '#9ab0c0', accent: '#a8e8ff', floor: '#dce4ec' },
  royal: { wood: '#e8e0d0', dark: '#6a4a2a', ceramic: '#fbf8f0', metal: '#d8b048', accent: '#c8a040', floor: '#e8e4dc' },
  wood: { wood: '#8a5a30', dark: '#4a2c14', ceramic: '#f0ece0', metal: '#8a8a92', accent: '#e8c15a', floor: '#c8c4bc' }
};
function styleFor(map) {
  const P = window.PLACE_DECOR; const k = P && P.forMap ? P.forMap(map.id) : null;
  if (/^(tech|machine|casino)$/.test(k)) return STYLE.modern; if (k === 'desert' || k === 'forge') return STYLE.clay; if (k === 'frost') return STYLE.frost;
  if (/^(royal|arcane|academy|bureau)$/.test(k)) return STYLE.royal; return STYLE.wood;
}

export function buildFurniture73(map, heightAt) {
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H) ? 'wall' : map.tile(x, z);
  const walk = (x, z) => !window.Tiles.isSolid(T(x, z));
  const KIND = { bookshelf: 1, stove: 1, sink: 1, cupboard: 1, toilet: 1 }; let n = 0;
  for (let z = 0; z < H && !n; z++) for (let x = 0; x < W; x++) if (KIND[T(x, z)]) { n++; break; }
  if (!n) return null;
  const S = styleFor(map); const b = new Batch(); const add = (m, g, mx) => b.add(m, g, mx);
  const g = new THREE.Group(); g.name = 'furniture73'; const stats = {};
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = T(x, z); if (!KIND[t]) continue; stats[t] = (stats[t] || 0) + 1;
    // 正面の向き（歩けるとなり。手前＝南を優先）。yaw は +z が正面
    let yaw = 0; for (const [dx, dz, a] of [[0, 1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, -1, Math.PI]]) { if (walk(x + dx, z + dz)) { yaw = a; break; } }
    const cx = x + 0.5, cz = z + 0.5, y = heightAt ? heightAt(cx, cz) : 0;
    const base = new THREE.Matrix4().makeTranslation(cx, y, cz).multiply(new THREE.Matrix4().makeRotationY(yaw));
    const P = (m, geo, lx, ly, lz, ry, rx, rz, sx, sy, sz) => add(m, geo, base.clone().multiply(M4(lx, ly, lz, ry || 0, rx || 0, rz || 0, sx || 1, sy || 1, sz || 1)));
    const r = (k) => hash(x, z, k);
    if (t === 'bookshelf') {
      const wood = mat('#6a4420', { rough: 0.85 }), back = mat('#2a180a', { rough: 1 });
      const Wd = 0.94, Hh = 2.0, D = 0.42, zb = -0.5 + D / 2 + 0.02;   // 壁ぎわ（奥）に寄せる
      P(back, box(Wd, Hh, 0.04), 0, Hh / 2, zb - D / 2 + 0.02);
      for (const sx of [-1, 1]) P(wood, box(0.06, Hh, D), sx * (Wd / 2 - 0.03), Hh / 2, zb);
      P(wood, box(Wd, 0.06, D), 0, Hh - 0.03, zb); P(wood, box(Wd + 0.06, 0.08, D + 0.04), 0, 0.04, zb);
      const shelves = 4; const sh = (Hh - 0.14) / shelves;
      for (let s = 0; s < shelves; s++) {
        const y0 = 0.08 + s * sh; P(wood, box(Wd - 0.08, 0.04, D - 0.02), 0, y0, zb);
        let px = -Wd / 2 + 0.07; let i = 0;
        while (px < Wd / 2 - 0.12) {
          const bw = 0.045 + hash(x * 13 + i, z * 7 + s, 3) * 0.05; const bh = sh * (0.6 + hash(x + i, z + s, 5) * 0.32); const col = BOOK[Math.floor(hash(x * 3 + i, z + s * 5, 7) * BOOK.length)];
          const lean = (hash(i, s, x + z) > 0.9) ? 0.25 : 0; const bm = mat(col, { rough: 0.75 });
          if (hash(i, s, x * 7 + z) > 0.93 && px < Wd / 2 - 0.3) {   // 横に積んだ本
            for (let k = 0; k < 3; k++) P(mat(BOOK[(i + k * 3) % BOOK.length], { rough: 0.75 }), box(0.2, 0.04, D * 0.7), px + 0.1, y0 + 0.04 + k * 0.042, zb + 0.02);
            px += 0.24; i++; continue;
          }
          P(bm, box(bw, bh, D * 0.78), px + bw / 2, y0 + 0.02 + bh / 2, zb + 0.03, 0, 0, lean);
          if (bh > sh * 0.7) P(mat('#f4e8c8', { rough: 0.6 }), box(bw + 0.004, 0.02, 0.01), px + bw / 2, y0 + 0.02 + bh * 0.72, zb + 0.03 + D * 0.39);   // 背表紙の帯
          px += bw + 0.008; i++;
        }
      }
    } else if (t === 'stove') {
      const body = mat(S.dark, { rough: 0.6, metal: 0.2 }), top = mat(S.metal, { rough: 0.4, metal: 0.6 });
      P(body, box(0.86, 0.82, 0.62), 0, 0.41, -0.12); P(top, box(0.9, 0.05, 0.66), 0, 0.84, -0.12);
      P(mat('#1a1a1e', { rough: 0.9 }), box(0.5, 0.32, 0.02), 0, 0.36, 0.2); P(mat('#ff7a2a', { glow: 2.4 }), box(0.36, 0.1, 0.01), 0, 0.3, 0.215);
      P(mat('#8a8a92', { rough: 0.35, metal: 0.8 }), new THREE.CylinderGeometry(0.16, 0.14, 0.18, 14), -0.2, 0.96, -0.1);   // 鍋
      P(mat(S.accent, { rough: 0.5, metal: 0.3 }), new THREE.SphereGeometry(0.12, 12, 8), 0.22, 0.96, -0.14, 0, 0, 0, 1, 0.8, 1);   // やかん
      P(mat('#e8e8f0', { opacity: 0.35, rough: 1 }), new THREE.SphereGeometry(0.08, 8, 6), -0.2, 1.18, -0.1);   // 湯気
      P(mat(S.dark, { rough: 0.7 }), box(0.5, 0.7, 0.3), 0, 1.75, -0.34);   // 換気の煙突
    } else if (t === 'sink') {
      const cab = mat(S.wood, { rough: 0.7 }), cer = mat(S.ceramic, { rough: 0.25 });
      P(cab, box(0.9, 0.78, 0.6), 0, 0.39, -0.14); P(cer, box(0.94, 0.06, 0.64), 0, 0.81, -0.14);
      P(mat('#7ab0d0', { rough: 0.1, metal: 0.2 }), box(0.56, 0.02, 0.38), 0, 0.82, -0.12);
      P(mat(S.metal, { rough: 0.3, metal: 0.9 }), new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), 0, 0.98, -0.38); P(mat(S.metal, { rough: 0.3, metal: 0.9 }), box(0.04, 0.04, 0.16), 0, 1.12, -0.31);
      for (let k = 0; k < 3; k++) P(cer, new THREE.CylinderGeometry(0.1, 0.08, 0.03, 12), 0.32, 0.86 + k * 0.035, -0.2);   // 皿
    } else if (t === 'cupboard') {
      const wood = mat(S.wood, { rough: 0.75 }), cer = mat(S.ceramic, { rough: 0.3 });
      P(wood, box(0.92, 1.9, 0.42), 0, 0.95, -0.27);
      for (let s = 0; s < 3; s++) { const y0 = 1.0 + s * 0.3; P(mat(S.dark, { rough: 0.8 }), box(0.86, 0.03, 0.36), 0, y0, -0.22); for (let k = 0; k < 4; k++) { if ((k + s) % 2) P(cer, new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), -0.3 + k * 0.2, y0 + 0.12, -0.3, 0, Math.PI / 2 - 0.15); else P(mat(BOOK[(k * 2 + s) % BOOK.length], { rough: 0.2, opacity: 0.85 }), new THREE.CylinderGeometry(0.04, 0.05, 0.16, 10), -0.3 + k * 0.2, y0 + 0.1, -0.22); } }
      for (const sx of [-1, 1]) { P(mat(S.dark, { rough: 0.7 }), box(0.42, 0.78, 0.02), sx * 0.22, 0.45, -0.05); P(mat(S.accent, { metal: 0.6, rough: 0.3 }), box(0.03, 0.1, 0.03), sx * 0.05, 0.55, -0.03); }
    } else if (t === 'toilet') {
      const cer = mat(S.ceramic, { rough: 0.2 }), tile = mat(S.floor, { rough: 0.5 });
      P(tile, box(1.0, 0.02, 1.0), 0, 0.01, 0);
      P(cer, box(0.42, 0.5, 0.18), 0, 0.72, -0.36);   // タンク
      P(cer, new THREE.CylinderGeometry(0.2, 0.16, 0.4, 16), 0, 0.2, -0.08); P(cer, new THREE.CylinderGeometry(0.24, 0.24, 0.05, 18), 0, 0.42, -0.06, 0, 0, 0, 1, 1, 1.25);
      P(mat(S.accent, { rough: 0.4 }), new THREE.CylinderGeometry(0.22, 0.22, 0.03, 18), 0, 0.46, -0.06, 0, 0, 0, 1, 1, 1.2);   // ふた
      P(mat(S.metal, { metal: 0.8, rough: 0.3 }), box(0.08, 0.03, 0.03), 0.16, 0.92, -0.26);   // レバー
      P(mat('#f8f8f8', { rough: 0.9 }), new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), 0.4, 0.62, -0.1, 0, 0, Math.PI / 2);   // 紙
      P(mat(S.dark, { rough: 0.8 }), box(0.03, 0.03, 0.14), 0.4, 0.68, -0.14);
    }
  }
  b.build(g, { castShadow: true }); g.userData.stats = stats; return g;
}
