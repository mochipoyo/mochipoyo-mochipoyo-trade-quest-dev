/* =========================================================
   v7.6 店の中の飾り（見本の町の屋内）：武器屋・防具屋＝鍛冶場（炉と煙突のフード・ふいご）・金床・剣の立て掛け・盾・鎧の飾り台
   酒場＝横に寝かせた酒樽（台・たが・栓）・酒瓶の棚・カウンターと机の上のジョッキと瓶
   ・論理のタイル（本棚・樽・木箱・柱）の上に作る（通れないマスのまま＝歩けるマスはふさがない）。机・カウンターは家具のまま、上に小物を足す
   ・当てる屋内：外への出口が見本の町（リヴェル城下町・港町マリナ・砂都サハル）の店・酒場。ほかの町は見本の確認のあとに広げる
   ========================================================= */
import * as THREE from 'three';
import { wbox, cyl } from './geo.js';
import { plain } from '../EnvKit3D.js';
import { armorStand, shieldOn } from './variants76.js';

export const SAMPLE76 = { rivel_town: 1, harbor_town: 1, sahar_city: 1 };
export function dressPlan76(map) {
  if (!map || !(map.warps || []).some((w) => SAMPLE76[w.to])) return null;
  const d = map.def || {}; const nm = map.name || '';
  let kind = d.shop && (d.shop.kind === 'weapon' || d.shop.kind === 'armor') ? d.shop.kind : null;
  if (!kind && (/酒場|隊商宿/.test(nm) || d.bgm === 'tavern')) kind = 'tavern';
  if (!kind) return null;
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_void' : map.tile(x, z));
  const items = []; const skip = new Set(); const used = new Set();
  const put = (x, z, what, o) => { items.push(Object.assign({ x, z, what }, o || {})); if (what !== 'mugs' && what !== 'bar') skip.add(x + ',' + z); used.add(x + ',' + z); };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = T(x, z); if (used.has(x + ',' + z)) continue;
    if (kind === 'weapon' || kind === 'armor') {
      if (t === 'barrel' && T(x + 1, z) === 'barrel' && !used.has((x + 1) + ',' + z)) { put(x, z, 'forge', { w: 2 }); used.add((x + 1) + ',' + z); skip.add((x + 1) + ',' + z); continue; }
      if (t === 'bookshelf' && kind === 'armor' && x >= W / 2 && T(x + 1, z) === 'bookshelf') { put(x, z, 'forge', { w: 2 }); used.add((x + 1) + ',' + z); skip.add((x + 1) + ',' + z); continue; }
      if (t === 'bookshelf') put(x, z, kind === 'weapon' ? 'swordrack' : 'shieldrack');
      else if (t === 'barrel') put(x, z, 'swordbarrel');
      else if (t === 'crate') put(x, z, 'anvil');
      else if (t === 'pillar') put(x, z, 'armorstand');
    } else {
      if (t === 'barrel') put(x, z, 'cask');
      else if (t === 'bookshelf' || t === 'cupboard') put(x, z, 'bottleshelf');
      else if (t === 'crate') put(x, z, 'bottlecrate');
      else if (t === 'counter') put(x, z, 'bar');
      else if (t === 'table') put(x, z, 'mugs');
    }
  }
  return items.length ? { kind, items, skip } : null;
}

// 向き：うしろの壁（なければ横の壁）。戻り値：正面の向きの角度（+z を正面とする回転）
const WALLISH = (t) => t === '_void' || /wall|^roof_|castle_wall/.test(t);
function faceOf(T, x, z) { if (WALLISH(T(x, z - 1))) return 0; if (WALLISH(T(x - 1, z))) return Math.PI / 2; if (WALLISH(T(x + 1, z))) return -Math.PI / 2; if (WALLISH(T(x, z + 1))) return Math.PI; return 0; }

