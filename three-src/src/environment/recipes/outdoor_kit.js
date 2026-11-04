/* =========================================================
   レシピ（屋外のダンジョン）：outdoor_kit — 森（lost_forest ほか）と空（sky_temple ほか）
   ・森：歩ける地面のシダと花（高さ 0.12 以下）、通れない森のマス（道から1〜3マス）に倒木・大きなキノコ・苔むした岩（パックの rock_cluster）、
         空間の流れ（js/rpg/envlayout.js）の見せ場に、光の差す大木
   ・空：歩ける所の外（雲・通れないマス）に浮かぶ岩と断柱（パックの column_classic）、風見の旗、低い雲の帯
   ・論理（タイル）は変えない。歩けるマスの上には体の高さの形を置かない
   ========================================================= */
import * as THREE from 'three';
import { kit, plain, rng } from '../EnvKit3D.js';
import { Batch } from '../../engine/Materials.js';
import { wbox, cyl } from './geo.js';

export function outdoorKit(kind) {
  return {
    id: 'outdoor_kit.v1:' + kind,
    async prepare(ctx) {
      const map = ctx.map, TL = window.Tiles; const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
      const near = (x, z, a, b) => { for (let d = a; d <= b; d++) for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue; const q = T(x + dx, z + dz); if (q !== '_out' && !TL.isSolid(q)) return true; } return false; };
      const busy = (x, z) => (map.warps || []).some((w) => Math.abs(w.x - x) < 3 && Math.abs(w.y - z) < 3) || (map.events || []).some((e) => Math.abs(e.x - x) < 2 && Math.abs(e.y - z) < 2);
      const spots = []; const r = rng(W * 101 + H);
      for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
        const t = T(x, z); if (!TL.isSolid(t) || busy(x, z)) continue; let ok = true; for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1 && ok; dx++) { const q = T(x + dx, z + dz); if (q !== '_out' && !TL.isSolid(q)) ok = false; }
        if (!ok || !near(x, z, 2, 3)) continue; if (r() > 0.18) continue; if (spots.some((s) => Math.abs(s.x - x) + Math.abs(s.z - z) < 5)) continue; spots.push({ x, z, t });
      }
      const set = new Set(spots.map((s) => s.x + ',' + s.z)); ctx.stats.spots = spots.length;
      return { hooks: { skipTree: (x, z) => set.has(x + ',' + z) }, build: (b) => build(ctx, kind, spots, b) };
    }
  };
}
async function build(ctx, kind, spots, b) {
  const map = ctx.map, W = map.w, H = map.h, hi = ctx.quality !== 'low'; const hAt = b.heightAt || (() => 0);
  const g = new THREE.Group(); g.name = 'env_outdoor_kit'; b.root.add(g); const bt = new Batch(); const add = (m, gg) => bt.add(m, gg);
  const M = { bark: plain('#5e4430', { std: { roughness: 0.95 } }), moss: plain('#5a7e3a', { std: { roughness: 1 } }), cap: plain('#c84a3a', { std: { roughness: 0.7 } }), stem: plain('#efe4cc', { std: { roughness: 0.8 } }),
    leaf: plain('#3e7a32', { std: { roughness: 0.85 } }), leaf2: plain('#5e9a42', { std: { roughness: 0.85 } }), rock: plain('#c8ccd4', { std: { roughness: 0.85 } }), white: plain('#f6f8fc', { std: { roughness: 0.9 } }),
    cloud: plain('#ffffff', { std: { roughness: 1 }, transparent: true, opacity: 0.55, noCutout: true }), cloth: plain('#4a7ab8', { std: { roughness: 0.95, side: THREE.DoubleSide } }), shaft: plain('#fff4c0', { emissive: '#fff0b0', ei: 0.5, transparent: true, opacity: 0.14, noCutout: true }) };
  const kits = {}; const K = (id, x, y, z, s, ry) => { (kits[id] = kits[id] || []).push({ x, y, z, s, ry: ry || 0 }); };
  spots.forEach((s, i) => {
    const x = s.x + 0.5, z = s.z + 0.5, y = hAt(x, z); const ry = (s.x * 0.7 + s.z * 0.3) % 6.28;
    if (kind === 'forest') {
      const k = i % 4;
      if (k === 0) { const lg = new THREE.CylinderGeometry(0.22, 0.26, 1.6, 8); lg.rotateZ(Math.PI / 2); lg.rotateY(ry); lg.translate(x, y + 0.22, z); add(M.bark, lg); add(M.moss, new THREE.IcosahedronGeometry(0.2, 0).scale(1.4, 0.5, 1).translate(x, y + 0.42, z)); }
      else if (k === 1) { for (let m = 0; m < 3; m++) { const dx = (m - 1) * 0.28, h = 0.35 + m * 0.18; add(M.stem, cyl(0.05, 0.07, h, 6, x + dx, y + h / 2, z)); add(M.cap, new THREE.SphereGeometry(0.16 + m * 0.04, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x + dx, y + h, z)); } }
      else if (k === 2) K('rock_cluster', x, y, z, 0.35, ry);
      else { add(M.moss, new THREE.IcosahedronGeometry(0.4, 1).scale(1, 0.45, 1).translate(x, y + 0.12, z)); }
    } else {
      const k = i % 3; const yy = y + 2.6 + (i % 3) * 0.7;
      if (k === 0) { add(M.rock, new THREE.IcosahedronGeometry(0.55, 0).scale(1.3, 0.55, 1.1).translate(x, yy, z)); K('column_classic', x, yy + 0.2, z, [0.35, 0.45, 0.35], ry); }
      else if (k === 1) { add(M.white, cyl(0.04, 0.05, 2.6, 6, x, y + 1.3, z)); const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3, 4, 1), M.cloth); cl.geometry.userData.own = true; cl.position.set(x + 0.38, y + 2.45, z); cl.userData.sway = true; g.add(cl); }
      else add(M.rock, new THREE.IcosahedronGeometry(0.4, 0).scale(1.2, 0.6, 1).translate(x, yy - 0.8, z));
    }
  });
  // 見せ場の大木（森）・光の差す筋
  const secs = (map.envLayout && map.envLayout.sections) || [];
  const sb = new Batch(); const sg = new THREE.Group(); sg.name = 'lightshaft'; g.add(sg);   // 光の筋（見た目だけ。歩くのに当たらない＝確認の対象外）
  if (kind === 'forest') for (const sc of secs) { if (sc.kind !== 'climax' && sc.kind !== 'main') continue; const x = sc.x + 0.5, z = sc.y + 0.5, y = hAt(x, z); sb.add(M.shaft, new THREE.CylinderGeometry(0.5, 1.2, 6, 12, 1, true).translate(x, y + 3, z)); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(x, y + 2.6, z), color: 0xfff0c0, power: 0.9, dist: 9 }); }
  // 下草（森）・雲の帯（空）
  let n = 0; const r = rng(W * 7 + H * 5);
  if (kind === 'forest' && hi) { const geo = new THREE.ConeGeometry(0.05, 0.1, 4); for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) { const t = map.tile(x, z); if (window.Tiles.isSolid(t) || /stairs|warp|door|bridge/.test(t)) continue; if (r() > 0.22) continue; for (let k = 0; k < 3; k++) { const px = x + 0.15 + r() * 0.7, pz = z + 0.15 + r() * 0.7; add(k ? M.leaf2 : M.leaf, geo.clone().scale(1.4, 1, 1.4).translate(px, hAt(px, pz) + 0.05, pz)); n++; } } }
  if (kind === 'sky') { for (let k = 0; k < 14; k++) { const x = -6 + r() * (W + 12), z = -6 + r() * (H + 12); const onMap = x > 0 && z > 0 && x < W && z < H; if (onMap && !window.Tiles.isSolid(map.tile(Math.floor(x), Math.floor(z)))) continue; add(M.cloud, new THREE.IcosahedronGeometry(1.2 + r() * 1.2, 1).scale(1.8, 0.35, 1.2).translate(x, -1.6 - r() * 1.2, z)); n++; } }
  for (const [id, list] of Object.entries(kits)) g.add(await kit(ctx, id, list));
  bt.build(g); sb.build(sg, { castShadow: false }); ctx.stats.ground = n; return g;
}
