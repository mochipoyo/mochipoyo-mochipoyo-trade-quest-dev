/* =========================================================
   showpiece76（v7.6）：町ごとの目玉（手で計画）。town_kit.js から呼ぶ
   ・リヴェル城下・職人通り（rivel_artisan）＝水路の町：石の護岸と岸の石畳・水面を下げた水路・反り橋（石のアーチ）・水車・小舟・
     護岸の灯りと花箱・水路をまたぐ洗濯物・水辺へ下りる石段
   ・魔導都マクディア（magicka_city）＝魔法の水路：光の粒が流れる水面・水晶の灯りの柱・浮かぶ光の玉・光る花の睡蓮
   ・灰鉱町ヴェルム（verum_town）＝崖の町：北の柵の外に鉱山の崖（坑道の口・トロッコの線路と貨車・足場とはしご・巻き上げの櫓・灯り）。門の先は谷の切り通し
   ・港町マリナ（harbor_town）＝灯台の港：桟橋の先の海に岩の小島と灯台（回る光）・錨を下ろした小舟・空を回るかもめ
   ・論理（タイル・当たり判定・ワープ・NPC・イベント）は変えない。形は通れないマス（水・海）か、地図の外にだけ置く
     歩く高さが変わるのは水路の町の岸の石畳（+0.08）と反り橋（最大 +0.4）だけ（WorldBuilder3D の walkY）
   ・形・色・大きさは見た目で決めた仮の値（実機では未確認）
   ========================================================= */
import * as THREE from 'three';
import { plain, rng } from '../EnvKit3D.js';
import { canvasTex, texMat, wbox, cyl, drawSetts } from './geo.js';

export const SHOWPIECE = { rivel_artisan: 'canal', magicka_city: 'magic', verum_town: 'quarry', harbor_town: 'lighthouse' };
const WATER = { water: 1, deep: 1, shallow: 1 };
const solidT = (t) => !!(window.Tiles && window.Tiles.isSolid(t));
const touching = (x, z) => { const fx = Math.floor(x), fz = Math.floor(z); const xs = Math.abs(x - fx) < 1e-6 ? [fx - 1, fx] : [fx], zs = Math.abs(z - fz) < 1e-6 ? [fz - 1, fz] : [fz]; const out = []; for (const a of zs) for (const b of xs) out.push([b, a]); return out; };

export function showpieceFor(map) {
  const k = SHOWPIECE[map.id]; if (!k) return null;
  try { if (k === 'canal') return canalPlan(map); if (k === 'magic') return magicPlan(map); if (k === 'quarry') return quarryPlan(map); if (k === 'lighthouse') return lighthousePlan(map); } catch (e) { console.warn('showpiece76', e); }
  return null;
}

// ---------------- 共通の小物
function lantern(add, x, y, z, M) { add(M.iron, wbox(0.16, 0.05, 0.16, x, y + 0.2, z)); add(M.glow, wbox(0.12, 0.18, 0.12, x, y + 0.08, z)); add(M.iron, new THREE.ConeGeometry(0.12, 0.1, 4).rotateY(Math.PI / 4).translate(x, y + 0.27, z)); }
function mats() {
  return {
    wood: plain('#6a4a30', { std: { roughness: 0.88 } }), woodL: plain('#9a7650', { std: { roughness: 0.85 } }), iron: plain('#2e3236', { std: { roughness: 0.5, metalness: 0.4 } }),
    glow: plain('#ffd890', { emissive: '#ffb850', ei: 1.6, window: true }), rope: plain('#c8b08a', { std: { roughness: 1 } }), white: plain('#f4f0e8', { std: { roughness: 0.6 } }),
    red: plain('#b83a32', { std: { roughness: 0.6 } }), dark: plain('#141210', { std: { roughness: 1 } }), foam: plain('#ffffff', { std: { roughness: 0.4 }, transparent: true, opacity: 0.55 })
  };
}
function cloth(add, x0, x1, y, z, along, r) {   // 洗濯物（along：'x' ならロープは東西）
  const cols = ['#f4f2ec', '#8ab0d8', '#e8a8b8', '#f0d878', '#a8c890', '#d8d0f0']; let p = x0 + 0.25, i = 0;
  while (p < x1 - 0.25) { const w = 0.24 + r() * 0.16, h = 0.3 + r() * 0.24; const m = plain(cols[(i++) % cols.length], { std: { roughness: 0.95, side: THREE.DoubleSide } });
    if (along === 'x') add(m, wbox(w, h, 0.03, p + w / 2, y - h / 2 - 0.02, z)); else add(m, wbox(0.03, h, w, z, y - h / 2 - 0.02, p + w / 2)); p += w + 0.12; }
}
// 小舟（中心 x,z。向き ry。水面 y）
function rowboat(x, y, z, ry, M, tint) {
  const g = new THREE.Group(); const hull = new THREE.BoxGeometry(0.6, 0.26, 1.6, 1, 1, 6); const p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) { const zz = p.getZ(i), yy = p.getY(i); const e = Math.max(0, (Math.abs(zz) - 0.35) / 0.45); let xx = p.getX(i) * (1 - e * 0.85); if (yy < 0) xx *= 0.7; p.setXYZ(i, xx, yy + (e * e) * 0.1, zz); }
  hull.computeVertexNormals(); const hm = new THREE.Mesh(hull, plain(tint || '#8a5a36', { std: { roughness: 0.8 } })); hm.castShadow = true; g.add(hm);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 1.0), plain('#4a3020', { std: { roughness: 1 } })); inner.position.y = 0.06; g.add(inner);
  for (const zz of [-0.25, 0.3]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.16), M.woodL); s.position.set(0, 0.11, zz); g.add(s); }
  const oar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 1.3), M.woodL); oar.position.set(0.18, 0.15, 0.05); oar.rotation.y = 0.15; g.add(oar);
  g.position.set(x, y + 0.02, z); g.rotation.y = ry; return g;
}

