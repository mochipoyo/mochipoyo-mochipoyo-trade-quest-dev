/* =========================================================
   showpiece76b（v7.6 第2弾）：町ごとの目玉のつづき。showpiece76.js の SHOWPIECE から呼ぶ
   ・氷港シエル（ciel_port）＝氷の港：港の水に流氷（ゆっくり揺れる）・氷に閉じこめられた帆船（霜・つらら・帆）・桟橋のつらら
   ・鐘都テンプス（tempus_city）＝時計の城：北の城（鐘楼）の中央の館に大きな文字盤（針が回る）と歯車（回る）、屋根の上に鐘楼（鐘が揺れる）・
     南の門に鐘のアーチ
   ・鍛冶街イグナス（ignas_town）＝炉の町：溶岩だまりの玄武岩のふちと泡・溶岩の水路の端に溶鉱炉（光る口・煙突と煙・溶けた鉄を注ぐ樋）
   ・砂都サハル（sahar_city）＝オアシス：池のふちの砂岩・水辺のヤシ・葦と睡蓮・はねつるべ（水くみの道具）
   ・論理（タイル・当たり判定・ワープ・NPC・イベント）は変えない。形は通れないマス（水・溶岩・柵・壁）か、地図の外にだけ置く。
     門のアーチは人の頭より上（高さ 3 以上）で、柱は柵・壁のマスの上。地図の外（北・南）の背景は、このカメラの角度ではほぼ見えないため置かない
   ・形・色・大きさは見た目で決めた仮の値（実機の GPU では未確認。作業環境のヘッドレス Chromium の画像でだけ確認）
   ========================================================= */
import * as THREE from 'three';
import { plain, rng } from '../EnvKit3D.js';
import { canvasTex, wbox, cyl } from './geo.js';

const WATER = { water: 1, deep: 1, shallow: 1 };
const solidT = (t) => !!(window.Tiles && window.Tiles.isSolid(t));
const WY = -0.2;   // 水面の高さ（WorldBuilder3D の水面）

// ---------------- 共通
function jitterDisc(r, h, seg, seed) {   // ふちがでこぼこの平たい円柱（流氷・岩の台）
  const g = new THREE.CylinderGeometry(r, r * 0.92, h, seg, 1); const p = g.attributes.position; const rr = rng(seed);
  const k = []; for (let i = 0; i <= seg; i++) k.push(0.7 + rr() * 0.45);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(z, x); const j = Math.round(((a + Math.PI) / (Math.PI * 2)) * seg) % seg; const s = Math.hypot(x, z) > 1e-4 ? k[j] : 1; p.setXYZ(i, x * s, p.getY(i), z * s); }
  g.computeVertexNormals(); return g;
}
function icicles(add, mat, x0, x1, y, z, along, seed) {   // つららの列
  const r = rng(seed); for (let p = x0; p < x1; p += 0.14 + r() * 0.12) { const l = 0.08 + r() * 0.22; const c = new THREE.ConeGeometry(0.025 + r() * 0.015, l, 5); c.rotateX(Math.PI); if (along === 'x') c.translate(p, y - l / 2, z); else c.translate(z, y - l / 2, p); add(mat, c); }
}
function smokePuffs(g, x, y, z, n, col, sc, anim) {   // 煙（半透明の玉を縦に重ねる。ゆっくり上下）
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 1, transparent: true, opacity: 0.32, depthWrite: false });
  for (let i = 0; i < n; i++) { const s = (0.5 + i * 0.32) * sc; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), m); b.position.set(x + Math.sin(i * 1.7) * 0.3 * sc + i * 0.25 * sc, y + i * 0.85 * sc, z - i * 0.12 * sc); g.add(b); anim.push({ kind: 'bob', obj: b, base: b.position.y, ph: i * 0.9, amp: 0.12 * sc }); }
}

