/* =========================================================
   WorldBuilder3D（Phase 1）：ポヨ村以外の屋外・ダンジョン（field／town／dungeon）を、2D版のタイルから汎用的に3D化する
   ・座標は TerrainBuilder3D と同じ（タイル x → X、タイル y → Z、1タイル＝1単位、中心は +0.5）
   ・地面：区画（チャンク）ごとの格子。高さはタイルの種類から（水は低く、丘・山は高く）。heightAt() に一本化
   ・塗り分け：タイル → 2枚のデータテクスチャ（splat：石畳／土／岩／平滑、tint：色）＋地域テーマ（themes.js）
   ・水・溶岩・雲海：それぞれ1枚の面（揺らぎのシェーダー）。壁・崖・洞窟の壁：タイルごとに立ち上げて材質ごとに結合
   ・山：手続き型の山の形を GPU インスタンスで。木：区画ごとのインスタンス（近い区画は精細・遠い区画は簡略の2段階 LOD）
   ・小物：タイルの種類 → Blender のモデル（manifest.js）。ワールドマップの村・城・洞窟・塔は目印のモデル
   ・当たり判定・出入り・イベントは2D版のまま（MapScene3D.resolve と World.onStep）。ここは見た目だけ
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4 } from '../engine/Materials.js';
import { MODELS } from '../assets/manifest.js';
import { rngFrom, sharedNoiseTexture } from './TerrainBuilder3D.js';
import { roundFor, roundedPillar, cornerFillet } from './Organic.js';
import { addCutout } from '../engine/Cutout.js';
import { LandmarkBuilder3D } from './LandmarkBuilder3D.js';
import { terraceInfo, stairFrac, buildTerraces } from './Terrace3D.js';
import { buildFountains, animateFountain } from './Fountain76.js';
import { voidMaterial, floatingRocks } from '../environment/Space76.js';
import { themeFor } from './themes.js';
import { Nature81 } from './Nature81.js';

function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, y) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, y * f); n += a; f *= 2.03; a *= 0.5; } return s / n; }

// タイル → 地面の高さ（歩ける所はほぼ 0）
const HEIGHT = { water: -0.55, deep: -0.8, shallow: -0.3, lava: -0.32, cloud: -1.7, puddle: -0.04, hill: 0.42, mountain: 0.85, cliff: 0.2, forest: 0.06, tree: 0.04, slag: 0.1 };
const WATERY = { water: 1, deep: 1, shallow: 1 };
const PAVED = { road: 1, stone: 1, path_stone: 1, floor_stone: 1, bld_door: 1, bridge: 1, dock: 1, stairs_down: 1, stairs_up: 1, meridian: 1 };   // v8.1 meridian：子午線を埋めた石の床（真鍮の線は Furniture81）
const WALL_TILES = { wall: 1, castle_wall: 1, wall_wood: 1, cave_wall: 1, bld_block: 1, window: 1, roof_blue: 1, roof_red: 1, roof_green: 1 };
const TREE_SOLID = { tree: 1, forest: 1 };
const LANDMARK = { village: 'lm_village', castle_icon: 'lm_castle', cave_icon: 'lm_cave', tower_icon: 'lm_tower' };
// タイル → 小物のモデル（manifest の id）
const PROP = {
  barrel: 'barrel', crate: 'crate', bench: 'bench', well: 'well', flowerbed: 'flowerbed', crops: 'crops', sign: 'sign', fence: 'fence', bush: 'bush_a',
  lamp: 'lamppost', torch: 'torch', fountain: 'fountain', stall: 'stall', stalactite: 'stalagmite', ore: 'ore', log: 'log', root: 'root', lever: 'lever',
  gate: 'gate', stairs_down: 'stairs_down', stairs_up: 'stairs_up', learn_rune: 'learn_rune', boss_mark: 'boss_mark', door_locked: 'door_locked', warp: 'warp',
  /* bookshelf：v7.3 から Furniture73（本が並ぶ形）で作る */ table: 'furn_table', counter: 'furn_counter', bed: 'furn_bed', pillar: 'furn_pillar', crystal: 'furn_crystal'
};

export class WorldBuilder3D {
  constructor(mats, models, quality) { this.mats = mats; this.models = models; this.quality = quality || 'high'; this.time = { value: 0 }; this.stats = {}; }