// ================= 水路の町（リヴェル城下・職人通り）
function canalPlan(map) {
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z)); const key = (x, z) => x + ',' + z;
  const canal = new Set(), bridges = new Set();
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const t = T(x, z); if (WATER[t]) canal.add(key(x, z)); else if (t === 'bridge' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => WATER[T(x + dx, z + dz)])) { canal.add(key(x, z)); bridges.add(key(x, z)); } }
  if (!canal.size) return null;
  const isC = (x, z) => canal.has(key(x, z)); const isW = (x, z) => isC(x, z) && !bridges.has(key(x, z));
  const covered = new Set(); (map.buildings || []).forEach((b) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) covered.add(key(x, y)); });
  const quay = new Set(); for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (isC(x, z) || covered.has(key(x, z))) continue; let n = false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (isC(x + dx, z + dz)) n = true; if (n) quay.add(key(x, z)); }
  // 橋（ひとつながり）：向き・長さ（水路をまたぐ向き）
  const spans = []; const seen = new Set();
  for (const k0 of bridges) { if (seen.has(k0)) continue; const [sx, sz] = k0.split(',').map(Number); const q = [[sx, sz]]; seen.add(k0); const cells = [];
    while (q.length) { const [a, b] = q.pop(); cells.push([a, b]); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = key(a + dx, b + dz); if (bridges.has(kk) && !seen.has(kk)) { seen.add(kk); q.push([a + dx, b + dz]); } } }
    const x0 = Math.min(...cells.map((c) => c[0])), x1 = Math.max(...cells.map((c) => c[0])) + 1, z0 = Math.min(...cells.map((c) => c[1])), z1 = Math.max(...cells.map((c) => c[1])) + 1;
    const alongX = cells.some(([a, b]) => WATER[T(a, b - 1)] || WATER[T(a, b + 1)]);   // 水路が南北に流れる → 橋は東西
    spans.push({ x0, x1, z0, z1, alongX, cells });
  }
  const spanAt = new Map(); spans.forEach((s) => s.cells.forEach(([a, b]) => spanAt.set(key(a, b), s)));
  const RISE = 0.34, QY = 0.08, WY = -0.42, BED = -0.8;
  const deckY = (s, wx, wz) => { const t = s.alongX ? (wx - s.x0) / (s.x1 - s.x0) : (wz - s.z0) / (s.z1 - s.z0); return QY + RISE * Math.sin(Math.PI * Math.max(0, Math.min(1, t))); };
  const hooks = {
    groundY: (vx, vz) => (touching(vx, vz).some(([a, b]) => isC(a, b)) ? BED : null),
    waterY: (x, z) => (isC(x, z) ? WY : null),
    walkY: (wx, wz) => { const x = Math.floor(wx), z = Math.floor(wz); const s = spanAt.get(key(x, z)); if (s) return deckY(s, wx, wz); if (quay.has(key(x, z)) && !solidT(T(x, z))) return QY; return null; },
    skipFloor: (t, x, z) => bridges.has(key(x, z))
  };
  const build = (o) => {
    const { add, g, ctx, K } = o; const M = mats(); const r = rng(W * 31 + H * 7);
    const wallTex = texMat('canal76_wall', canvasTex('canal76_wall', 256, 256, drawSetts('#a89e8c', '#5e564c', 64, 32, 0.16)), { roughness: 0.9 });
    const cope = plain('#cfc6b4', { std: { roughness: 0.85 } }), algae = plain('#3e4a2c', { std: { roughness: 1 } }), slab = K && K.walk ? K.walk : plain('#d8ccb4', { std: { roughness: 0.9 } });
    let n = { quay: 0, wall: 0, bridge: 0 };
    // 岸の石畳
    for (const k of quay) { const [x, z] = k.split(',').map(Number); add(slab, wbox(1.0, 0.16, 1.0, x + 0.5, QY - 0.08, z + 0.5, 2)); n.quay++; }
    // 護岸（水のマスの、岸に面した辺）
    for (const k of canal) { if (bridges.has(k)) continue; const [x, z] = k.split(',').map(Number);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (isC(x + dx, z + dz)) continue; const ex = x + 0.5 + dx * 0.5, ez = z + 0.5 + dz * 0.5; const along = dz !== 0;
        const th = 0.22, hh = QY + 0.06 - BED; const px = ex - dx * th / 2, pz = ez - dz * th / 2;
        add(wallTex, wbox(along ? 1.0 : th, hh, along ? th : 1.0, px, BED + hh / 2, pz, 1.2));
        add(cope, wbox(along ? 1.02 : 0.34, 0.08, along ? 0.34 : 1.02, ex - dx * 0.1, QY + 0.06, ez - dz * 0.1));
        add(algae, wbox(along ? 1.0 : 0.02, 0.12, along ? 0.02 : 1.0, ex - dx * (th + 0.01), WY + 0.04, ez - dz * (th + 0.01)));
        n.wall++; } }
    // 反り橋（石のアーチ）
    const bstone = texMat('canal76_bridge', canvasTex('canal76_bridge', 256, 256, drawSetts('#c8bca6', '#7a705e', 64, 32, 0.12)), { roughness: 0.88 });
    for (const s of spans) {
      const L = s.alongX ? s.x1 - s.x0 : s.z1 - s.z0, Dp = (s.alongX ? s.z1 - s.z0 : s.x1 - s.x0) + 0.1; const a0 = s.alongX ? s.x0 : s.z0;
      const sh = new THREE.Shape(); const N = 16; sh.moveTo(-0.15, BED); sh.lineTo(-0.15, QY);
      for (let i = 0; i <= N; i++) { const t = i / N; sh.lineTo(t * L, QY + RISE * Math.sin(Math.PI * t) - 0.02); }
      sh.lineTo(L + 0.15, QY); sh.lineTo(L + 0.15, BED); const ar = L * 0.42, ah = (QY + RISE - 0.16) - WY; sh.lineTo(L / 2 + ar, BED);
      for (let i = 0; i <= N; i++) { const t = i / N; const ang = t * Math.PI; sh.lineTo(L / 2 + Math.cos(ang) * ar, Math.max(BED, WY + Math.sin(ang) * ah)); }
      sh.lineTo(L / 2 - ar, BED); sh.closePath();
      const eg = new THREE.ExtrudeGeometry(sh, { depth: Dp, bevelEnabled: false }); eg.translate(0, 0, -Dp / 2);
      if (s.alongX) eg.translate(a0, 0, (s.z0 + s.z1) / 2); else { eg.rotateY(-Math.PI / 2); eg.translate((s.x0 + s.x1) / 2, 0, a0); }
      { const P = eg.attributes.position, U = eg.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, (P.getX(i) + P.getZ(i)) / 1.2, P.getY(i) / 1.2); }
      add(bstone, eg);
      // 手すり（橋の両側。反りに沿う）
      for (const side of [0, 1]) for (let i = 0; i < 8; i++) { const t0 = i / 8, t1 = (i + 1) / 8; const y0 = QY + RISE * Math.sin(Math.PI * t0), y1 = QY + RISE * Math.sin(Math.PI * t1); const len = Math.hypot(L / 8, y1 - y0), ang = Math.atan2(y1 - y0, L / 8);
        const c = a0 + (t0 + t1) / 2 * L, yy = (y0 + y1) / 2 + 0.2; const off = side ? (s.alongX ? s.z1 : s.x1) - 0.08 : (s.alongX ? s.z0 : s.x0) + 0.08;
        const gb = new THREE.BoxGeometry(len + 0.02, 0.34, 0.14); gb.rotateZ(ang); if (s.alongX) gb.translate(c, yy, off); else { gb.rotateY(-Math.PI / 2); gb.translate(off, yy, c); } add(bstone, gb); }
      // 橋のたもとの石の柱と灯り
      for (const e of [0, 1]) for (const side of [0, 1]) { const c = e ? a0 + L : a0, off = side ? (s.alongX ? s.z1 : s.x1) - 0.08 : (s.alongX ? s.z0 : s.x0) + 0.08; const px = s.alongX ? c : off, pz = s.alongX ? off : c;
        add(cope, wbox(0.22, 0.62, 0.22, px, QY + 0.31, pz)); if (side === e) { lantern(add, px, QY + 0.66, pz, M); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(px, QY + 0.8, pz), color: 0xffc070, power: 0.7, dist: 5 }); } }
      n.bridge++;
    }
    // 水路の区間（南北に流れる水路：行ごとの水のマスの西端・東端）
    const rows = []; for (let z = 0; z < H; z++) { let a = -1, b = -1; for (let x = 0; x < W; x++) if (isW(x, z)) { if (a < 0) a = x; b = x; } if (a >= 0) rows.push({ z, a, b: b + 1 }); }
    const rowAt = (z) => rows.find((q) => q.z === z);
    // 水車：建物に近い岸の、3行続く水の所
    let wheel = null; const blds = map.buildings || [];
    for (const q of rows) { if (!rowAt(q.z - 1) || !rowAt(q.z + 1) || spanAt.has(key(q.a, q.z - 1)) || spanAt.has(key(q.a, q.z + 1))) continue;
      const west = blds.some((b) => b.x + b.w >= q.a - 4 && b.x + b.w <= q.a && q.z >= b.y && q.z < b.y + b.h), east = blds.some((b) => b.x <= q.b + 4 && b.x >= q.b && q.z >= b.y && q.z < b.y + b.h);
      if (west || east) { wheel = { z: q.z + 0.5, x: (q.a + q.b) / 2, side: west ? -1 : 1 }; break; } }
    if (wheel) {
      const R = 0.7, cy = WY + R - 0.24; const wg = new THREE.Group(); const wm = M.wood;   // 水車の面はカメラに向ける（軸は南北）
      const parts = new THREE.Group(); [-0.16, 0.16].forEach((zz) => { const t = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 6, 28), wm); t.position.z = zz; parts.add(t); const t2 = new THREE.Mesh(new THREE.TorusGeometry(R * 0.55, 0.03, 6, 20), wm); t2.position.z = zz; parts.add(t2); });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const pd = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.38), M.woodL); pd.position.set(Math.cos(a) * (R - 0.08), Math.sin(a) * (R - 0.08), 0); pd.rotation.z = a; parts.add(pd);
        if (i % 2 === 0) for (const zz of [-0.16, 0.16]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(R * 2, 0.04, 0.04), wm); sp.rotation.z = a; sp.position.z = zz; parts.add(sp); } }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10), M.iron); hub.rotation.x = Math.PI / 2; parts.add(hub);
      parts.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      wg.add(parts); wg.position.set(wheel.x, cy, wheel.z); g.add(wg); ctx.scene.animated.push({ kind: 'spin', obj: parts, speed: 0.7 });
      const ax = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8); ax.rotateX(Math.PI / 2); ax.translate(wheel.x, cy, wheel.z); add(M.iron, ax);   // 軸（南北）
      for (const dz of [-0.45, 0.45]) for (const dx of [-0.22, 0.22]) { const lg = new THREE.BoxGeometry(0.1, cy - BED + 0.12, 0.1); lg.rotateZ(dx > 0 ? -0.18 : 0.18); lg.translate(wheel.x + dx, BED + (cy - BED) / 2, wheel.z + dz); add(M.wood, lg); }   // 軸受けの脚
      const fo = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), M.foam); fo.rotation.x = -Math.PI / 2; fo.scale.set(0.7, 1.4, 1); fo.position.set(wheel.x, WY + 0.012, wheel.z); g.add(fo);
    }
    // 小舟（長い区間の東寄り。橋・水車から離す）
    let boats = 0; const far = (z) => !spans.some((s) => z >= s.z0 - 2 && z <= s.z1 + 1) && !(wheel && Math.abs(z - wheel.z) < 3);
    for (const q of rows) { if (boats >= 2 || q.z % 5 !== 0 || !far(q.z) || !rowAt(q.z + 1)) continue; const bt = rowboat(q.b - 0.58, WY, q.z + 1.0, 0.04 * (boats ? 1 : -1), M, boats ? '#5a6e8a' : '#8a5a36'); g.add(bt); ctx.scene.animated.push({ kind: 'bob', obj: bt, base: bt.position.y, ph: boats * 2.1 });
      add(M.wood, cyl(0.06, 0.07, 1.1, 6, q.b - 0.32, WY + 0.25, q.z + 0.15)); boats++; }   // 舫い杭
    // 護岸の灯り（5行ごと・左右交互）と花箱（3行ごと）
    let lamps = 0; for (const q of rows) { if (spanAt.has(key(q.a, q.z))) continue;
      if (q.z % 5 === 2) { const side = (q.z / 5 | 0) % 2 ? -1 : 1; const px = side < 0 ? q.a + 0.3 : q.b - 0.3; add(M.iron, wbox(0.32, 0.04, 0.04, px + (side < 0 ? -0.14 : 0.14), QY - 0.02, q.z + 0.5)); lantern(add, px, QY - 0.3, q.z + 0.5, M); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(px, QY - 0.2, q.z + 0.5), color: 0xffc070, power: 0.6, dist: 4 }); lamps++; }
      if (q.z % 3 === 1) for (const side of [-1, 1]) { const px = side < 0 ? q.a + 0.3 : q.b - 0.3; add(M.wood, wbox(0.14, 0.16, 0.7, px, QY - 0.16, q.z + 0.5)); for (let i = 0; i < 4; i++) add(plain(['#e8506a', '#f0d040', '#f4f4f8', '#a060d8'][(i + q.z) % 4], { std: { roughness: 0.8 } }), new THREE.IcosahedronGeometry(0.07, 0).translate(px, QY - 0.04, q.z + 0.2 + i * 0.2)); } }
    // 水路をまたぐ洗濯物（真ん中あたりの行）
    const mid = rows.filter((q) => far(q.z) && q.z % 5 !== 0 && q.z % 5 !== 2)[Math.floor(rows.length / 3)] || null;
    if (mid) { const zz = mid.z + 0.5; for (const px of [mid.a + 0.3, mid.b - 0.3]) add(M.wood, wbox(0.1, 2.6 - BED, 0.1, px, BED + (2.6 - BED) / 2, zz)); add(M.rope, wbox(mid.b - mid.a - 0.6, 0.02, 0.02, (mid.a + mid.b) / 2, 2.45, zz)); cloth(add, mid.a + 0.3, mid.b - 0.3, 2.44, zz, 'x', r); }
    // 水辺へ下りる石段（最初の橋の北側の西の岸）
    const s0 = spans[0]; if (s0) { const z = s0.z0 - 2; const q = rowAt(z); if (q && !spanAt.has(key(q.a, z))) for (let i = 0; i < 4; i++) add(cope, wbox(0.42, 0.12, 0.26, q.a + 0.21, QY - 0.1 - i * 0.13, z + 0.15 + i * 0.26)); }
    Object.assign(ctx.stats, { showpiece: { kind: 'canal', quay: n.quay, walls: n.wall, bridges: n.bridge, wheel: !!wheel, boats, lamps } });
  };
  return { kind: 'canal', hooks, build };
}

