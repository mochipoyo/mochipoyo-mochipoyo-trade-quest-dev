/* =========================================================
   町ごとの目印（v7.6）：EnvLayout（js/rpg/envlayout.js）が広場に置いた目印のマス（m.envLayout.landmark）に、3D の形を作る
   ・目印のマスは論理の上でも通れない（噴水・井戸・柱・木・街灯のマス）。形は、そのマスの範囲＋上（頭より高い所）にだけ出す
   ・種類：fountain 噴水／bigtree 巨木／crane 荷揚げクレーン／headframe 巻上機の櫓（車輪が回る）／colonnade 列柱と梁／well 井戸／pool 水盤／
     lighthouse 灯台（修復中の足場）／clocktower 傾いた時計塔／belltower 鐘楼と水時計／glasslamps ガラス灯／banner 破れた軍旗／forge 共同鍛冶炉（煙）／
     armillary 星図環（回る）／mirrors 鏡の天蓋／cistern 段状の貯水槽／dome 観測ドーム／bell 金の鈴
   ========================================================= */
import * as THREE from 'three';
import { kit, plain } from '../EnvKit3D.js';
import { wbox, cyl } from './geo.js';

const C = {
  stone: plain('#e2d8c4', { std: { roughness: 0.85 } }), stoneD: plain('#a89c88', { std: { roughness: 0.9 } }), water: plain('#5ab0d8', { std: { roughness: 0.1, metalness: 0.1 }, transparent: true, opacity: 0.75 }),
  wood: plain('#6e4e34', { std: { roughness: 0.85 } }), iron: plain('#3a3e44', { std: { roughness: 0.55, metalness: 0.3 } }), rust: plain('#8a4e2e', { std: { roughness: 0.8 } }),
  white: plain('#f4f2ec', { std: { roughness: 0.7 } }), red: plain('#b8433a', { std: { roughness: 0.7 } }), brass: plain('#c9a24a', { std: { roughness: 0.35, metalness: 0.6 } }),
  gold: plain('#e8c040', { std: { roughness: 0.3, metalness: 0.7 } }), leaf: plain('#4e8a3a', { std: { roughness: 0.85 } }), leaf2: plain('#6aa84a', { std: { roughness: 0.85 } }), bark: plain('#6a4a32', { std: { roughness: 0.95 } }),
  glow: plain('#fff0c8', { emissive: '#ffd890', ei: 1.4, keepGlow: true }), glass: plain('#d8f0ff', { emissive: '#a8e0ff', ei: 0.9, keepGlow: true, transparent: true, opacity: 0.7 }),
  fire: plain('#ff9a40', { emissive: '#ff7020', ei: 2.4, keepGlow: true }), mirror: plain('#dfe8f0', { std: { roughness: 0.05, metalness: 0.9 } }), cloth: plain('#7a2e2e', { std: { roughness: 0.95, side: THREE.DoubleSide } }),
  copper: plain('#4f7d6a', { std: { roughness: 0.6 } }), dark: plain('#2a2420', { std: { roughness: 0.9 } })
};

