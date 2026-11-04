/* =========================================================
   レシピ：鉄鎖鉱山 1階（iron_mine_1）— FLAGSHIP_SCENES 3
   目標：迷路ではなく「鉱石を掘り運ぶ場所」と分かる。入口は低く、運搬路に沿ってレール、中ほどの採掘室の奥に縦坑の見せ場
   ・壁：汎用の角の丸い柱の代わりに、マスごとに形の違う岩塊（ノイズで凹凸・地層の色）。運搬路に面した面は人が削った平らな面＋板の土留め
   ・運搬路：入口（西）→ 階段（北東）の最短の道を論理のタイルから探し、その上にレール（枕木・2本の鉄）と踏み固めた土の帯
   ・支柱：通路が2マス幅で両側が岩のところに、パックの mine_support（柱は岩のマスの上。歩けるマスに柱を立てない）
   ・見せ場：採掘室の北の岩の中に縦坑（暗い穴・木の枠・パックの ore_lift の巻上機・吊り灯）。論理では岩のマス（歩けない）
   ・鉱脈：ore のマスのまわりと岩の面に、橙の鉱石の粒（low では光らせない）
   ・入口：西の端に木の坑口（低い梁）
   論理のタイル・NPC・宝箱・階段・イベントは変えない（見た目だけ）
   ========================================================= */
import * as THREE from 'three';
import { kit, mat, plain, Merge, worldUV, mat4, rng } from '../EnvKit3D.js';

const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function vnoise(x, y, z) {   // 値ノイズ（世界座標だけで決まる＝隣の岩塊と同じ場所は同じ値）
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi; const s = (t) => t * t * (3 - 2 * t);
  const L = (a, b, t) => a + (b - a) * t; const u = s(xf), v = s(yf), w = s(zf);
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
const WALLS = { cave_wall: 1, torch: 1, ore: 1 };

export const recipe = {
  id: 'iron_mine_1.v1',
  async prepare(ctx) {
    const map = ctx.map; const W = map.w, H = map.h;
    const exits = (map.warps || []).filter((q) => q && q.to);
    const start = exits.find((q) => q.to === 'world_grania'), goal = exits.find((q) => q.to === 'iron_mine_2');
    if (!start || !goal) throw new Error('入口・階段のワープがない');
    // 運搬路：入口 → 階段の最短の道（論理のタイルで歩けるマス）
    const walk = (x, z) => x >= 0 && z >= 0 && x < W && z < H && !window.Tiles.isSolid(map.tile(x, z));
    const prev = new Map(); const key = (x, z) => x + ',' + z; const q = [[start.x, start.y]]; prev.set(key(start.x, start.y), null);
    while (q.length) { const [x, z] = q.shift(); if (x === goal.x && z === goal.y) break; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (!walk(nx, nz) || prev.has(key(nx, nz))) continue; prev.set(key(nx, nz), [x, z]); q.push([nx, nz]); } }
    if (!prev.has(key(goal.x, goal.y))) throw new Error('入口から階段へ歩いて行けない（論理のタイル）');
    const route = []; let cur = [goal.x, goal.y]; while (cur) { route.unshift(cur); cur = prev.get(key(cur[0], cur[1])); }
    const shaft = { x0: 15, x1: 18, z0: 6, z1: 7 };   // 縦坑（岩のマス）
    for (let z = shaft.z0; z <= shaft.z1; z++) for (let x = shaft.x0; x <= shaft.x1; x++) if (!WALLS[map.tile(x, z)]) throw new Error('縦坑の場所が岩ではない ' + x + ',' + z);
    const hooks = { skipWall: (t, x, z) => t === 'cave_wall' || t === '_void' };
    return { hooks, build: (b) => build(ctx, b, { route, shaft }) };
  }
};

