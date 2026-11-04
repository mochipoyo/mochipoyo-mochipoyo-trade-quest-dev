/* =========================================================
   レシピ：リヴェル城 1階（rivel_castle・30×28）— FLAGSHIP_SCENES 2
   目標：城下町から入った瞬間に材質と天井の高さが変わる。入口から玉座へ儀礼の軸。
   ・論理（js/data/env76.js）：絨毯の両側に列柱（x=11・20、1マスおき）＝主軸（身廊）は広く、側廊は狭く。柱の間は通れる
   ・壁：汎用の箱の壁（2.2）の代わりに、高さ 4.6 の切石の壁（台座・目地・付け柱・軒蛇腹）。手前（南・カメラ側）は低い手すり壁
   ・奥：紋章付きの大アーチ（パックの arch_round を大きく）＋ステンドグラス＋玉座（北の壁のくぼみ。王の立つマスの後ろの壁の中）
   ・左右を写し鏡にしない：西＝庭と採光（高い窓・光の筋・鉢植えの柑橘）、東＝執務と警備（壁の槍掛け・燭台の暖色・旗）
   ・床：側廊は大きな石板（パックの stone_courtyard）、身廊は絨毯＋金の縁、中央に床紋様（パックの floor_medallion）
   ・柱：パックの column_classic（論理の柱のマスだけ。歩けるマスには立てない）
   ・スマホ（low）：光の筋・鉢植えの葉・細かい目地を省く。形（壁の高さ・アーチ・柱・玉座）は残す
   ========================================================= */
import * as THREE from 'three';
import { kit, mat, plain, Merge, worldUV, mat4 } from '../EnvKit3D.js';

const WALL_H = 4.6;
export const recipe = {
  id: 'rivel_castle.v1',
  async prepare(ctx) {
    const map = ctx.map; const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? 'castle_wall' : map.tile(x, z));
    // 論理の確認：外周が城壁・入口の扉・列柱がある（違えば準備で失敗＝従来の表示）
    if (W !== 30 || H !== 28) throw new Error('大きさが想定と違う ' + W + 'x' + H);
    if (T(14, 26) !== 'door' || T(15, 26) !== 'door') throw new Error('入口の扉がない');
    let pillars = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (T(x, z) === 'pillar') pillars++;
    if (pillars < 26) throw new Error('列柱のマスが足りない ' + pillars + '（js/data/env76.js が当たっていない）');
    const hooks = {
      skipWall: (t) => t === 'castle_wall',                      // 城壁はレシピが作る
      skipFloor: (t) => t === 'carpet',                         // 絨毯は金の縁つきで作り直す
      skipProp: (t) => t === 'pillar'                           // 柱は column_classic
    };
    return { hooks, build: (b) => build(ctx, b) };
  }
};

