/* =========================================================
   レシピ：修理中の船・甲板（harbor_ship_deck。js/data/ship76.js）
   ・船体：甲板の歩けるマスの外側（W のマス）に舷墻（手すり）を置き、そこから下へ船体（world/ShipModel3D.js のロフト）
     手すりは「歩けるマス（_）の外、W のマスの外の縁の内側」に収める（体の高さの形が歩けるマスに入らない）
   ・帆柱：I のマス（論理の柱）に3本。帆は体の高さより上だけ（いちばん下の帆桁はたたんだ帆）。索具は帆柱どうしと帆桁だけ（甲板の上を斜めに横切る綱は張らない）
   ・舵輪（25,6：調べる出来事のマス）・昇降口の縁（19,6：船室への階段）・タラップの切れ目（14,11）と、海へ下りる渡り板
   ・まわりの海：地図の外まで広い水面（町の水と同じ材質）
   ・論理（タイル）は変えない
   ========================================================= */
import * as THREE from 'three';
import { plain } from '../EnvKit3D.js';
import { Batch } from '../../engine/Materials.js';
import { shipMats, loftHull, railGeos, rig, bowsprit } from '../../world/ShipModel3D.js';

export const recipe = {
  id: 'ship_deck.v1',
  async prepare(ctx) {
    return { hooks: { skipWall: (t) => t === 'wall_wood', skipFloor: (t) => t === 'wall_wood', wetTile: (t) => t === 'wall_wood', floorAs: (t) => (t === 'barrel' || t === 'crate' || t === 'pillar' ? 'floor_wood' : null), flatTile: (t) => t === 'floor_wood' || t === 'barrel' || t === 'crate' || t === 'pillar' || t === 'stairs_down', skipProp: (t) => t === 'pillar' }, build: (b) => build(ctx, b) };
  }
};