// ================= 氷港シエル：流氷・氷に閉じこめられた帆船・つらら・氷山・オーロラ
export function icePortPlan(map) {
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
  const cells = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (WATER[T(x, z)]) cells.push([x, z]);
  if (cells.length < 20) return null;
  const isW = (x, z) => !!WATER[T(x, z)];
  const near = (x, z, t, d) => { for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) if (T(x + dx, z + dz) === t) return true; return false; };
  // 帆船：水のマスが横に 7、縦に 3 つづく所（桟橋・道から離す）。西寄り
  let ship = null; for (const [x, z] of cells) { let ok = true; for (let dz = 0; dz < 3 && ok; dz++) for (let dx = 0; dx < 7; dx++) if (!isW(x + dx, z + dz) || near(x + dx, z + dz, 'road', 1) || near(x + dx, z + dz, 'dock', 1)) { ok = false; break; } if (ok && (!ship || Math.abs(x - 3) < Math.abs(ship.x - 3))) ship = { x, z }; }
  const build = (o) => {
    const { add, g, ctx } = o; const r = rng(W * 31 + H);
    const ice = plain('#e4f2fc', { std: { roughness: 0.35, metalness: 0.05 } }), iceB = plain('#a8d4f0', { std: { roughness: 0.25 } }), frost = plain('#f4f8fc', { std: { roughness: 0.7 } });
    const iceSide = plain('#7ab4dc', { std: { roughness: 0.3, transparent: false } });
    const wood = plain('#4a3426', { std: { roughness: 0.9 } }), woodL = plain('#7a5a40', { std: { roughness: 0.85 } }), sail = plain('#e8e4dc', { std: { roughness: 0.95, side: THREE.DoubleSide } });
    const shipCells = new Set(); if (ship) for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 7; dx++) shipCells.add((ship.x + dx) + ',' + (ship.z + dz));
    // 流氷（水のマスの 1/4 ほど。桟橋のそばと帆船の所は除く）
    let floes = 0; const anim = ctx.scene.animated;
    for (const [x, z] of cells) {
      if (shipCells.has(x + ',' + z) || near(x, z, 'road', 1) || near(x, z, 'dock', 1)) continue; if (r() > 0.32) continue;
      const rad = 0.22 + r() * 0.3; const fl = new THREE.Mesh(jitterDisc(rad, 0.09, 7, x * 97 + z), r() < 0.5 ? ice : iceB); fl.position.set(x + 0.3 + r() * 0.4, WY + 0.02, z + 0.3 + r() * 0.4); fl.rotation.y = r() * 6.28; fl.receiveShadow = true; g.add(fl);
      if (floes % 2 === 0) anim.push({ kind: 'bob', obj: fl, base: fl.position.y, ph: floes * 0.8, amp: 0.012 }); floes++;
    }
    // 氷に閉じこめられた帆船
    if (ship) {
      const cx = ship.x + 3.5, cz = ship.z + 1.5; const sg = new THREE.Group(); sg.position.set(cx, WY, cz); sg.rotation.y = 0.08;
      const A = (m, geo) => { const me = new THREE.Mesh(geo, m); me.castShadow = true; me.receiveShadow = true; sg.add(me); return me; };
      const hull = new THREE.BoxGeometry(5.6, 0.9, 1.5, 12, 2, 2); const hp = hull.attributes.position;
      for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i); const e = Math.max(0, (Math.abs(x) - 1.6) / 1.2); let zz = hp.getZ(i) * (1 - e * e * 0.8); if (y < 0) zz *= 0.72; hp.setXYZ(i, x, y + e * e * 0.35 + (x > 0 ? e * 0.15 : 0), zz); }
      hull.computeVertexNormals(); hull.translate(0, 0.3, 0); A(wood, hull);
      A(woodL, wbox(5.0, 0.08, 1.3, 0, 0.78, 0)); A(frost, wbox(4.6, 0.06, 1.15, -0.1, 0.83, 0));   // 甲板と積もった雪
      for (const s of [-1, 1]) { A(wood, wbox(5.2, 0.18, 0.08, 0, 0.92, s * 0.68)); A(frost, wbox(5.2, 0.05, 0.12, 0, 1.03, s * 0.68)); }
      for (const mx of [-1.1, 0.9]) { A(wood, cyl(0.07, 0.09, 4.2, 8, mx, 2.85, 0)); A(wood, wbox(0.06, 0.06, 1.9, mx, 3.6, 0)); const sl = new THREE.CylinderGeometry(0.16, 0.16, 1.8, 8); sl.rotateX(Math.PI / 2); sl.translate(mx, 3.5, 0); A(sail, sl); A(frost, wbox(0.08, 0.06, 1.7, mx, 3.68, 0)); const sp = new THREE.PlaneGeometry(1.5, 1.3, 6, 4); const q = sp.attributes.position; for (let i = 0; i < q.count; i++) { const yy = q.getY(i), xx = q.getX(i); q.setZ(i, Math.sin((yy + 0.65) * 2.2) * 0.12 + (yy < -0.3 ? (xx > 0.3 ? -0.15 : 0) : 0)); } sp.computeVertexNormals(); sp.rotateY(Math.PI / 2); sp.translate(mx + 0.06, 2.75, 0); A(sail, sp); }
      A(wood, wbox(1.0, 0.6, 1.1, -2.1, 1.2, 0)); A(frost, wbox(1.05, 0.08, 1.15, -2.1, 1.54, 0));   // 船尾の部屋
      const bs = new THREE.CylinderGeometry(0.04, 0.05, 1.6, 6); bs.rotateZ(Math.PI / 2 - 0.35); bs.translate(3.3, 1.2, 0); A(wood, bs);   // 舳先の棒
      // 氷の板（船のまわり）とつらら
      const plate = new THREE.Mesh(jitterDisc(3.6, 0.12, 12, 77), ice); plate.scale.set(1, 1, 0.55); plate.position.set(0, 0.02, 0); plate.receiveShadow = true; sg.add(plate);
      const im = []; icicles((m, geo) => im.push(geo), null, -2.4, 2.4, 0.9, 0.73, 'x', 5); icicles((m, geo) => im.push(geo), null, -2.4, 2.4, 0.9, -0.73, 'x', 9);
      im.forEach((geo) => A(iceB, geo));
      for (let i = 0; i < 5; i++) { const sh = new THREE.ConeGeometry(0.18 + r() * 0.12, 0.5 + r() * 0.5, 5); sh.translate(-2.6 + i * 1.3 + r() * 0.3, 0.25, (i % 2 ? 1 : -1) * (0.95 + r() * 0.4)); A(iceB, sh); }   // 氷の割れて立った所
      g.add(sg);
      const lan = new THREE.Mesh(wbox(0.12, 0.14, 0.12, -1.55, 1.25, 0.6), plain('#ffd890', { emissive: '#ffb850', ei: 0.9, window: true })); sg.add(lan);   // 船尾の小さな灯り（点光源なし：氷の板が白く飛ばないように）
    }
    // 桟橋（dock）の外側のつらら
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'dock') continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1]]) { if (!isW(x + dx, z + dz)) continue; if (dz) icicles(add, iceB, x + 0.05, x + 0.95, -0.02, z + 1, 'x', x * 7 + z); else icicles(add, iceB, z + 0.05, z + 0.95, -0.02, dx > 0 ? x + 1 : x, 'z', x * 5 + z); } }
    Object.assign(ctx.stats, { showpiece: { kind: 'iceport', floes, ship: ship ? [ship.x, ship.z] : null } });
  };
  return { kind: 'iceport', hooks: {}, build };
}