async function build(ctx, b) {
  const map = ctx.map, W = map.w, H = map.h, hi = ctx.quality !== 'low';
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? 'castle_wall' : map.tile(x, z));
  const g = new THREE.Group(); g.name = 'env_rivel_castle'; b.root.add(g);
  const stone = await mat(ctx, 'stone_fortress', { repeat: 3, color: '#fbf6ec' });
  const stoneD = await mat(ctx, 'stone_fortress', { repeat: 3, color: '#cfc6b4' });
  const slab = await mat(ctx, 'stone_courtyard', { repeat: 2, color: '#fffaf0', roughness: 0.55 });
  const slabD = await mat(ctx, 'stone_courtyard', { repeat: 2, color: '#b9ae9a', roughness: 0.55 });
  const oak = await mat(ctx, 'wood_oak', { repeat: 2, color: '#a07850' });
  const gold = plain('#d8b04a', { std: { roughness: 0.35, metalness: 0.85 } });
  const red = plain('#8a1f2a', { std: { roughness: 0.95 } });
  const blue = plain('#23406e', { std: { roughness: 0.95 } });
  const glassDay = plain('#bcd8f0', { emissive: '#9cc4ec', ei: 0.85, window: true, std: { roughness: 0.2 } });
  const glassArt = plain('#6a3a8a', { emissive: '#f0b85a', ei: 0.9, std: { roughness: 0.25 } });
  const dark = plain('#2a2420', { std: { roughness: 1 } });
  const leaf = plain('#4a7a3a', { std: { roughness: 0.9 } }); const fruit = plain('#f0a02a', { std: { roughness: 0.6 } });
  const mg = new Merge();
  const B = (m, w, h, d, x, y, z, ry) => mg.add(m, worldUV(new THREE.BoxGeometry(w, h, d), 2), mat4(x, y, z, ry || 0));

  // ---------------- 壁：北（玉座の側・高い）・西（庭の側）・東（執務の側）・南（手前・低い）
  // 北：z 0〜2 の厚い壁。内側の面は z=2
  const north = (x0, x1) => { B(stone, x1 - x0, WALL_H, 2, (x0 + x1) / 2, WALL_H / 2, 1); B(stoneD, x1 - x0, 0.45, 0.16, (x0 + x1) / 2, 0.22, 2.06); B(stoneD, x1 - x0, 0.22, 0.22, (x0 + x1) / 2, WALL_H - 0.1, 2.08); };
  north(0, 12.6); north(17.4, 30);
  B(stone, 4.8, WALL_H - 3.9, 2, 15, 3.9 + (WALL_H - 3.9) / 2, 1);   // アーチの上
  B(stoneD, 4.8, 0.45, 0.6, 15, 0.22, 0.3);                            // アーチの奥の段
  // 西・東：x 0〜2 と 28〜30
  const side = (x, face) => { B(stone, 2, WALL_H, H - 2, x, WALL_H / 2, (H - 2) / 2 + 1); B(stoneD, 0.16, 0.45, 23.8, face, 0.22, 13.9); B(stoneD, 0.22, 0.22, 23.8, face, WALL_H - 0.1, 13.9); };
  side(1, 2.06); side(29, 27.94);
  // 付け柱（北の面に4本、東西の面に5本）。歩けるマスへ 0.12 以上はみ出さない
  for (const x of [3, 7, 23, 27]) B(stoneD, 0.6, WALL_H, 0.12, x, WALL_H / 2, 2.06);
  for (const z of [3.5, 8.5, 14, 19.5, 24.5]) { B(stoneD, 0.12, WALL_H, 0.6, 2.06, WALL_H / 2, z); B(stoneD, 0.12, WALL_H, 0.6, 27.94, WALL_H / 2, z); }
  // 南：低い手すり壁（カメラの側。中が見えるように）＋入口の門柱
  for (const [x0, x1] of [[0, 14], [16, 30]]) { B(stone, x1 - x0, 0.75, 2, (x0 + x1) / 2, 0.375, 27); B(stoneD, x1 - x0, 0.12, 2.1, (x0 + x1) / 2, 0.8, 27); }
  for (const x of [13.8, 16.2]) { B(stoneD, 0.5, 1.5, 0.5, x, 0.75, 26.3); B(gold, 0.36, 0.1, 0.36, x, 1.55, 26.3); }
  // 西の窓（高い窓・光の筋）・東の旗と槍掛け（左右を写し鏡にしない）
  const winZ = [7.5, 13.5, 19.5];
  for (const z of winZ) {
    B(dark, 0.3, 2.7, 1.5, 1.95, 2.6, z); B(glassDay, 0.06, 2.5, 1.3, 2.08, 2.6, z);
    mg.add(stoneD, new THREE.TorusGeometry(0.7, 0.09, 6, 16, Math.PI), mat4(2.1, 3.95, z, Math.PI / 2));
    B(stoneD, 0.3, 0.14, 1.7, 2.1, 1.25, z);   // 窓台
  }
  for (const z of [7.5, 13.5, 19.5]) {   // 東：旗（青と赤）と燭台
    B(z === 13.5 ? red : blue, 0.04, 2.2, 1.2, 27.9, 2.6, z); B(gold, 0.06, 0.08, 1.35, 27.88, 3.72, z);
    B(gold, 0.16, 0.5, 0.16, 27.85, 1.9, z - 1.4); B(gold, 0.16, 0.5, 0.16, 27.85, 1.9, z + 1.4);
  }
  for (const z of [10.5, 16.5]) {   // 東：槍掛け（壁の面。歩けるマスへ出ない）
    B(oak, 0.08, 0.1, 1.6, 27.9, 1.0, z); B(oak, 0.08, 0.1, 1.6, 27.9, 2.2, z);
    for (let i = 0; i < 4; i++) { const zz = z - 0.6 + i * 0.4; B(oak, 0.05, 2.4, 0.05, 27.86, 1.6, zz); mg.add(plain('#c0c4cc', { std: { metalness: 0.8, roughness: 0.35 } }), new THREE.ConeGeometry(0.05, 0.25, 6), mat4(27.86, 2.92, zz)); }
  }
  // ---------------- 奥の大アーチ・ステンドグラス・玉座（北の壁のくぼみ。王のマス (14,2) の後ろ）
  B(glassArt, 2.6, 3.0, 0.08, 15, 2.2, 0.62);
  for (let i = 0; i < 5; i++) B(gold, 0.04, 2.9, 0.1, 13.9 + i * 0.55, 2.2, 0.66);                    // ステンドグラスの鉛の枠
  mg.add(gold, new THREE.TorusGeometry(0.55, 0.05, 6, 24), mat4(15, 3.05, 0.68));                       // 紋章の輪
  B(dark, 3.0, 3.6, 1.2, 15, 1.8, 1.0);                                                                  // くぼみの奥（暗い）
  // 玉座
  B(stoneD, 3.2, 0.3, 1.4, 15, 0.15, 1.35); B(stoneD, 2.4, 0.3, 1.0, 15, 0.45, 1.25);
  B(red, 1.0, 0.18, 0.8, 15, 0.86, 1.3); B(gold, 1.1, 0.5, 0.86, 15, 0.6, 1.3);
  B(red, 1.0, 1.7, 0.16, 15, 1.75, 0.92); B(gold, 1.16, 0.12, 0.22, 15, 2.66, 0.92); mg.add(gold, new THREE.ConeGeometry(0.16, 0.42, 4), mat4(15, 2.9, 0.92));
  for (const x of [14.45, 15.55]) B(gold, 0.12, 0.8, 0.8, x, 1.05, 1.3);
  // 北の壁の旗（紋章：金の輪と十字）
  for (const x of [10.2, 19.8]) { B(red, 1.4, 2.6, 0.05, x, 2.7, 2.0); B(gold, 1.5, 0.08, 0.07, x, 4.02, 2.0); mg.add(gold, new THREE.TorusGeometry(0.34, 0.05, 6, 20), mat4(x, 2.9, 2.04)); B(gold, 0.06, 0.6, 0.04, x, 2.9, 2.05); B(gold, 0.6, 0.06, 0.04, x, 2.9, 2.05); }

  // ---------------- 床：側廊の石板（大きな目地）・柱の列の下の帯・身廊の絨毯（金の縁）
  // 側廊：2×2 マスごとに明るい石と暗い石を交互（磨いた石の市松）。柱の列の下は暗い石の帯
  const tile2 = (x0, z0, w, d, m) => { const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2); worldUV(geo, 2); mg.add(m, geo, mat4(x0 + w / 2, 0.012, z0 + d / 2)); };
  for (const [x0, x1] of [[2, 11], [21, 28]]) for (let x = x0; x < x1; x += 2) for (let z = 2; z < 26; z += 2) { const w = Math.min(2, x1 - x); tile2(x, z, w, 2, ((Math.floor((x - x0) / 2) + z / 2) & 1) ? slabD : slab); }
  tile2(11, 2, 1, 24, slabD); tile2(20, 2, 1, 24, slabD);
  const carpet = plain('#7a1a26', { std: { roughness: 1 } }); const carpetIn = plain('#9a2a32', { std: { roughness: 1 } });
  B(carpet, 8, 0.05, 24, 16, 0.025, 14); B(carpetIn, 6.6, 0.055, 24, 16, 0.028, 14);
  for (const x of [12.35, 19.65]) B(gold, 0.1, 0.06, 24, x, 0.03, 14);
  for (let z = 4; z < 26; z += 3) B(gold, 6.4, 0.058, 0.06, 16, 0.031, z);   // 絨毯の模様の横線
  mg.build(g);

  // ---------------- パックの部品（GLB）：列柱・床の紋様・大アーチ
  const cols = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (T(x, z) === 'pillar') cols.push({ x: x + 0.5, z: z + 0.5, s: [0.82, 1.58, 0.82] });
  g.add(await kit(ctx, 'column_classic', cols));
  g.add(await kit(ctx, 'floor_medallion', [{ x: 16, y: 0.02, z: 14.5, s: [1.15, 1, 1.15] }]));
  g.add(await kit(ctx, 'arch_round', [{ x: 15, y: 0, z: 1.85, s: [1.3, 1.15, 1.2] }]));
  // 西の鉢植え（柑橘）：窓と窓の間の壁ぎわ。歩けるマスへ出ない（壁のくぼみ x 1.55〜2.0）
  if (hi) {
    const pm = new Merge();
    for (const z of [10.5, 16.5, 22.8]) {
      pm.add(stoneD, new THREE.CylinderGeometry(0.22, 0.17, 0.42, 12), mat4(1.78, 0.21, z));
      pm.add(leaf, new THREE.IcosahedronGeometry(0.42, 1), mat4(1.78, 1.05, z, 0, [1, 1.25, 1]));
      for (let i = 0; i < 5; i++) pm.add(fruit, new THREE.SphereGeometry(0.05, 6, 5), mat4(1.78 + Math.cos(i * 1.3) * 0.3, 1.0 + (i % 3) * 0.15, z + Math.sin(i * 1.3) * 0.3));
    }
    pm.build(g);
    // 光の筋（西の窓から床へ。加算の半透明。影は落とさない）
    const shaft = plain('#fff3d6', { transparent: true, opacity: 0.12, noCutout: true, std: { side: THREE.DoubleSide, blending: THREE.AdditiveBlending } });
    for (const z of winZ) { const geo = new THREE.PlaneGeometry(1.3, 4.2); const m = new THREE.Mesh(geo, shaft); geo.userData.own = true; m.position.set(4.0, 1.9, z); m.rotation.set(0, Math.PI / 2, -0.95); m.castShadow = false; m.renderOrder = 4; g.add(m); }
  }
  // 光：西は冷たい昼の光（窓）、東は暖かい燭台、奥はステンドグラスの金色
  const L = ctx.scene.lampSpots;
  for (const z of winZ) L.push({ pos: new THREE.Vector3(3.2, 2.6, z), color: 0xcfe2ff, power: 0.9, dist: 8 });
  for (const z of [6.1, 9.9, 12.1, 14.9, 18.1, 20.9]) L.push({ pos: new THREE.Vector3(27.2, 2.2, z), color: 0xffa860, power: hi ? 0.55 : 0.4, dist: 6 });
  L.push({ pos: new THREE.Vector3(15, 2.8, 2.6), color: 0xffcf7a, power: 1.1, dist: 10 });
  return g;
}
