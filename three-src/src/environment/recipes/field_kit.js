/* =========================================================
   レシピ（フィールド12）：field_kit — 地方ごとの遠景の目印と、歩ける地面の低い下草
   ・目印：プロファイルの landmark（折れたアーチ・段状水盤・柱状節理・浮遊環・氷の柱・日時計など）を、地方ごとに 6〜10 か所。
     置くのは通れないマス（森・水・崖・山のふもとの森）だけ。道から2〜5マスで見える所。町・城・洞窟の目印（LandmarkBuilder）と出入口からは離す
     森のマスに置くときは、そのマスの木を外す（乱数の順は変えない）。浮遊環・雲上の断柱は、頭よりずっと高い所に浮かべる
   ・下草：歩ける草地に、地方の色の小さな花・草・小石（高さ 0.12 以下＝歩くのに当たらない）
   ・論理（タイル）は変えない（フィールドの行は関数で作られる。2D版の地図はそのまま）
   ========================================================= */
import * as THREE from 'three';
import { kit, plain, rng } from '../EnvKit3D.js';
import { Batch } from '../../engine/Materials.js';
import { wbox, cyl } from './geo.js';

// 地方 → 目印の作り方（kind の並び）と下草の色
const FIELD = {
  world: { lm: ['arch', 'windmill', 'arch', 'bigtree'], ground: ['#f4d04a', '#ffffff', '#e86a8a'] },
  world_grania: { lm: ['headframe', 'chimney', 'arch', 'cart'], ground: ['#8a8070', '#a89a80', '#6e665e'] },
  world_kalion: { lm: ['arch', 'notice', 'pool', 'arch'], ground: ['#f4d04a', '#ffffff', '#b0c8f0'] },
  world_islands: { lm: ['lighthouse', 'sunkcol', 'mooring', 'sunkcol'], ground: ['#ffffff', '#f0e0a0', '#8ad0e0'] },
  world_tempus: { lm: ['sundial', 'ring', 'bell', 'sundial'], ground: ['#d8c8ff', '#ffffff', '#a8b8e8'] },
  world_machine: { lm: ['datacol', 'cooling', 'datacol', 'gate'], ground: ['#a8b0b8', '#7a8288', '#c8d0d6'] },
  world_magicka: { lm: ['floatring', 'crystal', 'floatring', 'lamp'], ground: ['#c8a8f0', '#ffffff', '#a8d0ff'] },
  world_sky: { lm: ['skycol', 'armillary', 'skycol', 'vane'], ground: ['#ffffff', '#e8f0ff', '#f4e0a0'] },
  world_dark: { lm: ['voidgate', 'chain', 'banner', 'statue'], ground: ['#6a5a7a', '#4a3a5a', '#8a6a9a'] },
  world_desert: { lm: ['basin', 'column', 'tent', 'column'], ground: ['#e8c890', '#d0a870', '#f0dcb0'] },
  world_dragon: { lm: ['basalt', 'forge', 'basalt', 'vent'], ground: ['#5a4a44', '#8a5a3a', '#3a302c'] },
  world_snow: { lm: ['icespire', 'sled', 'icespire', 'jar'], ground: ['#ffffff', '#d8e8f8', '#b8c8d8'] }
};
const SOLID_OK = { forest: 1, tree: 1, water: 1, deep: 1, cliff: 1, shallow: 1 };