// L：{ kind, x, y, w, h }。add(m, g)：形を足す。ctx：レシピの文脈（kit・animated・lampSpots・addSmoke）。g：グループ
export async function buildLandmark(ctx, L, add, g, hAt) {
  const cx = L.x + L.w / 2, cz = L.y + L.h / 2, y0 = hAt ? hAt(cx, cz) : 0; const hw = L.w / 2 - 0.05, hd = L.h / 2 - 0.05;
  const lamp = (y, color, power) => ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, y0 + y, cz + hd + 0.6), color: color || 0xffd8a0, power: power || 1.0, dist: 9 });
  const spin = (obj, speed) => ctx.scene.animated.push({ kind: 'spin', obj, speed });
  switch (L.kind) {
    case 'fountain': case 'pool': case 'cistern': {
      const tiers = L.kind === 'cistern' ? 3 : 1;
      for (let i = 0; i < tiers; i++) { const sw = (hw * 2) * (1 - i * 0.22), sd = (hd * 2) * (1 - i * 0.22), yy = y0 + i * 0.32; add(C.stone, L.kind === 'fountain' && i === 0 ? cyl(Math.min(hw, hd) + 0.02, Math.min(hw, hd) + 0.06, 0.45, 8, cx, yy + 0.22, cz) : wbox(sw, 0.45, sd, cx, yy + 0.22, cz)); add(C.water, wbox(sw - 0.24, 0.04, sd - 0.24, cx, yy + 0.4, cz)); }
      if (L.kind === 'fountain') { add(C.stone, cyl(0.12, 0.16, 1.3, 10, cx, y0 + 1.0, cz)); add(C.stone, cyl(0.42, 0.18, 0.18, 12, cx, y0 + 1.55, cz)); add(C.water, cyl(0.36, 0.36, 0.03, 12, cx, y0 + 1.62, cz)); add(C.stone, cyl(0.05, 0.08, 0.5, 8, cx, y0 + 1.85, cz)); }
      if (L.kind === 'pool') for (const sx of [-1, 1]) add(C.white, wbox(0.22, 0.9, 0.22, cx + sx * (hw - 0.1), y0 + 0.45, cz));
      lamp(1.6, 0xcfe8ff, 0.7); break;
    }
    case 'well': { add(C.stone, cyl(0.42, 0.45, 0.6, 12, cx, y0 + 0.3, cz)); add(C.dark, cyl(0.34, 0.34, 0.02, 12, cx, y0 + 0.58, cz)); for (const sx of [-1, 1]) add(C.wood, wbox(0.08, 1.4, 0.08, cx + sx * 0.38, y0 + 0.7, cz)); add(C.wood, wbox(0.9, 0.08, 0.08, cx, y0 + 1.4, cz)); add(C.red, new THREE.ConeGeometry(0.62, 0.45, 4).rotateY(Math.PI / 4).translate(cx, y0 + 1.68, cz)); add(C.wood, cyl(0.1, 0.08, 0.16, 8, cx, y0 + 1.0, cz)); break; }
    case 'bigtree': {
      const trunk = new THREE.CylinderGeometry(0.45, 0.7, 3.2, 10); trunk.translate(cx, y0 + 1.6, cz); add(C.bark, trunk);
      for (let i = 0; i < 6; i++) { const a = i * 1.05, r = new THREE.CylinderGeometry(0.05, 0.22, 1.1, 6); r.rotateZ(Math.PI / 2 - 0.15); r.rotateY(-a); r.translate(cx + Math.cos(a) * 0.55, y0 + 0.1, cz + Math.sin(a) * 0.55); add(C.bark, r); }
      for (const [dx, y, dz, rad, m] of [[0, 4.9, 0, 2.1, C.leaf], [1.4, 4.4, 0.5, 1.6, C.leaf2], [-1.4, 4.5, 0.3, 1.7, C.leaf], [0.3, 4.2, -1.4, 1.5, C.leaf2], [-0.4, 4.0, 1.5, 1.4, C.leaf], [0, 5.9, 0, 1.3, C.leaf2]]) { const s = new THREE.IcosahedronGeometry(rad, 1); s.scale(1, 0.8, 1); s.translate(cx + dx, y0 + y, cz + dz); add(m, s); }
      break;
    }
    case 'crane': {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(C.wood, wbox(0.16, 3.4, 0.16, cx + sx * (hw - 0.15), y0 + 1.7, cz + sz * (hd - 0.15)));
      add(C.wood, wbox(hw * 2, 0.18, hd * 2, cx, y0 + 3.4, cz)); for (let k = 0; k < 3; k++) add(C.wood, wbox(hw * 2, 0.1, 0.1, cx, y0 + 0.8 + k * 0.9, cz + hd - 0.15));
      const jib = new THREE.Group(); jib.position.set(cx, y0 + 3.6, cz); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 5.2), C.wood); arm.geometry.userData.own = true; arm.position.set(0, 0.3, 1.8); arm.rotation.x = -0.18; jib.add(arm);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), C.iron); rope.geometry.userData.own = true; rope.position.set(0, -0.1, 4.0); jib.add(rope); const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), C.rust); hook.geometry.userData.own = true; hook.position.set(0, -0.95, 4.0); jib.add(hook); g.add(jib); break;
    }
    case 'headframe': {
      for (const sx of [-1, 1]) { const leg = new THREE.BoxGeometry(0.2, 5.4, 0.2); leg.rotateZ(sx * 0.14); leg.translate(cx + sx * (hw - 0.45), y0 + 2.6, cz); add(C.iron, leg); }
      for (let k = 0; k < 4; k++) add(C.iron, wbox(hw * 2 - 0.4 - k * 0.15, 0.1, 0.1, cx, y0 + 0.9 + k * 1.15, cz));
      const pivot = new THREE.Group(); pivot.position.set(cx, y0 + 5.3, cz); const wheel = new THREE.Group(); pivot.add(wheel);
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.07, 6, 24), C.rust); tor.geometry.userData.own = true; wheel.add(tor); for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), C.rust); sp.geometry.userData.own = true; sp.rotation.z = k * Math.PI / 4; wheel.add(sp); }
      g.add(pivot); spin(wheel, 0.6); ctx.scene.addSmoke(new THREE.Vector3(cx + hw, y0 + 2.4, cz - hd)); break;
    }
    case 'colonnade': { const list = []; for (let i = 0; i < L.w; i++) list.push({ x: L.x + i + 0.5, y: y0, z: cz, s: [0.62, 1.25, 0.62] }); g.add(await kit(ctx, 'column_classic', list)); add(C.stone, wbox(L.w + 0.4, 0.45, 0.9, cx, y0 + 3.62, cz)); add(C.stoneD, wbox(L.w + 0.6, 0.12, 1.0, cx, y0 + 3.9, cz)); break; }
    case 'lighthouse': {
      for (let i = 0; i < 6; i++) { const r0 = 0.95 - i * 0.08, r1 = r0 - 0.08; add(i % 2 ? C.red : C.white, cyl(r1, r0, 1.0, 14, cx, y0 + 0.5 + i, cz)); }
      add(C.iron, cyl(0.62, 0.62, 0.12, 14, cx, y0 + 6.06, cz)); add(C.glass, cyl(0.42, 0.42, 0.8, 10, cx, y0 + 6.5, cz)); add(C.red, new THREE.ConeGeometry(0.55, 0.6, 12).translate(cx, y0 + 7.2, cz));
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) add(C.wood, wbox(0.06, 0.06, hd * 2 + 0.1, cx + sx * (hw - 0.05), y0 + 1.2 + k * 1.4, cz)); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(C.wood, wbox(0.08, 4.4, 0.08, cx + sx * (hw - 0.05), y0 + 2.2, cz + sz * (hd - 0.05)));   // 修復中の足場
      ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, y0 + 6.5, cz), color: 0xfff0c0, power: 1.4, dist: 14 }); break;
    }
    case 'clocktower': {
      const tg = new THREE.Group(); tg.position.set(cx, y0, cz); tg.rotation.z = 0.1; tg.rotation.x = -0.05;
      const body = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.8, 6.0, hd * 1.8), C.stoneD); body.geometry.userData.own = true; body.position.y = 3.0; tg.add(body);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), C.white); face.geometry.userData.own = true; face.position.set(0, 4.9, hd * 0.9 + 0.01); tg.add(face);
      for (const a of [0.4, 2.1]) { const hand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.02), C.dark); hand.geometry.userData.own = true; hand.position.set(Math.sin(a) * 0.18, 4.9 + Math.cos(a) * 0.18, hd * 0.9 + 0.03); hand.rotation.z = -a; tg.add(hand); }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(hw * 1.35, 1.6, 4), C.copper); roof.geometry.userData.own = true; roof.rotation.y = Math.PI / 4; roof.position.y = 6.8; tg.add(roof); g.add(tg); break;
    }
    case 'belltower': {
      add(C.stone, wbox(hw * 1.8, 4.6, hd * 1.8, cx, y0 + 2.3, cz)); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(C.stone, wbox(0.22, 1.4, 0.22, cx + sx * (hw * 0.85), y0 + 5.3, cz + sz * (hd * 0.85)));
      add(C.copper, new THREE.ConeGeometry(hw * 1.4, 1.5, 4).rotateY(Math.PI / 4).translate(cx, y0 + 6.75, cz));
      const bell = new THREE.LatheGeometry([[0, 0.55], [0.12, 0.52], [0.22, 0.4], [0.26, 0.15], [0.36, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 16); bell.translate(cx, y0 + 4.8, cz); add(C.brass, bell);
      add(C.glass, cyl(0.3, 0.3, 1.2, 12, cx, y0 + 1.8, cz + hd * 0.9 + 0.32)); add(C.brass, cyl(0.34, 0.34, 0.08, 12, cx, y0 + 2.45, cz + hd * 0.9 + 0.32));   // 水時計の筒
      lamp(3.0, 0xffe0b0, 0.8); break;
    }
    case 'glasslamps': { for (let i = 0; i < L.w; i++) for (let j = 0; j < L.h; j++) { const x = L.x + i + 0.5, z = L.y + j + 0.5; add(C.iron, cyl(0.05, 0.07, 2.2, 6, x, y0 + 1.1, z)); add(C.glass, wbox(0.34, 0.5, 0.34, x, y0 + 2.45, z)); add(C.iron, new THREE.ConeGeometry(0.28, 0.2, 4).rotateY(Math.PI / 4).translate(x, y0 + 2.8, z)); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(x, y0 + 2.4, z), color: 0xbfe8ff, power: 0.9, dist: 8 }); } break; }
    case 'banner': { add(C.wood, cyl(0.07, 0.09, 4.2, 8, cx, y0 + 2.1, cz)); add(C.iron, wbox(1.1, 0.06, 0.06, cx + 0.5, y0 + 4.0, cz)); const cl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.7, 1, 6), C.cloth); cl.geometry.userData.own = true; cl.position.set(cx + 0.55, y0 + 3.1, cz); cl.userData.sway = true; g.add(cl); add(C.stoneD, cyl(0.4, 0.5, 0.4, 10, cx, y0 + 0.2, cz)); break; }
    case 'forge': {
      add(C.stoneD, wbox(hw * 2, 1.0, hd * 2, cx, y0 + 0.5, cz)); add(C.fire, wbox(hw * 1.2, 0.06, hd * 1.2, cx, y0 + 1.02, cz)); add(C.stoneD, wbox(0.7, 3.4, 0.7, cx + hw - 0.4, y0 + 2.5, cz - hd + 0.4));
      add(C.iron, wbox(0.5, 0.3, 0.25, cx - hw + 0.4, y0 + 1.15, cz + hd - 0.3)); ctx.scene.addSmoke(new THREE.Vector3(cx + hw - 0.4, y0 + 4.3, cz - hd + 0.4)); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, y0 + 1.5, cz), color: 0xff8a40, power: 1.3, dist: 8 }); break;
    }
    case 'armillary': {
      add(C.stoneD, cyl(Math.min(hw, hd), Math.min(hw, hd) + 0.1, 0.6, 12, cx, y0 + 0.3, cz)); add(C.brass, cyl(0.08, 0.12, 1.0, 8, cx, y0 + 1.1, cz));
      const pivot = new THREE.Group(); pivot.position.set(cx, y0 + 2.4, cz); pivot.rotation.x = -Math.PI / 2; const sp = new THREE.Group(); pivot.add(sp);
      for (const [r, tx, ty] of [[0.95, 0.4, 0], [0.8, -0.5, 0.6], [0.65, 1.2, -0.3]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 36), C.brass); ring.geometry.userData.own = true; ring.rotation.set(tx, ty, 0); sp.add(ring); }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), C.glass); core.geometry.userData.own = true; sp.add(core); g.add(pivot); spin(sp, 0.25); lamp(2.4, 0xd8c8ff, 0.7); break;
    }
    case 'mirrors': {
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, x = cx + Math.cos(a) * 0.45, z = cz + Math.sin(a) * 0.45; add(C.iron, cyl(0.04, 0.05, 2.6, 6, x, y0 + 1.3, z)); const mg = new THREE.PlaneGeometry(0.7, 1.0); mg.rotateY(-a + Math.PI / 2); mg.rotateX(-0.3); mg.translate(x, y0 + 2.2, z); add(C.mirror, mg); }
      const can = new THREE.PlaneGeometry(hw * 2.6, hd * 2.6); can.rotateX(-Math.PI / 2); can.translate(cx, y0 + 3.1, cz); add(C.mirror, can); add(C.brass, wbox(hw * 2.7, 0.06, 0.06, cx, y0 + 3.08, cz)); break;
    }
    case 'dome': { add(C.stone, cyl(Math.min(hw, hd), Math.min(hw, hd), 1.4, 16, cx, y0 + 0.7, cz)); const d = new THREE.SphereGeometry(Math.min(hw, hd) - 0.02, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(cx, y0 + 1.4, cz); add(C.copper, d); add(C.dark, wbox(0.25, 0.06, Math.min(hw, hd) * 1.2, cx, y0 + 1.4 + Math.min(hw, hd) * 0.7, cz + 0.2)); add(C.brass, cyl(0.07, 0.1, 0.9, 8, cx, y0 + 2.3, cz + 0.4)); break; }
    case 'bell': { for (const sx of [-1, 1]) add(C.gold, wbox(0.16, 3.0, 0.16, cx + sx * (hw - 0.1), y0 + 1.5, cz)); add(C.gold, wbox(hw * 2, 0.18, 0.2, cx, y0 + 3.0, cz)); const bell = new THREE.LatheGeometry([[0, 0.9], [0.2, 0.85], [0.36, 0.65], [0.42, 0.25], [0.58, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 20); bell.translate(cx, y0 + 1.8, cz); add(C.gold, bell); lamp(2.6, 0xffe0a0, 1.0); break; }
    default: add(C.stone, wbox(hw * 2, 1.0, hd * 2, cx, y0 + 0.5, cz));
  }
}
