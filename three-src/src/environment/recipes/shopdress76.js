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
// 部屋の用途（js/rpg/interior76.js と同じ考え方。広げた部屋は def._i76.use）
function useOf(map) {
  const d = map.def || {}; if (d._i76 && d._i76.use) return d._i76.use; const n = map.name || '';
  if (d.shop && d.shop.kind) return d.shop.kind === 'weapon' || d.shop.kind === 'armor' ? d.shop.kind : 'item';
  if (/酒場|隊商宿|バー/.test(n) || d.bgm === 'tavern') return 'tavern'; if (/城|宮|玉座|謁見|王/.test(n)) return 'castle';
  if (/宿/.test(n)) return 'inn'; if (/教会|祠|聖堂|神殿/.test(n)) return 'church'; if (/ギルド|銀行|学院|取引所|役所|詰所/.test(n)) return 'office';
  if (/倉庫/.test(n)) return 'storage'; if (/塔|やぐら|灯台/.test(n)) return 'tower'; if (/修行/.test(n)) return 'dojo'; if (/パン/.test(n)) return 'bakery'; if (/工房|鍛冶/.test(n)) return 'weapon';
  return 'house';
}
// 当てる屋内：ポヨ村の作り込んだ部屋（専用の飾り）以外の屋内すべて（町の建物・城の部屋）
export function dressPlan76(map) {
  if (!map || map.kind !== 'interior' || /^poyo_/.test(map.id || '')) return null;
  const d = map.def || {}; const nm = map.name || ''; const use = useOf(map);
  let kind = d.shop && (d.shop.kind === 'weapon' || d.shop.kind === 'armor') ? d.shop.kind : (use === 'weapon' ? 'weapon' : null);
  if (!kind && use === 'tavern') kind = 'tavern';
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_void' : map.tile(x, z));
  const items = []; const skip = new Set(); const used = new Set();
  const ON = { tableTop: 1, counterTop: 1, barrelTop: 1, crateTop: 1, mugs: 1, bar: 1, wallShelf: 1, herbs: 1, rug: 1, lantern: 1 };
  const put = (x, z, what, o) => { items.push(Object.assign({ x, z, what, use }, o || {})); if (!ON[what]) skip.add(x + ',' + z); used.add(x + ',' + z); };
  const walk = (x, z) => { const t = T(x, z); return t !== '_void' && window.Tiles && !window.Tiles.isSolid(t); };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = T(x, z); if (used.has(x + ',' + z)) continue;
    if (kind === 'weapon' || kind === 'armor') {
      if (t === 'barrel' && T(x + 1, z) === 'barrel' && !used.has((x + 1) + ',' + z)) { put(x, z, 'forge', { w: 2 }); used.add((x + 1) + ',' + z); skip.add((x + 1) + ',' + z); continue; }
      if (t === 'bookshelf' && kind === 'armor' && x >= W / 2 && T(x + 1, z) === 'bookshelf') { put(x, z, 'forge', { w: 2 }); used.add((x + 1) + ',' + z); skip.add((x + 1) + ',' + z); continue; }
      if (t === 'bookshelf') put(x, z, kind === 'weapon' ? 'swordrack' : 'shieldrack');
      else if (t === 'barrel') put(x, z, 'swordbarrel');
      else if (t === 'crate') put(x, z, 'anvil');
      else if (t === 'pillar') put(x, z, 'armorstand');
      else if (t === 'table') put(x, z, 'tableTop');
    } else if (kind === 'tavern') {
      if (t === 'barrel') put(x, z, 'cask');
      else if (t === 'bookshelf' || t === 'cupboard') put(x, z, 'bottleshelf');
      else if (t === 'crate') put(x, z, 'bottlecrate');
      else if (t === 'counter') put(x, z, 'bar');
      else if (t === 'table') put(x, z, 'mugs');
    } else {
      if (t === 'table') put(x, z, 'tableTop');
      else if (t === 'counter') put(x, z, 'counterTop');
      else if (t === 'barrel') put(x, z, 'barrelTop');
      else if (t === 'crate') put(x, z, 'crateTop');
    }
  }
  // 壁の高い所（体の高さより上）：奥・横の壁ぞいの床のマスに、棚と小物・吊るした薬草や鍋（3マスに1つ。部屋の飾りの絵と重ならない列）
  const WAL = (t) => t === '_void' || /wall|castle_wall/.test(t);
  if (use !== 'castle' && use !== 'church') for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {   // 城・教会は前回の部屋ごとの飾り（旗・ステンドグラス）のまま
    if (!walk(x, z)) continue;
    if (WAL(T(x, z - 1)) && (x % 3) === 1) put(x, z, (x * 5 + z) % 4 === 0 && /house|bakery|inn|tavern|item/.test(use) ? 'herbs' : 'wallShelf', { face: 'n' });
    else if (WAL(T(x - 1, z)) && (z % 3) === 1 && !WAL(T(x, z + 1))) put(x, z, 'wallShelf', { face: 'w' });
    else if (WAL(T(x + 1, z)) && (z % 3) === 2 && !WAL(T(x, z + 1))) put(x, z, 'wallShelf', { face: 'e' });
  }
  // 机のまわりの敷物・天井の吊りランプ（部屋の中央の歩ける所）
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (T(x, z) === 'table' && !(T(x - 1, z) === 'table') && !(T(x, z - 1) === 'table')) items.push({ x, z, what: 'rug', use });
  const lamps = W * H > 150 ? 2 : 1; for (let i = 0; i < lamps; i++) { const lx = Math.floor(W * (i + 1) / (lamps + 1)), lz = Math.floor(H / 2); items.push({ x: lx, z: lz, what: 'lantern', use }); }
  return items.length ? { kind: kind || use, use, items, skip } : null;
}