// ================= 魔法の水路（魔導都マクディア）
let sparkTex = null;
function sparkle() {
  if (sparkTex) return sparkTex;
  sparkTex = canvasTex('magic76_spark', 128, 128, (g, W, H) => { g.clearRect(0, 0, W, H); let s = 5; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H, rr = 1 + r() * 4; const gr = g.createRadialGradient(x, y, 0, x, y, rr * 3); gr.addColorStop(0, 'rgba(255,255,255,' + (0.5 + r() * 0.5) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; for (const ox of [0, -W, W]) for (const oy of [0, -H, H]) g.fillRect(x + ox - rr * 3, y + oy - rr * 3, rr * 6, rr * 6); }
    for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(200,220,255,0.25)'; g.lineWidth = 2; g.beginPath(); const y = r() * H; g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + 10, W * 0.6, y - 10, W, y); g.stroke(); } });
  return sparkTex;
}
function magicPlan(map) {
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
  const cells = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (WATER[T(x, z)]) cells.push([x, z]);
  if (!cells.length) return null;
  const build = (o) => {
    const { add, g, ctx } = o; const hAt = o.hAt || (() => 0);
    const tex = sparkle().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const glowM = new THREE.MeshBasicMaterial({ map: tex, color: 0x9a8cff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const pos = [], uv = [], idx = []; let v = 0;
    for (const [x, z] of cells) { const y = -0.2 + 0.015; for (const [px, pz] of [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]]) { pos.push(px, y, pz); uv.push(px / 3, pz / 3); } idx.push(v, v + 2, v + 1, v, v + 3, v + 2); v += 4; }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(idx); gg.computeVertexNormals();
    const gm = new THREE.Mesh(gg, glowM); gm.renderOrder = 3; g.add(gm); ctx.scene.animated.push({ kind: 'uvscroll', tex, sx: 0.04, sy: 0.07 });
    // 水晶の灯りの柱（水のマスの岸寄り・7マスごと）
    const pale = plain('#e8e0f4', { std: { roughness: 0.6 } }), crys = plain('#c8b0ff', { emissive: '#a080ff', ei: 1.6, keepGlow: true, std: { roughness: 0.15 } }), pad = plain('#4e7a4a', { std: { roughness: 0.9, side: THREE.DoubleSide } }), bloom = plain('#ffb0e0', { emissive: '#ff80d0', ei: 1.4, keepGlow: true });
    let posts = 0, orbs = 0, pads = 0; const r = rng(W * 13 + H);
    cells.forEach(([x, z], i) => { const ly = 0;
      if (i % 7 === 3) { const land = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dz]) => !WATER[T(x + dx, z + dz)] && T(x + dx, z + dz) !== 'bridge'); if (land) { const px = x + 0.5 + land[0] * 0.3, pz = z + 0.5 + land[1] * 0.3;
        const top = Math.max(0.6, hAt(x + 0.5 + land[0], z + 0.5 + land[1]) + 1.3); add(pale, cyl(0.07, 0.11, top + 0.4, 8, px, -0.4 + (top + 0.4) / 2, pz)); add(pale, cyl(0.13, 0.09, 0.08, 8, px, top, pz)); add(crys, new THREE.OctahedronGeometry(0.13, 0).scale(1, 1.8, 1).translate(px, top + 0.25, pz));
        ctx.scene.lampSpots.push({ pos: new THREE.Vector3(px, top + 0.2, pz), color: 0xb090ff, power: 0.8, dist: 5 }); posts++; } }
      if (i % 5 === 1) { const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xd8c8ff : 0xb8f0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); orb.position.set(x + 0.3 + r() * 0.4, 0.4 + r() * 0.9, z + 0.3 + r() * 0.4); g.add(orb); ctx.scene.animated.push({ kind: 'bob', obj: orb, base: orb.position.y, ph: i * 0.7, amp: 0.15 }); orbs++; }
      if (i % 6 === 4) { const px = x + 0.35 + r() * 0.3, pz = z + 0.35 + r() * 0.3; const lp = new THREE.CircleGeometry(0.18, 10, 0.4, Math.PI * 2 - 0.5); lp.rotateX(-Math.PI / 2); lp.translate(px, -0.185, pz); add(pad, lp); add(bloom, new THREE.IcosahedronGeometry(0.05, 0).translate(px + 0.04, -0.14, pz)); pads++; }
    });
    Object.assign(ctx.stats, { showpiece: { kind: 'magic', cells: cells.length, posts, orbs, pads } });
  };
  return { kind: 'magic', hooks: {}, build };
}

