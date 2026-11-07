/* =========================================================
   レシピ（v8.2）：interior82 — 町に属する建物の中を、町の作り方（theme82.js）と部屋の用途（js/rpg/layout82.js）で作り直す
   ・依頼（2026-11-07 14:39）：「小さい城・似た部屋・共通家具の色替えから大幅に変更」「各町で色以外に最低 4 種類の差」
   ・壁：作り（壁紙と腰板・切石・煉瓦・丸太・白壁とタイル・板張り・金属の板・土壁・帆布…）・腰板・幅木・長押・軒蛇腹・柱と梁・付け柱・タイルの帯・垂れ幕
   ・窓：上げ下げの出窓・アーチ・尖頭・鎧戸・ルーバー・鉄の格子・丸窓・格子（マシュラビーヤ）・乳白・小さな二重窓・覗き窓・画面 …（町ごと。教会はステンドグラス）
   ・天井の見え方（奥の半分だけ。カメラの視線をふさがない）：梁・丸太・低い梁・垂木・ヴォールトのアーチ・格天井・鉄のトラス・物干し・配管・照明の格子・布・帆布の棟・壊れた梁
   ・灯り：器具（ガス灯の真鍮の腕・燭台・ランタン・船のランタン・鉄かごの電球・白い球・油の灯・ろうそく・宙に浮く光の玉・帯の光・ネオン・電球の連なり・貝の灯・記憶の瓶・浮く…）と、色の決まった点の光
   ・床：張り方（ヘリンボーン・寄せ木・板・幅広の板・敷石・市松・テラコッタ・タイル・金属の格子・リノリウム・土・ござ…）。じゅうたんのマスは町の敷物の模様
   ・間仕切り（部屋の中の壁のマス）：縦は高く、横（カメラの手前を横切る）は低い腰壁に。作りは町ごと（ガラスつきの腰板・カーテン・格子・ルーバー・乳白ガラス・鉄の格子・帆布・柱の列…）
   ・家具は furn82.js。論理（タイル・当たり判定・ワープ・NPC・イベント・宝箱）は変えない。歩けるマスへ形は 0.1 までしか出さない（体の高さより上は 0.6 まで）
   ========================================================= */
import * as THREE from 'three';
import { plain, rng, worldUV, Merge } from '../EnvKit3D.js';
import { wbox, cyl, shade } from './geo.js';
import { wallTex, floorTex, rugTex } from './tex82.js';
import { buildFurn82, FURN82_TILES } from './furn82.js';

const WALLS = { wall: 1, castle_wall: 1, cave_wall: 1, wall_wood: 1, _void: 1 };
const TALL = { bookshelf: 1, cupboard: 1, stove: 1, counter: 1, bed: 1, rack: 1, hearth: 1, pillar: 1 };
const M = (hex, o) => { o = o || {}; return plain(hex, { std: { roughness: o.r !== undefined ? o.r : 0.8, metalness: o.m || 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }, emissive: o.glow ? (o.gc || hex) : undefined, ei: o.glow || undefined, keepGlow: !!o.glow, transparent: !!o.op, opacity: o.op, window: !!o.win }); };
const B = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };

export function interior82(theme) {
  return {
    id: 'interior82:' + theme.key + (theme.role ? ':' + theme.role : ''),
    async prepare(ctx) {
      const hooks = { skipWall: (t) => !!WALLS[t], skipFloor: (t) => t === 'floor_wood' || t === 'carpet', skipProp: (t) => !!FURN82_TILES[t] };
      ctx.stats.theme82 = { town: theme.key, role: theme.role, sub: theme.sub, source: theme.source, label: theme.label };
      return { hooks, decorKey: null, build: (bb) => build(ctx, theme, bb) };
    }
  };
}