// 向き：うしろの壁（なければ横の壁）。戻り値：正面の向きの角度（+z を正面とする回転）
const WALLISH = (t) => t === '_void' || /wall|^roof_|castle_wall/.test(t);
function faceOf(T, x, z) { if (WALLISH(T(x, z - 1))) return 0; if (WALLISH(T(x - 1, z))) return Math.PI / 2; if (WALLISH(T(x + 1, z))) return -Math.PI / 2; if (WALLISH(T(x, z + 1))) return Math.PI; return 0; }

export function dressBuild76(plan, o) {
  const { add, T, scene } = o; let n = 0; const beams76 = {};   // 吊りランプの梁（行ごとに1本）
  const C = {
    brick: plain('#8a4a32', { std: { roughness: 0.95 } }), brickD: plain('#5a2e22', { std: { roughness: 1 } }), iron: plain('#3a3c42', { std: { roughness: 0.5, metalness: 0.6 } }), steel: plain('#c8ccd2', { std: { roughness: 0.28, metalness: 0.75 } }),
    fire: plain('#ffb050', { emissive: '#ff7a1a', ei: 2.2, keepGlow: true }), coal: plain('#2a2420', { std: { roughness: 1 } }), wood: plain('#7a5236', { std: { roughness: 0.85 } }), woodD: plain('#4e3424', { std: { roughness: 0.9 } }),
    leather: plain('#6a4228', { std: { roughness: 0.9 } }), gold: plain('#c9a24a', { std: { roughness: 0.35, metalness: 0.6 } }), hoop: plain('#4a4440', { std: { roughness: 0.5, metalness: 0.5 } }),
    glass: [plain('#3a7a3a', { std: { roughness: 0.15, metalness: 0.1 } }), plain('#7a4a1e', { std: { roughness: 0.15 } }), plain('#8a2a3a', { std: { roughness: 0.15 } }), plain('#c8b860', { std: { roughness: 0.15 } })],
    foam: plain('#f6f0dc', { std: { roughness: 0.9 } }), beer: plain('#c88a2a', { std: { roughness: 0.4 } }), pewter: plain('#9a9ea4', { std: { roughness: 0.4, metalness: 0.5 } }),
    sack: plain('#c8b088', { std: { roughness: 1 } }), paper: plain('#f2ead6', { std: { roughness: 0.95 } }), basket: plain('#a87a46', { std: { roughness: 0.9 } }), herb: plain('#6a8a3a', { std: { roughness: 1 } }), herb2: plain('#a86a3a', { std: { roughness: 1 } }),
    rug: [plain('#8a2a2a', { std: { roughness: 1 } }), plain('#2a4a7a', { std: { roughness: 1 } }), plain('#5a6a2a', { std: { roughness: 1 } })], rugIn: [plain('#c8a24a', { std: { roughness: 1 } }), plain('#c8b890', { std: { roughness: 1 } }), plain('#d8c070', { std: { roughness: 1 } })]
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
    else if (generic(it, cx, cz, ry, A)) { /* 下の汎用の小物 */ }
    n++;
  }
  return n;
  // ---- 汎用の小物（全部の屋内）。k：マスごとの決まった値（同じ部屋は毎回同じ見た目）
  function generic(it, cx, cz, ry0, A0) {
    const k = ((it.x * 73856093) ^ (it.z * 19349663)) >>> 0; const r = (i) => ((k >> (i * 3)) & 7) / 7;
    const u = it.use || 'house'; const top = 0.8;
    const candle = (A, x, y, z) => { A(C.foam, cyl(0.03, 0.03, 0.14, 8, x, y + 0.07, z)); A(C.fire, new THREE.SphereGeometry(0.025, 6, 5).translate(x, y + 0.17, z)); A(C.hoop, cyl(0.06, 0.06, 0.015, 10, x, y + 0.008, z)); };
    const books = (A, x, y, z, n2) => { for (let i = 0; i < n2; i++) A(C.glass[(k + i) % 4], wbox(0.22, 0.05, 0.16, x + (i % 2) * 0.02, y + 0.025 + i * 0.05, z)); };
    const jar = (A, x, y, z, i) => { const m = [C.brick, C.pewter, C.glass[i % 4], C.wood][i % 4]; A(m, cyl(0.06, 0.07, 0.16, 10, x, y + 0.08, z)); A(m, cyl(0.04, 0.05, 0.04, 10, x, y + 0.18, z)); };
    const bread = (A, x, y, z) => { const g = new THREE.SphereGeometry(0.08, 10, 8); g.scale(1.5, 0.7, 1); g.translate(x, y + 0.05, z); A(C.beer, g); };
    const apple = (A, x, y, z, i) => A(i % 2 ? C.glass[2] : C.glass[0], new THREE.SphereGeometry(0.045, 8, 6).translate(x, y + 0.045, z));
    const sack = (A, x, y, z) => { const g = new THREE.SphereGeometry(0.2, 10, 8); g.scale(1, 1.15, 0.9); g.translate(x, y + 0.2, z); A(C.sack, g); A(C.leather, cyl(0.05, 0.07, 0.06, 8, x, y + 0.42, z)); };
    if (it.what === 'tableTop') {
      const A = at(cx, cz, (k & 1) ? 0 : Math.PI / 2);
      if (u === 'tavern' || u === 'inn' || u === 'castle') { mug(A, -0.15, top, 0.05); A(C.pewter, cyl(0.15, 0.15, 0.02, 14, 0.1, top + 0.01, -0.1)); bread(A, 0.1, top + 0.02, -0.1); candle(A, 0.25, top, 0.18); }
      else if (u === 'office' || u === 'church' || u === 'tower' || u === 'dojo') { books(A, -0.18, top, 0.0, 2 + (k % 3)); A(C.paper, wbox(0.32, 0.01, 0.24, 0.12, top + 0.005, 0.05, 1).rotateY(0.3)); candle(A, 0.25, top, -0.2); }
      else if (u === 'item') { for (let i = 0; i < 4; i++) bottle(A, -0.25 + i * 0.16, top, (i % 2) * 0.1 - 0.05, i + k); }
      else if (u === 'storage') { sack(A, 0, top, 0); }
      else if (u === 'weapon' || u === 'armor') { A(C.steel, wbox(0.06, 0.02, 0.62, -0.1, top + 0.01, 0, 1)); A(C.iron, wbox(0.24, 0.04, 0.05, -0.1, top + 0.02, 0.3, 1)); A(C.steel, new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6).translate(0.2, top, 0)); }
      else { A(C.basket, cyl(0.17, 0.13, 0.1, 10, -0.12, top + 0.05, 0)); for (let i = 0; i < 3; i++) (u === 'bakery' ? bread : apple)(A, -0.16 + i * 0.05, top + 0.08, (i - 1) * 0.06, i); jar(A, 0.2, top, 0.1, k); candle(A, 0.2, top, -0.18); }
      return true;
    }
    if (it.what === 'counterTop') {
      const A = A0; const ct = 1.02;
      if (u === 'item') { for (let i = 0; i < 3; i++) bottle(A, -0.3 + i * 0.13, ct, -0.05, i + k); A(C.gold, cyl(0.12, 0.12, 0.02, 12, 0.2, ct + 0.12, 0)); A(C.hoop, cyl(0.015, 0.015, 0.12, 6, 0.2, ct + 0.06, 0)); }
      else if (u === 'inn') { books(A, -0.2, ct, 0, 1); A(C.gold, new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0.15, ct, 0.05)); candle(A, 0.3, ct, -0.1); }
      else if (u === 'office') { for (let i = 0; i < 4; i++) A(C.gold, cyl(0.04, 0.04, 0.02 + i * 0.015, 10, -0.2 + i * 0.09, ct + 0.01 + i * 0.008, 0)); A(C.paper, wbox(0.3, 0.01, 0.22, 0.2, ct + 0.005, 0, 1)); }
      else if (u === 'church') { candle(A, -0.2, ct, 0); candle(A, 0.2, ct, 0); books(A, 0, ct, 0, 1); }
      else { jar(A, -0.2, ct, 0, k); bread(A, 0.15, ct, 0.05); }
      return true;
    }
    if (it.what === 'barrelTop') { const A = A0; A(C.wood, cyl(0.31, 0.31, 0.04, 12, 0, 0.72, 0)); if (k % 3 === 0) sack(A, 0, 0.74, 0); else for (let i = 0; i < 5; i++) apple(A, -0.1 + (i % 3) * 0.1, 0.74, (i > 2 ? 0.08 : -0.04), i); return true; }
    if (it.what === 'crateTop') { const A = A0; if (k % 2) sack(A, 0.05, 0.5, 0); else { A(C.wood, wbox(0.4, 0.3, 0.34, 0.06, 0.65, 0.02, 1).rotateY(0.3)); } return true; }
    if (it.what === 'wallShelf') {
      // 壁の面（奥＝z の小さい側の壁・左右の壁）。棚板は 1.95 より上
      const f = it.face; const yy = 1.98; let A;
      if (f === 'n') A = at(cx, it.z + 0.02, 0); else if (f === 'w') A = at(it.x + 0.02, cz, Math.PI / 2); else A = at(it.x + 0.98, cz, -Math.PI / 2);
      A(C.woodD, wbox(0.86, 0.05, 0.26, 0, yy, 0.13, 1)); for (const sx of [-0.33, 0.33]) A(C.woodD, wbox(0.04, 0.2, 0.2, sx, yy - 0.12, 0.1, 1));
      for (let i = 0; i < 4; i++) { const px = -0.3 + i * 0.2; if ((k + i) % 3 === 0) books(A, px, yy + 0.025, 0.12, 2); else jar(A, px, yy + 0.025, 0.12, k + i); }
      return true;
    }
    if (it.what === 'herbs') { const A = at(cx, it.z + 0.04, 0); A(C.woodD, wbox(0.8, 0.04, 0.06, 0, 2.45, 0.05, 1)); for (let i = 0; i < 4; i++) { const g = new THREE.ConeGeometry(0.07, 0.36, 6); g.rotateX(Math.PI); g.translate(-0.3 + i * 0.2, 2.24, 0.08); A(i % 2 ? C.herb : C.herb2, g); A(C.leather, cyl(0.01, 0.01, 0.1, 4, -0.3 + i * 0.2, 2.41, 0.08)); } if (k % 2) { const pan = new THREE.CylinderGeometry(0.16, 0.13, 0.06, 12); pan.rotateX(Math.PI / 2); pan.translate(0.42, 2.1, 0.05); A(C.iron, pan); } return true; }
    if (it.what === 'rug') {   // v7.6 机全体の下に（以前は机の左上のマスに合わせたうえ、位置を2回足していて部屋の外へずれていた）
      let tw = 1, th = 1; while (T(it.x + tw, it.z) === 'table') tw++; while (T(it.x, it.z + th) === 'table') th++;
      const R = at(it.x + tw / 2, it.z + th / 2, 0);
      const g = new THREE.PlaneGeometry(tw + 1.2, th + 0.9); g.rotateX(-Math.PI / 2); g.translate(0, 0.075, 0); R(C.rug[k % 3], g);
      const b2 = new THREE.PlaneGeometry(tw + 0.9, th + 0.6); b2.rotateX(-Math.PI / 2); b2.translate(0, 0.078, 0); R(C.rugIn[k % 3], b2); return true;
    }
    if (it.what === 'lantern' && !beams76[it.z]) {   // v7.6 吊りランプの梁（天井がないので、壁から壁へ渡した梁から吊るす）
      beams76[it.z] = 1; let x0 = it.x, x1 = it.x; while (x0 > 0 && T(x0 - 1, it.z) !== 'wall' && T(x0 - 1, it.z) !== '_void') x0--; while (T(x1 + 1, it.z) !== 'wall' && T(x1 + 1, it.z) !== '_void') x1++;
      const L = x1 - x0 + 1 + 0.1; if (L > 1.5 && L < 40) at((x0 + x1 + 1) / 2, cz, 0)(C.wood, wbox(L, 0.14, 0.15, 0, 2.47, 0, 1));   // 壁の上（屋内の壁は 2.4）にのせる
    }
    if (it.what === 'lantern') { const A = at(cx, cz, 0); A(C.hoop, cyl(0.012, 0.012, 0.22, 4, 0, 2.29, 0)); A(C.iron, cyl(0.12, 0.16, 0.06, 8, 0, 2.16, 0)); A(C.fire, cyl(0.1, 0.1, 0.2, 8, 0, 2.03, 0)); A(C.iron, cyl(0.16, 0.12, 0.05, 8, 0, 1.905, 0)); scene.lampSpots.push({ pos: new THREE.Vector3(cx, 1.95, cz), color: 0xffc070, power: 1.0, dist: 7 }); return true; }   // v7.6 梁（2.4）から吊るす。下端 1.88（体の高さより上）
    return false;
  }
}