// ================= 崖の町（灰鉱町ヴェルム）：北の柵の外の鉱山の崖
function rockMass(x0, x1, z0, z1, h0, seed, col) {
  const nx = Math.max(6, Math.round((x1 - x0) * 2)), nz = 5, ny = 12; const g = new THREE.BoxGeometry(x1 - x0, 1, z1 - z0, nx, ny, nz); const p = g.attributes.position; const c = new THREE.Color(col); const cols = new Float32Array(p.count * 3);
  const n2 = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233 + seed) * 43758.5453; return s - Math.floor(s); };
  const sm = (a, b) => { const ai = Math.floor(a), bi = Math.floor(b), af = a - ai, bf = b - bi; const f = (t) => t * t * (3 - 2 * t); return (n2(ai, bi) * (1 - f(af)) + n2(ai + 1, bi) * f(af)) * (1 - f(bf)) + (n2(ai, bi + 1) * (1 - f(af)) + n2(ai + 1, bi + 1) * f(af)) * f(bf); };
  for (let i = 0; i < p.count; i++) { const lx = p.getX(i), ly = p.getY(i) + 0.5, lz = p.getZ(i); const wx = (x0 + x1) / 2 + lx; const top = h0 * (0.75 + 0.45 * sm(wx * 0.18, seed)); let y = ly * top; let z = (z0 + z1) / 2 + lz;
    if (lz > 0) { z += (sm(wx * 0.6, ly * 3 + seed) - 0.5) * 0.8 - ly * 0.6; const band = Math.floor(ly * 4); z -= band * 0.18; }   // 前の面：凹凸と上ほど奥へ・段（地層の棚）
    const k = (0.72 + 0.4 * sm(wx * 1.3, y * 1.7 + seed)) * (1 - 0.22 * Math.max(0, Math.sin(y * 2.6))) * (y < 0.6 ? 0.82 : 1); /* 地層の縞・ふもとは暗く */ p.setXYZ(i, wx, y, z); cols[i * 3] = c.r * k; cols[i * 3 + 1] = c.g * k; cols[i * 3 + 2] = c.b * k; }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const uv = g.attributes.uv, nr = g.attributes.normal; for (let i = 0; i < p.count; i++) { const ny = Math.abs(nr.getY(i)); uv.setXY(i, (p.getX(i) + p.getZ(i) * (ny > 0.7 ? 0 : 0.3)) / 2.5, (ny > 0.7 ? p.getZ(i) : p.getY(i)) / 2.5); }   // 岩肌の模様（世界の座標）
  return g;
}
let rockTexM = null;
function rockTexMat() {
  if (rockTexM) return rockTexM;
  const t = canvasTex('quarry76_rock', 256, 256, (g, W, H) => { g.fillStyle = 'rgb(200,196,190)'; g.fillRect(0, 0, W, H); let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 900; i++) { const v = 150 + r() * 90 | 0; g.fillStyle = 'rgba(' + v + ',' + (v - 4) + ',' + (v - 10) + ',0.35)'; const x = r() * W, y = r() * H, w = 2 + r() * 10; g.fillRect(x, y, w, 1 + r() * 4); }
    g.strokeStyle = 'rgba(60,52,46,0.55)'; for (let k = 0; k < 26; k++) { g.lineWidth = 1 + r() * 1.5; let x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += (r() - 0.5) * 40; y += r() * 26; g.lineTo(x, y); } g.stroke(); }
    for (let k = 0; k < 7; k++) { const y = r() * H; g.fillStyle = 'rgba(80,70,60,0.18)'; g.fillRect(0, y, W, 3 + r() * 5); } });
  rockTexM = texMat('quarry76_rockm', t, { vertexColors: true, roughness: 0.95 }); return rockTexM;
}
function quarryPlan(map) {
  const W = map.w; const gate = []; for (let x = 0; x < W; x++) if (!solidT(map.tile(x, 0))) gate.push(x);
  const gx0 = gate.length ? Math.min(...gate) : W / 2 - 2, gx1 = gate.length ? Math.max(...gate) + 1 : W / 2 + 2;
  const hooks = { skipOutTree: (x, z) => z < 0 && z > -13 };   // 崖のふもとと切り通しに町の外の木を置かない
  const build = (o) => {
    const { add, g, ctx } = o; const M = mats(); const rock = rockTexMat(); const col = '#b0a090';
    const zf = -2.4;   // 崖のふもと（柵の 2 マス外）
    add(rock, rockMass(-14, gx0 - 2.5, zf - 7, zf, 7.5, 3, col)); add(rock, rockMass(gx1 + 2.5, W + 14, zf - 7, zf, 8.5, 7, col));
    add(rock, rockMass(gx0 - 3, gx0 - 1.2, zf - 9, zf - 0.6, 4.2, 11, col)); add(rock, rockMass(gx1 + 1.2, gx1 + 3, zf - 9, zf - 0.6, 4.6, 13, col));   // 切り通しの両側（低い）
    add(rock, rockMass(gx0 - 6, gx1 + 6, zf - 18, zf - 11, 9, 17, '#7a6e60'));   // 谷の奥
    // 坑道の口（東の崖）
    const mx = Math.min(W - 6, gx1 + 6), my = 0, mz = zf - 0.2;
    add(M.dark, wbox(1.6, 1.9, 1.2, mx, my + 0.95, mz - 0.4)); for (const sx of [-0.85, 0.85]) add(M.wood, wbox(0.2, 2.1, 0.2, mx + sx, 1.05, mz + 0.05)); add(M.wood, wbox(2.1, 0.22, 0.26, mx, 2.15, mz + 0.05)); add(M.wood, wbox(0.6, 0.3, 0.06, mx, 2.45, mz + 0.12));
    lantern(add, mx + 1.05, 1.6, mz + 0.15, M); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(mx + 1.05, 1.8, mz + 0.3), color: 0xffb060, power: 0.9, dist: 6 });
    // 線路と貨車（坑道の口から西へ・崖のふもとに沿う）
    const rail = plain('#5a5654', { std: { roughness: 0.5, metalness: 0.5 } });
    for (const dz of [-0.22, 0.22]) add(rail, wbox(9, 0.05, 0.05, mx - 4.5, 0.06, mz + 0.7 + dz));
    for (let i = 0; i < 18; i++) add(M.wood, wbox(0.12, 0.05, 0.7, mx - 0.3 - i * 0.5, 0.03, mz + 0.7));
    for (const k of [0, 1]) { const cxp = mx - 2.2 - k * 1.3; add(M.iron, wbox(0.9, 0.5, 0.62, cxp, 0.42, mz + 0.7)); add(plain('#3a3438', { std: { roughness: 1 } }), wbox(0.8, 0.12, 0.52, cxp, 0.68, mz + 0.7)); for (const dx of [-0.3, 0.3]) for (const dz of [-0.26, 0.26]) { const wh = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 10); wh.rotateX(Math.PI / 2); wh.translate(cxp + dx, 0.13, mz + 0.7 + dz); add(M.iron, wh); }
      if (!k) for (let i = 0; i < 5; i++) add(plain('#c8a24a', { emissive: '#7a5a10', ei: 0.4, std: { roughness: 0.5, metalness: 0.4 } }), new THREE.DodecahedronGeometry(0.1, 0).translate(cxp - 0.25 + i * 0.12, 0.78, mz + 0.65 + (i % 2) * 0.1)); }
    // 足場とはしご（西の崖の面）
    const sx0 = Math.max(-6, gx0 - 7); for (const [hy, w] of [[2.2, 3.2], [4.4, 2.4]]) { add(M.woodL, wbox(w, 0.1, 0.8, sx0, hy, zf - 0.2)); for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) add(M.wood, wbox(0.12, hy, 0.12, sx0 + dx, hy / 2, zf + 0.15)); add(M.wood, wbox(w, 0.06, 0.06, sx0, hy + 0.5, zf + 0.15)); lantern(add, sx0 + w / 2 - 0.2, hy + 0.55, zf + 0.15, M); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(sx0 + w / 2 - 0.2, hy + 0.7, zf + 0.3), color: 0xffb060, power: 0.6, dist: 5 }); }
    for (const [hy0, hy1, px] of [[0, 2.2, sx0 - 1.2], [2.2, 4.4, sx0 + 0.6]]) { for (const dx of [-0.18, 0.18]) add(M.wood, wbox(0.05, hy1 - hy0 + 0.3, 0.05, px + dx, (hy0 + hy1) / 2, zf + 0.25)); for (let y = hy0 + 0.25; y < hy1; y += 0.3) add(M.wood, wbox(0.36, 0.04, 0.04, px, y, zf + 0.25)); }
    // 巻き上げの櫓（崖の上）
    const tx = sx0 + 6, ty = 6.6, tz = zf - 1.8; for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const leg = new THREE.BoxGeometry(0.12, 2.6, 0.12); leg.rotateZ(-dx * 0.15); leg.rotateX(dz * 0.15); leg.translate(tx + dx * 0.8, ty + 1.3, tz + dz * 0.8); add(M.wood, leg); }
    const wh = new THREE.TorusGeometry(0.55, 0.05, 6, 20); wh.translate(tx, ty + 2.6, tz); add(M.iron, wh); add(M.rope, wbox(0.02, 2.4, 0.02, tx + 0.55, ty + 1.4, tz)); add(M.wood, wbox(0.4, 0.3, 0.4, tx + 0.55, ty + 0.1, tz));
    // 小屋（切り通しの入口）
    const hx = gx1 + 3.6, hz = zf - 1.0; add(M.woodL, wbox(1.8, 1.4, 1.4, hx, 0.7, hz)); const rf = new THREE.ConeGeometry(1.45, 0.7, 4); rf.rotateY(Math.PI / 4); rf.scale(1, 1, 0.8); rf.translate(hx, 1.75, hz); add(plain('#5a4a3a', { std: { roughness: 0.9 } }), rf);
    Object.assign(ctx.stats, { showpiece: { kind: 'quarry', gate: [gx0, gx1] } });
  };
  return { kind: 'quarry', hooks, build };
}

