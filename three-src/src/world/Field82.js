/* =========================================================
   Field82（v8.2）：フィールドの目印の作り直し
   ・magicka_city（world_magicka）：浮遊都市。地上の発動の陣（入口のマス＝これまでと同じ入口・着く所）から、独立した石の踏み板が一段ずつ宙に浮いて
     らせんに上がり、浮いた岩盤の上に複数の街区（煤けた煉瓦・深緑の屋根・煙突の古いロンドン風）と高い魔導宮殿。岩盤の下は空いていて、根と結晶と光る紋
     ・依頼：「独立した石の踏み板が一段ずつ宙に浮き、浮いた岩盤・複数街区・高い魔導宮殿；岩盤下の空間；ロンドン風意匠；入口地点・到着点・フラグ・乗り物条件維持；
       地上の発動地点から入れる；宙の階段で止まらない」
     ・踏み板は見た目だけ（当たり判定なし）。歩いて登らない（入口のマスに触れると、これまでどおり町へ入る）＝宙の階段で止まらない
   ・demon_castle（world_dark）・iron_fort（world_grania）：大きな城の輪郭（Castle82 の魔王城・鉄の砦の形を小さくして置く）
   ・どれも入口のマスの北（奥）に置き、入口のマスと、そのまわりの歩けるマスには形を置かない（入口の陣は地面すれすれ）
   ========================================================= */
import * as THREE from 'three';
import { plain, Merge } from '../environment/EnvKit3D.js';
import { buildCastle82 } from './Castle82.js';

const M = (hex, o) => { o = o || {}; return plain(hex, { std: { roughness: o.r !== undefined ? o.r : 0.85, metalness: o.m || 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }, emissive: o.glow ? (o.gc || hex) : undefined, ei: o.glow || undefined, keepGlow: !!o.glow, window: !!o.win }); };
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
function hash(i, k) { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }

export const FIELD82 = { magicka_city: 'floating', demon_castle: 'demon', iron_fort: 'iron' };