// ================= 鐘都テンプス：大時計塔（針・鐘・歯車が動く）と鐘のアーチ
function gear(r, teeth, th) {
  const parts = [new THREE.TorusGeometry(r, th, 6, Math.max(12, teeth * 2))];
  for (let i = 0; i < teeth; i++) { const a = i / teeth * Math.PI * 2; const b = new THREE.BoxGeometry(th * 2.2, th * 2.4, th * 1.6); b.rotateZ(a); b.translate(Math.cos(a) * (r + th * 1.2), Math.sin(a) * (r + th * 1.2), 0); parts.push(b); }
  for (let i = 0; i < 4; i++) { const s = new THREE.BoxGeometry(r * 2, th * 0.9, th * 0.9); s.rotateZ(i * Math.PI / 4); parts.push(s); }
  return parts;
}
function bellGeo(r, h) { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(r * (0.35 + 0.65 * Math.pow(t, 1.6)) + (t > 0.9 ? (t - 0.9) * r * 1.2 : 0), -t * h)); } return new THREE.LatheGeometry(pts, 16); }
export function clockTowerPlan(map) {
  // 北の城（鐘楼・type castle）の中央の館の正面に大きな文字盤（針が回る）と左右の歯車（回る）、館の屋根の上に小さな鐘楼（鐘が揺れる）。
  // 寸法は BuildingBuilder3D.castle と同じ式（外壁の高さ 4.2・中央の館 2.4）。地図の外（北）の大時計塔はカメラの角度で見えないため置かない
  const W = map.w, H = map.h; const cb = (map.buildings || []).find((b) => b.type === 'castle' && b.y <= 2) || null;
  const gate = []; for (let x = 0; x < W; x++) if (!solidT(map.tile(x, H - 1))) gate.push(x);
  const build = (o) => {
    const { add, g, ctx } = o; const anim = ctx.scene.animated;
    const stone = plain('#c8bca8', { std: { roughness: 0.9 } }), stoneD = plain('#8e8270', { std: { roughness: 0.9 } }), copper = plain('#4f8a7a', { std: { roughness: 0.6, metalness: 0.3 } }), gold = plain('#d8b050', { std: { roughness: 0.35, metalness: 0.7 } });
    const dial = plain('#f6efdc', { emissive: '#fff0c8', ei: 0.25, window: true }), ink = plain('#2a2420', { std: { roughness: 0.6 } }), brass = plain('#b8903a', { std: { roughness: 0.4, metalness: 0.6 } }), dark = plain('#2e2a28', { std: { roughness: 0.8 } });
    let clock = null;
    if (cb) {
      const x0 = cb.x + 0.15, x1 = cb.x + cb.w - 0.15, z0 = cb.y + 0.15, z1 = cb.y + cb.h - 0.55; const Wd = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, czz = (z0 + z1) / 2;
      const kw = Wd * 0.5, kd = D * 0.55, kz = czz - D * 0.1; const fz = kz + kd / 2 + 0.02; const cy = 4.2 + 1.25; const R = Math.min(0.95, kw * 0.2);
      add(stoneD, new THREE.CylinderGeometry(R + 0.2, R + 0.2, 0.12, 32).rotateX(Math.PI / 2).translate(cx, cy, fz + 0.04));   // 文字盤の台
      add(dial, new THREE.CircleGeometry(R, 40).translate(cx, cy, fz + 0.11)); add(brass, new THREE.TorusGeometry(R + 0.05, 0.06, 8, 40).translate(cx, cy, fz + 0.12));
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const l = i % 3 === 0 ? 0.2 : 0.11; const b = new THREE.BoxGeometry(i % 3 === 0 ? 0.07 : 0.045, l, 0.02); b.translate(0, R - 0.1 - l / 2, 0); b.rotateZ(-a); b.translate(cx, cy, fz + 0.12); add(ink, b); }
      for (const [l, w, sp, dz] of [[R * 0.55, 0.08, 0.03, 0.02], [R * 0.85, 0.05, 0.25, 0.04]]) { const hg = new THREE.Group(); hg.position.set(cx, cy, fz + 0.14 + dz); hg.add(new THREE.Mesh(new THREE.BoxGeometry(w, l, 0.02).translate(0, l / 2 - 0.08, 0), ink)); g.add(hg); anim.push({ kind: 'spin', obj: hg, speed: sp }); }
      add(gold, new THREE.SphereGeometry(0.07, 10, 8).translate(cx, cy, fz + 0.2));
      // 左右の歯車（館の正面。回る）
      for (const sx of [-1, 1]) { const gx = cx + sx * (R + 0.75); if (Math.abs(gx - cx) > kw / 2 - 0.2) continue; const gg = new THREE.Group(); gg.position.set(gx, cy + 0.2, fz + 0.08); gear(0.42, 10, 0.05).forEach((geo) => gg.add(new THREE.Mesh(geo, brass))); g.add(gg); anim.push({ kind: 'spin', obj: gg, speed: sx * 0.5 });
        const g2 = new THREE.Group(); g2.position.set(gx - sx * 0.12, cy - 0.62, fz + 0.1); gear(0.22, 7, 0.04).forEach((geo) => g2.add(new THREE.Mesh(geo, brass))); g.add(g2); anim.push({ kind: 'spin', obj: g2, speed: -sx * 0.95 }); }
      // 館の屋根の上の鐘楼（屋根の円錐の頂上 4.2+2.4+2.2 の少し下から）
      const by = 4.2 + 2.4 + 1.5; const bw = 0.55;
      add(stoneD, wbox(bw * 2 + 0.2, 0.16, bw * 2 + 0.2, cx, by, kz));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(stone, wbox(0.14, 1.0, 0.14, cx + sx * bw, by + 0.58, kz + sz * bw));
      add(stoneD, wbox(bw * 2 + 0.3, 0.14, bw * 2 + 0.3, cx, by + 1.14, kz)); const rf = new THREE.ConeGeometry(bw * 1.45, 1.1, 4); rf.rotateY(Math.PI / 4); rf.translate(cx, by + 1.75, kz); add(copper, rf);
      add(gold, cyl(0.03, 0.03, 0.6, 6, cx, by + 2.5, kz)); add(gold, new THREE.OctahedronGeometry(0.1, 0).translate(cx, by + 2.85, kz));
      const bell = new THREE.Group(); bell.position.set(cx, by + 1.0, kz); const bm = new THREE.Mesh(bellGeo(0.32, 0.6), plain('#b88a3a', { std: { roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide } })); bm.castShadow = true; bell.add(bm); g.add(bell); anim.push({ kind: 'swing', obj: bell });
      ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, cy, fz + 0.9), color: 0xffe0a0, power: 0.9, dist: 7 });
      clock = [cx, cy, fz];
    }
    // 南の門：鐘のアーチ（柱は柵・壁のマス。梁は高さ 3.4）
    let arch = null; if (gate.length) { const gx0 = Math.min(...gate), gx1 = Math.max(...gate) + 1; const zz = H - 0.5; const px0 = gx0 - 0.5, px1 = gx1 + 0.5;
      if (solidT(map.tile(gx0 - 1, H - 1)) && solidT(map.tile(gx1, H - 1))) {
        for (const px of [px0, px1]) { add(stone, wbox(0.5, 3.6, 0.5, px, 1.8, zz)); add(stoneD, wbox(0.64, 0.2, 0.64, px, 3.7, zz)); }
        add(stoneD, wbox(px1 - px0 + 0.6, 0.32, 0.5, (px0 + px1) / 2, 3.95, zz)); add(copper, new THREE.ConeGeometry(0.5, 0.6, 4).rotateY(Math.PI / 4).translate((px0 + px1) / 2, 4.42, zz));
        const gb = new THREE.Group(); gb.position.set((px0 + px1) / 2, 3.78, zz); const gm = new THREE.Mesh(bellGeo(0.22, 0.38), plain('#c49a48', { std: { roughness: 0.35, metalness: 0.7, side: THREE.DoubleSide } })); gb.add(gm); g.add(gb); anim.push({ kind: 'swing', obj: gb });
        arch = [gx0, gx1]; } }
    Object.assign(ctx.stats, { showpiece: { kind: 'clocktower', clock, arch } });
  };
  return { kind: 'clocktower', hooks: {}, build };
}