// ================= 灯台の港（港町マリナ）
function lighthousePlan(map) {
  const W = map.w, H = map.h; const T = (x, z) => map.tile(x, z);
  // 海のマスで、まわり 2 マスも海の所（桟橋・船から離す）。南東寄り
  let best = null; for (let z = 2; z < H - 1; z++) for (let x = Math.floor(W * 0.6); x < W - 1; x++) { let ok = true; for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1; dx++) if (!WATER[T(x + dx, z + dz)]) { ok = false; break; } if (!ok) continue; const sc = Math.abs(x - W * 0.84) + Math.abs(z - (H - 7)) * 2; if (!best || sc < best.sc) best = { x, z, sc }; }
  if (!best) return null;
  const build = (o) => {
    const { add, g, ctx } = o; const M = mats(); const rock = plain('#ffffff', { std: { roughness: 0.95, vertexColors: true } }); const cx = best.x + 0.5, cz = best.z + 0.5;
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, rr = i ? 0.9 : 0; const ge = new THREE.IcosahedronGeometry(i ? 0.6 : 1.1, 1); const p = ge.attributes.position; const cl = new Float32Array(p.count * 3); for (let k = 0; k < p.count; k++) { const s = 0.75 + 0.3 * Math.sin(k * 1.7 + i); p.setXYZ(k, p.getX(k) * s, p.getY(k) * 0.7, p.getZ(k) * s); const v = 0.45 + 0.15 * Math.sin(k * 0.9 + i); cl[k * 3] = v; cl[k * 3 + 1] = v * 0.95; cl[k * 3 + 2] = v * 0.9; }
      ge.setAttribute('color', new THREE.BufferAttribute(cl, 3)); ge.computeVertexNormals(); ge.translate(cx + Math.cos(a) * rr, -0.35, cz + Math.sin(a) * rr); add(rock, ge); }
    const h = 4.6; const tower = new THREE.CylinderGeometry(0.42, 0.62, h, 16); tower.translate(cx, 0.1 + h / 2, cz); add(M.white, tower);
    for (const y of [1.2, 2.6]) { const b = new THREE.CylinderGeometry(0.5 - y * 0.03, 0.53 - y * 0.03, 0.45, 16); b.translate(cx, 0.1 + y, cz); add(M.red, b); }
    add(M.iron, cyl(0.66, 0.66, 0.1, 16, cx, 0.1 + h + 0.05, cz)); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(M.iron, wbox(0.03, 0.3, 0.03, cx + Math.cos(a) * 0.62, 0.1 + h + 0.25, cz + Math.sin(a) * 0.62)); }
    add(plain('#fff4c0', { emissive: '#ffe08a', ei: 2.2, keepGlow: true, std: { roughness: 0.1 } }), cyl(0.3, 0.3, 0.5, 12, cx, 0.1 + h + 0.35, cz));
    add(M.red, new THREE.ConeGeometry(0.42, 0.45, 16).translate(cx, 0.1 + h + 0.82, cz));
    add(M.dark, wbox(0.3, 0.55, 0.06, cx, 0.45, cz + 0.6));   // 扉
    ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, h + 0.5, cz), color: 0xfff0b0, power: 1.4, dist: 10 });
    // 回る光（夜に見える。MapScene3D の 'spinY'）
    const bm = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }); bm.userData.nightGlow = 0.22;
    const beam = new THREE.Group(); for (const s of [1, -1]) { const cg = new THREE.ConeGeometry(0.9, 9, 16, 1, true); cg.rotateZ(s * Math.PI / 2); cg.translate(s * 4.5, 0, 0); beam.add(new THREE.Mesh(cg, bm)); }
    beam.position.set(cx, 0.1 + h + 0.35, cz); g.add(beam); ctx.scene.animated.push({ kind: 'spinY', obj: beam, speed: 0.6 });
    // 錨を下ろした小舟・かもめ
    let boats = 0; for (const [dx, dz, ry] of [[-6, 1, 0.6], [-3, 3, -0.4]]) { const x = best.x + dx, z = best.z + dz; if (!WATER[T(x, z)] || !WATER[T(x, z - 1)] || !WATER[T(x, z + 1)]) continue; const bt = rowboat(x + 0.5, -0.2, z + 0.5, ry, M, boats ? '#3e6a8a' : '#a8483a'); g.add(bt); ctx.scene.animated.push({ kind: 'bob', obj: bt, base: bt.position.y, ph: boats * 1.7 }); boats++; }
    const gm = plain('#f4f4f4', { std: { roughness: 0.7, side: THREE.DoubleSide } });
    for (let i = 0; i < 4; i++) { const gl = new THREE.Group(); for (const s of [1, -1]) { const w = new THREE.BufferGeometry(); w.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.06, s * 0.32, 0.08, 0, 0, 0, 0.06], 3)); w.computeVertexNormals(); gl.add(new THREE.Mesh(w, gm)); }
      g.add(gl); ctx.scene.animated.push({ kind: 'gull', obj: gl, cx: cx - 4 + i * 2.2, cz: cz - 5 + (i % 2) * 3, r: 2 + i * 0.6, y: 4.5 + i * 0.5, ph: i * 1.6, sp: 0.35 + i * 0.06 }); }
    Object.assign(ctx.stats, { showpiece: { kind: 'lighthouse', at: [best.x, best.z], boats } });
  };
  return { kind: 'lighthouse', hooks: {}, build };
}
