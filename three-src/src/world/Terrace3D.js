/* =========================================================
   Terrace3D（v7.6 町の作り直し）：段（levels76）の高さの形。論理は js/rpg/terrace76.js
   ・段の差の辺：高いマスと低いマスの境に石積みの壁（擁壁）。壁の上の縁石、ところどころに蔦
   ・擁壁のマス（ledge）：上に手すり（石の柱と横木）か低い壁と花鉢（style）
   ・階段（steps）：段ごとの石の踏み板と、横の側板（低い側へ）。坂（ramp）：石畳の斜面
   ・WorldBuilder3D が地面の高さ（heightAt）に段を入れ、ここが形を足す（Batch に add）
   ========================================================= */
import * as THREE from 'three';
import { box, M4 } from '../engine/Materials.js';

export function terraceInfo(map) {
  const TR = window.Terrace76; if (!TR || !TR.has(map)) return null;
  const LH = TR.LH; const W = map.w, H = map.h; const lvl = (x, z) => (x < 0 || z < 0 || x >= W || z >= H) ? 0 : TR.levelAt(map, x, z);
  const dirCache = new Map(); const dir = (x, z) => { const k = x + ',' + z; if (!dirCache.has(k)) dirCache.set(k, TR.stepDir(map, x, z)); return dirCache.get(k); };
  return { TR, LH, lvl, lvY: (x, z) => lvl(x, z) * LH, dir, isStair: (t) => TR.isStair(t) };
}

// 階段の中の点の高さの割合（低い辺＝0・高い辺＝1）
export function stairFrac(x, z, tx, tz, d) {
  if (d[0] === 1) return x - tx; if (d[0] === -1) return tx + 1 - x; if (d[1] === 1) return z - tz; return tz + 1 - z;
}