export function dressBuild76(plan, o) {
  const { add, T, scene } = o; let n = 0;
  const C = {
    brick: plain('#8a4a32', { std: { roughness: 0.95 } }), brickD: plain('#5a2e22', { std: { roughness: 1 } }), iron: plain('#3a3c42', { std: { roughness: 0.5, metalness: 0.6 } }), steel: plain('#c8ccd2', { std: { roughness: 0.28, metalness: 0.75 } }),
    fire: plain('#ffb050', { emissive: '#ff7a1a', ei: 2.2, keepGlow: true }), coal: plain('#2a2420', { std: { roughness: 1 } }), wood: plain('#7a5236', { std: { roughness: 0.85 } }), woodD: plain('#4e3424', { std: { roughness: 0.9 } }),
    leather: plain('#6a4228', { std: { roughness: 0.9 } }), gold: plain('#c9a24a', { std: { roughness: 0.35, metalness: 0.6 } }), hoop: plain('#4a4440', { std: { roughness: 0.5, metalness: 0.5 } }),
    glass: [plain('#3a7a3a', { std: { roughness: 0.15, metalness: 0.1 } }), plain('#7a4a1e', { std: { roughness: 0.15 } }), plain('#8a2a3a', { std: { roughness: 0.15 } }), plain('#c8b860', { std: { roughness: 0.15 } })],
    foam: plain('#f6f0dc', { std: { roughness: 0.9 } }), beer: plain('#c88a2a', { std: { roughness: 0.4 } }), pewter: plain('#9a9ea4', { std: { roughness: 0.4, metalness: 0.5 } })
  };
  // 回転つきで足す：局所の座標（正面 +z）→ マスの中心へ
  const at = (x, z, ry) => { const m = new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(ry)); return (mat, g) => { g.applyMatrix4(m); add(mat, g); }; };
  const sword = (A, px, py, pz, up) => { A(C.steel, wbox(0.06, 0.78, 0.02, px, py, pz)); A(C.gold, wbox(0.22, 0.04, 0.05, px, py - 0.41 * (up ? 1 : -1), pz)); A(C.leather, wbox(0.045, 0.18, 0.045, px, py - 0.52 * (up ? 1 : -1), pz)); };
  const mug = (A, px, py, pz) => { A(C.wood, cyl(0.07, 0.065, 0.16, 10, px, py + 0.08, pz)); A(C.foam, cyl(0.07, 0.07, 0.03, 10, px, py + 0.17, pz)); const hd = new THREE.TorusGeometry(0.045, 0.012, 5, 10, Math.PI); hd.rotateZ(-Math.PI / 2); hd.translate(px + 0.07, py + 0.09, pz); A(C.hoop, hd); };
  const bottle = (A, px, py, pz, k) => { A(C.glass[k % 4], cyl(0.05, 0.05, 0.2, 8, px, py + 0.1, pz)); A(C.glass[k % 4], cyl(0.018, 0.04, 0.1, 6, px, py + 0.25, pz)); A(C.woodD, cyl(0.02, 0.02, 0.03, 5, px, py + 0.31, pz)); };
  for (const it of plan.items) {
    const cx = it.x + 0.5, cz = it.z + 0.5; const ry = faceOf(T, it.x, it.z);
    if (it.what === 'forge') {   // 炉（2マス）：煉瓦の台・火床・フード・煙突・ふいご
      const fx = it.x + 1.0; const A = at(fx, cz, ry);
      A(C.brick, wbox(1.9, 0.85, 0.86, 0, 0.425, -0.02)); A(C.brickD, wbox(1.96, 0.1, 0.92, 0, 0.88, -0.02));
      A(C.coal, wbox(1.2, 0.06, 0.55, 0, 0.92, 0.02)); A(C.fire, wbox(0.9, 0.08, 0.36, 0, 0.96, 0.02));
      const hood = new THREE.CylinderGeometry(0.28, 0.95, 0.9, 4, 1); hood.rotateY(Math.PI / 4); hood.scale(1.25, 1, 0.62); hood.translate(0, 1.95, -0.05); A(C.brickD, hood);
      A(C.brickD, wbox(0.4, 1.4, 0.4, 0, 3.0, -0.12));
      A(C.leather, wbox(0.42, 0.14, 0.3, 1.15, 0.62, 0.15)); A(C.wood, wbox(0.5, 0.04, 0.34, 1.15, 0.7, 0.15));
      for (let k = 0; k < 3; k++) A(C.iron, wbox(0.03, 0.5, 0.03, -0.75 + k * 0.08, 1.25, 0.35));   // 火ばさみ
      scene.lampSpots.push({ pos: new THREE.Vector3(fx, 1.2, cz + 0.4), color: 0xff8a3a, power: 1.6, dist: 6 }); n++; continue;
    }
    const A = at(cx, cz, ry);
    if (it.what === 'anvil') { A(C.wood, cyl(0.24, 0.27, 0.45, 12, 0, 0.225, 0)); A(C.iron, wbox(0.26, 0.2, 0.2, 0, 0.55, 0)); A(C.iron, wbox(0.56, 0.14, 0.22, 0, 0.72, 0)); const h = new THREE.ConeGeometry(0.08, 0.3, 8); h.rotateZ(Math.PI / 2); h.translate(0.42, 0.74, 0); A(C.iron, h); A(C.wood, wbox(0.04, 0.04, 0.34, -0.1, 0.81, 0.02)); A(C.iron, wbox(0.14, 0.08, 0.08, -0.1, 0.83, 0.17)); }
    else if (it.what === 'swordrack') { A(C.wood, wbox(0.08, 1.5, 0.08, -0.42, 0.75, -0.3)); A(C.wood, wbox(0.08, 1.5, 0.08, 0.42, 0.75, -0.3)); A(C.wood, wbox(0.92, 0.07, 0.12, 0, 0.35, -0.26)); A(C.wood, wbox(0.92, 0.07, 0.1, 0, 1.25, -0.33)); for (let k = 0; k < 5; k++) sword(A, -0.32 + k * 0.16, 0.86, -0.24, true); shieldOn((m, g, mx) => { g.applyMatrix4(mx); A(m, g); }, { tinted: (b, c) => plain(c, { std: { roughness: 0.6 } }), get: (k) => (k === 'gold' ? C.gold : C.iron) }, 0, 1.95, -0.42, '#a8302a', 0); }
    else if (it.what === 'swordbarrel') { A(C.wood, cyl(0.3, 0.3, 0.7, 12, 0, 0.35, 0)); A(C.hoop, cyl(0.31, 0.31, 0.05, 12, 0, 0.15, 0)); A(C.hoop, cyl(0.31, 0.31, 0.05, 12, 0, 0.58, 0)); for (let k = 0; k < 4; k++) { sword((m, gg) => { gg.rotateZ((k - 1.5) * 0.12); gg.translate((k - 1.5) * 0.1, 0, 0); A(m, gg); }, 0, 1.0, (k % 2) * 0.08 - 0.04, false); } }
    else if (it.what === 'shieldrack') { A(C.wood, wbox(0.94, 1.6, 0.08, 0, 0.8, -0.4)); A(C.wood, wbox(0.94, 0.06, 0.3, 0, 1.0, -0.28)); const cols = ['#2e5a9a', '#a8302a', '#c9a24a']; for (let k = 0; k < 2; k++) shieldOn((m, g, mx) => { g.applyMatrix4(mx); A(m, g); }, { tinted: (b, c) => plain(c, { std: { roughness: 0.6 } }), get: (k) => (k === 'gold' ? C.gold : C.iron) }, -0.22 + k * 0.44, 1.45, -0.36, cols[(it.x + k) % 3], 0); for (let k = 0; k < 2; k++) A(C.steel, new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62).translate(-0.22 + k * 0.44, 1.04, -0.26)); }
    else if (it.what === 'armorstand') { armorStand((m, g, mx) => { if (mx) g.applyMatrix4(mx); A(m, g); }, { get: () => C.wood }, 0, 0, C.steel, C.iron); }
    else if (it.what === 'cask') { const g = new THREE.CylinderGeometry(0.36, 0.36, 0.78, 16); g.rotateZ(Math.PI / 2); g.translate(0, 0.52, 0); A(C.wood, g); for (const sx of [-0.28, 0, 0.28]) { const h = new THREE.TorusGeometry(0.365, 0.02, 4, 16); h.rotateY(Math.PI / 2); h.translate(sx, 0.52, 0); A(C.hoop, h); } for (const sx of [-0.28, 0.28]) A(C.woodD, wbox(0.1, 0.2, 0.7, sx, 0.1, 0)); { const tp = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6); tp.rotateZ(Math.PI / 2); tp.translate(0.42, 0.42, 0); A(C.woodD, tp); } A(C.gold, wbox(0.06, 0.06, 0.06, 0.43, 0.36, 0)); }
    else if (it.what === 'bottleshelf') { A(C.woodD, wbox(0.94, 2.0, 0.36, 0, 1.0, -0.3)); for (const sy of [0.55, 1.05, 1.55]) { A(C.wood, wbox(0.9, 0.04, 0.34, 0, sy, -0.26)); for (let k = 0; k < 5; k++) bottle(A, -0.34 + k * 0.17, sy + 0.02, -0.24, k + it.x + Math.round(sy * 2)); } }
    else if (it.what === 'bottlecrate') { A(C.wood, wbox(0.6, 0.36, 0.45, 0, 0.18, 0)); for (let k = 0; k < 6; k++) { const px = -0.2 + (k % 3) * 0.2, pz = -0.1 + Math.floor(k / 3) * 0.2; A(C.glass[k % 4], cyl(0.035, 0.04, 0.16, 6, px, 0.42, pz)); } }
    else if (it.what === 'bar') { bottle(A, -0.25, 1.02, -0.1, it.x); mug(A, 0.15, 1.02, 0.05); if ((it.x + it.z) % 2) mug(A, 0.32, 1.02, -0.1); }
    else if (it.what === 'mugs') { mug(A, -0.15, 0.8, 0.05); mug(A, 0.18, 0.8, -0.08); A(C.pewter, cyl(0.15, 0.15, 0.02, 14, 0.0, 0.81, 0.15)); }
    n++;
  }
  return n;
}