  // env（v7.6 環境リデザインのレシピのフック。js は three-src/src/environment/）：skipWall(t, x, z)／skipFloor(t, x, z)／skipProp(t, x, z) が true のマスは、汎用の壁・床・小物を作らない（レシピが作り直す）。skipOutTree(x, z)：町の外の木を置かない
  async build(map, theme, env) {
    const t0 = performance.now(); const hi = this.quality === 'high'; env = env || null; this.env = env;
    const W = map.w, H = map.h, kind = map.kind; const dungeon = kind === 'dungeon' || kind === 'interior'; const field = kind === 'field';
    const P = theme.placeDef || {}; this.theme = theme;
    const outdoorD = kind === 'dungeon' && !!P.outdoor;   // 森・草原・天空などの屋外のダンジョン：外側も地形が続く
    const voidOut = dungeon && !outdoorD;
    const OUT = voidOut ? 3 : field ? 16 : outdoorD ? 10 : 14; this.OUT = OUT;
    const space = !!(field && map.def && map.def.space76); this.stats.space76 = space;   // v7.6 異空間（ゼロメア）：周りの海を宇宙空間に（Space76.js）
    const round = roundFor(map, theme); this.round = round; this.stats.round = round; this.stats.region = theme.region;   // v6.8 道・壁・境界線の丸み（Organic.js。まずアルカディアだけ）
    const group = new THREE.Group(); group.name = 'world3d_' + map.id;
    const rnd = rngFrom(4321 + W * 17 + H * 3);
    const clampT = (x, y) => map.tile(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)));
    const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? (voidOut ? '_void' : clampT(x, y)) : map.tile(x, y);
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    this.T = T;
    const TRI = terraceInfo(map); const lvY = TRI ? (x, z) => TRI.lvY(x, z) : () => 0; this.lvY = lvY;   // v7.6 町の段（js/rpg/terrace76.js・Terrace3D.js）
    // 水の上の橋・桟橋（下は水として扱う）
    const wet = new Set(); for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const t = map.tile(x, z); if ((t === 'bridge' || t === 'dock') && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => WATERY[T(x + dx, z + dz)])) wet.add(x + ',' + z); }
    if (env && env.wetTile) for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (env.wetTile(map.tile(x, z), x, z)) wet.add(x + ',' + z);   // v7.6 レシピが「下は海」とするマス（船の甲板の舷墻など）
    (map.buildings || []).forEach((bd) => { if (bd.type === 'ship') for (let z = bd.y; z < bd.y + bd.h; z++) for (let x = bd.x; x < bd.x + bd.w; x++) wet.add(x + ',' + z); });   // v7.6 船の建物の下は海（船体は ShipModel3D.js）
    const Tg = (x, z) => (wet.has(x + ',' + z) ? 'water' : T(x, z));   // 地面・水面用

    // ---------------- 高さ
    const baseH = (t) => (t === '_void' ? 0 : (HEIGHT[t] !== undefined ? HEIGHT[t] : 0));
    const noiseAmp = (t) => (t === 'hill' ? 0.32 : t === 'mountain' ? 0.5 : (t === 'grass' || t === 'grass2' || t === 'sand' || t === 'snow' || t === 'ash' || t === 'darkland') ? 0.1 : t === 'cliff' ? 0.15 : 0);
    // 頂点（タイルの角・辺・中心）：周りのタイルの重みつき平均（陸を重く＝岸がえぐれすぎない）
    const solidT76 = (t) => !!(window.Tiles && window.Tiles.isSolid(t));
    const GY = env && env.groundY ? env.groundY : null;   // v7.6 町の目玉（showpiece76.js）：水路の底など、地面の高さを決める所
    const vertexH = (x, z) => {
      if (GY) { const gy = GY(x, z); if (gy !== null && gy !== undefined) return gy; }
      const fx = Math.floor(x), fz = Math.floor(z); const ex = Math.abs(x - fx) < 1e-6, ez = Math.abs(z - fz) < 1e-6;
      const xs = ex ? [fx - 1, fx] : [fx], zs = ez ? [fz - 1, fz] : [fz];
      if (TRI) {   // 段のある町：通れるマス（階段は辺の高さ）だけで決める＝通れるマスは平ら・段の境は擁壁が隠す
        let wetB = null, hiLand = false; for (const tz of zs) for (const tx of xs) { const t = Tg(tx, tz); if (WATERY[t]) wetB = baseH(t); else if (inside(tx, tz) && TRI.lvY(tx, tz) > 0) hiLand = true; }
        if (wetB !== null && hiLand) return wetB;   // 上の段の岸：水の底まで下げる（水が見える。岸の壁と石の板が縁を隠す。歩く高さは heightAtWalk が平らにする）
        let ws = 0, wn = 0, s2 = 0, n2 = 0, amp2 = 0, stairNear = false;
        for (const tz of zs) for (const tx of xs) { const t = Tg(tx, tz); const ins = inside(tx, tz); const L = ins ? TRI.lvY(tx, tz) : 0;
          if (ins && TRI.isStair(map.tile(tx, tz))) { const d = TRI.dir(tx, tz); if (d) { ws += L + TRI.LH * Math.max(0, Math.min(1, stairFrac(x, z, tx, tz, d))); wn++; stairNear = true; continue; } }
          if (ins && !solidT76(map.tile(tx, tz)) && !WATERY[t]) { ws += baseH(t) + L; wn++; amp2 = Math.max(amp2, noiseAmp(t)); }
          const w = WATERY[t] ? 1 : 2; s2 += (baseH(t) + (WATERY[t] ? 0 : L)) * w; n2 += w; }
        const v = wn ? ws / wn : s2 / n2; return v + (amp2 && !stairNear ? (fbm(x * 0.33 + 7, z * 0.33 + 3) - 0.5) * amp2 * 1.2 : 0);
      }
      let s = 0, n = 0, amp = 0;
      for (const tz of zs) for (const tx of xs) { const t = Tg(tx, tz); const w = WATERY[t] || t === 'cloud' || t === 'lava' ? 1 : 2; s += baseH(t) * w; n += w; amp = Math.max(amp, noiseAmp(t)); }
      let shore = 0; if (round && n > 0) { let wv = 0, ld = 0; for (const tz of zs) for (const tx of xs) { if (WATERY[Tg(tx, tz)]) wv++; else ld++; } if (wv && ld) shore = (fbm(x * 0.9 + 31, z * 0.9 + 17) - 0.5) * 0.8; }   // v6.8 岸の高さを揺らす（岸の線がまっすぐにならない）
      return s / n + shore + (amp ? (fbm(x * 0.33 + 7, z * 0.33 + 3) - 0.5) * amp * 2 : 0);
    };
    if (this.slice) await this.slice();   // v7.6 つないだ世界：となりの地域を裏で組み立てるときは、ここで一度画面へ返す（止まる時間を短く）
    // ---------------- 地面（区画ごと）
    const S = hi ? 2 : 1; const CH = field ? 32 : 24;
    // v7.6 つないだ世界（js/rpg/world76.js）：となりの地域がある側は、地図の外の地面・海・木・山を作らない（となりの地域と重ならない）
    const J76 = field && window.World76 && window.World76.on && window.World76.on() ? window.World76.sides(map.id) : null; this.stats.join76 = J76 ? Object.keys(J76).filter((k) => J76[k]).join('') : null;
    const OW = J76 && J76.w ? 0 : OUT, OE = J76 && J76.e ? 0 : OUT, ON = J76 && J76.n ? 0 : OUT, OS = J76 && J76.s ? 0 : OUT;
    const gx0 = -OW, gz0 = -ON, gx1 = W + OE, gz1 = H + OS;
    const NX = (gx1 - gx0) * S + 1, NZ = (gz1 - gz0) * S + 1;
    const hgrid = new Float32Array(NX * NZ);
    const tHgt = performance.now();
    // v7.6 フィールドの高低差（field_kit の terraceField）：丘・山のまわりの高さを段々に（棚田・岩棚のような段）。通れるマスは変えない
    const TFLD = env && env.terraceField; const hillT = { hill: 1, mountain: 1, cliff: 1 };
    const terr = (h) => { const q = 0.42; const b = Math.floor(h / q); const f = h / q - b; const e = f < 0.78 ? 0 : (f - 0.78) / 0.22; return (b + e * e * (3 - 2 * e)) * q; };
    // 丘の奥行き（丘でないマスからの距離）：奥ほど高い台地にして段を重ねる
    let hdep = null; if (TFLD) { hdep = new Int16Array(W * H).fill(-1); const q0 = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (!hillT[map.tile(x, z)]) { hdep[z * W + x] = 0; q0.push(x, z); }
      for (let i = 0; i < q0.length; i += 2) { const x = q0[i], z = q0[i + 1], d = hdep[z * W + x]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= H || hdep[nz * W + nx] >= 0) continue; hdep[nz * W + nx] = d + 1; q0.push(nx, nz); } } }
    const depAt = (x, z) => (hdep && x >= 0 && z >= 0 && x < W && z < H ? Math.max(0, hdep[z * W + x]) : 0);
    const vertexF = TFLD ? (x, z) => { const h = vertexH(x, z); const fx = Math.floor(x), fz = Math.floor(z); const xs = Math.abs(x - fx) < 1e-6 ? [fx - 1, fx] : [fx], zs = Math.abs(z - fz) < 1e-6 ? [fz - 1, fz] : [fz]; let hh = 0, dsum = 0, dn = 0; for (const tz of zs) for (const tx of xs) { dn++; if (hillT[Tg(tx, tz)]) { hh++; dsum += Math.min(4, depAt(tx, tz)); } } if (!hh) return h; const k = hh / dn; return terr(h + k * (0.5 + (dsum / hh) * 0.32)); } : vertexH;   // 丘のマスは 0.5＋奥行き×0.32 だけ高く（段に丸める）
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) hgrid[j * NX + i] = vertexF(gx0 + i / S, gz0 + j / S);
    this.stats.heightMs = Math.round(performance.now() - tHgt);
    const heightAt = (x, z) => {
      const fx = (x - gx0) * S, fz = (z - gz0) * S; const i = Math.max(0, Math.min(NX - 2, Math.floor(fx))), j = Math.max(0, Math.min(NZ - 2, Math.floor(fz)));
      const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j));
      const a = hgrid[j * NX + i], b = hgrid[j * NX + i + 1], c = hgrid[(j + 1) * NX + i], d = hgrid[(j + 1) * NX + i + 1];
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
    const heightAtRaw = heightAt;
    const flat = env && env.flatTile ? (x, z) => env.flatTile(T(Math.floor(x), Math.floor(z))) : null;   // v7.6 レシピが「床の高さ 0 で平ら」とするマス（船の甲板。縁の海のマスに引っぱられて沈まない）
    const quay = new Set(); if (TRI) for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (!(lvY(x, z) > 0) || WATERY[map.tile(x, z)] || TRI.isStair(map.tile(x, z))) continue; let wv = false; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (WATERY[T(x + dx, z + dz)]) wv = true; if (wv) quay.add(x + ',' + z); }
    this.quay = quay;   // v7.6 上の段の岸のマス（歩く高さは段の高さで平ら。Terrace3D が石の板を張る）
    const WY = env && env.walkY ? env.walkY : null;   // v7.6 町の目玉：岸の石畳・反り橋の歩く高さ
    const heightAtWalk = (x, z) => (WY && WY(x, z) !== null ? WY(x, z) : wet.has(Math.floor(x) + ',' + Math.floor(z)) ? 0.05 + lvY(Math.floor(x), Math.floor(z)) : quay.has(Math.floor(x) + ',' + Math.floor(z)) ? lvY(Math.floor(x), Math.floor(z)) + 0.04 : flat && flat(x, z) ? 0.0 : heightAtRaw(x, z));
    this.heightAt = heightAtWalk;

    if (this.slice) await this.slice();
    // ---------------- 塗り分けのテクスチャ（2テクセル／タイル）
    const tSplat = performance.now();
    const SP = round ? 4 : 2, SW = (gx1 - gx0) * SP, SH = (gz1 - gz0) * SP;   // v6.8 丸みを使うマップは細かく（4テクセル／タイル）して広くぼかす
    const sp = new Float32Array(SW * SH * 4), tn = new Float32Array(SW * SH * 3);
    const col = new THREE.Color(); const grassC = new THREE.Color(theme.grass);
    const G = theme.ground || {};
    const tileLook = (t) => {
      // [R 石畳, G 土, B 岩, A 平滑], 色
      if (t === '_void') return [[0, 0, 1, 0], '#0a0806'];
      if (PAVED[t]) return [[1, 0, 0, 0], G[t] || '#c8c0b0'];
      if (t === 'road') { const dirt = field || !!(map.def && map.def.dirtRoad81); return [[dirt ? 0 : 1, dirt ? 1 : 0, 0, 0], G.road]; }   // v8.1 dirtRoad81：村の踏み跡は土の道（js/data/remake81-*.js）
      if (t === 'sand') return [theme.sandSplat || [0, 0.2, 0, 1], G.sand];   // v7.9 砂漠は土の粒を混ぜる（themes.js の sandSplat）
      if (t === 'snow') return [[0, 0, 0, 1], G.snow];
      if (t === 'ash') return [[0, 0.3, 0.3, 0.7], G.ash];
      if (t === 'darkland') return [[0, 0.5, 0.2, 0.4], G.darkland];
      if (t === 'slag') return [[0, 0, 1, 0], G.slag];
      if (t === 'cave_floor' || t === 'moss' || t === 'puddle') return [[0, 0.4, 0.6, 0], t === 'moss' ? G.moss : P.floor || G.cave_floor];
      if (t === 'floor_wood' || t === 'carpet' || t === 'door') return [[0, 1, 0, 0], '#8a6a4a'];
      if (t === 'crops') return [[0, 1, 0, 0], G.crops];
      if (WATERY[t] || t === 'lava') return [[0, 0.3, 0.7, 0.3], '#8a8070'];
      if (t === 'cloud') return [[0, 0, 0, 1], '#ffffff'];
      if (t === 'mountain' || t === 'cliff') return [[0, 0.2, 0.8, 0], theme.rock];
      if (WALL_TILES[t]) return [[0, 0.3, 0.7, 0], P.floor || '#8a8070'];
      if (t === 'hill') return [[0, 0.12, 0, 0], null];
      if (TREE_SOLID[t]) return [[0, 0.45, 0, 0], null];
      return [[0, 0, 0, 0], null];   // 草（地域の色）
    };
    const lookCache = {};
    if (round) {   // v6.8 丸み：テクセルが4倍なので、タイルごとに1回だけ調べて SP×SP テクセルへ書く（結果は下のループと同じ）
      const colCache = {}; const TW = gx1 - gx0, TH = gz1 - gz0;
      for (let tz = 0; tz < TH; tz++) for (let tx = 0; tx < TW; tx++) {
        const t = Tg(gx0 + tx, gz0 + tz); const L = lookCache[t] || (lookCache[t] = tileLook(t));
        let cc = colCache[t]; if (!cc) { if (L[1]) col.set(L[1]); else col.copy(grassC); if (dungeon && !L[1] && P.floor) col.set(P.floor); else if (kind === 'interior' && !L[1]) col.set('#8a7660');   /* v8.1 屋内で色の決まっていない家具の下（机・黒板など）が草の色にならないように */ cc = colCache[t] = [col.r, col.g, col.b]; }
        for (let jj = 0; jj < SP; jj++) { let o = (tz * SP + jj) * SW + tx * SP; for (let ii = 0; ii < SP; ii++, o++) { sp[o * 4] = L[0][0]; sp[o * 4 + 1] = L[0][1]; sp[o * 4 + 2] = L[0][2]; sp[o * 4 + 3] = L[0][3]; tn[o * 3] = cc[0]; tn[o * 3 + 1] = cc[1]; tn[o * 3 + 2] = cc[2]; } }
      }
    } else for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
      const tx = Math.floor(gx0 + (i + 0.5) / SP), tz = Math.floor(gz0 + (j + 0.5) / SP); const t = Tg(tx, tz);
      const L = lookCache[t] || (lookCache[t] = tileLook(t)); const o = (j * SW + i);
      sp[o * 4] = L[0][0]; sp[o * 4 + 1] = L[0][1]; sp[o * 4 + 2] = L[0][2]; sp[o * 4 + 3] = L[0][3];
      if (L[1]) col.set(L[1]); else col.copy(grassC); if (dungeon && !L[1] && P.floor) col.set(P.floor); else if (kind === 'interior' && !L[1]) col.set('#8a7660');   /* v8.1 屋内で色の決まっていない家具の下（机・黒板など）が草の色にならないように */
      tn[o * 3] = col.r; tn[o * 3 + 1] = col.g; tn[o * 3 + 2] = col.b;
    }
    const blur = (arr, ch, rad) => { const tmp = new Float32Array(arr.length); for (const [dx, dy] of [[1, 0], [0, 1]]) { const src = dx ? arr : tmp, dst = dx ? tmp : arr; for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) for (let c = 0; c < ch; c++) { let s = 0, n = 0; for (let k = -rad; k <= rad; k++) { const ii = Math.min(SW - 1, Math.max(0, i + k * dx)), jj = Math.min(SH - 1, Math.max(0, j + k * dy)); s += src[(jj * SW + ii) * ch + c]; n++; } dst[(j * SW + i) * ch + c] = s / n; } } };
    // v6.8 丸み：テクセルが4倍になるので、ぼかしは移動和（1テクセルあたり定数回）で計算する（結果は上の blur と同じ箱フィルタ）
    const blurFast = (arr, ch, rad) => {
      const tmp = new Float32Array(arr.length); const inv = 1 / (2 * rad + 1);
      for (let j = 0; j < SH; j++) { const row = j * SW; for (let c = 0; c < ch; c++) { let s = 0; for (let k = -rad; k <= rad; k++) s += arr[(row + Math.min(SW - 1, Math.max(0, k))) * ch + c]; for (let i = 0; i < SW; i++) { tmp[(row + i) * ch + c] = s * inv; s += arr[(row + Math.min(SW - 1, i + rad + 1)) * ch + c] - arr[(row + Math.max(0, i - rad)) * ch + c]; } } }
      for (let i = 0; i < SW; i++) for (let c = 0; c < ch; c++) { let s = 0; for (let k = -rad; k <= rad; k++) s += tmp[(Math.min(SH - 1, Math.max(0, k)) * SW + i) * ch + c]; for (let j = 0; j < SH; j++) { arr[(j * SW + i) * ch + c] = s * inv; s += tmp[(Math.min(SH - 1, j + rad + 1) * SW + i) * ch + c] - tmp[(Math.max(0, j - rad) * SW + i) * ch + c]; } }
    };
    if (round) { blurFast(sp, 4, 2); blurFast(sp, 4, 1); blurFast(tn, 3, 2); blurFast(tn, 3, 1); } else { blur(sp, 4, 1); blur(tn, 3, 1); }
    const toTex = (arr, ch) => { const n = SW * SH; const d = new Uint8Array(n * 4); for (let k = 0; k < n; k++) { for (let c = 0; c < 4; c++) d[k * 4 + c] = c < ch ? Math.round(Math.max(0, Math.min(1, ch === 3 ? Math.pow(arr[k * 3 + c], 1 / 2.2) : arr[k * ch + c])) * 255) : 255; } const t = new THREE.DataTexture(d, SW, SH, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; };
    const splat = toTex(sp, 4), tint = toTex(tn, 3); this.own(splat); this.own(tint);   // v7.6 地図ごとの画像（捨てるときに GPU からも消す）
    this.stats.splatMs = Math.round(performance.now() - tSplat);
    const groundMat = this.groundMaterial(splat, tint, gx0, gz0, gx1 - gx0, gz1 - gz0, theme, round);
    if (this.slice) await this.slice();
    // 区画ごとのメッシュ
    const chunkRanges = (a0, a1) => { const out = []; for (let a = a0; a < a1; a += CH) out.push([a, Math.min(a1, a + CH)]); return out; };
    let groundTris = 0;
    for (const [cz0, cz1] of chunkRanges(gz0, gz1)) for (const [cx0, cx1] of chunkRanges(gx0, gx1)) {
      if (voidOut) { let any = false; for (let z = cz0; z < cz1 && !any; z++) for (let x = cx0; x < cx1 && !any; x++) if (inside(x, z)) any = true; if (!any) continue; }
      const nx = (cx1 - cx0) * S + 1, nz = (cz1 - cz0) * S + 1;
      const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const gi = (cx0 - gx0) * S + i, gj = (cz0 - gz0) * S + j; const x = gx0 + gi / S, z = gz0 + gj / S; const k = j * nx + i;
        pos[k * 3] = x; pos[k * 3 + 1] = hgrid[gj * NX + gi]; pos[k * 3 + 2] = z; uv[k * 2] = x / 4; uv[k * 2 + 1] = z / 4;
      }
      const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0;
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.userData.own = true; groundTris += idx.length / 3;
      const mesh = new THREE.Mesh(geo, groundMat); mesh.receiveShadow = true; mesh.name = 'ground_' + cx0 + '_' + cz0; group.add(mesh);
    }
    if (voidOut) { const under = new THREE.Mesh(new THREE.PlaneGeometry(W + 80, H + 80), new THREE.MeshBasicMaterial({ color: 0x050403 })); under.rotation.x = -Math.PI / 2; under.position.set(W / 2, -2.2, H / 2); group.add(under); }
    this.stats.groundTris = groundTris;

    if (this.slice) await this.slice();
    // ---------------- 水・溶岩・雲海
    this.surfaces = [];
    let spaceRim = null;   // v7.6 異空間：色の r＝角を囲む4マスのうち陸の割合（岸のそばの光る縁）
    // v7.6 つないだ世界：水の色は世界の座標から決める（地図の境目・海の地図との境目で切れない）
    //   色合い＝まわりの地域の水の色を、地域の長方形からの距離で重みづけ（中は自分の色、境目は半分ずつ、遠い沖は外洋の色）
    //   深さ＝いちばん近い陸からの距離（World76.landDist。岸の近くは明るく、沖は深い色）。タイルの種類（浅瀬・海・深い海）は乗り物と敵の出方にだけ使う
    let seaBlend = null;
    if (J76 && window.World76 && window.World76.landDist) { const W76 = window.World76; const o = W76.origin(map.id);
      const regs = (W76.REGIONS || []).map((id) => { let th = null; try { th = themeFor({ id, kind: 'field', def: (window.MAP_DEFS || {})[id] || {} }); } catch (e) { th = null; } return th ? { id, w: new THREE.Color(th.water), d: new THREE.Color(th.deep) } : null; }).filter(Boolean);
      const ocW = new THREE.Color('#2c6a9c'), ocD = new THREE.Color('#163c68'), sh = new THREE.Color('#6ab8c8'); const L2 = 24 * 24;
      seaBlend = (arr, cx, cz, t) => { if (!WATERY[t] && t !== 'water') return arr; const gx = o.x + cx, gz = o.y + cz;
        let ws = 0.03, wr = ocW.r * 0.03, wg = ocW.g * 0.03, wb = ocW.b * 0.03, dr = ocD.r * 0.03, dg = ocD.g * 0.03, db = ocD.b * 0.03;
        for (const r of regs) { const dd = W76.distTo(r.id, gx, gz); if (dd > 72) continue; const k = Math.exp(-(dd * dd) / L2); ws += k; wr += r.w.r * k; wg += r.w.g * k; wb += r.w.b * k; dr += r.d.r * k; dg += r.d.g * k; db += r.d.b * k; }
        let ld = 99; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) ld = Math.min(ld, W76.landDist(Math.floor(gx + dx), Math.floor(gz + dz)));
        const dep = Math.max(0, Math.min(1, (ld - 1.5) / 12)); const near = Math.max(0, Math.min(1, 1 - (ld - 0.5) / 2.5)) * 0.55;
        let r0 = (wr + (dr - wr) * dep) / ws, g0 = (wg + (dg - wg) * dep) / ws, b0 = (wb + (db - wb) * dep) / ws;
        r0 += (sh.r - r0) * near; g0 += (sh.g - g0) * near; b0 += (sh.b - b0) * near; return [r0, g0, b0]; }; }
    const surf = (test, y, mat, name, margin) => {
      const qs = [];
      for (let z = gz0; z < gz1; z++) for (let x = gx0; x < gx1; x++) { if (!margin && !inside(x, z)) continue; if (test(Tg(x, z), x, z)) qs.push([x, z]); }
      if (!qs.length) return null;
      const pos = new Float32Array(qs.length * 12), uv = new Float32Array(qs.length * 8), colA = new Float32Array(qs.length * 12), idx = new Uint32Array(qs.length * 6);
      const c = new THREE.Color();
      const colOf = (t) => (t === 'deep' ? theme.deep : t === 'shallow' ? '#6ab8c8' : t === 'lava' ? '#ff6a1a' : t === 'cloud' ? '#ffffff' : theme.water);
      // v6.8 丸み：角の色＝その角を囲む4マスの水の色の平均（浅瀬と深みの境がタイルの直線にならない）
      const cc = new THREE.Color(); const cornerCol = (cx, cz, own) => { let r = 0, g = 0, b = 0, n = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const t = Tg(cx + dx, cz + dz); if (!WATERY[t]) continue; cc.set(colOf(t)); r += cc.r; g += cc.g; b += cc.b; n++; } return n ? [r / n, g / n, b / n] : own; };
      qs.forEach(([x, z], k) => {
        let t = Tg(x, z); if (round && !WATERY[t] && t !== 'lava' && t !== 'cloud') t = 'water'; c.set(colOf(t));
        const corners = [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]];
        const yy = (name === 'water' && env && env.waterY && env.waterY(x, z) !== null) ? env.waterY(x, z) : y;   // v7.6 水路の水面（町の目玉）
        corners.forEach(([cx, cz], m) => { pos.set([cx, yy, cz], k * 12 + m * 3); uv.set([cx / 8, cz / 8], k * 8 + m * 2); let cv = spaceRim ? spaceRim(cx, cz) : round && (WATERY[t] || t === 'water') ? cornerCol(cx, cz, [c.r, c.g, c.b]) : [c.r, c.g, c.b]; if (seaBlend && !spaceRim && name === 'water') cv = seaBlend(cv, cx, cz, t); colA.set(cv, k * 12 + m * 3); });
        idx.set([k * 4, k * 4 + 2, k * 4 + 1, k * 4 + 1, k * 4 + 2, k * 4 + 3], k * 6);
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.own = true;
      const m = new THREE.Mesh(g, mat); m.name = name; m.receiveShadow = true; m.renderOrder = 2; group.add(m); this.surfaces.push(m); return m;
    };
    // v6.8 丸み：水面を岸のとなりのマスまで広げる（岸の線は地面の高さで決まる＝タイルの四角い縁が出ない）
    const nearWater = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (WATERY[Tg(x + dx, z + dz)]) return true; return false; };
    if (space) { spaceRim = (cx, cz) => { let n = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (!WATERY[Tg(cx + dx, cz + dz)]) n++; return [n / 4, 0, 0]; }; surf((t, x, z) => !!WATERY[t] || (t !== 'lava' && t !== 'cloud' && !WALL_TILES[t] && t !== '_void' && nearWater(x, z)), -0.2, voidMaterial(this.time), 'space76_void', true); spaceRim = null; }
    else surf((t, x, z) => !!WATERY[t] || (round && t !== 'lava' && t !== 'cloud' && !WALL_TILES[t] && t !== '_void' && nearWater(x, z)), -0.2, this.waterMaterial(), 'water', !dungeon);
    surf((t) => t === 'lava', -0.16, this.lavaMaterial(), 'lava', !dungeon);
    surf((t) => t === 'cloud', -0.95, this.cloudMaterial(), 'cloudsea', !dungeon);

    if (this.slice) await this.slice();
    // ---------------- 壁・崖・洞窟の壁（材質ごとに結合）
    const M = this.mats; const wb = new Batch();
    const wallMat = (t) => {
      if (t === 'cave_wall' || (t === 'wall' && P.wall === 'rock')) return M.tinted('stonewall', P.wallTint || '#8a7a6a');
      if (t === 'wall_wood' || (t === 'wall' && P.wall === 'wood')) return M.get('planks');
      if (t === 'castle_wall') return M.tinted('stonewall', theme.region === 'dark' ? '#6a6070' : P.wall === 'stone' ? (P.wallTint || '#c8c0b4') : '#c8c0b4');
      if (t === 'bld_block') return M.tinted('plaster', theme.plaster || '#fff6e6');
      if (t === 'window') return M.get('glassCold');
      if (/^roof_/.test(t)) return M.roof(t === 'roof_blue' ? '#3f5f9f' : t === 'roof_red' ? '#a8483a' : '#3f8a5a');
      return P.wall === 'metal' ? M.tinted('stonewall', '#8a9098') : M.tinted('stonewall', P.wallTint || '#b8b0a4');
    };
    const wallH = (t) => (t === 'castle_wall' ? (dungeon ? 2.2 : 2.6) : t === 'cave_wall' ? 2.0 : t === 'wall_wood' ? 2.0 : /^roof_/.test(t) ? 2.8 : 2.2);
    const covered = new Set(); for (const b of map.buildings) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) covered.add(x + ',' + y);
    const rockSpots = []; const tWall = performance.now();
    let walls = 0;
    // v6.8 丸み（Organic.js）：岩壁・石壁・城壁・崖・ダンジョンの外周は、外に出た角を丸くした柱にし、内側の角に丸い隅を足す
    const NB4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const solidT = (n) => !!(WALL_TILES[n] || n === '_void' || n === 'mountain' || n === 'cliff');
    const openAt = (x, z) => !solidT(T(x, z));
    const any4 = (x, z) => openAt(x + 1, z) || openAt(x - 1, z) || openAt(x, z + 1) || openAt(x, z - 1);
    const inRange = (x, z) => (dungeon ? x >= -1 && z >= -1 && x <= W && z <= H : inside(x, z));
    const cliffH = (x, z) => 1.25 + vnoise(x * 0.7, z * 0.7) * 0.6;
    const cellH = (x, z) => {   // そのマスに立てる壁の高さ（立てないマスは 0）。下のループと同じ決め方
      if (!inRange(x, z)) return 0; const t = T(x, z);
      if (t === '_void') return any4(x, z) ? (openAt(x, z - 1) && !openAt(x, z + 1) ? 0.7 : 2.0) : 0;
      if (t === 'cliff') return cliffH(x, z) + 0.05;
      if (!WALL_TILES[t] || (t === 'bld_block' && covered.has(x + ',' + z)) || (dungeon && !any4(x, z))) return 0;
      return dungeon && openAt(x, z - 1) && !openAt(x, z + 1) ? 0.7 : wallH(t);
    };
    const ROUNDABLE = { cave_wall: 1, wall: 1, castle_wall: 1, cliff: 1, _void: 1 };
    const rockish = (t) => t === 'cave_wall' || t === 'cliff' || ((t === 'wall' || t === '_void') && P.wall === 'rock' && kind !== 'town');
    const roundMat = (t) => (t === '_void' ? wallMat(P.wall === 'rock' ? 'cave_wall' : 'castle_wall') : t === 'cliff' ? M.tinted('stonewall', theme.rock) : wallMat(t));
    const topAmpOf = (t, h) => (rockish(t) ? Math.min(0.18, h * 0.12) : 0);
    const pillar = (t, x, z, h) => {
      const rk = rockish(t);
      wb.add(roundMat(t), roundedPillar({ x, z, h, y0: t === 'cliff' ? -0.25 : -0.12, r: rk ? 0.42 : 0.3, open: (dx, dz) => openAt(x + dx, z + dz), hN: (dx, dz) => cellH(x + dx, z + dz), overlap: 0.25,
        solidRound: (dx, dz) => { const n = T(x + dx, z + dz); return !!ROUNDABLE[n] && rockish(n) === rk && cellH(x + dx, z + dz) > 0; },
        wave: rk ? 0.12 : 0, topAmp: topAmpOf(t, h), uvS: t === 'cliff' ? 1.6 : 1.5 }), null);
    };
    let fillets = 0;
    for (let z = (dungeon ? -1 : 0); z < (dungeon ? H + 1 : H); z++) for (let x = (dungeon ? -1 : 0); x < (dungeon ? W + 1 : W); x++) {
      const t = T(x, z);
      if (env && env.skipWall && env.skipWall(t, x, z)) continue;   // v7.6 レシピが壁を作り直すマス
      const open = (dx, dz) => { const n = T(x + dx, z + dz); return !(WALL_TILES[n] || n === '_void' || n === 'mountain' || n === 'cliff'); };
      if (t === '_void') { if (open(1, 0) || open(-1, 0) || open(0, 1) || open(0, -1)) { const hv = open(0, -1) && !open(0, 1) ? 0.7 : 2.0; if (round) pillar(t, x, z, hv); else wb.add(wallMat(P.wall === 'rock' ? 'cave_wall' : 'castle_wall'), box(1, hv, 1, 1.5), M4(x + 0.5, hv / 2, z + 0.5)); walls++; } continue; }
      if (!WALL_TILES[t]) {
        if (t === 'cliff') { const h = cliffH(x, z); if (round) pillar(t, x, z, h + 0.05); else wb.add(M.tinted('stonewall', theme.rock), box(1.02, h, 1.02, 1.6), M4(x + 0.5, h / 2 + 0.05, z + 0.5)); walls++; if (rnd() < 0.3) rockSpots.push([x + 0.5, z + 0.5, h + 0.05]); }
        continue;
      }
      if (t === 'bld_block' && covered.has(x + ',' + z)) continue;   // 建物は BuildingBuilder3D が作る
      // 四方とも壁に囲まれた内側は省く（見えない）
      if (!dungeon || open(1, 0) || open(-1, 0) || open(0, 1) || open(0, -1)) {
        // 部屋の手前（南）の壁は低く：北側が床で南側が壁・外のとき（ジオラマ式。中が見える）
        const front = dungeon && open(0, -1) && !open(0, 1);
        const h = front ? 0.7 : wallH(t); const ly = lvY(x, z); if (round && ROUNDABLE[t] && !ly) pillar(t, x, z, h); else wb.add(wallMat(t), box(1, h, 1, 1.5), M4(x + 0.5, h / 2 + ly, z + 0.5)); walls++;
        if (t === 'castle_wall' && !dungeon && ((x + z) & 1) === 0) wb.add(wallMat(t), box(0.45, 0.35, 0.45, 1), M4(x + 0.5, h + 0.17 + ly, z + 0.5));   // 胸壁
        if (/^roof_/.test(t)) wb.add(M.roof('#3f5f9f'), box(1.1, 0.2, 1.1, 1), M4(x + 0.5, h + 0.1, z + 0.5));
        if (t === 'cave_wall' && rnd() < 0.5) rockSpots.push([x + 0.5, z + 0.5, h - 0.2]);
      }
    }
    // v6.8 丸み：内側の角（床のマスの角を2方向の壁が囲む）に丸い隅を足す
    if (round) {
      const FIL_SKIP = { door: 1, bld_door: 1, gate: 1, stairs_down: 1, stairs_up: 1, bridge: 1, dock: 1 };
      for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
        const t = T(x, z); if (!openAt(x, z) || WATERY[t] || t === 'lava' || t === 'cloud' || FIL_SKIP[t]) continue;
        for (let k = 0; k < 4; k++) {
          const e1 = NB4[(k + 3) % 4], e2 = NB4[k]; const ax = x + e1[0], az = z + e1[1], bx = x + e2[0], bz = z + e2[1];
          const ta = T(ax, az), tb = T(bx, bz); if (!ROUNDABLE[ta] || !ROUNDABLE[tb] || openAt(x + e1[0] + e2[0], z + e1[1] + e2[1])) continue;
          const ha = cellH(ax, az), hb = cellH(bx, bz); if (!ha || !hb) continue;
          if (env && env.skipWall && (env.skipWall(ta, ax, az) || env.skipWall(tb, bx, bz))) continue;   // v7.6 レシピの壁には丸い隅を足さない
          if (lvY(ax, az) || lvY(bx, bz) || lvY(x, z)) continue;   // v7.6 段の上は丸い隅を足さない（高さが合わない）
          const rk = rockish(ta) && rockish(tb); const hf = Math.min(ha, hb);
          wb.add(roundMat(ta), cornerFillet(x, z, k, hf, rk ? 0.42 : 0.3, { y0: -0.12, uvS: 1.5, topAmp: rk ? topAmpOf(ta, hf) : 0 }), null); fillets++;
        }
      }
    }
    this.stats.fillets = fillets;
    if (this.slice) await this.slice();
    // v7.6 町の段：擁壁・手すり・階段・坂（Terrace3D.js）
    if (TRI) { const tr = buildTerraces({ map, T, quay: this.quay, add: (m, g, mx) => wb.add(m, g, mx), M, theme, rnd: rngFrom(777 + W * 3 + H), style: (map.def && map.def.terrace76Style) || {} }); this.stats.terraceFaces = tr.faces; this.stats.terraceSteps = tr.steps; }
    this.stats.wallMs = Math.round(performance.now() - tWall);
    // 床板・じゅうたん（ダンジョン・町の中）
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const t0 = T(x, z); const t = (env && env.floorAs && env.floorAs(t0, x, z)) || t0;   // v7.6 レシピが「この小物の下は床板」とするマス（船の甲板の樽・木箱・帆柱）
      if (env && env.skipFloor && env.skipFloor(t, x, z)) continue;   // v7.6 レシピが床を作り直すマス
      const fy = lvY(x, z);
      if (t === 'floor_wood' || t === 'door') wb.add(M.get('planks'), box(1, 0.06, 1, 1.5), M4(x + 0.5, 0.03 + fy, z + 0.5));
      else if (t === 'carpet') wb.add(M.get('carpet'), box(1, 0.07, 1, 3), M4(x + 0.5, 0.035 + fy, z + 0.5));
      else if (t === 'bridge' || t === 'dock') { const w = wet.has(x + ',' + z); wb.add(M.tinted('planks', '#a07a52'), box(1.0, 0.1, 0.96, 1), M4(x + 0.5, (w ? 0.0 : 0.03) + fy, z + 0.5)); if (w && !fy) for (const sx of [-0.42, 0.42]) wb.add(M.get('timber'), box(0.12, 1.0, 0.12, 1), M4(x + 0.5 + sx, -0.5, z + 0.5 + sx * 0.0)); }
      if (t0 === 'door') for (const sx of [-0.5, 0.5]) wb.add(M.get('timber'), box(0.14, 2.0, 0.3, 1), M4(x + 0.5 + sx, 1.0, z + 0.5));
      if (t === 'slot_machine') { wb.add(M.tinted('planks', '#7a1a3a'), box(0.82, 1.45, 0.62, 1), M4(x + 0.5, 0.725, z + 0.5)); wb.add(M.get('gold'), box(0.86, 0.12, 0.66, 1), M4(x + 0.5, 1.5, z + 0.5)); }
      if (t === 'hole') { const d = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), new THREE.MeshBasicMaterial({ color: 0x050302 })); d.rotation.x = -Math.PI / 2; d.position.set(x + 0.5, 0.03, z + 0.5); group.add(d); }
    }
    wb.build(group);
    this.stats.walls = walls;

    if (this.slice) await this.slice();
    // ---------------- 区画（チャンク）へ置く小物・木・山
    const PCH = field ? 32 : 24;
    const buckets = new Map();
    const put = (id, m, x, z, color) => { const k = Math.floor(x / PCH) + ',' + Math.floor(z / PCH); if (!buckets.has(k)) buckets.set(k, { cx: (Math.floor(x / PCH) + 0.5) * PCH, cz: (Math.floor(z / PCH) + 0.5) * PCH, ids: {} }); const b = buckets.get(k); const e = b.ids[id] || (b.ids[id] = { m: [], c: [] }); e.m.push(m); e.c.push(color || null); };
    this.put = put; this.buckets = buckets;
    // v6.6 目印（町・城・洞窟・塔）の建物が立つ範囲：木・小物を置かない（LandmarkBuilder3D と同じ中心＝入口から正面の反対へ 0.5 マス）
    const LW = window.World; const lmZones = [];
    if (field && map.def && map.def.locations && window.LocationDesign) for (const L of map.def.locations) { const wp = map.warpAt(L.x, L.y); const f = (LW && LW.landmarkFace && wp) ? LW.landmarkFace(map, wp) : [0, 1]; lmZones.push({ x: L.x + 0.5 - f[0] * 0.5, z: L.y + 0.5 - f[1] * 0.5, r: L.icon === 'tower_icon' ? 1.85 : 2.85 }); }
    const nearLm = (x, z, k) => lmZones.length > 0 && lmZones.some((q) => (x - q.x) * (x - q.x) + (z - q.z) * (z - q.z) < q.r * q.r * (k || 1) * (k || 1));
    // 木（地域テーマ）
    const treeSet = theme.tree || ['pine', 'oak'];
    const treeIds = { pine: ['tree_pine_a', 'tree_pine_b', 'tree_pine_c'], oak: ['tree_oak_a', 'tree_oak_b', 'tree_oak_c'], palm: ['tree_palm'], dead: ['tree_dead'], snowpine: ['tree_snowpine'] };
    const pickTree = () => { const kindT = treeSet[Math.floor(rnd() * treeSet.length)]; const list = treeIds[kindT] || treeIds.pine; return list[Math.floor(rnd() * list.length)]; };
    const tc = new THREE.Color();
    const TSC = field ? 0.78 : outdoorD ? 0.7 : 1.0;   // フィールド・屋外ダンジョンの木は小さめ（道が隠れない）
    this.trees = [];   // 木は1つの BatchedMesh（1回の描画）に入れ、主人公の近くだけ精細なモデルにする（木ごとの LOD）
    const tree = (x, z, s) => { if (nearLm(x, z)) return; s *= TSC; const id = pickTree(); tc.setHSL(0, 0, 0.82 + rnd() * 0.25); if (theme.dim) tc.multiplyScalar(0.75 + theme.dim * 0.25); this.trees.push({ id, m: M4(x, heightAt(x, z) - 0.05, z, rnd() * 6.28, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.06, s), x, z, c: tc.clone() }); };
    let trees = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const t = T(x, z);
      if (t === 'forest' && outdoorD && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => { const n = T(x + dx, z + dz); return !TREE_SOLID[n] && !WALL_TILES[n] && n !== '_void' && !Tiles().isSolid(n); })) {
        // 屋外ダンジョンの道ぞいの森：背の低い木と茂みにして、道が隠れないようにする
        put(rnd() < 0.5 ? 'bush_a' : 'tree_oak_c', M4(x + 0.5 + (rnd() - 0.5) * 0.3, heightAt(x + 0.5, z + 0.5), z + 0.5 + (rnd() - 0.5) * 0.3, rnd() * 6.28, 0, 0, 0.55 + rnd() * 0.2), x, z); trees++; continue;
      }
      if (t === 'forest') { const n0 = this.trees.length; const n = (hi && field) ? 2 : 1; for (let k = 0; k < n; k++) { tree(x + (n > 1 ? 0.2 + rnd() * 0.6 : 0.4 + rnd() * 0.2), z + (n > 1 ? 0.2 + rnd() * 0.6 : 0.4 + rnd() * 0.2), 0.8 + rnd() * 0.45); trees++; } if (env && env.skipTree && env.skipTree(x, z)) this.trees.length = n0; }
      else if (t === 'tree') { const n0 = this.trees.length; tree(x + 0.5 + (rnd() - 0.5) * 0.3, z + 0.5 + (rnd() - 0.5) * 0.3, 0.8 + rnd() * 0.35); trees++; if (env && env.skipTree && env.skipTree(x, z)) this.trees.length = n0; }   // v7.6 レシピの木のマス（大樹など）は置いてから外す（乱数の順を変えない）
      else if (t === 'tree_small') { put('tree_oak_c', M4(x + 0.5, heightAt(x + 0.5, z + 0.5), z + 0.5, rnd() * 6.28, 0, 0, 0.45), x, z); }
    }
    // 町の外周：草地なら森（出口の道の延長は空ける）
    if (kind === 'town' || outdoorD) {
      const open81 = !!(map.def && map.def.open81);
      for (let z = -ON; z < H + OS; z++) for (let x = -OW; x < W + OE; x++) {
        if (inside(x, z)) continue; const d = Math.max(-x, x - W + 1, -z, z - H + 1); if (d < 2) continue;
        const t = T(x, z); if (PAVED[t] || t === 'road' || WATERY[t] || t === 'sand' || t === 'cloud' || t === 'lava') continue;
        if (open81 ? (d < 6 || rnd() > 0.12) : rnd() > (d < 4 ? 0.35 : 0.6)) continue; if (env && env.skipOutTree && env.skipOutTree(x, z)) continue;   // v7.6 レシピ：町の外の木を置かない所（冷却塔の足元・門の前など）　v8.1 開いた村（open81）：外は草地が続き、木は遠くにまばら（壁に見せない）
        tree(x + rnd(), z + rnd(), 0.9 + rnd() * 0.5); trees++;
      }
    }
    this.stats.trees = trees;
    if (this.slice) await this.slice();
    // 山（手続き型の形をインスタンス化）
    const mountains = []; const snowCap = !!theme.snowCap;
    for (let z = -ON; z < H + OS; z++) for (let x = -OW; x < W + OE; x++) {
      if (T(x, z) !== 'mountain') continue; if (!inside(x, z) && rnd() < 0.5) continue;
      if (nearLm(x + 0.5, z + 0.5, 0.8)) continue;   // v6.6 町・城・洞窟の建物に山が重ならないように（地面の高さはそのまま）
      const s = 0.85 + rnd() * 0.5; const h = 1.6 + rnd() * 1.8;
      mountains.push(M4(x + 0.5 + (rnd() - 0.5) * 0.3, heightAt(x + 0.5, z + 0.5) - 0.2, z + 0.5 + (rnd() - 0.5) * 0.3, rnd() * 6.28, 0, 0, s, h, s));
    }
    if (mountains.length && Nature81.on()) this.buildMountains81(group, mountains, snowCap, theme);   // v8.1 角ばった岩の塊を寄せた岩山（Nature81.js）。近景・遠景の 2 段
    else if (mountains.length) { const mm = new THREE.InstancedMesh(this.mountainGeometry(snowCap, theme), this.mountainMaterial(), mountains.length); mountains.forEach((m, i) => mm.setMatrixAt(i, m)); mm.castShadow = true; mm.receiveShadow = true; mm.computeBoundingSphere(); mm.name = 'mountains'; group.add(mm); }
    this.stats.mountains = mountains.length;
    // 崖の上の岩・洞窟の壁の岩
    for (const [x, z, y] of rockSpots) put(rnd() < 0.5 ? 'rock_a' : 'rock_b', M4(x + (rnd() - 0.5) * 0.3, y, z + (rnd() - 0.5) * 0.3, rnd() * 6.28, 0, 0, 0.6 + rnd() * 0.6), x, z, new THREE.Color(theme.rock));
    // タイルの小物
    const lampSpots = []; const lights = [];
    if (this.slice) await this.slice();
    // v6.6 フィールドの町・城・洞窟・塔（LandmarkBuilder3D）：マップ内の全目印を材質ごとにまとめて結合
    const LD = window.LocationDesign; const flags = (window.State && window.State.data && window.State.data.flags) || {};
    const locs = (field && map.def && map.def.locations) || []; const locAt = (x, z) => locs.find((L) => L.x === x && L.y === z) || null;
    const lmb = new LandmarkBuilder3D(this.mats); const smokes = []; const lmIds = [];
    const yawFor = (x, z) => { for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const n = T(x + dx, z + dz); if (PAVED[n] || n === 'road' || n === 'floor_wood' || n === 'grass' || n === 'cave_floor') return Math.atan2(dx, dz); } return 0; };
    let props = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const t = T(x, z); const cx = x + 0.5, cz = z + 0.5; const y = heightAt(cx, cz);
      const id = t === 'fountain' ? null : PROP[t];   // v7.6 噴水は Fountain76.js が作る（下）
      if (id && !nearLm(cx, cz) && !(env && env.skipProp && env.skipProp(t, x, z))) {   // v7.6 レシピが作り直す小物は置かない
        let m;
        if (t === 'fence') { let hx = 0, hz = 0; for (const k of [-1, 1]) { if (T(x + k, z) === 'fence') hx++; if (T(x, z + k) === 'fence') hz++; } m = M4(cx, y, cz, hz > hx ? Math.PI / 2 : 0); }
        else if (t === 'barrel' || t === 'bush' || t === 'ore' || t === 'stalactite' || t === 'root') m = M4(cx, y, cz, rnd() * 6.28, 0, 0, t === 'bush' ? 0.9 + rnd() * 0.3 : 1);
        else if (t === 'well') m = M4(cx, y, cz, 0, 0, 0, 0.62);
        else if (t === 'table' || t === 'bed') m = M4(cx, y, cz, 0, 0, 0, 0.62, 0.92, 0.85);
        else m = M4(cx, y, cz, yawFor(x, z));
        put(id, m, cx, cz); props++;
        if (t === 'lamp') lampSpots.push({ pos: new THREE.Vector3(cx, 2.0, cz), color: 0xffb05a, power: 1.0, dist: 9 });
        if (t === 'torch') lampSpots.push({ pos: new THREE.Vector3(cx, 1.6, cz), color: 0xff9a4a, power: 1.2, dist: 8 });
        if (t === 'crystal') lampSpots.push({ pos: new THREE.Vector3(cx, 1.3, cz), color: 0x7fc8ff, power: 0.9, dist: 6 });
        if (t === 'learn_rune' || t === 'warp') lampSpots.push({ pos: new THREE.Vector3(cx, 1.0, cz), color: t === 'warp' ? 0xa080ff : 0x6ad0ff, power: 0.7, dist: 5 });
        if (t === 'boss_mark') lampSpots.push({ pos: new THREE.Vector3(cx, 0.8, cz), color: 0xff3040, power: 0.8, dist: 5 });
      }
      if (t === 'lava') lampSpots.push({ pos: new THREE.Vector3(cx, 0.6, cz), color: 0xff6a20, power: 0.5, dist: 4 });
      const lm = LANDMARK[t];
      if (lm) {
        // v6.6 場所ごとの固有デザイン（LOCATION_DESIGNS）から組み立てる。デザインがない・失敗したときは従来の目印モデル
        let done = null; const Lc = locAt(x, z);
        if (Lc && LD) {
          try {
            const r0 = LD.resolve(Lc.id, flags); const wp = map.warpAt(x, z); const face = (LW && LW.landmarkFace && wp) ? LW.landmarkFace(map, wp) : [0, 1];
            const lb = new Batch();
            if (r0 && r0.design) done = lmb.build(r0.design, new THREE.Vector3(cx, y, cz), lb, { put, heightAt, water: (wx, wz) => !!WATERY[T(Math.floor(wx), Math.floor(wz))] }, face);
            // 目印ごとに1つのまとまり（画面の外の目印は描かない＝視錐台で省ける）。窓・光・布・暗い穴などの小さな部品は影を落とさない（影の描画回数を減らす）
            if (done) { const lg = new THREE.Group(); lg.name = 'landmark_' + Lc.id; lb.build(lg); lg.traverse((o) => { if (o.isMesh && /^lm_(win|glow|cloth)/.test(o.material.name || '')) o.castShadow = false; }); group.add(lg); }
          } catch (e) { lmb.stats.failed.push(Lc.id + ': ' + (e && e.message)); }
        }
        if (done) { done.lights.forEach((l) => lampSpots.push(l)); done.smokes.forEach((sm) => smokes.push(sm)); done.sprites.forEach((sp) => group.add(sp)); lmIds.push(Lc.id); }
        else put(lm, M4(cx, y, cz, 0, 0, 0, t === 'castle_icon' ? 3.4 : t === 'tower_icon' ? 2.6 : 3.0), cx, cz);
        props++;
      }
      if (t === 'ship') { put('veh_sailboat', M4(cx, -0.1, cz, 0, 0, 0, 0.9), cx, cz); props++; }
      // ダンジョン・洞窟の飾り
      if (dungeon && (t === 'cave_floor' || t === 'moss') && rnd() < 0.03) put('mushroom', M4(cx + (rnd() - 0.5) * 0.6, y, cz + (rnd() - 0.5) * 0.6, rnd() * 6.28, 0, 0, 0.8 + rnd() * 0.6), cx, cz);
      if (field && t === 'sand' && theme.region === 'desert' && rnd() < 0.012) put('cactus', M4(cx, y, cz, rnd() * 6.28, 0, 0, 0.8 + rnd() * 0.5), cx, cz);
    }
    // ダンジョン：壁ぎわのたいまつ（明かりの少ない場所の目安。2D版にない飾り）
    if (dungeon && P.torch) {
      let n = 0; for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
        const t = T(x, z); if (Tiles().isSolid(t) || WALL_TILES[t]) continue; if (!(WALL_TILES[T(x, z - 1)] || T(x, z - 1) === '_void')) continue;
        if (hash2(x * 3, z * 7) > 0.14 || n > 40) continue;
        put('wall_lantern', M4(x + 0.5, 1.7 + lvY(x, z), z + 0.08, Math.PI), x, z); lampSpots.push({ pos: new THREE.Vector3(x + 0.5, 1.5 + lvY(x, z), z + 0.5), color: 0xffa050, power: 0.9, dist: 7 }); n++;
      }
    }
    // 屋内・暗いダンジョン：天井の明かり（点光源の候補。見た目の器具は置かない）
    if (voidOut) for (let z = 2; z < H - 1; z += 5) for (let x = 3; x < W - 1; x += 6) { const t = T(x, z); if (Tiles().isSolid(t) || WALL_TILES[t]) continue; lampSpots.push({ pos: new THREE.Vector3(x + 0.5, 2.6, z + 0.5), color: kind === 'interior' ? 0xffd8a0 : 0xffb070, power: kind === 'interior' ? 0.9 : 0.5, dist: 9 }); }
    this.stats.landmarks3d = lmIds.length; if (lmb.stats.failed.length) this.stats.landmarkFailed = lmb.stats.failed.slice(0, 8);
    this.stats.props = props;
    this.lampSpots = lampSpots;
    this.stats.buildMs = Math.round(performance.now() - t0);
    if (this.slice) await this.slice();
    // v7.6 噴水（段の水盤・水の柱・落ちる水の幕。つながった噴水マスは1つの大きな噴水）
    const animated = [];
    if (space) { try { const fr = floatingRocks(map, (x, z) => !!WATERY[T(x, z)], hi ? 18 : 10, (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }); group.add(fr.group); fr.animated.forEach((a) => animated.push(a)); this.stats.space76Rocks = fr.count; } catch (e) { /* 浮かぶ岩がなくても星空のまま */ } }   // v7.6 異空間の浮かぶ岩
    if (!(env && env.skipProp && env.skipProp('fountain', -1, -1))) { try { const fbat = new Batch(); const fr = buildFountains({ map, T, add: (m, g) => fbat.add(m, g), group, lvY }); fbat.build(group); fr.animated.forEach((a) => animated.push(a)); fr.lights.forEach((l) => lampSpots.push(l)); this.stats.fountains = fr.count; } catch (e) { console.warn('fountain76', e); } }
    return { group, heightAt: heightAtWalk, lampSpots, smokes, animated, finalize: () => this.finalize(group) };
  }

  // 置き場所が全部決まってから（建物の小物も put したあと）インスタンス化する。木は区画ごとに精細・簡略の2つを作って距離で切り替える
  async finalize(group) {
    const jobs = []; this.lodChunks = [];
    const need = new Set(); for (const b of this.buckets.values()) for (const id of Object.keys(b.ids)) { need.add(id); if (MODELS[id] && MODELS[id].lod) need.add(MODELS[id].lod); }
    await Promise.all([...need].filter((id) => MODELS[id]).map((id) => this.models.partsOf(id)));
    for (const [key, b] of this.buckets) {
      const near = new THREE.Group(), far = new THREE.Group(); near.name = 'chunk_' + key; far.name = 'chunk_far_' + key; let hasFar = false;
      for (const id of Object.keys(b.ids)) {
        if (!MODELS[id]) continue; const e = b.ids[id]; const colors = e.c.some((c) => c) ? e.c.map((c) => c || new THREE.Color(1, 1, 1)) : null;
        const cast = !/^rock_|^bush_|mushroom/.test(id);
        jobs.push(this.models.instanced(id, e.m, { castShadow: cast, colors }).then((g) => near.add(g)));
        const lod = MODELS[id].lod;
        if (lod && MODELS[lod]) { hasFar = true; jobs.push(this.models.instanced(lod, e.m, { castShadow: cast, colors }).then((g) => far.add(g))); }
      }
      group.add(near); if (hasFar) { group.add(far); far.visible = false; }
      this.lodChunks.push({ cx: b.cx, cz: b.cz, near, far: hasFar ? far : null, lod: 0 });
    }
    await Promise.all(jobs);
    if (this.slice) await this.slice();
    await this.buildTrees(group);
    this.lodAt = null;
  }
  async buildTrees(group) {
    const list = this.trees || []; if (!list.length) return;
    const ids = [...new Set(list.map((t) => t.id))]; const geos = {}; let verts = 0, idxN = 0; let mat = null;
    for (const id of ids) {
      if (!MODELS[id]) continue; const lodId = MODELS[id].lod;
      const p0 = await this.models.partsOf(id); const p1 = lodId && MODELS[lodId] ? await this.models.partsOf(lodId) : null;
      if (!p0.length) continue; mat = mat || p0[0].material;
      if (p0.length > 1 || p0[0].material !== mat) { console.warn('tree with several materials → instanced', id); continue; }
      const g0 = p0[0].geometry, g1 = p1 && p1[0] ? p1[0].geometry : g0; geos[id] = { g0, g1 };
      const cnt = (g) => (g.index ? g.index.count : g.attributes.position.count);
      verts += g0.attributes.position.count + g1.attributes.position.count; idxN += cnt(g0) + cnt(g1);
    }
    const use = list.filter((t) => geos[t.id]); if (!use.length || !mat) return;
    const bm = new THREE.BatchedMesh(use.length, verts, idxN * 2, mat); bm.name = 'trees'; bm.castShadow = true; bm.receiveShadow = true; bm.sortObjects = false;
    const gid = {}; for (const id of Object.keys(geos)) gid[id] = { l0: bm.addGeometry(geos[id].g0), l1: bm.addGeometry(geos[id].g1) };
    this.treeInst = [];
    for (const t of use) { const g = gid[t.id]; const iid = bm.addInstance(g.l1); bm.setMatrixAt(iid, t.m); bm.setColorAt(iid, t.c); this.treeInst.push({ iid, x: t.x, z: t.z, g, lod: 1 }); }
    bm.computeBoundingSphere(); bm.computeBoundingBox(); group.add(bm); this.treeBatch = bm; this.stats.treeBatch = use.length;
  }
  // 主人公から遠い区画は簡略の木にする（区画単位の LOD）
  updateLod(focus) {
    if (!this.lodChunks || !focus) return;
    if (this.treeInst && !(this.treeAt && Math.abs(this.treeAt.x - focus.x) + Math.abs(this.treeAt.z - focus.z) < 1.5)) {
      this.treeAt = { x: focus.x, z: focus.z }; const R = this.quality === 'high' ? 16 : 11; const R2 = R * R;
      for (const t of this.treeInst) { const dx = t.x - focus.x, dz = t.z - focus.z; const want = dx * dx + dz * dz < R2 ? 0 : 1; if (want !== t.lod) { this.treeBatch.setGeometryIdAt(t.iid, want ? t.g.l1 : t.g.l0); t.lod = want; } }
    }
    if (this.mtnInst && !(this.mtnAt && Math.abs(this.mtnAt.x - focus.x) + Math.abs(this.mtnAt.z - focus.z) < 2)) {   // v8.1 岩山の近景・遠景
      this.mtnAt = { x: focus.x, z: focus.z }; const R = this.quality === 'high' ? 22 : 15; const R2 = R * R;
      for (const t of this.mtnInst) { const dx = t.x - focus.x, dz = t.z - focus.z; const want = dx * dx + dz * dz < R2 ? 0 : 1; if (want !== t.lod) { this.mtnBatch.setGeometryIdAt(t.iid, want ? t.g.l1 : t.g.l0); t.lod = want; } }
    }
    if (this.lodAt && Math.abs(this.lodAt.x - focus.x) + Math.abs(this.lodAt.z - focus.z) < 2) return; this.lodAt = { x: focus.x, z: focus.z };
    const R = this.quality === 'high' ? 30 : 20;
    for (const c of this.lodChunks) {
      if (!c.far) continue; const d = Math.hypot(c.cx - focus.x, c.cz - focus.z); const want = d > R ? 1 : 0;
      if (want !== c.lod) { c.lod = want; c.near.visible = !want; c.far.visible = !!want; }
    }
  }
  update(t) { this.time.value = t; }
  // v7.6 この地図だけで使う画像・マテリアル（共有の素材は入れない）。MapScene3D.dispose から捨てる（長い移動で GPU の画像が増え続けないように）
  own(o) { if (o) (this._own || (this._own = [])).push(o); return o; }
  dispose() { (this._own || []).forEach((o) => { try { o.dispose(); } catch (e) { /* なし */ } }); this._own = []; }

  /* ---------- マテリアル ---------- */
  groundMaterial(splat, tint, ox, oz, sw, sh, theme, round) {
    const tx = this.mats.tex;
    const mat = new THREE.MeshStandardMaterial({ map: tx.grass_albedo || null, roughness: 0.95, metalness: 0 }); this.own(mat);
    const U = { uSplat: { value: splat }, uTint: { value: tint }, uOrigin: { value: new THREE.Vector2(ox, oz) }, uSize: { value: new THREE.Vector2(sw, sh) },
      uDirt: { value: tx.dirt_albedo || null }, uCobble: { value: tx.cobble_albedo || null }, uRock: { value: tx.stonewall_albedo || null }, uRockTint: { value: new THREE.Color(theme.rock || '#9a948a') }, uSnow: { value: theme.region === 'snow' ? 1 : 0 },
      uNoise: { value: sharedNoiseTexture() }, uRound: { value: round ? 1 : 0 }, uModern: { value: theme && theme.modern ? 1 : 0 } };   // v7.0 uModern：近未来・機械・娯楽の町の舗装（石畳の代わりに平らな板石の目地）   // v6.8 丸み：境界をノイズでゆがめる（uRound=0 のときは以前と同じ）
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vSlope; varying float vH;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlope = objectNormal.y; vH = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSlope; varying float vH; uniform sampler2D uSplat, uTint, uDirt, uCobble, uRock, uNoise; uniform vec2 uOrigin, uSize; uniform vec3 uRockTint; uniform float uSnow, uRound, uModern;')
        .replace('#include <map_fragment>', `
          vec2 wp = vMapUv * 4.0; vec2 st = (wp - uOrigin) / uSize;
          // v6.8 丸み：塗り分けを読む位置をノイズで少しずらし（境界が波打つ）、重みにも細かい揺らぎを足す
          float wx = texture2D(uNoise, wp * 0.043).r, wz = texture2D(uNoise, wp * 0.043 + vec2(0.53, 0.29)).r; vec4 nf = texture2D(uNoise, wp * 0.21 + vec2(0.13, 0.57));
          st += uRound * (vec2(wx, wz) - 0.5) * 0.9 / uSize;
          vec4 sp = texture2D(uSplat, st); vec3 tn = texture2D(uTint, st).rgb;
          sp += uRound * vec4((nf.r - 0.5) * 0.42, (nf.g - 0.5) * 0.38, (nf.r - 0.5) * 0.3, (nf.g - 0.5) * 0.3);
          vec3 g1 = texture2D(map, wp / 3.1).rgb, g2 = texture2D(map, wp / 7.3 + vec2(0.37, 0.11)).rgb; vec3 grass = mix(g1, g2, 0.42);
          vec3 dirt = texture2D(uDirt, wp / 2.7).rgb; vec3 cob = texture2D(uCobble, wp / 2.0).rgb; vec3 rock = texture2D(uRock, wp / 3.0).rgb;
          if (uModern > 0.5) { vec2 gp = fract(wp * 0.5); float ln = step(0.955, max(gp.x, gp.y)); cob = mix(vec3(0.56, 0.6, 0.64), vec3(0.32, 0.35, 0.4), ln) * (0.9 + 0.1 * texture2D(uNoise, wp * 0.13).r); }
          float lum = dot(dirt, vec3(0.333)); vec3 smoothc = vec3(0.82 + lum * 0.36);
          vec3 c = grass * 1.15;
          c = mix(c, dirt * 1.1, smoothstep(0.25, 0.7, sp.g));
          c = mix(c, rock * 1.2, smoothstep(0.3, 0.75, sp.b));
          c = mix(c, smoothc, smoothstep(0.3, 0.7, sp.a));
          c = mix(c, cob, smoothstep(0.35, 0.65, sp.r));
          c *= tn;
          float steep = smoothstep(0.82, 0.55, vSlope); c = mix(c, rock * uRockTint * 1.1, steep * 0.85);
          c = mix(c, vec3(0.92, 0.95, 0.99), uSnow * smoothstep(0.6, 1.6, vH) * 0.6);
          // v7.0 海・湖の底（水面より下の地面）：石の壁や石畳の模様（タイル）が水の下に透けて見えないよう、模様のない深い青緑にする
          { float sea = smoothstep(-0.16, -0.4, vH); if (sea > 0.0) { float nb = texture2D(uNoise, wp * 0.031).r; vec3 bed = mix(vec3(0.06, 0.15, 0.22), vec3(0.11, 0.21, 0.25), nb); c = mix(c, bed, sea); } }
          diffuseColor *= vec4(c, 1.0);
        `);
    };
    mat.customProgramCacheKey = () => 'world-ground-v3';
    // v7.6 地面は「主人公の手前を抜く」対象にしない：丘・町の段で持ち上がった地面を抜くと、下に何もないため空の色（白い三角）が見えていた。
    //   地面の陰に隠れた主人公は、主人公の淡いシルエット（Character3D の xray）で見える
    return mat;
  }
  // 水・溶岩・雲の面：テクスチャを使わないので、自前の UV（vWuv）を渡す
  static withUv(sh) {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWuv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvWuv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWuv;');
  }
  waterMaterial() {
    const time = this.time;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.86, roughness: 0.12, metalness: 0.15, depthWrite: false }); this.own(m);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time; WorldBuilder3D.withUv(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          { vec2 p = vWuv * 8.0; float a = sin(p.x * 3.1 + uTime * 1.3) * 0.5 + sin(p.y * 2.7 - uTime * 1.1) * 0.5 + sin((p.x + p.y) * 5.3 + uTime * 2.1) * 0.25;
            float b = cos(p.y * 3.3 + uTime * 1.2) * 0.5 + cos(p.x * 2.3 - uTime * 0.9) * 0.5;
            normal = normalize(normal + vec3(a, 0.0, b) * 0.07); }`)
        .replace('#include <color_fragment>', '#include <color_fragment>\n{ vec2 p = vWuv * 8.0; float f = smoothstep(0.92, 1.0, sin(p.x * 4.0 + uTime * 0.8) * sin(p.y * 4.4 - uTime * 0.7)); diffuseColor.rgb += f * 0.08; }');
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y += sin(position.x * 0.9 + uTime * 1.2) * 0.025 + cos(position.z * 0.8 + uTime) * 0.025;').replace('#include <common>', '#include <common>\nuniform float uTime;');
    };
    m.customProgramCacheKey = () => 'world-water-v1'; return m;
  }
  lavaMaterial() {
    const time = this.time;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: 0xff5a10, emissiveIntensity: 1.6 }); m.userData.natural = true; this.own(m);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time; WorldBuilder3D.withUv(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ vec2 p = vWuv * 8.0; float n = sin(p.x * 2.1 + uTime * 0.6) * sin(p.y * 1.7 - uTime * 0.4) * 0.5 + 0.5; totalEmissiveRadiance *= 0.55 + n * 0.8; diffuseColor.rgb *= 0.4 + n * 0.6; }');
    };
    m.customProgramCacheKey = () => 'world-lava-v1'; return m;
  }
  cloudMaterial() {
    const time = this.time;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true, opacity: 0.94, depthWrite: false, emissive: 0xbcd0e8, emissiveIntensity: 0.25 }); this.own(m);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = time; WorldBuilder3D.withUv(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n{ vec2 p = vWuv * 6.0 + vec2(uTime * 0.03, uTime * 0.012); float n = sin(p.x * 2.3) * sin(p.y * 1.9) * 0.5 + sin(p.x * 5.1 + p.y * 3.7) * 0.25; diffuseColor.rgb *= 0.86 + n * 0.14; }');
    };
    m.customProgramCacheKey = () => 'world-cloud-v1'; return m;
  }
  // v8.1 岩山：形の違う 3 種 × 近景・遠景を 1 つの BatchedMesh に入れる（描画 1 回）。主人公の近くだけ近景の形（updateLod）
  buildMountains81(group, mats, snowCap, theme) {
    const o = { rock: theme.rock || '#8a8478', grass: theme.grass || '#6a8a4a', snow: !!snowCap, strata: /desert|canyon|mesa|sand/.test(theme.key || theme.id || '') || (theme.tree || []).indexOf('palm') >= 0 };
    const G = []; for (let v = 0; v < 3; v++) G.push([Nature81.mountainGeo(o, v, 0), Nature81.mountainGeo(o, v, 1)]);
    let verts = 0; for (const [a, b] of G) verts += a.attributes.position.count + b.attributes.position.count;
    const bm = new THREE.BatchedMesh(mats.length, verts, 0, Nature81.rockMaterial()); bm.name = 'mountains81'; bm.castShadow = true; bm.receiveShadow = true; bm.sortObjects = false;
    const gid = G.map(([a, b]) => ({ l0: bm.addGeometry(a), l1: bm.addGeometry(b) })); const tc = new THREE.Color(); const e = new THREE.Vector3();
    const shrink = new THREE.Matrix4().makeScale(1, 1 / 2.5, 1);   // 岩山の形は縦 2.5 倍で作ってある
    this.mtnInst = mats.map((m, i) => { const g = gid[i % 3]; const iid = bm.addInstance(g.l1); bm.setMatrixAt(iid, m.clone().multiply(shrink)); tc.setHSL(0, 0, 0.9 + ((i * 37) % 11) / 55); bm.setColorAt(iid, tc); e.setFromMatrixPosition(m); return { iid, x: e.x, z: e.z, g, lod: 1 }; });
    bm.computeBoundingSphere(); bm.computeBoundingBox(); group.add(bm); this.mtnBatch = bm; this.stats.mountains81 = mats.length;
  }
  mountainMaterial() { if (!this._mtnMat) { this._mtnMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }); addCutout(this._mtnMat); } return this._mtnMat; }
  // 山：雪の帽子つき（地域による）のでこぼこな円錐。高さ1・半径0.95 を基準に、インスタンスの拡大率で変える
  mountainGeometry(snowCap, theme) {
    const key = (snowCap ? 's' : 'n') + theme.rock; this._mtnGeo = this._mtnGeo || {}; if (this._mtnGeo[key]) return this._mtnGeo[key];
    const g = new THREE.ConeGeometry(0.95, 1, 9, 4, false); const p = g.attributes.position; const c = new Float32Array(p.count * 3);
    const rock = new THREE.Color(theme.rock), dark = rock.clone().multiplyScalar(0.7), snow = new THREE.Color('#f4f8fc'), grassy = new THREE.Color(theme.grass).multiplyScalar(0.6);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i) + 0.5, z = p.getZ(i); const r = Math.hypot(x, z);
      if (r > 0.01 && y < 0.98) { const n = (hash2(Math.round(x * 50), Math.round(z * 50 + y * 30)) - 0.5) * 0.25; p.setX(i, x * (1 + n)); p.setZ(i, z * (1 + n)); p.setY(i, p.getY(i) + n * 0.15); }
      const k = y; const cc = snowCap && k > 0.62 ? snow : k < 0.2 ? grassy : (hash2(i, 3) > 0.5 ? rock : dark);
      c[i * 3] = cc.r; c[i * 3 + 1] = cc.g; c[i * 3 + 2] = cc.b;
    }
    g.translate(0, 0.5, 0); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); g.userData.own = false; this._mtnGeo[key] = g; return g;
  }
}
function Tiles() { return window.Tiles; }