// 形を足す。o：{ map, T, add(material, geometry, matrix), M（材質）, theme, rnd, groundAt(x, z)（低い側の地面の高さ）, style }
export function buildTerraces(o) {
  const info = terraceInfo(o.map); if (!info) return { faces: 0, steps: 0 };
  const { lvl, LH, dir, isStair } = info; const map = o.map, W = map.w, H = map.h, T = o.T, M = o.M, rnd = o.rnd || Math.random;
  const st = o.style || {}; const stoneC = st.stone || (o.theme && o.theme.rock) || '#a8a090';
  const wallM = M.tinted('stonewall', stoneC), capM = M.tinted('stonewall', st.cap || '#d8d2c4'), stepM = M.tinted('stonewall', st.step || '#c8c0b0');
  const railM = M.tinted('stonewall', st.rail || '#e4ded0'), ivyM = M.tinted('plaster', '#4e8a3a'), potM = M.tinted('plaster', '#b0623a');
  const WATER = { water: 1, deep: 1, shallow: 1 };
  const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  let faces = 0, steps = 0;
  const groundOf = (x, z) => { const t = T(x, z); if (WATER[t]) return -0.6; return lvl(x, z) * LH; };
  // 辺の壁：高いマス (x,z) の k の向きの辺。上の高さ yTop・下の高さ yBot
  const face = (x, z, k, yBot, yTop, cap) => {
    const h = yTop - yBot; if (h < 0.05) return; const [dx, dz] = N4[k]; const th = 0.18;
    const cx = x + 0.5 + dx * (0.5 - th / 2), cz = z + 0.5 + dz * (0.5 - th / 2); const along = dx !== 0 ? [th, 1.0] : [1.0, th];
    o.add(wallM, box(along[0], h + 0.2, along[1], 1.4), M4(cx, yBot - 0.2 + (h + 0.2) / 2, cz)); faces++;
    if (cap) o.add(capM, box(along[0] + (dx ? 0.06 : 0.02), 0.08, along[1] + (dz ? 0.06 : 0.02), 1), M4(cx + dx * 0.03, yTop + 0.04, cz + dz * 0.03));
    if (h > 0.4 && rnd() < 0.28) {   // 蔦（壁の外へ少しだけ。下の歩けるマスの体の高さには出さない＝壁から 0.08 まで）
      const n = 3 + Math.floor(rnd() * 4); for (let i = 0; i < n; i++) { const g = new THREE.IcosahedronGeometry(0.1 + rnd() * 0.08, 0); g.scale(1, 1.3, 0.45);
        const u = (rnd() - 0.5) * 0.8; const yy = yTop - 0.05 - rnd() * h * 0.8; const px = dx !== 0 ? x + 0.5 + dx * 0.53 : x + 0.5 + u, pz = dz !== 0 ? z + 0.5 + dz * 0.53 : z + 0.5 + u;
        if (dx !== 0) g.rotateY(Math.PI / 2); g.translate(px, yy, pz); o.add(ivyM, g); }
    }
  };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = map.tile(x, z); if (WATER[t]) continue;   // 水のマスは壁を作らない（岸の壁は陸の側が作る）
    const L = lvl(x, z); const yA = L * LH;
    const stair = isStair(t); const d = stair ? dir(x, z) : null;
    for (let k = 0; k < 4; k++) {
      const nx = x + N4[k][0], nz = z + N4[k][1]; const inside = nx >= 0 && nz >= 0 && nx < W && nz < H; if (!inside) continue;
      const tn = map.tile(nx, nz); const yB = groundOf(nx, nz); const Ln = lvl(nx, nz);
      if (isStair(tn)) { if (!stair && L > Ln) face(x, z, k, Ln * LH, yA, true); continue; }   // 階段の横：高いマス（擁壁など）の壁を階段の低い段まで。低い側は階段の側板が作る
      if (stair && d) {
        // 階段の横の辺：となりが低いとき、横の側板（低い端 L・高い端 L+1）
        const along = N4[k][0] === d[0] && N4[k][1] === d[1], back = N4[k][0] === -d[0] && N4[k][1] === -d[1];
        if (along || back) continue;
        if (Ln * LH < yA + LH - 0.05) sideStringer(o.add, stepM, x, z, k, d, yA, LH, yB); continue;
      }
      if (L > Ln || (WATER[tn] && L > 0)) face(x, z, k, yB, yA, true);
    }
    if (o.quay && o.quay.has(x + ',' + z) && t !== 'bridge' && t !== 'dock' && !(window.Tiles && window.Tiles.isSolid(t))) o.add(capM, box(1.0, 0.08, 1.0, 1), M4(x + 0.5, yA, z + 0.5));   // 岸の石の板（地面は水の底へ下がるので、上を平らに）
    if (t === 'ledge') ledgeTop(o.add, railM, capM, potM, x, z, yA, (k) => { const nx = x + N4[k][0], nz = z + N4[k][1]; return lvl(nx, nz) < L || WATER[T(nx, nz)]; }, st, rnd);
    if (stair && d) { if (t === 'steps') stepsMesh(o.add, stepM, capM, x, z, d, yA, LH); else rampMesh(o.add, stepM, x, z, d, yA, LH); steps++; }
  }
  return { faces, steps };
}
function sideStringer(add, m, x, z, k, d, y0, LH, yB) {
  // 側板：辺に沿って低い端から高い端へ（三角を含む台形）。厚さ 0.12
  const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const [dx, dz] = N4[k]; const th = 0.12;
  const ex = x + 0.5 + dx * (0.5 - th / 2), ez = z + 0.5 + dz * (0.5 - th / 2);
  const n = 4; for (let i = 0; i < n; i++) { const f0 = i / n, f1 = (i + 1) / n; const yTop = y0 + LH * f1; const h = yTop - yB + 0.15; const along0 = f0 - 0.5 + 0.5 / n;
    const px = d[0] !== 0 ? x + 0.5 + d[0] * along0 : ex, pz = d[1] !== 0 ? z + 0.5 + d[1] * along0 : ez;
    const g = box(d[0] !== 0 ? 1 / n : th, h, d[1] !== 0 ? 1 / n : th, 1.4); add(m, g, M4(d[0] !== 0 ? px : ex, yB - 0.15 + h / 2, d[1] !== 0 ? pz : ez)); }
}
function stepsMesh(add, m, capM, x, z, d, y0, LH) {
  const n = 4; for (let i = 0; i < n; i++) { const f0 = i / n; const h = LH * (i + 1) / n; const c = f0 + 0.5 / n;   // i 段目：低い側から
    const px = d[0] !== 0 ? (d[0] > 0 ? x + c : x + 1 - c) : x + 0.5, pz = d[1] !== 0 ? (d[1] > 0 ? z + c : z + 1 - c) : z + 0.5;
    add(m, box(d[0] !== 0 ? 1 / n + 0.01 : 1.0, h + 0.1, d[1] !== 0 ? 1 / n + 0.01 : 1.0, 1.2), M4(px, y0 - 0.1 + (h + 0.1) / 2, pz));
    // 踏み板の縁（少し明るい）
    const ex = d[0] !== 0 ? (d[0] > 0 ? x + f0 + 0.02 : x + 1 - f0 - 0.02) : x + 0.5, ez = d[1] !== 0 ? (d[1] > 0 ? z + f0 + 0.02 : z + 1 - f0 - 0.02) : z + 0.5;
    add(capM, box(d[0] !== 0 ? 0.05 : 1.0, 0.03, d[1] !== 0 ? 0.05 : 1.0, 1), M4(ex, y0 + h + 0.01, ez)); }
}
function rampMesh(add, m, x, z, d, y0, LH) {
  const g = new THREE.PlaneGeometry(1, Math.hypot(1, LH), 2, 2); g.rotateX(-Math.PI / 2);
  const ang = Math.atan2(LH, 1); if (d[1] !== 0) g.rotateX(d[1] > 0 ? -ang : ang); else { g.rotateY(Math.PI / 2); g.rotateZ(d[0] > 0 ? ang : -ang); }
  g.translate(x + 0.5, y0 + LH / 2 + 0.01, z + 0.5); add(m, g);
}
function ledgeTop(add, railM, capM, potM, x, z, y, lowSide, st, rnd) {
  // 縁石の上の手すり（石の柱と横木）。低い側の辺に沿って。style.ledge：'rail'（既定）／'wall'（低い壁）／'planter'（花鉢）
  const N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const kind = st.ledge || 'rail';
  add(capM, box(1.0, 0.1, 1.0, 1), M4(x + 0.5, y + 0.05, z + 0.5));
  for (let k = 0; k < 4; k++) { if (!lowSide(k)) continue; const [dx, dz] = N4[k];
    const ex = x + 0.5 + dx * 0.32, ez = z + 0.5 + dz * 0.32; const alongX = dx === 0;
    if (kind === 'wall') { add(capM, box(alongX ? 1.0 : 0.26, 0.55, alongX ? 0.26 : 1.0, 1), M4(ex, y + 0.37, ez)); continue; }
    add(railM, box(alongX ? 1.0 : 0.12, 0.08, alongX ? 0.12 : 1.0, 1), M4(ex, y + 0.78, ez));
    for (const u of [-0.38, 0, 0.38]) add(railM, box(0.11, 0.66, 0.11, 1), M4(alongX ? x + 0.5 + u : ex, y + 0.43, alongX ? ez : z + 0.5 + u));
    if (kind === 'planter' || rnd() < 0.18) { const g = new THREE.CylinderGeometry(0.16, 0.12, 0.22, 8); g.translate(x + 0.5 - dx * 0.05, y + 0.21, z + 0.5 - dz * 0.05); add(potM, g); }
  }
}
// 建物などを段の高さへ持ち上げる Batch の代わり（add の行列に高さを足す）
export function liftBatch(batch, dy) {
  if (!dy) return batch; const T = new THREE.Matrix4().makeTranslation(0, dy, 0);
  return { add: (m, g, mx) => batch.add(m, g, mx ? T.clone().multiply(mx) : T), build: (...a) => batch.build(...a) };
}