async function build(ctx, b) {
  const map = ctx.map; const g = new THREE.Group(); g.name = 'env_ship_deck'; b.root.add(g); const bt = new Batch(); const add = (m, gg) => bt.add(m, gg); const M = shipMats();
  // 歩けるマス（_ など）の南北の広がりから、手すりの半幅を決める（歩けるマスの外・W のマスの中）
  const W = map.w, H = map.h; const zc = 6.5;
  const walkHalf = (x) => { let h = 0; for (let z = 0; z < H; z++) { const t = map.tile(Math.floor(x), z); if (!window.Tiles.isSolid(t) || t === 'pillar' || t === 'barrel' || t === 'crate') h = Math.max(h, Math.abs(z + 0.5 - zc) + 0.5); } return h; };
  const col = {}; for (let x = 0; x < W; x++) col[x] = walkHalf(x + 0.5);   // 列ごとの歩けるマスの半幅
  const colAt = (x) => col[Math.max(0, Math.min(W - 1, Math.floor(x)))] || 0;
  const x0 = 1.3, x1 = 27.15;
  const hbAt = (x) => Math.max(colAt(x - 0.5), colAt(x), colAt(x + 0.3), colAt(x + 0.6), colAt(x + 0.9)) + 0.12;   // 前後のマスも見る（区間の線が歩けるマスの角を切らない）
  const o = { x0, x1, zc, rail: 0.78, wl: -0.2, N: 52, hb: (t) => { const x = x0 + (x1 - x0) * t; return x < 2.2 ? Math.max(0.05, hbAt(2.2) * Math.pow((x - x0) / (2.2 - x0), 0.7)) : hbAt(x); }, yD: () => 0.0, yK: (t) => -1.7 + 0.6 * Math.pow(Math.abs(t - 0.5) * 2, 3) };
  add(M.hull, loftHull(o));
  railGeos(o, add, M, [[14.02, 14.98, 1]]);
  // 船尾の手すり
  { const hb = o.hb(1); const sg = new THREE.BoxGeometry(0.16, 0.78, hb * 2); sg.translate(x1 - 0.06, 0.39, zc); add(M.rail, sg); const cg = new THREE.BoxGeometry(0.2, 0.08, hb * 2 + 0.1); cg.translate(x1 - 0.06, 0.82, zc); add(M.wood, cg); }
  // 帆柱（I のマス）
  const masts = []; for (let x = 0; x < W; x++) if (map.tile(x, 6) === 'pillar') masts.push(x + 0.5);
  const HGT = [8.6, 10.2, 7.6]; const list = masts.map((x, i) => ({ x, h: HGT[i] || 8, flag: i === 1, yards: i === 1
    ? [{ y: 2.4, len: 6.4, sail: 'furled' }, { y: 5.2, len: 5.0, sail: 'torn', drop: 2.4 }, { y: 7.8, len: 3.4, sail: 'set', drop: 1.6 }, { y: 9.4, len: 2.2, sail: null }]
    : [{ y: 2.4, len: 5.4, sail: 'furled' }, { y: 4.9, len: 4.2, sail: 'set', drop: 2.0 }, { y: 6.9, len: 3.0, sail: null }] }));
  rigMasts(add, M, o, list);
  bowsprit(add, M, o, 3.2, list[0]);
  // 舵輪（調べる出来事のマス）
  const helm = (map.events || []).find((e) => e.x === 25 && e.y === 6);
  if (helm) { const hx = 25.5, hz = 6.5; add(M.wood, box(0.3, 0.9, 0.3, hx + 0.2, 0.45, hz)); const wg = new THREE.TorusGeometry(0.42, 0.04, 6, 18); wg.rotateY(Math.PI / 2); wg.translate(hx - 0.02, 1.05, hz); add(M.wood, wg);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const sp = new THREE.CylinderGeometry(0.025, 0.025, 1.05, 5); sp.rotateX(a); sp.translate(hx - 0.02, 1.05, hz); add(M.wood, sp); }
    add(M.brass, cyl(0.07, 0.07, 0.12, 8, hx - 0.02, 1.05, hz, true)); }
  // 昇降口の縁（低い木枠。歩くのに当たらない高さ）
  for (let x = 0; x < W; x++) for (let z = 0; z < H; z++) if (map.tile(x, z) === 'stairs_down') {
    for (const [w, d, dx, dz] of [[1.0, 0.08, 0.5, 0.04], [1.0, 0.08, 0.5, 0.96], [0.08, 1.0, 0.04, 0.5], [0.08, 1.0, 0.96, 0.5]]) add(M.rail, box(w, 0.12, d, x + dx, 0.06, z + dz));
  }
  // タラップの切れ目から海へ下りる渡り板（海のマスの上）
  { const a = new THREE.Vector3(14.5, 0.02, 11.95), c = new THREE.Vector3(14.5, -0.55, 13.4); const len = a.distanceTo(c); const pl = new THREE.BoxGeometry(0.6, 0.06, len); pl.rotateX(Math.atan2(a.y - c.y, c.z - a.z)); pl.translate(14.5, (a.y + c.y) / 2, (a.z + c.z) / 2); add(M.newWood, pl); }
  // 甲板の縁の水落とし（手すりの足もとの細い板。高さ 0.1）
  // まわりの海（地図の外まで）
  const waterM = (ctx.scene.world && ctx.scene.world.waterMaterial) ? ctx.scene.world.waterMaterial() : plain('#3a7ab8', { std: { roughness: 0.3 }, transparent: true, opacity: 0.85, noCutout: true });
  const seaG = new THREE.PlaneGeometry(240, 240, 1, 1); { const c = new THREE.Color((ctx.scene.theme && ctx.scene.theme.water) || '#3f7fb8'); const n = seaG.attributes.position.count; const ca = new Float32Array(n * 3); for (let i = 0; i < n; i++) ca.set([c.r, c.g, c.b], i * 3); seaG.setAttribute('color', new THREE.BufferAttribute(ca, 3)); }   // 町の水と同じ材質（頂点の色を使う）
  const sea = new THREE.Mesh(seaG, waterM); sea.geometry.userData.own = true; sea.rotation.x = -Math.PI / 2; sea.position.set(W / 2, -0.23, H / 2); sea.name = 'ship_sea'; sea.receiveShadow = true; g.add(sea);
  ctx.scene.lampSpots.push({ pos: new THREE.Vector3(x1 - 0.4, 1.6, zc), color: 0xffc070, power: 0.6, dist: 6 });
  bt.build(g); ctx.stats.masts = list.length; return g;
}
const box = (w, h, d, x, y, z) => { const gg = new THREE.BoxGeometry(w, h, d); gg.translate(x, y, z); return gg; };
const cyl = (r0, r1, h, seg, x, y, z, side) => { const gg = new THREE.CylinderGeometry(r0, r1, h, seg); if (side) gg.rotateZ(Math.PI / 2); gg.translate(x, y, z); return gg; };
// 甲板の上を斜めに横切る綱は張らない（歩けるマスの体の高さに入るため）。帆柱・帆桁・帆と、帆柱どうしの綱だけ
function rigMasts(add, M, o, list) {
  const o2 = Object.assign({}, o, { hb: () => 0.0 });   // シュラウドを帆柱の根もとへ（実質なし）
  rig((m, gg) => { const p = gg.attributes.position; let lowY = 1e9; for (let i = 0; i < p.count; i++) lowY = Math.min(lowY, p.getY(i)); if (m === M.rope && lowY < 2.0) return; add(m, gg); }, M, o2, list);
}

// 船室（harbor_ship_cabin）：屋内の作り方（room_kit の板張り）に、家具の下も床板にするフックを足す（ダンジョンの種類なので、家具の下が草地の色にならないように）
import { roomKit, ROOM_STYLE } from './room_kit.js';
const FURN = { bed: 1, table: 1, bookshelf: 1, barrel: 1, crate: 1, chest: 1, chest_open: 1, counter: 1 };
export const cabinRecipe = {
  id: 'ship_cabin.v1',
  async prepare(ctx) {
    const base = roomKit(Object.assign({ archetype: 'ship' }, ROOM_STYLE.ship)); const r = await base.prepare(ctx);
    r.hooks = Object.assign({}, r.hooks, { floorAs: (t) => (FURN[t] ? 'floor_wood' : null), flatTile: (t) => t === 'floor_wood' || !!FURN[t] || t === 'stairs_up' });
    return r;
  }
};
