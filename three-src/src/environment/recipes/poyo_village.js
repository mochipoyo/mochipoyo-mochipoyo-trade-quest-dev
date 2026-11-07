/* =========================================================
   レシピ：ポヨ村（poyo_village）— FLAGSHIP_SCENES 1
   目標：画面を見ただけで「始まりの農村」と分かる。中央の緑地に村の大樹、川の水車、東の畑、家ごとに違う形
   ・論理（js/data/env76.js）：中央の緑地（教会の西）の 2×2 マスを木（歩けない）にした。そこに大樹（幹の分かれ・根・層の違う樹冠）と低い石囲い
     （石囲いは木のマスの内側。歩けるマスに壁を作らない。根は地面に沿う低い形）
   ・建物：用途ごとに屋根の形・向き・軒・高さ・壁を変える（BuildingBuilder3D の style）
       村長の家＝寄棟の低い大屋根・太い土台／道具屋＝庇／宿屋＝広い軒の2階建て／修行場＝妻入り（棟が南北）・木組みなし／
       民家＝妻入り／水車小屋＝石の壁／納屋＝赤い妻入り／集会所＝寄棟。教会は鐘楼（従来）
   ・水車：水車小屋の東の川（水のマス）に、パックの waterwheel。回る（軸は東西）
   ・畑：作物のマスに畝（低い土の盛り上がり。歩ける高さ）
   ========================================================= */
import * as THREE from 'three';
import { Nature81 } from '../../world/Nature81.js';
import { kit, mat, plain, Merge, worldUV, mat4, rng } from '../EnvKit3D.js';

const STYLE = {
  elder: { roof: 'hip', pitch: 0.5, eave: 0.6, two: false, h1: 2.7, base: 0.5, plaster: '#f0e2c2' },
  item: { roof: 'gable', porch: 3.6, plaster: '#f6ecd8' },
  inn: { roof: 'gable', eave: 0.7, two: true, porch: 4.2, plaster: '#f2e6cc' },
  church: { plaster: '#f8f4ec' },
  dojo: { roof: 'gableZ', pitch: 0.62, eave: 0.55, frame: false, plaster: '#e4d6bc', chimney: false },
  house: { roof: 'gableZ', h1: 2.6, plaster: '#eedcbc' },
  mill: { roof: 'gable', wall: 'stone', frame: false, plaster: '#cfc4b0', h1: 2.7 },
  barn: { roof: 'gableZ', pitch: 0.82, frame: false, plaster: '#b05a3a', chimney: false },
  hall: { roof: 'hip', pitch: 0.55, eave: 0.5, h1: 2.9, plaster: '#f0e4cc' }
};
const TREE = [[27, 12], [28, 12], [27, 13], [28, 13]];

export const recipe = {
  id: 'poyo_village.v1',
  async prepare(ctx) {
    const map = ctx.map;
    const treeOk = TREE.every(([x, z]) => map.tile(x, z) === 'tree');
    if (!treeOk) throw new Error('大樹のマスが木になっていない（js/data/env76.js）');
    const mill = (map.buildings || []).find((b) => b.id === 'mill'); if (!mill) throw new Error('水車小屋がない');
    // 水車：小屋の東の川（水のマス）。小屋の南北の範囲で、東へ探す
    let wx = -1; for (let x = mill.x + mill.w; x < Math.min(map.w, mill.x + mill.w + 6); x++) if (map.tile(x, mill.y + 2) === 'water') { wx = x; break; }
    if (wx < 0) throw new Error('水車小屋の東に川がない');
    const hooks = { skipTree: (x, z) => TREE.some(([a, b]) => a === x && b === z) };
    const building = async (b, o) => { const st = STYLE[b.id] || STYLE[b.type]; if (!st) return null; return o.bb.build(b, o.rnd, { batch: o.batch, design: o.design, theme: o.theme, style: st }); };
    return { hooks, building, build: (bb) => build(ctx, bb, { mill, wx }) };
  }
};