async function build(ctx, b, o) {
  const map = ctx.map, W = map.w, H = map.h, hi = ctx.quality !== 'low'; const r = rng(77123);
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_void' : map.tile(x, z));
  const solid = (x, z) => !!WALLS[T(x, z)] || T(x, z) === '_void';
  const open = (x, z) => x >= 0 && z >= 0 && x < W && z < H && !window.Tiles.isSolid(T(x, z));
  const g = new THREE.Group(); g.name = 'env_iron_mine_1'; b.root.add(g);
  const onRoute = new Set(o.route.map(([x, z]) => x + ',' + z)); const nearRoute = (x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => onRoute.has((x + dx) + ',' + (z + dz)));
  const inShaft = (x, z) => x >= o.shaft.x0 && x <= o.shaft.x1 && z >= o.shaft.z0 && z <= o.shaft.z1;
  // 岩の材質：パックの rock_basalt（画像）＋頂点の色（地層の帯）
  const rockBase = await mat(ctx, 'rock_basalt', { repeat: 2.5 });
  const rock = rockBase.clone(); rock.vertexColors = true; rock.color = new THREE.Color('#ffffff'); rock.name = 'env_mine_rock';
  const oak = await mat(ctx, 'wood_oak', { repeat: 1.5, color: '#8a6a48' }); const oakD = await mat(ctx, 'wood_oak', { repeat: 1.5, color: '#5a4430' });
  const iron = await mat(ctx, 'metal_industrial', { repeat: 1, color: '#9aa0a8' });
  const dirt = plain('#4a3c30', { std: { roughness: 1 } }); const pit = plain('#050403', { std: { roughness: 1 }, noCutout: true });
  const oreM = plain('#d07a2a', hi ? { emissive: '#ff8a2a', ei: 0.55, std: { roughness: 0.5, metalness: 0.4 } } : { std: { roughness: 0.5, metalness: 0.4 } });
  const mg = new Merge();
  // ---------------- 岩塊
  const band = (y) => 1.35 + 0.25 * Math.sin(y * 3.1 + 0.6) + 0.2 * vnoise(y * 4, 0, 0);   // 地層の明暗（画像の暗さを持ち上げる）
  let chunks = 0;
  for (let z = -1; z <= H; z++) for (let x = -1; x <= W; x++) {
    if (!solid(x, z) || inShaft(x, z)) continue;
    const adj = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dz]) => open(x + dx, z + dz)); if (!adj) continue;
    const front = open(x, z - 1) && !open(x, z + 1);          // カメラ側（南）の壁は低く（中が見える）
    const worked = nearRoute(x, z);                           // 運搬路に面した、人が削った面
    const h = front ? 0.75 + vnoise(x, 0, z) * 0.25 : (worked ? 2.5 : 2.6 + vnoise(x * 0.7, 1, z * 0.7) * 0.9);
    const seg = hi ? 3 : 2; const geo = new THREE.BoxGeometry(1.12, h, 1.12, seg, Math.max(2, Math.round(h * (hi ? 2 : 1))), seg);
    const p = geo.attributes.position; const col = new Float32Array(p.count * 3);
    const LIM = 0.06, oE = open(x + 1, z), oW = open(x - 1, z), oS = open(x, z + 1), oN = open(x, z - 1), oD = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dz]) => [dx, dz, open(x + dx, z + dz)]);
    for (let i = 0; i < p.count; i++) {
      const lx = p.getX(i), ly = p.getY(i) + h / 2, lz = p.getZ(i); const wx = x + 0.5 + lx, wz = z + 0.5 + lz;
      const amp = worked ? 0.06 : 0.26; const n1 = vnoise(wx * 1.7, ly * 1.3, wz * 1.7) - 0.5, n2 = vnoise(wx * 1.7 + 9, ly * 1.3 + 3, wz * 1.7 + 5) - 0.5;
      let nx = wx + n1 * amp * 2, nz = wz + n2 * amp * 2, ny = ly;
      // 歩けるマスへはみ出さない（境から 0.06 まで）。斜めのとなりが歩けるときは角を引っ込める
      if (oE) nx = Math.min(nx, x + 1 + LIM); if (oW) nx = Math.max(nx, x - LIM); if (oS) nz = Math.min(nz, z + 1 + LIM); if (oN) nz = Math.max(nz, z - LIM);
      for (const [dx, dz, on] of oD) if (on) { const ox = dx > 0 ? nx - (x + 1) : x - nx, oz = dz > 0 ? nz - (z + 1) : z - nz; if (ox > LIM && oz > LIM) { if (ox < oz) nx = dx > 0 ? x + 1 + LIM : x - LIM; else nz = dz > 0 ? z + 1 + LIM : z - LIM; } }
      if (ly > h - 0.05) ny = ly + (vnoise(wx * 2.3, 7, wz * 2.3) - 0.5) * (front ? 0.2 : 0.55);   // 天井側はぎざぎざ
      p.setXYZ(i, nx - (x + 0.5), ny - h / 2, nz - (z + 0.5));
      const k = band(ny) * (0.85 + 0.3 * vnoise(wx * 3, ny * 3, wz * 3)) * (worked ? 1.12 : 1); col[i * 3] = k * 1.05; col[i * 3 + 1] = k * 0.93; col[i * 3 + 2] = k * 0.8;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); worldUV(geo, 2.5);
    mg.add(rock, geo, mat4(x + 0.5, h / 2 - 0.08, z + 0.5)); chunks++;
    // 削った面：板の土留め（運搬路に面した、高い壁だけ）
    if (worked && !front && hi && r() < 0.55) for (const [dx, dz] of [[1, 0], [-1, 0], [0, -1]]) if (onRoute.has((x + dx) + ',' + (z + dz))) {
      for (let k2 = 0; k2 < 3; k2++) mg.add(oakD, new THREE.BoxGeometry(dx ? 0.05 : 0.9, 0.16, dz ? 0.05 : 0.9), mat4(x + 0.5 + dx * 0.53, 0.5 + k2 * 0.42, z + 0.5 + dz * 0.53));
    }
    // 鉱脈の粒
    if ((T(x, z) === 'ore' || r() < 0.08) && !front) for (let k2 = 0; k2 < (T(x, z) === 'ore' ? 7 : 3); k2++) {
      const a = r() * 6.28; mg.add(oreM, new THREE.OctahedronGeometry(0.07 + r() * 0.08, 0), mat4(x + 0.5 + Math.cos(a) * 0.56, 0.4 + r() * 1.6, z + 0.5 + Math.sin(a) * 0.56, r() * 3, 1, r() * 3));
    }
  }
  // ---------------- 運搬路：踏み固めた土の帯・レール（枕木と2本の鉄）
  const route = o.route;
  for (let i = 0; i < route.length; i++) {
    const [x, z] = route[i]; const cx = x + 0.5, cz = z + 0.5; const nb = route[i + 1] || route[i - 1]; const horiz = nb && nb[1] === z;
    mg.add(dirt, new THREE.BoxGeometry(horiz ? 1.02 : 0.8, 0.02, horiz ? 0.8 : 1.02), mat4(cx, 0.012, cz));
    for (let s = 0; s < 3; s++) { const off = -0.33 + s * 0.33; mg.add(oakD, new THREE.BoxGeometry(horiz ? 0.1 : 0.62, 0.04, horiz ? 0.62 : 0.1), mat4(cx + (horiz ? off : 0), 0.04, cz + (horiz ? 0 : off))); }
    for (const sd of [-0.2, 0.2]) mg.add(iron, new THREE.BoxGeometry(horiz ? 1.02 : 0.05, 0.05, horiz ? 0.05 : 1.02), mat4(cx + (horiz ? 0 : sd), 0.075, cz + (horiz ? sd : 0)));
  }
  // ---------------- 坑口（西の入口）：低い梁と柱（柱は岩のマスの上）
  const ent = route[0];
  if (ent) { for (const dz of [-1, 2]) if (solid(ent[0], ent[1] + dz)) mg.add(oak, new THREE.BoxGeometry(0.3, 2.1, 0.3), mat4(ent[0] + 0.5, 1.05, ent[1] + 0.5 + dz + (dz > 0 ? -0.3 : 0.3)));   // 柱は入口の上下の岩のマスの中
    mg.add(oak, new THREE.BoxGeometry(0.35, 0.3, 3.3), mat4(ent[0] + 0.5, 2.05, ent[1] + 1)); }
  // ---------------- 縦坑の見せ場（岩のマス。歩けない）
  const S = o.shaft; const sx = (S.x0 + S.x1 + 1) / 2, sz = (S.z0 + S.z1 + 1) / 2;
  mg.add(pit, new THREE.BoxGeometry(S.x1 - S.x0 + 1, 0.02, S.z1 - S.z0 + 1), mat4(sx, -0.02, sz));
  for (const dz of [S.z0, S.z1 + 1]) mg.add(oak, new THREE.BoxGeometry(S.x1 - S.x0 + 1.2, 0.3, 0.3), mat4(sx, 0.15, dz));
  for (const dx of [S.x0, S.x1 + 1]) mg.add(oak, new THREE.BoxGeometry(0.3, 0.3, S.z1 - S.z0 + 1.2), mat4(dx, 0.15, sz));
  for (let k2 = 0; k2 < 4; k2++) mg.add(oakD, new THREE.BoxGeometry(S.x1 - S.x0 + 0.9, 0.12, 0.12), mat4(sx, -0.6 - k2 * 0.7, S.z0 + 0.1));   // 縦坑の中の段（暗い穴の奥行き）
  mg.add(plain('#3a3632', { std: { roughness: 1 } }), new THREE.BoxGeometry(S.x1 - S.x0 + 1, 3.2, 0.2), mat4(sx, -1.6, S.z0 + 0.02));
  mg.build(g);
  // ---------------- パックの部品：巻上機（縦坑の上）・支柱（2マス幅の通路を両側の岩で支える）・トロッコ
  g.add(await kit(ctx, 'ore_lift', [{ x: sx, y: 0.1, z: sz }]));
  const supports = []; const seen = new Set();
  route.forEach(([x, z], i) => {
    if (i % 4 !== 2) return; const nb = route[i + 1] || route[i - 1]; const horiz = !!nb && nb[1] === z;   // 通路が東西に延びる
    const ax = horiz ? 0 : 1, az = horiz ? 1 : 0;   // 通路を横切る向き
    let c = null;   // 柱は ±1.26（通路の外の岩のマスの中）。2マス幅なら2マスの境目を中心に、1マス幅ならそのマスを中心に
    if (open(x + ax, z + az) && solid(x - ax, z - az) && solid(x + 2 * ax, z + 2 * az)) c = [x + 0.5 + ax * 0.5, z + 0.5 + az * 0.5];
    else if (open(x - ax, z - az) && solid(x + ax, z + az) && solid(x - 2 * ax, z - 2 * az)) c = [x + 0.5 - ax * 0.5, z + 0.5 - az * 0.5];
    else if (solid(x + ax, z + az) && solid(x - ax, z - az)) c = [x + 0.5, z + 0.5];
    const k = c && Math.round(c[0] * 2) + ',' + Math.round(c[1] * 2);
    if (c && !seen.has(k)) { seen.add(k); supports.push({ x: c[0], z: c[1], ry: horiz ? Math.PI / 2 : 0, s: [0.9, 0.95, 1] }); }
  });
  g.add(await kit(ctx, 'mine_support', supports));
  // 灯：支柱の吊り灯（暖色）・縦坑の灯
  const L = ctx.scene.lampSpots; supports.forEach((s, i) => { if (hi || i % 2 === 0) L.push({ pos: new THREE.Vector3(s.x, 2.1, s.z), color: 0xffa04a, power: 0.8, dist: 6 }); });
  L.push({ pos: new THREE.Vector3(sx, 2.6, sz + 0.6), color: 0xffb860, power: 1.2, dist: 8 });
  ctx.stats.meshes = chunks; ctx.stats.supports = supports.length; ctx.stats.route = route.length;
  return g;
}