async function build(ctx, th, b) {
  const map = ctx.map, W = map.w, H = map.h; const hi = ctx.quality !== 'low';
  const g = new THREE.Group(); g.name = 'env_interior82'; b.root.add(g); const mg = new Merge(); const add = (m, gg, mx) => mg.add(m, gg, mx); const mgNo = new Merge(); const addNo = (m, gg, mx) => mgNo.add(m, gg, mx);
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_void' : map.tile(x, z));
  const isWall = (x, z) => !!WALLS[T(x, z)];
  const walkish = (x, z) => x >= 0 && z >= 0 && x < W && z < H && !WALLS[T(x, z)];
  const walk = (x, z) => walkish(x, z) && !window.Tiles.isSolid(T(x, z));
  const r = rng(W * 7919 + H * 104729 + th.key.length * 31);
  const scene = ctx.scene; const lamps = scene.lampSpots; const stats = { walls: 0, part: 0, windows: 0, decor: 0, sconce: 0, ceil: 0, rugs: 0 };
  const broken = (/ruin|raid/.test(th.state || '') || th.furn === 'rotten' || th.key === 'aruna_ruins') && !th.survivor;
  // 部屋の内側の箱（外の壁の内側）
  let ix0 = W, iz0 = H, ix1 = -1, iz1 = -1; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (walkish(x, z) && T(x, z) !== 'door') { if (x < ix0) ix0 = x; if (z < iz0) iz0 = z; if (x > ix1) ix1 = x; if (z > iz1) iz1 = z; }
  const inner = (x, z) => x >= ix0 && x <= ix1 && z >= iz0 && z <= iz1;
  // 間仕切りとして作る壁：v8.2 の間取りで足した壁と、小さな部屋の中の壁。大きな部屋（迷路の塔など）の中の壁は、ふつうの壁
  const L82 = map.def && map.def._l82; const small = W <= 18 && H <= 12; const partSet = new Set();
  if (L82 && L82.old) for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (map.def.rows[z][x] === '#' && L82.old[z][x] !== '#') partSet.add(x + ',' + z);
  const isPart = (x, z) => inner(x, z) && (small || partSet.has(x + ',' + z));
  const WH = th.state === 'raid' || th.state === 'ruins' ? 2.3 : /canvas/.test(th.wall.kind) ? 2.2 : /marble|ashlar_arch|glass_curve/.test(th.wall.kind) ? 2.8 : 2.5;   // 壁の高さ
  const body = wallTex(th.wall.kind, th.wall.c1, th.wall.c2, { pattern: th.wall.pattern, soot: th.wall.soot, lath: th.wall.lath });
  const extM = th.wall.ext ? wallTex(th.wall.ext.kind, th.wall.ext.c1, th.wall.ext.c2, { soot: th.wall.ext.soot }) : null;   // 手前の低い壁（外から見える面）
  const c2m = M(th.wall.c2, { r: 0.85 }); const trimC = th.wall.cornice || th.wall.rail || shade(th.wall.c2, 0.7); const trim = M(trimC, { r: 0.7 });
  const wain = th.wall.wain; const wainM = wain ? (wain.kind === 'tile' || wain.kind === 'zellige' ? wallTex('tile_frost', wain.c, shade(wain.c, 0.75), {}) : wain.kind === 'plank' ? wallTex('vplank', wain.c, shade(wain.c, 0.7), {}) : wallTex('walnut_panel', wain.c, shade(wain.c, 0.65), {})) : null;
  const postM = th.wall.post ? M(th.wall.post, { r: 0.85 }) : null; const gilt = th.wall.gilt ? M(th.wall.gilt, { r: 0.3, m: 0.8 }) : null;
  const frame = M(th.win.frame || '#4a3a2a', { r: 0.6 }); const glassDay = M('#cfe4f4', { glow: 0.55, gc: '#bcd8f0', win: true }); const metal = M(th.furnSet.metal, { r: 0.35, m: 0.75 });
  const tall = (x, z) => TALL[T(x, z)];
  // 暖炉・炉・窓の場所を先に決める（同じ壁に重ねない）
  const reserved = new Set();
  const WALLITEMS = { portrait: 1, old_portrait: 1, crest: 1, sea_chart: 1, star_chart: 1, map_frame: 1, old_clock: 1, pendulum_clock: 1, wall_clock: 1, city_clocks: 1, ticker_board: 1, schedule_board: 1, rule_poster: 1, number_plate: 1, probability_chart: 1, chains: 1, tongs: 1, net: 1, sailcloth: 1, drying_herbs: 1, memory_jars: 1, mirror: 1, shade_cloth: 1, textile: 1, campaign_map: 1, pennant: 1, unit_number: 1, monitor_window: 1, cable_rack: 1, thick_curtain: 1, cold_coat: 1, drying_clothes: 1, tide_gauge: 1, tide_record: 1, art: 1, marquee: 1, labels: 1, keepsake: 1, cloth: 1, herbs: 1, apron: 1, workclothes: 1, rope_coil: 1, letters: 1, stopped_gear: 1, gears: 1, blackboard: 1, ration_board: 1, repair_mark: 1, old_map: 1 };
  const wallList = th.props.filter((p) => WALLITEMS[p]); let wi = 0;
  let sconceN = 0;
  // ---------------- 壁 ----------------
  for (let z = -1; z <= H; z++) for (let x = -1; x <= W; x++) {
    if (!isWall(x, z)) continue;
    const nb8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]; if (!nb8.some(([dx, dz]) => walkish(x + dx, z + dz))) continue;
    const cx = x + 0.5, cz = z + 0.5;
    if (isPart(x, z)) { partition(x, z); continue; }
    const front = walkish(x, z - 1) && !walkish(x, z + 1);
    let h = front ? 0.7 : WH;
    if (broken && !front) { const k = Math.sin(x * 2.3 + z * 1.7) * 0.5 + 0.5; h = WH - (k > 0.62 ? 0.4 + k * 0.7 : k * 0.25); }
    add(front && extM ? extM : body, worldUV(new THREE.BoxGeometry(1, h, 1).translate(cx, h / 2, cz), 2.5)); stats.walls++;
    if (front) { add(trim, B(1.0, 0.06, 1.04, cx, h + 0.03, cz)); continue; }
    if (broken && h < WH - 0.3) for (let i = 0; i < 3; i++) add(c2m, B(0.18 + r() * 0.2, 0.1 + r() * 0.15, 0.2, cx + (r() - 0.5) * 0.6, h + 0.02, cz + (r() - 0.5) * 0.4));   // 崩れた壁の上の欠け
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!walkish(x + dx, z + dz)) continue; const fx = cx + dx * 0.5, fz = cz + dz * 0.5; const along = dz !== 0;
      const strip = (hh, yy, dd, m, o) => (o ? addNo : add)(m, B(along ? 1.0 : dd, hh, along ? dd : 1.0, fx + dx * dd / 2, yy, fz + dz * dd / 2));
      // 腰板・幅木・長押・軒蛇腹
      if (wain) { strip(wain.h, wain.h / 2, 0.035, wainM); strip(0.05, wain.h + 0.02, 0.06, trim); }
      strip(0.12, 0.06, 0.05, trim);
      if (th.wall.rail && h > 2) strip(0.04, 1.95, 0.04, trim);
      if (h > 2) strip(0.14, h - 0.07, dz > 0 ? 0.12 : 0.08, trim);
      if (th.wall.band) strip(0.12, 1.45, 0.012, M(th.wall.band, { r: 0.4 }));
      if (th.wall.waterline) { strip(th.wall.waterline, th.wall.waterline / 2, 0.006, M('#3a4a44', { r: 1, op: 0.45 }), true); strip(0.04, th.wall.waterline, 0.008, M('#6a8a6a', { r: 1 })); }
      if (th.wall.led) { strip(0.03, 0.25, 0.02, M(th.wall.led, { glow: 1.2 })); if (h > 2) strip(0.03, h - 0.3, 0.02, M(th.wall.led, { glow: 1.2 })); }
      if (th.wall.iron) { strip(0.08, 0.7, 0.03, M(th.wall.iron, { r: 0.5, m: 0.5 })); if (h > 2) strip(0.08, 1.9, 0.03, M(th.wall.iron, { r: 0.5, m: 0.5 })); }
      // 柱と梁（木組みの壁）・付け柱
      const along2 = along ? x : z;
      if (postM && along2 % 2 === 0) { add(postM, B(along ? 0.16 : 0.06, h, along ? 0.06 : 0.16, fx + dx * 0.03 + (along ? -0.42 : 0), h / 2, fz + dz * 0.03 + (along ? 0 : -0.42))); if (along2 % 4 === 0 && h > 2) add(postM, new THREE.BoxGeometry(along ? 1.2 : 0.05, 0.1, along ? 0.05 : 1.2).rotateZ(along ? 0.75 : 0).rotateX(along ? 0 : 0.75).translate(fx + dx * 0.03, 1.2, fz + dz * 0.03)); }
      if ((th.wall.pilaster || /ashlar_arch|stone_panel/.test(th.wall.kind)) && along2 % 3 === 0 && h > 2) { add(th.wall.pilaster ? M(th.wall.pilaster, { r: 0.4 }) : trim, B(along ? 0.3 : 0.08, h, along ? 0.08 : 0.3, fx + dx * 0.04 + (along ? -0.35 : 0), h / 2, fz + dz * 0.04 + (along ? 0 : -0.35))); if (gilt) add(gilt, B(along ? 0.34 : 0.1, 0.08, along ? 0.1 : 0.34, fx + dx * 0.05 + (along ? -0.35 : 0), h - 0.22, fz + dz * 0.05 + (along ? 0 : -0.35))); }
      if (dz > 0 && h > 2) backFace(x, z, cx, fz, h);
      else if (dx !== 0 && h > 2) sideFace(x, z, dx, fx, cz, h);
      if (broken && r() < 0.35) add(M('#3a3228', { r: 1, op: 0.5 }), B(along ? 0.3 + r() * 0.5 : 0.006, 0.6 + r() * 1.2, along ? 0.006 : 0.3 + r() * 0.5, fx + dx * 0.005, h - 0.5 - r() * 0.4, fz + dz * 0.005));   // 雨染み
    }
  }
  // 奥の壁（南を向いた面）：窓・その町の壁の品・灯りの器具・垂れ幕
  function backFace(x, z, cx, fz, h) {
    const k = (x - ix0) % 4; const blocked = tall(x, z + 1);
    if (k === 1 && !blocked && th.win.kind !== 'none') { windowAt(cx, fz, h, 'back'); reserved.add(x + ',' + z); return; }
    if (k === 3) { if (sconce(cx, fz + 0.0, 'z', h)) return; }
    if (k === 2 || (k === 3 && blocked)) { wallItem(cx, fz, h, x, blocked); return; }
    if (th.role === 'clock' && k === 0 && !blocked && (x - ix0) % 8 === 0) {   // 時計塔：止まった大きな文字盤（割れて、針が下がったまま）
      const gm = M('#6a5a40', { r: 0.55, m: 0.6 }); add(gm, new THREE.TorusGeometry(0.62, 0.06, 6, 28, Math.PI * 1.6).rotateZ(0.4).translate(cx, h - 0.85, fz + 0.06)); add(M('#d8ccb0', { r: 0.9 }), new THREE.CircleGeometry(0.58, 24, 0.5, Math.PI * 1.5).translate(cx, h - 0.85, fz + 0.03));
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(M('#2a2420'), B(0.04, 0.1, 0.01, cx + Math.cos(a) * 0.48, h - 0.85 + Math.sin(a) * 0.48, fz + 0.045)); }
      add(M('#2a2420', { r: 0.5, m: 0.5 }), new THREE.BoxGeometry(0.04, 0.42, 0.02).translate(0, -0.21, 0).rotateZ(0.15).translate(cx, h - 0.85, fz + 0.06)); add(M('#2a2420', { r: 0.5, m: 0.5 }), new THREE.BoxGeometry(0.03, 0.3, 0.02).translate(0, -0.15, 0).rotateZ(-0.4).translate(cx, h - 0.85, fz + 0.065)); stats.decor++; return; }
    if (th.wall.tapestry && k === 0 && !blocked) { add(M(th.wall.tapestry, { r: 0.95, ds: true }), B(0.6, 1.3, 0.015, cx, h - 0.95, fz + 0.012)); add(M('#c8a060', { r: 0.4, m: 0.6 }), B(0.66, 0.04, 0.04, cx, h - 0.28, fz + 0.03)); add(M('#c8a060', { r: 0.6 }), B(0.2, 0.2, 0.017, cx, h - 0.9, fz + 0.02)); stats.decor++; }
  }
  function sideFace(x, z, dx, fx, cz, h) {
    const k = (z - iz0) % 4; if (tall(x + dx, z)) return;
    if (k === 1 && th.win.kind !== 'none' && th.win.kind !== 'monitor') { windowAt(fx, cz, h, dx > 0 ? 'east' : 'west'); return; }
    if (k === 3) sconce(fx, cz, dx > 0 ? 'x+' : 'x-', h);
  }
  // ---------------- 窓 ----------------
  function windowAt(px, pz, h, face) {
    stats.windows++; const side = face !== 'back'; const n = face === 'east' ? 1 : face === 'west' ? -1 : 0;
    // ローカル：横 u（壁に沿う）・高さ y・奥行き d（部屋の側が +）
    const P = (m, w, hh, d, u, y, dd, o) => { const gg = side ? B(d, hh, w, px + n * dd, y, pz + u) : B(w, hh, d, px + u, y, pz + dd); (o ? addNo : add)(m, gg); };
    const K = th.win.kind; const y0 = 1.0, y1 = Math.min(h - 0.25, 2.2);
    if (K === 'monitor') { P(M('#1a2026', { r: 0.4 }), 0.8, 0.5, 0.04, 0, 1.6, 0.02); P(M('#48c9d6', { glow: 1.1 }), 0.72, 0.42, 0.01, 0, 1.6, 0.045, true); for (let i = 0; i < 4; i++) P(M('#a8f0ff', { glow: 1.4 }), 0.3 - i * 0.05, 0.015, 0.012, -0.15, 1.75 - i * 0.08, 0.05, true); return; }
    if (K === 'stained') { P(frame, 0.6, y1 - y0 + 0.4, 0.05, 0, (y0 + y1) / 2, 0.02); const cols = ['#c83a3a', '#3a6ac8', '#e8c040', '#4aa86a']; for (let i = 0; i < 8; i++) P(M(cols[i % 4], { glow: 0.9, win: true }), 0.24, 0.24, 0.01, -0.13 + (i % 2) * 0.26, y0 + 0.1 + Math.floor(i / 2) * 0.32, 0.045, true); lamps.push({ pos: new THREE.Vector3(side ? px + n * 1.2 : px, 1.6, side ? pz : pz + 1.2), color: 0xbcd4ff, power: 0.4, dist: 5 }); return; }
    if (K === 'broken') { P(frame, 0.7, 0.06, 0.06, 0, y0, 0.03); P(frame, 0.06, 0.9, 0.06, -0.32, y0 + 0.45, 0.03); P(frame, 0.06, 0.6, 0.06, 0.3, y0 + 0.3, 0.03, false); P(M('#cfe4f4', { glow: 0.8, win: true }), 0.6, 0.9, 0.01, 0, y0 + 0.45, 0.01, true); for (let i = 0; i < 3; i++) P(M('#9ab8c8', { r: 0.1, op: 0.5 }), 0.12, 0.2, 0.005, -0.2 + i * 0.18, y0 + 0.7 - i * 0.1, 0.05, true); return; }
    const glassM = K === 'frosted' ? M('#eef4f8', { glow: 0.65, win: true }) : K === 'rain' ? M('#5a7a9a', { glow: 0.5, win: true }) : K === 'plastic' ? M('#d8dccc', { glow: 0.4, win: true, op: 0.8 }) : glassDay;
    if (K === 'round' || K === 'vent_round' || K === 'porthole') { const rr = K === 'vent_round' ? 0.22 : 0.3; const ring = new THREE.TorusGeometry(rr, 0.05, 8, 20); const disc = new THREE.CircleGeometry(rr, 20); if (side) { ring.rotateY(Math.PI / 2); disc.rotateY(n > 0 ? Math.PI / 2 : -Math.PI / 2); ring.translate(px + n * 0.03, 1.65, pz); disc.translate(px + n * 0.02, 1.65, pz); } else { ring.translate(px, 1.65, pz + 0.03); disc.translate(px, 1.65, pz + 0.02); } add(K === 'round' ? metal : frame, ring); addNo(glassM, disc); if (K === 'round') for (let i = 0; i < 4; i++) P(metal, 0.012, rr * 2, 0.012, 0, 1.65, 0.04, false); return; }
    let w = 0.72, top = y1, bot = y0;
    if (K === 'tall_narrow' || K === 'lancet' || K === 'slit' || K === 'slit_grille') { w = K === 'slit' || K === 'slit_grille' ? 0.18 : 0.42; bot = K === 'slit' || K === 'slit_grille' ? 1.4 : 0.9; top = Math.min(h - 0.2, 2.3); }
    if (K === 'tall_arched' || K === 'panorama' || K === 'arched' || K === 'arched_brass') { w = K === 'panorama' ? 0.96 : 0.62; bot = K === 'panorama' ? 0.15 : 0.8; top = Math.min(h - 0.2, K === 'panorama' ? h - 0.1 : 2.35); }
    if (K === 'square_small' || K === 'double_small' || K === 'small_shutter' || K === 'hidden') { w = 0.5; bot = 1.3; top = 1.8; }
    const mid = (top + bot) / 2, hh = top - bot;
    P(glassM, w - 0.06, hh - 0.06, 0.01, 0, mid, 0.012, true);
    P(frame, w, 0.06, 0.07, 0, bot, 0.035); P(frame, w, 0.06, 0.06, 0, top, 0.03); P(frame, 0.06, hh, 0.06, -w / 2, mid, 0.03); P(frame, 0.06, hh, 0.06, w / 2, mid, 0.03);
    if (K === 'sash_bay') { P(frame, w, 0.04, 0.05, 0, mid, 0.04); for (const u of [-w / 6, w / 6]) P(frame, 0.025, hh, 0.04, u, mid, 0.04); P(frame, w + 0.16, 0.06, 0.1, 0, bot - 0.03, 0.05); P(M(th.furnSet.fab2, { r: 1, ds: true }), 0.16, hh + 0.2, 0.02, -w / 2 - 0.08, mid, 0.05); P(M(th.furnSet.fab2, { r: 1, ds: true }), 0.16, hh + 0.2, 0.02, w / 2 + 0.08, mid, 0.05); P(metal, w + 0.4, 0.025, 0.04, 0, top + 0.12, 0.05); }
    else if (K === 'lancet' || K === 'tall_arched' || K === 'arched' || K === 'arched_brass') { const ar = new THREE.TorusGeometry(w / 2, 0.035, 6, 14, Math.PI); if (side) { ar.rotateY(Math.PI / 2); ar.translate(px + n * 0.03, top, pz); } else ar.translate(px, top, pz + 0.03); add(K === 'arched_brass' ? metal : frame, ar); const cap = new THREE.CircleGeometry(w / 2 - 0.03, 12, 0, Math.PI); if (side) { cap.rotateY(n > 0 ? Math.PI / 2 : -Math.PI / 2); cap.translate(px + n * 0.012, top, pz); } else cap.translate(px, top, pz + 0.012); addNo(glassM, cap); P(frame, 0.025, hh, 0.04, 0, mid, 0.04); if (K === 'arched') for (let i = 1; i < 4; i++) P(frame, w, 0.015, 0.03, 0, bot + i * hh / 4, 0.04); }
    else if (K === 'shutter' || K === 'small_shutter' || K === 'louver' || K === 'hidden') { const sm = M(th.win.frame, { r: 0.8 }); P(sm, w / 2, hh, 0.04, -w * 0.75, mid, 0.06); P(sm, w / 2, hh, 0.04, w * 0.75, mid, 0.06); if (K === 'louver') for (let i = 0; i < 6; i++) { P(M(shade(th.win.frame, 0.7)), w / 2 - 0.04, 0.02, 0.03, -w * 0.75, bot + 0.1 + i * hh / 6, 0.085); P(M(shade(th.win.frame, 0.7)), w / 2 - 0.04, 0.02, 0.03, w * 0.75, bot + 0.1 + i * hh / 6, 0.085); } P(frame, w, 0.025, 0.04, 0, mid, 0.04); }
    else if (K === 'lattice') { for (let i = 0; i < 6; i++) P(frame, w, 0.02, 0.04, 0, bot + i * hh / 5, 0.045); for (let i = 0; i < 5; i++) P(frame, 0.02, hh, 0.04, -w / 2 + i * w / 4, mid, 0.045); }
    else if (K === 'grid_steel' || K === 'slit_grille') { for (let i = 1; i < 4; i++) P(frame, w, 0.02, 0.04, 0, bot + i * hh / 4, 0.045); for (let i = 1; i < 3; i++) P(frame, 0.02, hh, 0.04, -w / 2 + i * w / 3, mid, 0.045); }
    else if (K === 'drape' || K === 'cloth' || K === 'flap') { const cm = M(K === 'drape' ? th.wall.c1 : th.furnSet.fab, { r: 1, ds: true }); P(cm, w * 0.6, hh + 0.4, 0.03, -w * 0.45, mid + 0.1, 0.07); P(cm, w * 0.6, hh + 0.4, 0.03, w * 0.45, mid + 0.1, 0.07); if (K === 'drape') P(gilt || metal, w + 0.6, 0.06, 0.06, 0, top + 0.25, 0.06); }
    else if (K === 'double_small') { P(frame, 0.025, hh, 0.04, 0, mid, 0.04); P(M(th.furnSet.fab, { r: 1, ds: true }), w + 0.3, 0.6, 0.02, 0, top - 0.1, 0.07); }
    else if (K === 'patched') { P(M('#c8b890', { r: 1 }), w * 0.45, hh * 0.5, 0.012, -w * 0.2, mid + 0.1, 0.02); P(frame, w, 0.03, 0.05, 0, mid, 0.04, false); }
    else if (K === 'casement') { P(frame, 0.03, hh, 0.04, 0, mid, 0.04); P(frame, w, 0.03, 0.04, 0, mid + hh * 0.2, 0.04); }
    else { P(frame, 0.03, hh, 0.04, 0, mid, 0.04); P(frame, w, 0.03, 0.04, 0, mid, 0.04); }
    // 光の帯（床に落ちる窓の光）
    if (!side && hi) { const pl = new THREE.PlaneGeometry(w * 0.9, 1.6); pl.rotateX(-Math.PI / 2); pl.translate(px, 0.055, pz + 1.0); addNo(M('#fff4d8', { op: 0.08, glow: 0.3 }), pl); }
  }
  // ---------------- 灯りの器具 ----------------
  function sconce(px, pz, dir, h) {
    const K = th.light.kind; if (K === 'daylight' || K === 'panel' || K === 'led' || K === 'chandelier' || K === 'pendant' || K === 'bulb_string' || K === 'float_orb' || K === 'marquee') return false;
    const n = dir === 'x+' ? [1, 0] : dir === 'x-' ? [-1, 0] : [0, 1]; const y = Math.min(2.05, h - 0.35);
    const at = (d, yy) => [px + n[0] * d, yy, pz + n[1] * d];
    const gl = M('#fff0c8', { glow: 1.5, gc: '#' + new THREE.Color(th.light.col).getHexString() });
    const P = (m, gg, d, yy, o) => { const p = at(d, yy); gg.translate(p[0], p[1], p[2]); (o ? addNo : add)(m, gg); };
    if (K === 'gas_brass') { P(metal, new THREE.BoxGeometry(0.06, 0.12, 0.04), 0.02, y - 0.1); P(metal, new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6).rotateX(n[1] ? Math.PI / 2 : 0).rotateZ(n[0] ? Math.PI / 2 : 0), 0.15, y - 0.05); P(gl, new THREE.SphereGeometry(0.07, 10, 8), 0.28, y + 0.05, true); P(metal, new THREE.CylinderGeometry(0.035, 0.05, 0.05, 8), 0.28, y - 0.03); }
    else if (K === 'candelabra' || K === 'candle' || K === 'candle_stand') { P(M('#2e2e32', { r: 0.6, m: 0.5 }), new THREE.BoxGeometry(0.05, 0.3, 0.05), 0.03, y - 0.1); for (const s of K === 'candle' ? [0] : [-0.12, 0, 0.12]) { const o = n[1] ? [s, 0] : [0, s]; const p = at(0.14, y + 0.08); const c = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6); c.translate(p[0] + o[0], p[1], p[2] + o[1]); add(M('#ece4d0'), c); const f = new THREE.SphereGeometry(0.02, 6, 4); f.translate(p[0] + o[0], p[1] + 0.09, p[2] + o[1]); addNo(gl, f); } }
    else if (K === 'lantern' || K === 'oil_lamp' || K === 'ship_lantern' || K === 'hurricane' || K === 'mirror_lantern' || K === 'pierced_brass') { const lm = K === 'ship_lantern' || K === 'pierced_brass' || K === 'mirror_lantern' ? metal : M(th.furnSet.wood2, { r: 0.8 }); P(lm, new THREE.BoxGeometry(0.04, 0.04, 0.04), 0.02, y + 0.1); P(lm, new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4).rotateX(n[1] ? Math.PI / 2 : 0).rotateZ(n[0] ? Math.PI / 2 : 0), 0.1, y + 0.1); P(lm, new THREE.BoxGeometry(0.14, 0.2, 0.14), 0.2, y - 0.05); P(gl, new THREE.BoxGeometry(0.1, 0.14, 0.1), 0.2, y - 0.05, true); P(lm, new THREE.ConeGeometry(0.1, 0.08, 4), 0.2, y + 0.09); }
    else if (K === 'cage_lamp' || K === 'cold_globe' || K === 'shell' || K === 'jar_glow' || K === 'neon' || K === 'ember' || K === 'banker') {
      if (K === 'neon') { P(M('#ff4ab8', { glow: 2.0 }), new THREE.BoxGeometry(n[1] ? 0.7 : 0.03, 0.04, n[1] ? 0.03 : 0.7), 0.03, y, true); P(M('#4af0ff', { glow: 2.0 }), new THREE.BoxGeometry(n[1] ? 0.5 : 0.03, 0.04, n[1] ? 0.03 : 0.5), 0.03, y - 0.15, true); }
      else if (K === 'ember') { P(M('#2e2e32', { r: 0.6, m: 0.5 }), new THREE.CylinderGeometry(0.12, 0.06, 0.1, 8), 0.16, y - 0.1); P(M('#ff7a2a', { glow: 1.6 }), new THREE.CylinderGeometry(0.1, 0.1, 0.02, 8), 0.16, y - 0.04, true); }
      else if (K === 'shell') { P(M('#f4e8dc', { r: 0.4 }), new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 0.5), 0.05, y - 0.05); P(gl, new THREE.SphereGeometry(0.05, 8, 6), 0.08, y - 0.02, true); }
      else if (K === 'jar_glow') { P(M('#cfe8ff', { r: 0.1, glow: 0.9 }), new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10), 0.14, y - 0.05, true); P(metal, new THREE.BoxGeometry(0.3, 0.03, 0.2), 0.1, y - 0.14); }
      else { P(M('#2e2e32', { r: 0.6, m: 0.5 }), new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4).rotateX(n[1] ? Math.PI / 2 : 0).rotateZ(n[0] ? Math.PI / 2 : 0), 0.1, y + 0.05); P(gl, new THREE.SphereGeometry(0.065, 10, 8), 0.22, y, true); if (K === 'cage_lamp') P(M('#2e2e32', { r: 0.6, m: 0.5 }), new THREE.SphereGeometry(0.085, 6, 4), 0.22, y); }
    }
    else return false;
    stats.sconce++; if (sconceN < 1) { const p = at(0.6, y); lamps.push({ pos: new THREE.Vector3(p[0], p[1], p[2]), color: th.light.col, power: 0.55, dist: 5 }); sconceN++; }
    return true;
  }
  // ---------------- 壁の品（その町の品） ----------------
  function wallItem(cx, fz, h, x, high) {
    if (!wallList.length) return; const it = wallList[(wi++ + x) % wallList.length]; const y = high ? Math.max(2.0, h - 0.45) : 1.65; const zf = fz + 0.015; stats.decor++;
    const fm = M(th.furnSet.wood2, { r: 0.6 }); const pap = M('#e8dcc0', { r: 1 }); const brass = M('#c8a050', { r: 0.3, m: 0.8 });
    const frameAt = (w, hh, inner, yy) => { add(gilt || fm, B(w, hh, 0.04, cx, yy, zf + 0.02)); add(inner, B(w - 0.08, hh - 0.08, 0.01, cx, yy, zf + 0.045)); };
    const s = high ? 0.7 : 1;
    switch (it) {
      case 'portrait': case 'old_portrait': case 'art': frameAt(0.5 * s, 0.62 * s, M(it === 'art' ? '#5a8ab8' : '#4a3a30', { r: 0.9 }), y); if (!high) add(M('#c8a070', { r: 0.9 }), B(0.18, 0.22, 0.012, cx, y + 0.04, zf + 0.052)); break;
      case 'crest': add(M('#8a1e2a', { r: 0.9 }), new THREE.CylinderGeometry(0.26 * s, 0.26 * s, 0.03, 6).rotateX(Math.PI / 2).translate(cx, y, zf + 0.02)); add(brass, B(0.08, 0.3 * s, 0.03, cx, y, zf + 0.04)); add(brass, B(0.3 * s, 0.08, 0.03, cx, y, zf + 0.04)); break;
      case 'sea_chart': case 'star_chart': case 'map_frame': case 'campaign_map': case 'old_map': frameAt(0.8 * s, 0.5 * s, it === 'star_chart' ? M('#1e2a4a', { r: 0.9, glow: 0.15, gc: '#3a5aa0' }) : pap, y); if (it === 'star_chart') for (let i = 0; i < 7; i++) addNo(M('#ffffff', { glow: 1.2 }), B(0.02, 0.02, 0.005, cx - 0.3 + r() * 0.6, y - 0.18 + r() * 0.36, zf + 0.055)); else for (let i = 0; i < 4; i++) add(M('#7a6a4a', { r: 1 }), B(0.3, 0.008, 0.004, cx - 0.1 + r() * 0.2, y - 0.15 + i * 0.1, zf + 0.054)); break;
      case 'old_clock': case 'pendulum_clock': case 'wall_clock': case 'city_clocks': { const n = it === 'city_clocks' ? 3 : 1; for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * 0.32; add(it === 'wall_clock' ? M('#e8e8e0', { r: 0.4 }) : fm, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 16).rotateX(Math.PI / 2).translate(cx + ox, y + 0.1, zf + 0.02)); add(M('#f0e8d4', { r: 0.6 }), new THREE.CircleGeometry(0.1, 16).translate(cx + ox, y + 0.1, zf + 0.042)); add(M('#1e1a16'), B(0.01, 0.08, 0.004, cx + ox, y + 0.13, zf + 0.045)); add(M('#1e1a16'), B(0.06, 0.01, 0.004, cx + ox + 0.02, y + 0.1, zf + 0.045)); }
        if (it === 'pendulum_clock') { add(fm, B(0.26, 0.7, 0.08, cx, y - 0.4, zf + 0.04)); add(brass, new THREE.CircleGeometry(0.06, 12).translate(cx, y - 0.6, zf + 0.085)); add(brass, B(0.012, 0.36, 0.005, cx, y - 0.38, zf + 0.085)); } break; }
      case 'ticker_board': case 'schedule_board': case 'rule_poster': case 'ration_board': case 'probability_chart': case 'blackboard': { const tb = it === 'ticker_board'; add(tb ? M('#141a16', { r: 0.6 }) : it === 'blackboard' ? M('#26402e') : fm, B(0.86 * s, 0.56 * s, 0.04, cx, y, zf + 0.02)); for (let i = 0; i < 4; i++) (tb ? addNo : add)(tb ? M(i % 2 ? '#ff5a4a' : '#5aff8a', { glow: 1.2 }) : pap, B(0.6 * s, 0.03, 0.006, cx - 0.05, y + 0.16 - i * 0.1, zf + 0.045)); if (tb) addNo(M('#ffd84a', { glow: 1.2 }), B(0.12, 0.03, 0.006, cx + 0.32, y + 0.16, zf + 0.045)); break; }
      case 'number_plate': case 'unit_number': add(M('#2a3a50', { r: 0.4 }), B(0.36, 0.2, 0.02, cx, y + 0.1, zf + 0.01)); add(M('#f0f0f0', { r: 0.6 }), B(0.06, 0.12, 0.004, cx - 0.08, y + 0.1, zf + 0.022)); add(M('#f0f0f0', { r: 0.6 }), B(0.06, 0.12, 0.004, cx + 0.06, y + 0.1, zf + 0.022)); break;
      case 'chains': case 'tongs': case 'apron': case 'workclothes': for (let i = 0; i < 3; i++) add(M(it === 'apron' || it === 'workclothes' ? '#7a4a2a' : '#3a3a40', { r: 0.6, m: it === 'chains' || it === 'tongs' ? 0.5 : 0 }), B(it === 'apron' || it === 'workclothes' ? 0.22 : 0.04, 0.6, 0.03, cx - 0.25 + i * 0.25, y - 0.1, zf + 0.03)); add(M('#2e2e32', { r: 0.6, m: 0.5 }), B(0.8, 0.04, 0.05, cx, y + 0.22, zf + 0.03)); break;
      case 'net': case 'sailcloth': case 'rope_coil': { const nm = M(it === 'sailcloth' ? '#e8dcc0' : '#c8b07a', { r: 1, ds: true }); if (it === 'rope_coil') { add(nm, new THREE.TorusGeometry(0.16, 0.035, 6, 14).translate(cx, y, zf + 0.04)); add(nm, new THREE.TorusGeometry(0.11, 0.03, 6, 12).translate(cx, y, zf + 0.06)); } else if (it === 'sailcloth') { add(nm, B(0.9, 0.7, 0.01, cx, y - 0.05, zf + 0.02)); add(M('#8a6a44'), B(0.95, 0.04, 0.04, cx, y + 0.3, zf + 0.03)); } else { for (let i = 0; i < 6; i++) add(nm, B(0.86, 0.012, 0.01, cx, y - 0.3 + i * 0.12, zf + 0.02)); for (let i = 0; i < 7; i++) add(nm, B(0.012, 0.62, 0.01, cx - 0.42 + i * 0.14, y, zf + 0.02)); add(M('#e8c040'), new THREE.SphereGeometry(0.06, 8, 6).translate(cx + 0.2, y - 0.1, zf + 0.06)); } break; }
      case 'drying_herbs': case 'herbs': case 'drying_clothes': case 'cloth': case 'textile': case 'shade_cloth': { add(M('#6a5030'), B(0.9, 0.03, 0.03, cx, y + 0.3, zf + 0.04)); for (let i = 0; i < 4; i++) add(M(it === 'drying_herbs' || it === 'herbs' ? ['#6a7a3a', '#8a8a4a', '#5a6a2a'][i % 3] : [th.furnSet.fab, th.furnSet.fab2, '#c8b890', '#8a6a5a'][i], { r: 1, ds: true }), B(it === 'drying_herbs' || it === 'herbs' ? 0.1 : 0.2, it === 'drying_herbs' || it === 'herbs' ? 0.3 : 0.5, 0.03, cx - 0.3 + i * 0.2, y + 0.1 - (it === 'drying_herbs' || it === 'herbs' ? 0 : 0.1), zf + 0.05)); break; }
      case 'memory_jars': case 'labels': add(M(th.furnSet.wood, { r: 0.7 }), B(0.86, 0.04, 0.22, cx, y - 0.2, zf + 0.11)); for (let i = 0; i < 4; i++) { add(M(['#cfe8ff', '#e8d8ff', '#d8ffe8', '#fff0d0'][i], { r: 0.1, glow: 0.7 }), new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10).translate(cx - 0.3 + i * 0.2, y - 0.1, zf + 0.12)); add(pap, B(0.08, 0.04, 0.004, cx - 0.3 + i * 0.2, y - 0.12, zf + 0.181)); } break;
      case 'mirror': add(gilt || brass, new THREE.CylinderGeometry(0.28, 0.28, 0.03, 18).rotateX(Math.PI / 2).translate(cx, y, zf + 0.02)); add(M('#d8e8f0', { r: 0.02, m: 0.9 }), new THREE.CircleGeometry(0.24, 18).translate(cx, y, zf + 0.037)); break;
      case 'pennant': for (let i = 0; i < 3; i++) add(M(['#2a3a6a', '#8a6a2a', '#6a1e24'][i], { r: 1, ds: true }), new THREE.ConeGeometry(0.12, 0.5, 3).rotateZ(Math.PI).translate(cx - 0.28 + i * 0.28, y, zf + 0.03)); break;
      case 'monitor_window': case 'cable_rack': add(M('#1a2026', { r: 0.4 }), B(0.8, 0.5, 0.04, cx, y, zf + 0.02)); addNo(M('#48c9d6', { glow: 1.0 }), B(0.72, 0.42, 0.01, cx, y, zf + 0.045)); break;
      case 'thick_curtain': case 'cold_coat': case 'keepsake': case 'repair_mark': case 'letters': case 'stopped_gear': case 'gears': case 'tide_gauge': case 'tide_record': case 'marquee':
        if (it === 'tide_gauge') { add(fm, B(0.1, 1.2, 0.04, cx, 1.3, zf + 0.02)); for (let i = 0; i < 10; i++) add(M(i % 5 ? '#e8e0d0' : '#c83a3a'), B(0.08, 0.012, 0.005, cx, 0.75 + i * 0.12, zf + 0.045)); }
        else if (it === 'stopped_gear' || it === 'gears') { for (let i = 0; i < 3; i++) add(M('#7a6a4a', { r: 0.5, m: 0.6 }), new THREE.TorusGeometry(0.1 + i * 0.05, 0.025, 4, 12).translate(cx - 0.2 + i * 0.2, y + (i % 2) * 0.1, zf + 0.03)); }
        else if (it === 'letters') { for (let i = 0; i < 5; i++) add(pap, B(0.14, 0.1, 0.004, cx - 0.3 + i * 0.15, y - 0.2 + (i % 2) * 0.15, zf + 0.012).rotateZ((i - 2) * 0.15)); }
        else if (it === 'marquee') { for (let i = 0; i < 6; i++) addNo(M('#ffd890', { glow: 1.6 }), new THREE.SphereGeometry(0.03, 6, 4).translate(cx - 0.4 + i * 0.16, h - 0.3, zf + 0.04)); }
        else { add(M(th.furnSet.fab, { r: 1, ds: true }), B(0.4, 0.9, 0.04, cx, y - 0.2, zf + 0.03)); }
        break;
      default: break;
    }
  }
  // ---------------- 間仕切り（部屋の中の壁のマス） ----------------
  function partition(x, z) {
    stats.part++; const cx = x + 0.5, cz = z + 0.5; const ns = walkish(x, z - 1) || walkish(x, z + 1); const ew = walkish(x - 1, z) || walkish(x + 1, z);
    const horiz = ns && !(isWall(x, z - 1) || isWall(x, z + 1));   // 南北どちらも歩ける＝東西にのびる仕切り（カメラの手前を横切る）
    const ph = horiz ? 1.15 : 2.05; const K = th.part; const wood = M(th.furnSet.wood, { r: 0.75 }), wood2 = M(th.furnSet.wood2, { r: 0.8 });
    const w = horiz ? 1.0 : 0.16, d = horiz ? 0.16 : 1.0;
    const frameBox = (m, hh, y) => add(m, B(w, hh, d, cx, y, cz));
    if (K === 'curtain' || K === 'cloth' || K === 'sail_curtain' || K === 'canvas' || K === 'velvet_rope') {
      const cm = M(K === 'canvas' ? th.wall.c1 : K === 'velvet_rope' ? '#6a1420' : th.furnSet.fab, { r: 1, ds: true });
      if (K === 'velvet_rope') { add(M('#d8b058', { r: 0.3, m: 0.8 }), new THREE.CylinderGeometry(0.04, 0.05, 0.95, 8).translate(cx, 0.475, cz)); add(cm, new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6).rotateZ(horiz ? Math.PI / 2 : 0).rotateX(horiz ? 0 : Math.PI / 2).translate(cx, 0.8, cz)); return; }
      add(metal, B(horiz ? 1.0 : 0.04, 0.04, horiz ? 0.04 : 1.0, cx, horiz ? 1.25 : 2.1, cz)); for (let i = 0; i < 4; i++) add(cm, B(horiz ? 0.24 : 0.04, horiz ? 1.15 : 2.0, horiz ? 0.04 : 0.24, cx + (horiz ? -0.36 + i * 0.24 : (i % 2) * 0.03), (horiz ? 1.15 : 2.0) / 2 + 0.05, cz + (horiz ? (i % 2) * 0.03 : -0.36 + i * 0.24))); return;
    }
    if (K === 'colonnade' || K === 'stone_arch') { const cm = M(th.wall.c1, { r: 0.6 }); add(cm, new THREE.CylinderGeometry(0.16, 0.18, WH - 0.1, 12).translate(cx, (WH - 0.1) / 2, cz)); add(cm, B(0.42, 0.14, 0.42, cx, 0.07, cz)); add(gilt || cm, B(0.44, 0.14, 0.44, cx, WH - 0.15, cz)); return; }
    if (K === 'lattice' || K === 'iron_grille' || K === 'woven' || K === 'wattle') { const lm = K === 'iron_grille' ? M('#2e2e32', { r: 0.5, m: 0.6 }) : wood; frameBox(wood2, 0.08, 0.04); frameBox(wood2, 0.06, ph); for (let i = 0; i < 5; i++) { add(lm, B(horiz ? 0.025 : 0.04, ph, horiz ? 0.04 : 0.025, cx + (horiz ? -0.4 + i * 0.2 : 0), ph / 2, cz + (horiz ? 0 : -0.4 + i * 0.2))); add(lm, B(horiz ? 1.0 : 0.04, 0.025, horiz ? 0.04 : 1.0, cx, 0.2 + i * (ph - 0.25) / 4, cz)); } return; }
    if (K === 'glazed_panel' || K === 'brass_glass' || K === 'frosted' || K === 'glass') { const lowH = K === 'glass' ? 0.08 : 0.95; frameBox(K === 'glass' ? metal : wood, lowH, lowH / 2); if (K !== 'glass' && wainM) add(wainM, B(horiz ? 1.0 : 0.17, lowH - 0.1, horiz ? 0.17 : 1.0, cx, lowH / 2, cz)); const gm = K === 'frosted' ? M('#e8f0f4', { r: 0.2, op: 0.75 }) : M('#cfe0ea', { r: 0.05, op: 0.35 }); addNo(gm, B(horiz ? 0.96 : 0.03, ph - lowH, horiz ? 0.03 : 0.96, cx, lowH + (ph - lowH) / 2, cz)); const fm2 = K === 'brass_glass' ? metal : wood2; add(fm2, B(w, 0.05, d, cx, ph, cz)); add(fm2, B(horiz ? 0.04 : 0.17, ph - lowH, horiz ? 0.17 : 0.04, cx + (horiz ? 0.48 : 0), lowH + (ph - lowH) / 2, cz + (horiz ? 0 : 0.48))); return; }
    if (K === 'broken') { const hh = 0.5 + ((x * 3 + z * 7) % 5) * 0.25; add(body, worldUV(new THREE.BoxGeometry(w, hh, d).translate(cx, hh / 2, cz), 2.5)); for (let i = 0; i < 3; i++) add(c2m, B(0.2, 0.12, 0.2, cx + (r() - 0.5) * 0.6, 0.06, cz + (r() - 0.5) * 0.6)); return; }
    // 板・板の間仕切り・金属・腰板：作りの模様の板
    const pm = K === 'metal' || K === 'patched_metal' || K === 'corrugated' ? wallTex(K === 'corrugated' ? 'pipes_patch' : 'metal_panel', th.wall.c1, th.wall.c2, {}) : K === 'laminate' || K === 'light_partition' ? wallTex('laminate', th.wall.c1, th.wall.c2, {}) : K === 'louver' ? wallTex('vplank', th.wall.c1, th.wall.c2, {}) : K === 'panel' ? wallTex('walnut_panel', th.furnSet.wood, th.furnSet.wood2, {}) : wallTex('vplank', th.furnSet.wood, th.furnSet.wood2, {});
    add(pm, worldUV(new THREE.BoxGeometry(w, ph, d).translate(cx, ph / 2, cz), 2)); add(wood2, B(w + 0.02, 0.05, d + 0.02, cx, ph + 0.025, cz));
  }
  // ---------------- 床 ----------------
  const fl = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (walkish(x, z) && T(x, z) !== 'door' && !/stairs/.test(T(x, z))) fl.push([x, z]);
  if (fl.length) { const pos = [], uv = [], nrm = [], idx = []; let v = 0; const y = 0.035; for (const [x, z] of fl) { pos.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1); uv.push(x / 2, z / 2, (x + 1) / 2, z / 2, (x + 1) / 2, (z + 1) / 2, x / 2, (z + 1) / 2); nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); idx.push(v, v + 3, v + 2, v, v + 2, v + 1); v += 4; }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); fg.setIndex(idx); add(floorTex(th.floor.kind, th.floor.c1, th.floor.c2), fg); }
  // 敷物（じゅうたんのマス）：つながったまとまりごとに 1 枚の模様
  if (th.rug) { const seen = new Set(); for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'carpet' || seen.has(x + ',' + z)) continue; const comp = []; const st = [[x, z]]; seen.add(x + ',' + z); while (st.length) { const [a, c] = st.pop(); comp.push([a, c]); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (a + dx) + ',' + (c + dz); if (!seen.has(k) && T(a + dx, c + dz) === 'carpet') { seen.add(k); st.push([a + dx, c + dz]); } } }
    let bx0 = 1e9, bz0 = 1e9, bx1 = -1, bz1 = -1; comp.forEach(([a, c]) => { bx0 = Math.min(bx0, a); bz0 = Math.min(bz0, c); bx1 = Math.max(bx1, a); bz1 = Math.max(bz1, c); }); const bw = bx1 - bx0 + 1, bh = bz1 - bz0 + 1;
    const pos = [], uv = [], nrm = [], idx = []; let v = 0; const y = 0.05; const ins = 0.04; for (const [a, c] of comp) { const x0 = a + (T(a - 1, c) === 'carpet' ? 0 : ins), x1 = a + 1 - (T(a + 1, c) === 'carpet' ? 0 : ins), z0 = c + (T(a, c - 1) === 'carpet' ? 0 : ins), z1 = c + 1 - (T(a, c + 1) === 'carpet' ? 0 : ins); pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1); for (const [px, pz] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) uv.push((px - bx0) / bw, (pz - bz0) / bh); nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); idx.push(v, v + 3, v + 2, v, v + 2, v + 1); v += 4; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); rg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); rg.setIndex(idx); add(rugTex(th.rug.kind, th.rug.c1, th.rug.c2), rg); stats.rugs++; } }
  // ---------------- 天井の見え方（奥の半分） ----------------
  const Wn = ix1 - ix0 + 1, Hn = iz1 - iz0 + 1; const zb = iz0, ze = iz0 + Math.max(2, Math.round(Hn * 0.42)); const yc = WH - 0.05; const cm = M(th.ceil.c || '#5a4030', { r: 0.85 });
  const CK = th.ceil.kind;
  if (CK === 'beams' || CK === 'low_beams' || CK === 'poles' || CK === 'rafters' || CK === 'palm') { const yb = CK === 'low_beams' ? WH - 0.25 : yc - 0.08; const t = CK === 'low_beams' ? 0.2 : CK === 'rafters' ? 0.08 : 0.14; for (let x = ix0 + 1; x <= ix1; x += CK === 'rafters' ? 1 : 2) { if (CK === 'poles' || CK === 'palm') add(cm, new THREE.CylinderGeometry(t * 0.6, t * 0.6, ze - zb, 8).rotateX(Math.PI / 2).translate(x, yb, (zb + ze) / 2)); else add(cm, B(t, t, ze - zb, x, yb, (zb + ze) / 2)); stats.ceil++; } }
  else if (CK === 'vault') { for (let k = 0; k < 2; k++) { const zz = zb + 0.5 + k * Math.max(1.5, (ze - zb) - 0.5); const ar = new THREE.TorusGeometry(Wn / 2, 0.09, 6, 24, Math.PI); ar.scale(1, Math.min(1, 1.2 / (Wn / 2)), 1); ar.translate(ix0 + Wn / 2, WH - 0.2, zz); add(cm, ar); stats.ceil++; } add(cm, B(0.12, 0.12, ze - zb, ix0 + Wn / 2, WH + 1.0, (zb + ze) / 2)); }
  else if (CK === 'coffer' || CK === 'coffer_wood') { for (let x = ix0 + 1; x <= ix1; x += 2) add(cm, B(0.12, 0.16, ze - zb, x, yc, (zb + ze) / 2)); for (let z = zb + 1; z <= ze; z += 2) add(cm, B(Wn, 0.16, 0.12, ix0 + Wn / 2, yc, z)); if (gilt) for (let x = ix0 + 1; x <= ix1; x += 2) for (let z = zb + 1; z <= ze; z += 2) add(gilt, new THREE.SphereGeometry(0.06, 8, 6).translate(x, yc - 0.1, z)); stats.ceil++; }
  else if (CK === 'truss' || CK === 'truss_chain' || CK === 'hoops') { const im = M(th.ceil.c, { r: 0.5, m: 0.6 }); for (let z = zb + 1; z <= ze; z += 2) { if (CK === 'hoops') { const ar = new THREE.TorusGeometry(Wn / 2, 0.04, 6, 20, Math.PI); ar.scale(1, 0.5, 1); ar.translate(ix0 + Wn / 2, WH - 0.15, z); add(im, ar); continue; } add(im, B(Wn, 0.08, 0.08, ix0 + Wn / 2, yc - 0.3, z)); add(im, new THREE.BoxGeometry(Wn / 2 + 0.2, 0.06, 0.06).rotateZ(0.32).translate(ix0 + Wn / 4, yc - 0.05, z)); add(im, new THREE.BoxGeometry(Wn / 2 + 0.2, 0.06, 0.06).rotateZ(-0.32).translate(ix0 + Wn * 0.75, yc - 0.05, z)); for (let i = 1; i < 5; i++) add(im, B(0.04, 0.4, 0.04, ix0 + i * Wn / 5, yc - 0.15, z)); if (CK === 'truss_chain') for (let i = 0; i < 2; i++) add(M('#3a3a40', { r: 0.4, m: 0.7 }), B(0.03, 0.55, 0.03, ix0 + (i + 1) * Wn / 3, yc - 0.6, z)); } stats.ceil++; }
  else if (CK === 'lines' || CK === 'bulb_string') { for (let k = 0; k < 2; k++) { const zz = zb + 0.8 + k * 1.6; add(M('#3a3028'), B(Wn, 0.012, 0.012, ix0 + Wn / 2, WH - 0.15, zz)); for (let i = 0; i < Wn; i += 2) { if (CK === 'lines') add(M([th.furnSet.fab, th.furnSet.fab2, '#c8b890', '#8a6a5a'][(i + k) % 4], { r: 1, ds: true }), B(0.4, 0.4, 0.02, ix0 + i + 0.6, WH - 0.38, zz)); else { addNo(M('#fff0c0', { glow: 1.6 }), new THREE.SphereGeometry(0.04, 6, 4).translate(ix0 + i + 0.5, WH - 0.24, zz)); } } } if (CK === 'bulb_string') { lamps.push({ pos: new THREE.Vector3(ix0 + Wn / 2, WH - 0.4, zb + 1.2), color: th.light.col, power: 0.8, dist: 8 }); } stats.ceil++; }
  else if (CK === 'cables' || CK === 'pipes') { const pm = M(CK === 'pipes' ? '#6a5a4a' : '#3a4046', { r: 0.4, m: 0.6 }); for (let k = 0; k < 3; k++) add(pm, new THREE.CylinderGeometry(0.05 + k * 0.015, 0.05 + k * 0.015, Wn, 8).rotateZ(Math.PI / 2).translate(ix0 + Wn / 2, WH - 0.15 - k * 0.12, zb + 0.25 + k * 0.08)); for (let x = ix0 + 1; x <= ix1; x += 3) add(pm, new THREE.CylinderGeometry(0.04, 0.04, ze - zb, 8).rotateX(Math.PI / 2).translate(x, WH - 0.1, (zb + ze) / 2)); if (CK === 'pipes') for (let i = 0; i < 3; i++) addNo(M('#6a8ab0', { r: 0.1, op: 0.6 }), new THREE.SphereGeometry(0.025, 6, 4).translate(ix0 + 1.5 + i * 3, WH - 0.35, zb + 0.4)); stats.ceil++; }
  else if (CK === 'panel_grid') { for (let x = ix0 + 1; x <= ix1 - 1; x += 3) for (let z = zb + 1; z <= ze; z += 2) addNo(M('#f4f4ff', { glow: 1.0 }), B(0.8, 0.03, 0.5, x + 0.5, WH - 0.04, z)); lamps.push({ pos: new THREE.Vector3(ix0 + Wn / 2, WH - 0.3, (zb + ze) / 2 + 1), color: 0xf4f4ff, power: 0.9, dist: 9 }); stats.ceil++; }
  else if (CK === 'chandelier_ring') { /* 灯りで作る */ }
  else if (CK === 'cloth' || CK === 'woven') { const cl = M(th.ceil.c, { r: 1, ds: true, op: 0.55 }); for (let x = ix0; x < ix1; x += 3) { const pl = new THREE.PlaneGeometry(1.2, ze - zb, 4, 1); const p = pl.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i) / 0.6; p.setZ(i, -0.18 * (1 - (u * u))); } pl.rotateX(-Math.PI / 2); pl.translate(x + 1, WH + 0.15, (zb + ze) / 2); addNo(cl, pl); } stats.ceil++; }   // 布の天井：細い帯を間をあけて（下を隠さない・少し透ける）
  else if (CK === 'ridge') { add(M(th.furnSet.wood2), new THREE.CylinderGeometry(0.06, 0.06, ze - zb + 1, 8).rotateX(Math.PI / 2).translate(ix0 + Wn / 2, WH + 0.6, (zb + ze) / 2)); for (const s2 of [-1, 1]) { const len = Math.min(2.2, Wn / 2); const pl = new THREE.PlaneGeometry(len, ze - zb + 1); pl.rotateX(-Math.PI / 2); pl.rotateZ(s2 * 0.5); const ex = s2 > 0 ? ix0 + Wn - len / 2 * Math.cos(0.5) : ix0 + len / 2 * Math.cos(0.5); pl.translate(ex, WH + 0.05 + len / 2 * Math.sin(0.5), (zb + ze) / 2); addNo(M(th.wall.c1, { r: 1, ds: true, op: 0.6 }), pl); } for (let z = zb + 1; z <= ze; z += 2) add(M(th.furnSet.wood2), new THREE.CylinderGeometry(0.03, 0.03, Wn, 6).rotateZ(Math.PI / 2).translate(ix0 + Wn / 2, WH + 0.1, z)); stats.ceil++; }   // 帆布の棟：棟木と、壁ぎわだけの斜めの布（真ん中はあけて下を見せる）
  else if (CK === 'broken') { for (let x = ix0 + 1; x <= ix1; x += 2) { const ang = ((x * 7) % 5 - 2) * 0.12; const len = (ze - zb) * (0.4 + ((x * 3) % 4) * 0.2); add(cm, new THREE.BoxGeometry(0.14, 0.14, len).rotateX(ang).translate(x, yc - 0.1 - Math.abs(ang), zb + len / 2)); } if (hi) for (let k = 0; k < 2; k++) { const lx = ix0 + 2 + k * Math.max(3, Wn - 5); const sh = new THREE.CylinderGeometry(0.4, 0.8, WH + 0.5, 10, 1, true); sh.translate(lx, (WH + 0.5) / 2, zb + 1.5 + k); addNo(M('#fff4e0', { op: 0.07, glow: 0.4, ds: true }), sh); } lamps.push({ pos: new THREE.Vector3(ix0 + 2, WH - 0.2, zb + 1.5), color: 0xd8e4f0, power: 0.9, dist: 9 }); stats.ceil++; }
  // ---------------- 吊るす灯り・部屋の光 ----------------
  const LK = th.light.kind; const hang = (px, pz) => {
    const yb = WH - 0.08; const gl = M('#fff0c8', { glow: 1.6, gc: '#' + new THREE.Color(th.light.col).getHexString() });
    if (LK === 'chandelier' || CK === 'chandelier_ring' || LK === 'marquee') { const gm = gilt || metal; add(gm, B(0.02, yb - 2.15, 0.02, px, (yb + 2.15) / 2, pz)); add(gm, new THREE.TorusGeometry(0.32, 0.02, 6, 18).rotateX(Math.PI / 2).translate(px, 2.15, pz)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; addNo(gl, new THREE.SphereGeometry(0.035, 6, 4).translate(px + Math.cos(a) * 0.32, 2.21, pz + Math.sin(a) * 0.32)); } addNo(M('#e8f4ff', { glow: 0.8, op: 0.7 }), new THREE.ConeGeometry(0.12, 0.25, 8).rotateX(Math.PI).translate(px, 2.05, pz)); return true; }
    if (LK === 'pendant' || LK === 'cage_lamp' || LK === 'hurricane' || LK === 'pierced_brass' || LK === 'ship_lantern' || LK === 'gas_brass' || LK === 'bulb_string' || LK === 'banker') { add(M('#2e2e32', { r: 0.6, m: 0.5 }), B(0.012, yb - 2.1, 0.012, px, (yb + 2.1) / 2, pz)); if (LK === 'pendant') add(M('#e8e0d0', { r: 0.4 }), new THREE.ConeGeometry(0.18, 0.16, 14, 1, true).translate(px, 2.08, pz)); else if (LK === 'pierced_brass') add(metal, new THREE.SphereGeometry(0.14, 8, 6).translate(px, 2.05, pz)); else add(metal, new THREE.CylinderGeometry(0.08, 0.1, 0.18, 8).translate(px, 2.06, pz)); addNo(gl, new THREE.SphereGeometry(0.06, 8, 6).translate(px, 1.99, pz)); return true; }
    if (LK === 'float_orb') { for (let i = 0; i < 3; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M('#cfe4ff', { glow: 1.8 })); o.geometry.userData.own = true; o.position.set(px + (i - 1) * 0.6, 2.1 + (i % 2) * 0.15, pz + (i % 2) * 0.3); o.castShadow = false; g.add(o); scene.animated.push({ kind: 'bob', obj: o, base: o.position.y, ph: i * 1.7 + px, amp: 0.08 }); } return true; }
    if (LK === 'led' || LK === 'panel' || LK === 'neon') { addNo(M(LK === 'neon' ? '#ff7ad8' : '#cfffff', { glow: 1.4 }), B(1.6, 0.03, 0.06, px, WH - 0.06, pz)); return true; }
    return false;
  };
  const spots = Wn >= 10 ? [ix0 + Wn * 0.28, ix0 + Wn * 0.72] : [ix0 + Wn / 2]; const pz0 = iz0 + Hn * 0.45;
  spots.forEach((sx) => { let px = Math.floor(sx) + 0.5, pz = Math.floor(pz0) + 0.5; hang(px, pz); lamps.push({ pos: new THREE.Vector3(px, 2.1, pz), color: th.light.col, power: LK === 'daylight' ? 1.1 : 1.35, dist: 10 }); });
  lamps.push({ pos: new THREE.Vector3(ix0 + Wn / 2, 2.0, iz1 - 1), color: th.light.col, power: 0.8, dist: 8 });   // 入口の側（カメラの手前）
  // ---------------- 家具 ----------------
  let fstats = {}; try { const fr = buildFurn82({ map, T, walk, wallAt: isWall, add, theme: th, lamps, animated: scene.animated }); fstats = fr.stats; } catch (e) { ctx.stats.furnError = String(e && e.message || e); console.warn('furn82', e); }
  mg.build(g); mgNo.build(g, { shadow: false });
  { const lum = (h) => { const c = new THREE.Color(h || '#808080'); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }; const fl = (lum(th.floor.c1) + lum(th.floor.c2 || th.floor.c1)) / 2;   /* 床の明るさ（線形）で、まわりの光を決める：暗い床の町ほど上げる */
    const a82 = !hi ? (fl < 0.06 ? 1.45 : fl < 0.15 ? 1.15 : 0.85) : (fl < 0.06 ? 1.0 : 0); if (a82) { scene.ambient82 = a82; scene.ambient = Math.max(scene.ambient || 0, a82); } stats.ambient82 = a82; stats.floorLum = +fl.toFixed(3); }   // 低画質（点の光が 4 つ・スマホの既定）：まわりの光を上げる（0.5 では暗い木の床の町がほぼ黒く見えた）
  Object.assign(ctx.stats, { i82: stats, furn82: fstats });
  return g;
}