// ================= 鍛冶街イグナス：溶岩だまりのふち・泡、北の煙突と火山
export function forgePlan(map) {
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
  const lava = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (T(x, z) === 'lava') lava.push([x, z]);
  const build = (o) => {
    const { add, g, ctx } = o; const anim = ctx.scene.animated; const r = rng(W * 7 + H);
    const basalt = plain('#2e2a2a', { std: { roughness: 0.95, flatShading: true } }), ember = plain('#ff7a28', { emissive: '#ff5a10', ei: 2.0, keepGlow: true }), brick = plain('#7a4a3a', { std: { roughness: 0.9 } }), brickD = plain('#4a2e26', { std: { roughness: 0.9 } });
    // 溶岩だまりのふち（溶岩のマスの、溶岩でない側の辺に玄武岩）と泡
    let rims = 0, bubbles = 0;
    for (const [x, z] of lava) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = T(x + dx, z + dz); if (t === 'lava' || t === 'bridge') continue;
        const ex = x + 0.5 + dx * 0.42, ez = z + 0.5 + dz * 0.42; for (let k = 0; k < 3; k++) { const s = 0.12 + r() * 0.1; const geo = new THREE.DodecahedronGeometry(s, 0); geo.scale(1, 0.7, 1); const off = (k - 1) * 0.32; geo.translate(ex + (dz ? off : 0), -0.12 + s * 0.4, ez + (dx ? off : 0)); add(basalt, geo); rims++; } }
      if (r() < 0.35) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + r() * 0.05, 8, 6), ember); b.position.set(x + 0.25 + r() * 0.5, -0.14, z + 0.25 + r() * 0.5); g.add(b); anim.push({ kind: 'bob', obj: b, base: b.position.y, ph: r() * 6, amp: 0.04 }); bubbles++; }
    }
    // 溶岩の水路の西の端（溶岩のマス 2×2）に溶鉱炉：石の炉・光る口・煙突と煙・溶けた鉄を水路へ注ぐ樋
    let smelter = null; const L = new Set(lava.map(([x, z]) => x + ',' + z));
    const spot = lava.filter(([x, z]) => L.has((x + 1) + ',' + z) && L.has(x + ',' + (z + 1)) && L.has((x + 1) + ',' + (z + 1)) && !L.has((x - 1) + ',' + z)).sort((a, b) => b[0] - a[0] || a[1] - b[1]).find(([x, z]) => lava.filter(([xx, zz]) => zz === z && xx > x).length >= 6);
    if (spot) { const [sx0, sz0] = spot; const cx = sx0 + 1, cz = sz0 + 1;
      add(brickD, wbox(1.9, 0.3, 1.9, cx, 0.0, cz)); add(brick, wbox(1.6, 1.9, 1.6, cx, 1.1, cz)); for (let y = 0.5; y < 2.0; y += 0.45) add(brickD, wbox(1.63, 0.05, 1.63, cx, y, cz));
      add(brickD, new THREE.CylinderGeometry(0.7, 0.95, 0.9, 8).translate(cx, 2.5, cz)); add(brick, wbox(0.55, 2.6, 0.55, cx - 0.35, 4.2, cz - 0.35)); add(brickD, wbox(0.68, 0.18, 0.68, cx - 0.35, 5.5, cz - 0.35)); add(ember, wbox(0.36, 0.05, 0.36, cx - 0.35, 5.6, cz - 0.35));
      add(ember, wbox(0.7, 0.55, 0.06, cx, 0.75, cz + 0.81)); add(plain('#1a1414', { std: { roughness: 1 } }), wbox(0.9, 0.12, 0.1, cx, 1.1, cz + 0.82));   // 炉の口（光る）
      const tr = new THREE.BoxGeometry(1.2, 0.08, 0.3); tr.rotateZ(-0.25); tr.translate(cx + 1.25, 0.5, cz + 0.2); add(brickD, tr); const st = new THREE.CylinderGeometry(0.05, 0.08, 0.55, 6); st.translate(cx + 1.85, 0.12, cz + 0.2); add(ember, st);   // 樋と流れ落ちる鉄
      ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, 1.0, cz + 1.2), color: 0xff7030, power: 1.1, dist: 7 });
      smokePuffs(g, cx - 0.35, 6.2, cz - 0.35, 5, '#6a625e', 0.7, anim); smelter = [sx0, sz0]; }
    Object.assign(ctx.stats, { showpiece: { kind: 'forge', lava: lava.length, rims, bubbles, smelter } });
  };
  return { kind: 'forge', hooks: {}, build };
}