export function fieldKit(mapId) {
  return {
    id: 'field_kit.v1',
    async prepare(ctx) {
      const map = ctx.map; const F = FIELD[map.id]; if (!F) throw new Error('地方の作り方がない：' + map.id);
      const spots = pickSpots(map, F.lm.length * 2 + 2);
      const set = new Set(spots.map((s) => s.x + ',' + s.z));
      const hooks = { skipTree: (x, z) => set.has(x + ',' + z) };
      ctx.stats.landmarks = spots.length;
      return { hooks, build: (b) => build(ctx, F, spots, b) };
    }
  };
}
function pickSpots(map, n) {
  const W = map.w, H = map.h, TL = window.Tiles; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? 'water' : map.tile(x, z));
  const locs = (map.def && map.def.locations) || []; const warps = map.warps || [];
  const far = (x, z, r) => !locs.some((L) => Math.abs(L.x - x) < r && Math.abs(L.y - z) < r) && !warps.some((w) => Math.abs(w.x - x) < r && Math.abs(w.y - z) < r);
  const r = rng(W * 31 + H * 17); const out = [];
  // 道（road）から 2〜5 マスの、通れないマス。見つからなければ、歩けるマスから 2〜4 マスの通れないマス
  const nearOf = (x, z, test, a, b) => { for (let d = a; d <= b; d++) for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue; if (test(T(x + dx, z + dz))) return true; } return false; };
  const cand = [];
  for (let z = 3; z < H - 3; z++) for (let x = 3; x < W - 3; x++) {
    const t = T(x, z); if (!SOLID_OK[t]) continue; if (!far(x, z, 6)) continue;
    // まわり1マスも通れないマス（歩ける所に形がはみ出さない）
    let ok = true; for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1 && ok; dx++) if (!TL.isSolid(T(x + dx, z + dz))) ok = false; if (!ok) continue;
    const road = nearOf(x, z, (q) => q === 'road' || q === 'bridge', 2, 5); const walk = road || nearOf(x, z, (q) => !TL.isSolid(q), 2, 4); if (!walk) continue;
    cand.push({ x, z, t, w: road ? 2 : 1, h: r() });
  }
  cand.sort((a, b) => (b.w - a.w) || (a.h - b.h));
  for (const c of cand) { if (out.length >= n) break; if (out.some((o) => Math.abs(o.x - c.x) + Math.abs(o.z - c.z) < 14)) continue; out.push(c); }
  return out;
}
async function build(ctx, F, spots, b) {
  const map = ctx.map, W = map.w, H = map.h, hi = ctx.quality !== 'low'; const hAt = b.heightAt || (() => 0);
  const g = new THREE.Group(); g.name = 'env_field_kit'; b.root.add(g); const bt = new Batch(); const add = (m, gg) => bt.add(m, gg);
  const M = {
    stone: plain('#d8ccb6', { std: { roughness: 0.9 } }), stoneD: plain('#9a8e7a', { std: { roughness: 0.9 } }), wood: plain('#6e4e34', { std: { roughness: 0.85 } }), iron: plain('#3a3e44', { std: { roughness: 0.55 } }),
    white: plain('#f4f2ec', { std: { roughness: 0.7 } }), red: plain('#b8433a', { std: { roughness: 0.7 } }), brass: plain('#c9a24a', { std: { roughness: 0.35, metalness: 0.6 } }), cloth: plain('#e8dcc0', { std: { roughness: 0.95, side: THREE.DoubleSide } }),
    dark: plain('#2e2638', { std: { roughness: 0.8 } }), glow: plain('#fff0c8', { emissive: '#ffd890', ei: 1.4, keepGlow: true }), cyan: plain('#8ae0f0', { emissive: '#48c9d6', ei: 1.4, keepGlow: true }),
    violet: plain('#c8a8ff', { emissive: '#a080ff', ei: 1.2, keepGlow: true }), fire: plain('#ff9a40', { emissive: '#ff7020', ei: 2.2, keepGlow: true }), ice: plain('#d8f0ff', { std: { roughness: 0.15, metalness: 0.1 }, transparent: true, opacity: 0.85 }),
    leaf: plain('#4e8a3a', { std: { roughness: 0.85 } }), panel: plain('#c4ccd4', { std: { roughness: 0.5 } })
  };
  const kits = {};   // パックの部品はまとめて置く
  // 遠景の目印は大きめ（道から見える）。足元は通れないマス（まわり1マスも通れない＝中心から 1.5 まで）の中に収まる倍率
  const SCK = { cooling: 1.0, windmill: 1.15, bigtree: 1.3, ring: 1.2, floatring: 1.3 }; let SC = 1.6, CX = 0, CY = 0, CZ = 0;
  const K = (id, x, y, z, s, ry) => { const sc = Array.isArray(s) ? s.map((v) => v * SC) : (s || 1) * SC; (kits[id] = kits[id] || []).push({ x: CX + (x - CX) * SC, y: CY + (y - CY) * SC, z: CZ + (z - CZ) * SC, s: sc, ry: ry || 0 }); };
  spots.forEach((sp, i) => {
    const kind = F.lm[i % F.lm.length]; const x = sp.x + 0.5, z = sp.z + 0.5; const y = Math.max(hAt(x, z), sp.t === 'water' || sp.t === 'deep' || sp.t === 'shallow' ? -0.25 : -0.1); const ry = (sp.x * 0.37 + sp.z * 0.21) % 6.28;
    SC = SCK[kind] || 1.6; CX = x; CY = y; CZ = z; const lg = new THREE.Group(); lg.position.set(x, y, z); lg.scale.setScalar(SC); g.add(lg); const lb = new Batch();
    const add = (m, gg) => lb.add(m, gg.translate(-x, -y, -z));   // この目印の形（目印の足元を原点に、まとめて大きくする）
    const V = (px, py, pz) => new THREE.Vector3(CX + (px - CX) * SC, CY + (py - CY) * SC, CZ + (pz - CZ) * SC);   // 煙・光の位置も同じ倍率
    const place = (obj) => { obj.position.x -= x; obj.position.y -= y; obj.position.z -= z; lg.add(obj); };
    switch (kind) {
      case 'arch': K('arch_round', x, y, z, [0.42, 0.62, 0.9], ry); add(M.stoneD, wbox(0.5, 0.3, 0.4, x + 0.3, y + 0.15, z + 0.2)); break;   // 折れたアーチ（小さく）
      case 'windmill': add(M.white, cyl(0.32, 0.42, 2.6, 10, x, y + 1.3, z)); add(M.red, new THREE.ConeGeometry(0.46, 0.6, 10).translate(x, y + 2.9, z)); { const pv = new THREE.Group(); pv.position.set(x, y + 2.4, z + 0.45); const sp2 = new THREE.Group(); pv.add(sp2); for (let k = 0; k < 4; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.03), M.cloth); bl.geometry.userData.own = true; bl.rotation.z = k * Math.PI / 2; bl.position.set(Math.sin(k * Math.PI / 2) * 0.8, Math.cos(k * Math.PI / 2) * 0.8, 0); sp2.add(bl); } place(pv); ctx.scene.animated.push({ kind: 'spin', obj: sp2, speed: 0.8 }); } break;
      case 'bigtree': add(M.wood, cyl(0.3, 0.45, 2.6, 8, x, y + 1.3, z)); for (const [dx, yy, dz, rr] of [[0, 3.4, 0, 1.4], [0.8, 3.0, 0.3, 1.0], [-0.8, 3.1, -0.2, 1.1]]) add(M.leaf, new THREE.IcosahedronGeometry(rr, 1).translate(x + dx, y + yy, z + dz)); break;
      case 'headframe': for (const sx of [-1, 1]) add(M.iron, wbox(0.12, 3.4, 0.12, x + sx * 0.35, y + 1.7, z)); add(M.iron, new THREE.TorusGeometry(0.4, 0.05, 6, 18).translate(x, y + 3.4, z)); break;
      case 'chimney': add(M.stoneD, cyl(0.28, 0.4, 4.0, 10, x, y + 2.0, z)); ctx.scene.addSmoke(V(x, y + 4.2, z)); break;
      case 'cart': K('minecart', x, y, z, 0.6, ry); break;
      case 'notice': add(M.wood, wbox(0.1, 1.6, 0.1, x - 0.35, y + 0.8, z)); add(M.wood, wbox(0.1, 1.6, 0.1, x + 0.35, y + 0.8, z)); add(M.cloth, wbox(0.8, 0.6, 0.04, x, y + 1.3, z)); break;
      case 'pool': add(M.stone, cyl(0.48, 0.5, 0.35, 12, x, y + 0.17, z)); add(M.cyan, cyl(0.4, 0.4, 0.02, 12, x, y + 0.34, z)); break;
      case 'lighthouse': for (let k = 0; k < 4; k++) add(k % 2 ? M.red : M.white, cyl(0.42 - k * 0.04, 0.46 - k * 0.04, 0.9, 12, x, y + 0.45 + k * 0.9, z)); add(M.glow, cyl(0.25, 0.25, 0.4, 10, x, y + 3.8, z)); add(M.red, new THREE.ConeGeometry(0.34, 0.4, 10).translate(x, y + 4.2, z)); ctx.scene.lampSpots.push({ pos: V(x, y + 3.8, z), color: 0xfff0c0, power: 1.2, dist: 14 }); break;
      case 'sunkcol': K('column_classic', x, y - 0.6, z, [0.4, 0.8, 0.4], ry); K('column_classic', x + 0.25, y - 0.9, z - 0.2, [0.36, 0.55, 0.36], ry + 1); break;
      case 'mooring': K('mooring_post', x, y, z, 1.0, ry); K('mooring_post', x + 0.35, y, z + 0.3, 0.8, ry); break;
      case 'sundial': add(M.stone, cyl(0.48, 0.5, 0.2, 16, x, y + 0.1, z)); { const gn = new THREE.BoxGeometry(0.04, 0.5, 0.36); gn.rotateX(-0.6); gn.translate(x, y + 0.42, z); add(M.brass, gn); } break;
      case 'ring': { const pv = new THREE.Group(); pv.position.set(x, y + 4.5, z); pv.rotation.x = -Math.PI / 2; const sp2 = new THREE.Group(); pv.add(sp2); const t1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 6, 40), M.brass); t1.geometry.userData.own = true; t1.rotation.x = 0.5; sp2.add(t1); place(pv); ctx.scene.animated.push({ kind: 'spin', obj: sp2, speed: 0.2 }); add(M.stone, cyl(0.2, 0.3, 0.6, 8, x, y + 0.3, z)); break; }
      case 'bell': add(M.wood, wbox(0.1, 2.0, 0.1, x - 0.4, y + 1.0, z)); add(M.wood, wbox(0.1, 2.0, 0.1, x + 0.4, y + 1.0, z)); add(M.wood, wbox(1.0, 0.1, 0.12, x, y + 2.0, z)); add(M.brass, new THREE.LatheGeometry([[0, 0.45], [0.12, 0.42], [0.2, 0.3], [0.26, 0]].map(([a, c]) => new THREE.Vector2(a, c)), 12).translate(x, y + 1.45, z)); break;
      case 'datacol': K('server_pillar', x, y, z, [0.45, 0.9, 0.45], ry); break;
      case 'cooling': { const pts = []; for (let k = 0; k <= 10; k++) { const yy = k / 10 * 5; pts.push(new THREE.Vector2(0.8 * Math.sqrt(1 + ((yy - 3.6) / 2.4) ** 2), yy)); } add(plain('#cdd3d6', { std: { roughness: 0.9, side: THREE.DoubleSide } }), new THREE.LatheGeometry(pts, hi ? 20 : 12).translate(x, y, z)); ctx.scene.addSmoke(V(x, y + 5.2, z)); break; }
      case 'gate': for (const sx of [-1, 1]) add(M.panel, wbox(0.2, 2.6, 0.3, x + sx * 0.4, y + 1.3, z)); add(M.panel, wbox(1.0, 0.2, 0.3, x, y + 2.6, z)); add(M.cyan, wbox(0.7, 0.03, 0.03, x, y + 2.45, z + 0.16)); break;
      case 'floatring': { const pv = new THREE.Group(); pv.position.set(x, y + 5.5, z); const sp2 = new THREE.Group(); pv.add(sp2); for (const [rr, tx] of [[1.0, 0.3], [0.75, -0.6]]) { const t1 = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.04, 6, 36), M.violet); t1.geometry.userData.own = true; t1.rotation.x = Math.PI / 2 + tx; sp2.add(t1); } place(pv); ctx.scene.animated.push({ kind: 'spin', obj: sp2, speed: 0.3 }); break; }
      case 'crystal': for (let k = 0; k < 4; k++) add(M.violet, new THREE.OctahedronGeometry(0.16 + k * 0.05, 0).scale(1, 2.4, 1).translate(x + Math.cos(k * 1.6) * 0.25, y + 0.4 + k * 0.08, z + Math.sin(k * 1.6) * 0.25)); break;
      case 'lamp': add(M.dark, cyl(0.05, 0.07, 2.4, 6, x, y + 1.2, z)); add(M.violet, new THREE.OctahedronGeometry(0.18, 0).scale(1, 1.5, 1).translate(x, y + 2.6, z)); break;
      case 'skycol': K('column_classic', x, y + 3.2, z, [0.45, 0.55, 0.45], ry); add(M.white, new THREE.IcosahedronGeometry(0.6, 0).scale(1.2, 0.5, 1.2).translate(x, y + 3.1, z)); break;   // 雲上の断柱（浮かぶ岩の上）
      case 'armillary': add(M.stone, cyl(0.3, 0.4, 0.8, 10, x, y + 0.4, z)); add(M.brass, new THREE.TorusGeometry(0.5, 0.03, 6, 28).translate(x, y + 1.4, z)); add(M.brass, new THREE.TorusGeometry(0.42, 0.03, 6, 28).rotateY(Math.PI / 2).translate(x, y + 1.4, z)); break;
      case 'vane': add(M.white, cyl(0.04, 0.05, 2.8, 6, x, y + 1.4, z)); add(M.brass, wbox(0.7, 0.04, 0.2, x, y + 2.8, z)); break;
      case 'voidgate': K('arch_round', x, y, z, [0.45, 0.8, 0.9], ry); add(M.violet, wbox(0.9, 1.6, 0.02, x, y + 1.2, z)); break;
      case 'chain': for (let k = 0; k < 5; k++) add(M.iron, new THREE.TorusGeometry(0.12, 0.03, 5, 10).rotateY(k % 2 ? Math.PI / 2 : 0).translate(x, y + 0.4 + k * 0.2, z)); add(M.stoneD, wbox(0.5, 0.4, 0.5, x, y + 0.2, z)); break;
      case 'banner': add(M.wood, cyl(0.05, 0.07, 3.2, 6, x, y + 1.6, z)); { const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3, 1, 5), plain('#5a1a2a', { std: { roughness: 0.95, side: THREE.DoubleSide } })); cl.geometry.userData.own = true; cl.position.set(x + 0.42, y + 2.4, z); cl.userData.sway = true; place(cl); } break;
      case 'statue': add(M.stoneD, wbox(0.6, 0.5, 0.6, x, y + 0.25, z)); add(M.dark, cyl(0.18, 0.24, 1.4, 8, x, y + 1.2, z)); add(M.dark, new THREE.SphereGeometry(0.2, 8, 6).translate(x, y + 2.05, z)); break;
      case 'basin': for (let k = 0; k < 3; k++) add(M.stone, cyl(0.5 - k * 0.12, 0.52 - k * 0.12, 0.22, 12, x, y + 0.11 + k * 0.22, z)); add(M.cyan, cyl(0.24, 0.24, 0.02, 10, x, y + 0.67, z)); break;
      case 'column': K('column_classic', x, y, z, [0.42, 0.7, 0.42], ry); break;
      case 'tent': add(M.cloth, new THREE.ConeGeometry(0.55, 1.2, 6).translate(x, y + 0.6, z)); break;
      case 'basalt': K('basalt_ribs', x, y, z, [0.3, 0.8, 0.6], ry); break;
      case 'forge': add(M.stoneD, wbox(0.8, 0.8, 0.8, x, y + 0.4, z)); add(M.fire, wbox(0.5, 0.04, 0.5, x, y + 0.82, z)); add(M.stoneD, cyl(0.15, 0.2, 1.8, 8, x + 0.25, y + 1.6, z - 0.25)); ctx.scene.addSmoke(V(x + 0.25, y + 2.6, z - 0.25)); ctx.scene.lampSpots.push({ pos: V(x, y + 1.2, z), color: 0xff8a40, power: 1.0, dist: 7 }); break;
      case 'vent': add(M.stoneD, cyl(0.2, 0.35, 0.6, 8, x, y + 0.3, z)); ctx.scene.addSmoke(V(x, y + 0.8, z)); break;
      case 'icespire': K('ice_spires', x, y, z, 0.6, ry); break;
      case 'sled': add(M.wood, wbox(0.8, 0.12, 0.4, x, y + 0.3, z)); add(M.iron, wbox(0.9, 0.04, 0.05, x, y + 0.18, z - 0.15)); add(M.iron, wbox(0.9, 0.04, 0.05, x, y + 0.18, z + 0.15)); break;
      case 'jar': for (let k = 0; k < 3; k++) add(M.ice, cyl(0.1, 0.12, 0.3, 8, x + (k - 1) * 0.24, y + 0.15, z)); break;
      default: break;
    }
    lb.build(lg);
  });
  for (const [id, list] of Object.entries(kits)) g.add(await kit(ctx, id, list));
  // 下草：歩ける草地に、小さな花・草・小石（高さ 0.12 以下）
  let tufts = 0; if (hi) { const r = rng(W * 13 + H * 7); const cols = F.ground.map((c) => plain(c, { std: { roughness: 0.9 } })); const geo = new THREE.IcosahedronGeometry(0.05, 0);
    for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) { const t = map.tile(x, z); if (t !== 'grass' && t !== 'grass2' && t !== 'sand' && t !== 'snow' && t !== 'darkland' && t !== 'ash') continue; if (r() > 0.12) continue; const n = 2 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const px = x + 0.15 + r() * 0.7, pz = z + 0.15 + r() * 0.7; add(cols[Math.floor(r() * cols.length)], geo.clone().scale(1, 0.7, 1).translate(px, hAt(px, pz) + 0.04, pz)); tufts++; } } }
  bt.build(g); ctx.stats.tufts = tufts;
  return g;
}