async function build(ctx, b, o) {
  const map = ctx.map, hi = ctx.quality !== 'low'; const r = rng(99211);
  const g = new THREE.Group(); g.name = 'env_poyo_village'; b.root.add(g);
  const bark = plain('#6a4a32', { std: { roughness: 0.95 } }); const barkL = plain('#8a6446', { std: { roughness: 0.95 } });
  const leafA = plain('#4e8a3a', { std: { roughness: 0.85 } }); const leafB = plain('#6aa84a', { std: { roughness: 0.85 } }); const leafC = plain('#3a6e30', { std: { roughness: 0.85 } });
  const ringStone = await mat(ctx, 'stone_courtyard', { repeat: 1, color: '#d8ccb4' }); const soil = plain('#5a4430', { std: { roughness: 1 } });
  const mg = new Merge();
  // ---------------- 大樹（中心 28,13）
  const cx = 28, cz = 13;
  const trunk = new THREE.CylinderGeometry(0.5, 0.8, 3.4, 12, 6); const tp = trunk.attributes.position;
  for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); const a = Math.atan2(tp.getZ(i), tp.getX(i)); const k = 1 + 0.12 * Math.sin(a * 3 + y * 1.7) + 0.06 * Math.sin(a * 7); tp.setX(i, tp.getX(i) * k); tp.setZ(i, tp.getZ(i) * k); }
  trunk.computeVertexNormals(); mg.add(bark, trunk, mat4(cx, 1.7, cz));
  // 枝：幹の上から5本、外と上へ
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3, len = 2.0 + r() * 0.8, tilt = 0.75 + r() * 0.25;
    const br = new THREE.CylinderGeometry(0.1, 0.26, len, 7); br.translate(0, len / 2, 0);
    const m = new THREE.Matrix4().makeTranslation(cx + Math.cos(a) * 0.2, 2.8 + r() * 0.4, cz + Math.sin(a) * 0.2).multiply(new THREE.Matrix4().makeRotationY(-a)).multiply(new THREE.Matrix4().makeRotationZ(-tilt));
    mg.add(barkL, br, m);
  }
  // 根：地面に沿う低い形（歩けるマスの上では高さ 0.12 以下）
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + r() * 0.3, len = 1.1 + r() * 0.9; const rt = new THREE.CylinderGeometry(0.05, 0.24, len, 6); rt.rotateZ(Math.PI / 2); rt.translate(len / 2, 0, 0); rt.scale(1, 0.5, 1);
    mg.add(bark, rt, new THREE.Matrix4().makeTranslation(cx + Math.cos(a) * 0.55, 0.08, cz + Math.sin(a) * 0.55).multiply(new THREE.Matrix4().makeRotationY(-a)).multiply(new THREE.Matrix4().makeRotationZ(-0.05)));
  }
  // 樹冠：大きさ・色の違う塊を3層
  const lobes = [[0, 5.4, 0, 2.3, leafA], [1.6, 4.8, 0.6, 1.8, leafB], [-1.5, 4.9, 0.4, 1.9, leafA], [0.4, 4.6, -1.6, 1.7, leafC], [-0.6, 4.4, 1.7, 1.6, leafB], [1.9, 4.1, -1.0, 1.3, leafC], [-1.9, 4.2, -1.2, 1.35, leafB], [0.2, 6.3, 0.2, 1.5, leafB]];
  if (Nature81.on()) { const [cg, cm] = Nature81.crown(lobes.map(([dx, y, dz, rad]) => [cx + dx, y, cz + dz, rad * 1.05]), 28); const cr = new THREE.Mesh(cg, cm); cr.castShadow = cr.receiveShadow = true; cr.name = 'poyo_bigtree_crown81'; g.add(cr); }   // v8.1 葉の板の樹冠（Nature81）
  else for (const [dx, y, dz, rad, m] of lobes) { const ge = new THREE.IcosahedronGeometry(rad, hi ? 2 : 1); const p = ge.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.12 * Math.sin(p.getX(i) * 3.1 + p.getY(i) * 2.3) * Math.cos(p.getZ(i) * 2.7); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.82, p.getZ(i) * k); } ge.computeVertexNormals(); mg.add(m, ge, mat4(cx + dx, y, cz + dz)); }
  // 低い石囲い（木のマスの内側＝半径 0.95）と土
  const ring = new THREE.CylinderGeometry(0.97, 0.99, 0.36, 28, 1, true); worldUV(ring, 1); mg.add(ringStone, ring, mat4(cx, 0.18, cz));
  mg.add(ringStone, new THREE.TorusGeometry(0.97, 0.07, 6, 28), mat4(cx, 0.37, cz, 0, 1, Math.PI / 2));
  mg.add(soil, new THREE.CircleGeometry(0.95, 24).rotateX(-Math.PI / 2), mat4(cx, 0.3, cz));
  // ---------------- 畑の畝（作物のマス。高さ 0.1）
  let rows = 0; const furrow = plain('#6a4a2e', { std: { roughness: 1 } });
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.tile(x, z) === 'crops') { for (const dz of [-0.25, 0.25]) mg.add(furrow, new THREE.CylinderGeometry(0.11, 0.13, 1.0, 6, 1).rotateZ(Math.PI / 2), mat4(x + 0.5, 0.05, z + 0.5 + dz, 0, [1, 0.55, 1])); rows++; }
  mg.build(g);
  // ---------------- 水車（川のマス。パックの waterwheel を回す）
  const mill = o.mill; const wz = mill.y + Math.min(2.5, mill.h / 2);
  const pivot = new THREE.Group(); pivot.position.set(o.wx + 0.55, 1.0, wz); pivot.rotation.y = Math.PI / 2;
  const spin = new THREE.Group(); spin.add(await kit(ctx, 'waterwheel', [{ x: 0, y: -1.51, z: 0 }])); pivot.add(spin); g.add(pivot);
  ctx.scene.animated.push({ kind: 'spin', obj: spin, speed: 0.5 });
  // 光：大樹の下の灯り（夕方・夜に道を照らす）
  ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, 2.2, cz + 1.4), color: 0xffc070, power: 0.8, dist: 7 });
  ctx.stats.furrows = rows;
  return g;
}