// 浮遊都市。(cx, cz)：入口のマスの中心。y0：地面の高さ
export function buildFloating82(cx, y0, cz) {
  const g = new THREE.Group(); g.name = 'floating82_magicka'; const mg = new Merge(); const add = (m, gg) => mg.add(m, gg); const mgNo = new Merge(); const addNo = (m, gg) => mgNo.add(m, gg);
  const lights = [], animated = [];
  const RX = cx, RZ = cz - 2.5, RY = y0 + 5.6, RR = 4.6;   // 岩盤の中心（入口の北 2.5 マス・高さ 5.6）。フィールドのいつものカメラ（上から斜め）で入口の南から全体が見える所。岩盤の下の先は高さ 2.3 より上（人の頭の上）
  // ---- 地上の発動の陣（入口のマス。地面すれすれ）
  const rune = M('#9ab8ff', { glow: 1.4 }); const ringG = new THREE.RingGeometry(0.75, 0.9, 32); ringG.rotateX(-Math.PI / 2); ringG.translate(cx, y0 + 0.04, cz); addNo(rune, ringG);
  const ring2 = new THREE.RingGeometry(0.4, 0.47, 6); ring2.rotateX(-Math.PI / 2); ring2.translate(cx, y0 + 0.045, cz); addNo(rune, ring2);
  lights.push({ pos: new THREE.Vector3(cx, y0 + 1.2, cz), color: 0x9ab8ff, power: 0.9, dist: 6 });
  // ---- 浮く踏み板（16 段。らせんに上がって岩盤のふちへ）。1 枚ずつ別の物（ゆっくり上下）
  const stepM = M('#8a8078', { r: 0.95 }), stepTop = M('#a8a098', { r: 0.9 }), stepRune = M('#9ab8ff', { glow: 1.2 });
  const N = 14; const sx0 = cx + 0.9, sz0 = cz + 0.2;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1); const ang = -0.6 + t * 3.6; const rad = 3.2 - t * 0.6; const px = sx0 + (RX + Math.cos(ang) * (RR + 0.8) - sx0) * t + Math.sin(t * Math.PI) * 1.6, pz = sz0 + (RZ + Math.sin(ang) * (RR + 0.8) * 0.6 - sz0) * t + Math.sin(t * Math.PI) * 0.8;
    const py = y0 + 2.05 + t * (RY - y0 - 2.15);   // いちばん下の踏み板も人の頭の上（2.05）：陣の上に浮かぶ
    const s = new THREE.Group(); s.position.set(px, py, pz);
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.38, 0.32, 7), stepM); slab.geometry.userData.own = true; slab.castShadow = true; s.add(slab);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 7), stepTop); top.position.y = 0.17; top.geometry.userData.own = true; s.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 6), stepM); under.rotation.x = Math.PI; under.position.y = -0.45; under.geometry.userData.own = true; s.add(under);
    if (i % 3 === 0) { const rr = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 12), stepRune); rr.rotation.x = -Math.PI / 2; rr.position.y = 0.2; rr.geometry.userData.own = true; s.add(rr); }
    g.add(s); animated.push({ kind: 'bob', obj: s, base: py, ph: i * 0.7, amp: 0.06 });
  }
  // ---- 浮いた岩盤（下へ尖る。ふちは不ぞろい）
  const rock = new THREE.ConeGeometry(RR, 3.2, 11, 3); const p = rock.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); const f = 1 + (hash(k, 1) - 0.5) * 0.28; p.setX(k, p.getX(k) * f); p.setZ(k, p.getZ(k) * f); if (y > 1.5) p.setY(k, y + (hash(k, 2) - 0.5) * 0.3); }
  rock.computeVertexNormals(); rock.rotateX(Math.PI); rock.translate(RX, RY - 1.6, RZ); add(M('#6e6458', { r: 1 }), rock);
  const topDisc = new THREE.CylinderGeometry(RR * 0.98, RR, 0.5, 22); topDisc.translate(RX, RY - 0.25, RZ); add(M('#5e6a4a', { r: 1 }), topDisc);
  // 岩盤の下：垂れた根・光る結晶・紋
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = RR * (0.3 + hash(i, 3) * 0.5); add(M('#4a3a2a', { r: 1 }), box(0.06, 0.5 + hash(i, 4) * 0.5, 0.06, RX + Math.cos(a) * rr * 0.7, RY - 2.4 - hash(i, 5) * 0.3, RZ + Math.sin(a) * rr * 0.7)); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; addNo(M('#9ab8ff', { glow: 1.6 }), new THREE.OctahedronGeometry(0.22, 0).scale(1, 1.8, 1).translate(RX + Math.cos(a) * 1.6, RY - 2.9, RZ + Math.sin(a) * 1.6)); }
  const under = new THREE.RingGeometry(1.2, 1.5, 24); under.rotateX(Math.PI / 2); under.translate(RX, RY - 3.25, RZ); addNo(M('#9ab8ff', { glow: 1.6, ds: true }), under);
  lights.push({ pos: new THREE.Vector3(RX, RY - 3.0, RZ), color: 0x9ab8ff, power: 1.1, dist: 9 });
  // ---- 街区（煤けた煉瓦・深緑の屋根・煙突・出窓）：岩盤の南・東・西の 3 つのかたまりと、間の石畳
  const brick = M('#6a3a2e', { r: 0.95 }), brick2 = M('#5a2e26', { r: 0.95 }), roofG = M('#2e4a3e', { r: 0.8 }), chim = M('#3a2a24', { r: 0.9 }), win = M('#2a1a10', { glow: 1.2, gc: '#ffc27a', win: true }), street = M('#8a8478', { r: 0.95 });
  const pave = new THREE.CylinderGeometry(RR * 0.92, RR * 0.92, 0.06, 22); pave.translate(RX, RY + 0.03, RZ); add(street, pave);
  const house = (x, z, w, d, h, rot) => { const gg = new THREE.Group(); const hb = new THREE.BoxGeometry(w, h, d); hb.translate(0, h / 2, 0); const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, RY, z);
    const addT = (mat, geo) => { geo.applyMatrix4(m); add(mat, geo); }; addT((x + z) % 2 > 1 ? brick : brick2, hb);
    const rf = new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.1, h * 0.55, 4); rf.rotateY(Math.PI / 4); rf.scale(w / Math.hypot(w, d) * 1.42, 1, d / Math.hypot(w, d) * 1.42); rf.translate(0, h + h * 0.27, 0); addT(roofG, rf);
    addT(chim, (() => { const c = new THREE.BoxGeometry(0.3, 1.0, 0.3); c.translate(w * 0.3, h + 0.6, 0); return c; })());
    for (let k = 0; k < 2; k++) { const wg = new THREE.BoxGeometry(0.3, 0.42, 0.04); wg.translate(-w * 0.25 + k * w * 0.5, h * 0.55, d / 2 + 0.02); wg.applyMatrix4(m); addNo(win, wg); } };
  const DIST = [[RX - 2.3, RZ + 1.7], [RX + 2.4, RZ + 1.2], [RX - 2.6, RZ - 1.4], [RX + 0.3, RZ + 2.7]];
  DIST.forEach(([dx, dz], di) => { for (let k = 0; k < 4; k++) { const a = k * 1.6 + di; house(dx + Math.cos(a) * 1.1, dz + Math.sin(a) * 0.9, 1.0 + hash(di, k) * 0.5, 0.9 + hash(k, di) * 0.4, 1.3 + hash(di + 3, k) * 1.2, a); } });
  // ガス灯
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const x = RX + Math.cos(a) * 3.5, z = RZ + Math.sin(a) * 3.5; add(M('#2a2a2e', { r: 0.5, m: 0.6 }), box(0.06, 1.2, 0.06, x, RY + 0.6, z)); addNo(M('#ffc27a', { glow: 1.6 }), new THREE.SphereGeometry(0.1, 8, 6).translate(x, RY + 1.25, z)); }
  lights.push({ pos: new THREE.Vector3(RX, RY + 2, RZ + 3), color: 0xffc27a, power: 1.0, dist: 10 });
  // ---- 高い魔導宮殿（岩盤の北の奥。Castle82 の魔導宮殿を小さく）
  const pal = buildCastle82('magicka', { w: 9, d: 5, doorX: 4, seed: 91 }); pal.group.scale.setScalar(0.62); pal.group.position.set(RX - 2.8, RY, RZ - 3.2); g.add(pal.group);
  mg.build(g); mgNo.build(g, { shadow: false });
  return { group: g, lights, animated, footprint: { x: RX, z: RZ, r: RR + 3 } };
}

// 魔王城・鉄冠将軍の砦：大きな城の輪郭（入口のマスの北に）
export function buildFieldCastle82(style, cx, y0, cz) {
  const W = style === 'demon' ? 14 : 12, D = 7; const c = buildCastle82(style, { w: W, d: D, doorX: Math.floor(W / 2), seed: 300 + W });
  const s = 0.6; c.group.scale.setScalar(s); c.group.position.set(cx - W * s / 2, y0, cz - 1.2 - D * s); c.group.name = 'field82_' + style;
  return { group: c.group, lights: c.lights.slice(0, 1).map((l) => ({ pos: new THREE.Vector3(cx - W * s / 2 + l.x * s, y0 + l.y * s, cz - 1.2 - D * s + l.z * s), color: l.color, power: 0.9, dist: 8 })), animated: [] };
}
