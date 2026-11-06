/* =========================================================
   Furniture81（v8.1）：町・村・城・学院の作り直し（js/rpg/remake81.js）で足した家具と床の形（見た目だけ。当たり判定は 2D 版のタイル）
   ・target（稽古の的）・hearth（低い炉。石の輪・灰・薪・おき火）・rack（壁の道具かけ：弓・槍・斧・毛皮）
   ・armillary（天球儀：台と真鍮の輪。ゆっくり回る。js/data/remake81-academy.js の発見で速く回る）
   ・blackboard（黒板）・instrument（計器の台：目盛り・画面・つまみ）・meridian（床に埋めた子午線の真鍮の線）
   ・光は炉と天球儀だけ（数を増やさない）。形は 1 つの Batch にまとめる（回る天球儀の輪だけ別の物）
   ・向き：歩けるとなりのマスの方（手前＝南を優先）を正面にする（道具かけ・黒板は壁を背にする）
   ========================================================= */
import * as THREE from 'three';
import { addCutout } from '../engine/Cutout.js';
import { Batch, box, M4 } from '../engine/Materials.js';

const MAT = new Map();
function mat(hex, o) {
  o = o || {}; const key = hex + '|' + [o.rough, o.metal, o.glow].join(','); if (MAT.has(key)) return MAT.get(key);
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: o.rough !== undefined ? o.rough : 0.75, metalness: o.metal || 0 });
  if (o.glow) { m.emissive = new THREE.Color(hex); m.emissiveIntensity = o.glow; m.userData.keepGlow = true; }
  m.name = 'furn81_' + key; addCutout(m); MAT.set(key, m); return m;   /* 主人公の手前では網目に抜く */
}
const KINDS = { target: 1, hearth: 1, rack: 1, armillary: 1, blackboard: 1, instrument: 1, meridian: 1 };
export function buildFurniture81(map, heightAt) {
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H) ? 'wall' : map.tile(x, z);
  const walk = (x, z) => !window.Tiles.isSolid(T(x, z));
  let any = false; for (let z = 0; z < H && !any; z++) for (let x = 0; x < W; x++) if (KINDS[T(x, z)]) { any = true; break; }
  if (!any) return null;
  const b = new Batch(); const g = new THREE.Group(); g.name = 'furniture81'; const lamps = []; const animated = []; const stats = {};
  const wood = mat('#7a4e26', { rough: 0.85 }), dark = mat('#3a2614', { rough: 0.9 }), straw = mat('#d8c070', { rough: 1 }), red = mat('#c03828', { rough: 0.8 }), cream = mat('#f0e6c8', { rough: 0.9 });
  const stone = mat('#8a8680', { rough: 0.95 }), ash = mat('#2a2624', { rough: 1 }), ember = mat('#ff7a2a', { glow: 1.6 }), iron = mat('#8a8a92', { rough: 0.4, metal: 0.6 });
  const brass = mat('#c8a050', { rough: 0.35, metal: 0.8 }), brassGlow = mat('#e8c870', { rough: 0.3, metal: 0.6, glow: 0.25 }), board = mat('#26402e', { rough: 0.95 }), chalk = mat('#e8e8e0', { rough: 1 });
  const screen = mat('#5affb0', { glow: 1.1 }), glass = mat('#9ad8ff', { glow: 0.9 }), fur = mat('#8a6a48', { rough: 1 });
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = T(x, z); if (!KINDS[t]) continue; stats[t] = (stats[t] || 0) + 1;
    let yaw = 0; for (const [dx, dz, a] of [[0, 1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, -1, Math.PI]]) { if (walk(x + dx, z + dz)) { yaw = a; break; } }
    const cx = x + 0.5, cz = z + 0.5, y = heightAt ? heightAt(cx, cz) : 0;
    const base = new THREE.Matrix4().makeTranslation(cx, y, cz).multiply(new THREE.Matrix4().makeRotationY(yaw));
    const P = (m, geo, lx, ly, lz, ry, rx, rz) => b.add(m, geo, base.clone().multiply(M4(lx, ly, lz, ry || 0, rx || 0, rz || 0)));
    if (t === 'target') {
      P(dark, box(0.5, 0.12, 0.3), 0, 0.06, 0); P(wood, box(0.1, 1.05, 0.1), 0, 0.55, -0.02);
      const disc = (r, m, dz) => { const c = new THREE.CylinderGeometry(r, r, 0.07, 24); c.rotateX(Math.PI / 2); P(m, c, 0, 1.05, 0.04 + dz); };
      disc(0.4, straw, 0); disc(0.29, red, 0.01); disc(0.18, cream, 0.02); disc(0.08, red, 0.03);
      P(wood, box(0.06, 0.06, 0.4), 0.18, 1.0, 0.25, 0, 0.25); P(cream, box(0.02, 0.02, 0.12), 0.18, 1.02, 0.47, 0, 0.25);   // 刺さった矢
    } else if (t === 'hearth') {
      const n = 10; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; P(stone, box(0.2, 0.16, 0.14), Math.cos(a) * 0.38, 0.08, Math.sin(a) * 0.38, -a); }
      const bed = new THREE.CylinderGeometry(0.34, 0.36, 0.05, 20); P(ash, bed, 0, 0.03, 0);
      const lg = new THREE.CylinderGeometry(0.05, 0.06, 0.55, 8); lg.rotateZ(Math.PI / 2); P(dark, lg, 0, 0.1, -0.05, 0.5); P(dark, lg, 0, 0.1, 0.06, -0.6);
      for (const [ex, ez] of [[-0.08, 0.02], [0.06, -0.06], [0.1, 0.08], [-0.02, -0.1]]) P(ember, box(0.08, 0.05, 0.08), ex, 0.1, ez, ex * 3);
      P(iron, box(0.04, 0.8, 0.04), -0.32, 0.4, 0); P(iron, box(0.04, 0.8, 0.04), 0.32, 0.4, 0); P(iron, box(0.7, 0.04, 0.04), 0, 0.8, 0);   // 鍋をかける棒
      const pot = new THREE.CylinderGeometry(0.13, 0.1, 0.18, 12); P(dark, pot, 0, 0.6, 0);
      lamps.push({ pos: new THREE.Vector3(cx, y + 0.7, cz), color: 0xff9a4a, power: 1.0, dist: 5 });
    } else if (t === 'rack') {
      const zb = -0.32;   // 壁ぎわ（奥）
      P(wood, box(0.08, 1.7, 0.08), -0.4, 0.85, zb); P(wood, box(0.08, 1.7, 0.08), 0.4, 0.85, zb); P(wood, box(0.9, 0.07, 0.08), 0, 1.45, zb); P(wood, box(0.9, 0.07, 0.08), 0, 0.75, zb);
      const bow = new THREE.TorusGeometry(0.32, 0.025, 6, 16, Math.PI); bow.rotateZ(Math.PI / 2); P(wood, bow, -0.18, 1.1, zb + 0.08);
      P(iron, box(0.03, 1.3, 0.03), 0.05, 0.85, zb + 0.06); P(iron, box(0.07, 0.16, 0.03), 0.05, 1.55, zb + 0.06);   // 槍
      P(wood, box(0.04, 0.6, 0.04), 0.27, 1.05, zb + 0.07); P(iron, box(0.16, 0.12, 0.03), 0.33, 1.3, zb + 0.07);   // 斧
      P(fur, box(0.34, 0.42, 0.03), -0.05, 0.45, zb + 0.06); P(straw, box(0.12, 0.2, 0.06), 0.3, 0.45, zb + 0.07);   // 毛皮・干した薬草
    } else if (t === 'armillary') {
      const ped = new THREE.CylinderGeometry(0.16, 0.26, 0.6, 12); P(stone, ped, 0, 0.3, 0); P(brass, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), 0, 0.62, 0);
      P(brass, box(0.04, 0.5, 0.04), 0, 0.85, 0);
      const sp = new THREE.Group(); sp.name = 'armillary81_' + x + '_' + z; sp.position.set(cx, y + 1.25, cz);
      const ringM = [brass, brassGlow, brass];
      [[0, 0], [Math.PI / 2, 0], [Math.PI / 2, Math.PI / 3]].forEach((r, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.42 - i * 0.05, 0.022, 6, 40), ringM[i]); m.rotation.set(r[0], r[1], 0.4 * i); m.geometry.userData.own = true; sp.add(m); });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glass); core.geometry.userData.own = true; sp.add(core);
      const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), brass); ax.rotation.z = 0.41; ax.geometry.userData.own = true; sp.add(ax);
      g.add(sp); animated.push({ kind: 'armillary81', obj: sp, speed: 0.25 });
      lamps.push({ pos: new THREE.Vector3(cx, y + 1.4, cz + 0.3), color: 0x9ad8ff, power: 0.6, dist: 4 });
    } else if (t === 'blackboard') {
      const zb = -0.3; P(wood, box(0.98, 0.9, 0.06), 0, 1.35, zb); P(board, box(0.88, 0.78, 0.07), 0, 1.35, zb + 0.01);
      for (const [lx, ly, lw] of [[-0.2, 1.55, 0.36], [0.05, 1.42, 0.6], [-0.1, 1.28, 0.42], [0.12, 1.14, 0.3]]) P(chalk, box(lw, 0.02, 0.02), lx, ly, zb + 0.05);
      P(wood, box(0.9, 0.04, 0.12), 0, 0.95, zb + 0.05); P(wood, box(0.06, 0.9, 0.06), -0.42, 0.45, zb); P(wood, box(0.06, 0.9, 0.06), 0.42, 0.45, zb);
    } else if (t === 'instrument') {
      P(iron, box(0.9, 0.08, 0.7), 0, 0.78, 0); P(dark, box(0.84, 0.74, 0.62), 0, 0.37, 0);
      P(dark, box(0.4, 0.34, 0.1), -0.18, 1.0, -0.2); P(screen, box(0.32, 0.24, 0.02), -0.18, 1.0, -0.14);
      for (let i = 0; i < 3; i++) { const dial = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 14); dial.rotateX(Math.PI / 2); P(i === 1 ? brass : iron, dial, 0.12 + i * 0.12, 0.9, -0.12); }
      P(glass, box(0.05, 0.05, 0.05), 0.3, 0.85, 0.2); P(mat('#ff6060', { glow: 1.0 }), box(0.05, 0.05, 0.05), 0.18, 0.85, 0.2);
      const coil = new THREE.TorusGeometry(0.1, 0.02, 6, 16); coil.rotateX(Math.PI / 2); P(brass, coil, 0.25, 0.86, 0.05);
    } else if (t === 'meridian') {
      const along = (T(x - 1, z) === 'meridian' || T(x + 1, z) === 'meridian') && !(T(x, z - 1) === 'meridian' || T(x, z + 1) === 'meridian');
      b.add(brassGlow, box(along ? 1.0 : 0.14, 0.02, along ? 0.14 : 1.0), M4(cx, y + 0.012, cz));
      if ((x + z) % 3 === 0) b.add(brass, box(0.32, 0.015, 0.05), M4(cx, y + 0.014, cz, along ? Math.PI / 2 : 0));   // 目盛り
    }
  }
  b.build(g); g.userData.stats = stats; g.userData.lamps = lamps; g.userData.animated = animated;
  return g;
}