// ================= 砂都サハル：オアシス（池のふち・ヤシ・葦・睡蓮・はねつるべ）と外の砂丘
function palm(add, x, y, z, h, lean, dir, M, seed) {
  const r = rng(seed); const segs = 7; let px = x, pz = z, py = y; const dx = Math.cos(dir), dz = Math.sin(dir);
  for (let i = 0; i < segs; i++) { const t = i / segs, t1 = (i + 1) / segs; const off0 = lean * t * t, off1 = lean * t1 * t1; const x0 = x + dx * off0, z0 = z + dz * off0, x1 = x + dx * off1, z1 = z + dz * off1, y0 = y + h * t, y1 = y + h * t1;
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0); const c = new THREE.CylinderGeometry(0.075 - t * 0.02, 0.09 - t * 0.02, len, 7); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize()); c.applyQuaternion(q); c.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); add(i % 2 ? M.trunk : M.trunkD, c); px = x1; py = y1; pz = z1; }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + r() * 0.3; const L = 0.9 + r() * 0.35; const gg = new THREE.BufferGeometry(); const pts = []; const N = 6;
    for (let i = 0; i <= N; i++) { const t = i / N; const w = Math.sin(t * Math.PI) * 0.16; const fx = Math.cos(a) * L * t, fz = Math.sin(a) * L * t, fy = 0.18 * t - 0.75 * t * t; const nx = -Math.sin(a) * w, nz = Math.cos(a) * w; pts.push(px + fx + nx, py + fy, pz + fz + nz, px + fx - nx, py + fy - 0.02, pz + fz - nz); }
    const idx = []; for (let i = 0; i < N; i++) { const a0 = i * 2; idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2); } gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); gg.setIndex(idx); gg.computeVertexNormals(); add(k % 2 ? M.frond : M.frondD, gg); }
  for (let k = 0; k < 3; k++) add(M.nut, new THREE.SphereGeometry(0.06, 7, 5).translate(px + Math.cos(k * 2.1) * 0.09, py - 0.08, pz + Math.sin(k * 2.1) * 0.09));
}
export function oasisPlan(map) {
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
  const cells = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (WATER[T(x, z)]) cells.push([x, z]);
  if (!cells.length) return null; const isW = (x, z) => !!WATER[T(x, z)];
  const build = (o) => {
    const { add, g, ctx } = o; const r = rng(W * 3 + H * 17);
    const M = { trunk: plain('#8a6a46', { std: { roughness: 0.95 } }), trunkD: plain('#6e5236', { std: { roughness: 0.95 } }), frond: plain('#3e7a36', { std: { roughness: 0.8, side: THREE.DoubleSide } }), frondD: plain('#2e6430', { std: { roughness: 0.8, side: THREE.DoubleSide } }), nut: plain('#5a3e22', { std: { roughness: 0.7 } }) };
    const curb = plain('#d8b884', { std: { roughness: 0.9 } }), curbT = plain('#e8cc9a', { std: { roughness: 0.85 } }), reed = plain('#7a8a3a', { std: { roughness: 0.9, side: THREE.DoubleSide } }), pad = plain('#4e8a44', { std: { roughness: 0.8, side: THREE.DoubleSide } }), lotus = plain('#f4d0e0', { std: { roughness: 0.6 } }), pot = plain('#b86a40', { std: { roughness: 0.85 } }), wood = plain('#6a4e36', { std: { roughness: 0.9 } });
    // 池のふち（水のマスの、陸の側の辺に砂岩の縁石）
    let curbs = 0; for (const [x, z] of cells) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (isW(x + dx, z + dz) || T(x + dx, z + dz) === 'bridge') continue;
      const ex = x + 0.5 + dx * 0.43, ez = z + 0.5 + dz * 0.43; add(curb, wbox(dx ? 0.16 : 1.0, 0.32, dz ? 0.16 : 1.0, ex, -0.1, ez)); add(curbT, wbox(dx ? 0.2 : 1.02, 0.05, dz ? 0.2 : 1.02, ex, 0.08, ez)); curbs++; }
    // 池ごとの角（いちばん外の水のマス）にヤシ
    const seen = new Set(); const pools = []; for (const [x0, z0] of cells) { const k0 = x0 + ',' + z0; if (seen.has(k0)) continue; const q = [[x0, z0]]; seen.add(k0); const pc = []; while (q.length) { const [x, z] = q.pop(); pc.push([x, z]); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (z + dz); if (!seen.has(k) && isW(x + dx, z + dz)) { seen.add(k); q.push([x + dx, z + dz]); } } } pools.push(pc); }
    let palms = 0, reeds = 0, pads = 0;
    pools.forEach((pc, pi) => {
      const xs = pc.map((c) => c[0]), zs = pc.map((c) => c[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1; const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const corners = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
      corners.forEach(([ccx, ccz], k) => { const tx = ccx === x0 ? ccx + 0.35 : ccx - 0.35, tz = ccz === z0 ? ccz + 0.35 : ccz - 0.35; if (!isW(Math.floor(tx), Math.floor(tz))) return; if (k === 3 && pi % 2 === 0) return;
        palm(add, tx, -0.2, tz, 3.2 + r() * 0.9, 0.9 + r() * 0.5, Math.atan2(tz - mz, tx - mx) + Math.PI + (r() - 0.5) * 0.6, M, pi * 10 + k); palms++; });
      // 葦と睡蓮
      pc.forEach(([x, z], i) => { const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dz]) => !isW(x + dx, z + dz));
        if (edge && i % 3 === 0) { const bx = x + 0.5 + edge[0] * 0.3, bz = z + 0.5 + edge[1] * 0.3; for (let k = 0; k < 6; k++) { const h = 0.35 + r() * 0.35; const b = new THREE.PlaneGeometry(0.05, h); b.rotateY(r() * 3); b.rotateZ((r() - 0.5) * 0.4); b.translate(bx + (r() - 0.5) * 0.3, -0.2 + h / 2, bz + (r() - 0.5) * 0.3); add(reed, b); } reeds++; }
        if (!edge && i % 4 === 1) { const px = x + 0.3 + r() * 0.4, pz = z + 0.3 + r() * 0.4; const lp = new THREE.CircleGeometry(0.16, 10, 0.4, Math.PI * 2 - 0.5); lp.rotateX(-Math.PI / 2); lp.translate(px, -0.185, pz); add(pad, lp); if (i % 8 === 1) add(lotus, new THREE.IcosahedronGeometry(0.05, 0).translate(px + 0.03, -0.15, pz)); pads++; } });
    });
    // はねつるべ（いちばん大きい池の外側のふち）
    let shaduf = null; const big = pools.slice().sort((a, b) => b.length - a.length)[0];
    if (big) { const xs = big.map((c) => c[0]); const zs = big.map((c) => c[1]); const x0 = Math.min(...xs), z1 = Math.max(...zs); const sx = x0 + 0.3, sz = z1 + 0.2;
      if (isW(Math.floor(sx), Math.floor(sz))) { add(wood, cyl(0.06, 0.08, 1.7, 7, sx, 0.65, sz)); add(wood, cyl(0.06, 0.08, 1.7, 7, sx + 0.3, 0.65, sz));
        const beam = new THREE.CylinderGeometry(0.035, 0.045, 3.0, 6); beam.rotateZ(Math.PI / 2 - 0.35); beam.translate(sx + 0.15, 1.6, sz); add(wood, beam);
        add(plain('#a89a86', { std: { roughness: 0.95 } }), new THREE.DodecahedronGeometry(0.2, 0).translate(sx + 0.15 - 1.35, 1.1, sz)); add(plain('#c8b08a', { std: { roughness: 1 } }), cyl(0.008, 0.008, 1.2, 4, sx + 0.15 + 1.38, 1.5, sz)); add(pot, cyl(0.12, 0.09, 0.2, 9, sx + 0.15 + 1.38, 0.85, sz)); shaduf = [sx, sz]; } }
    Object.assign(ctx.stats, { showpiece: { kind: 'oasis', pools: pools.length, curbs, palms, reeds, pads, shaduf } });
  };
  return { kind: 'oasis', hooks: {}, build };
}
