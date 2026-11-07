/* =========================================================
   レシピ（全体展開・町）：town_kit — 専用レシピのない町に、地域ごとの作り方を当てる
   ・地域（プロファイルの region。ゲームの12地域）ごとに：壁（しっくい・石・木組み）の色、屋根の色の組と勾配、建物の用途ごとの屋根の形、
     道と歩道の舗装（キャンバスの石の画像）、街灯の形と光の色、柵の形（石垣・柵・鉄柵・欄干・漂流木・日干し煉瓦）
   ・建物は BuildingBuilder3D の style（足元・扉・名札は従来と同じ）。同じ町の同じ用途でも、位置から決まる値で色・向きが少し変わる
   ・論理（タイル・当たり判定・ワープ・NPC・イベント・宝箱）は変えない。柵・街灯は柵・街灯のマスの中だけ
   ・近未来・機械・娯楽の町（飾りのテーマが tech／machine／casino）には当てない（ガラスと金属の建物のまま）
   ・状態：integrated（組み込み・自動の確認まで）。町ごとの目印の作り込みはしていない（専用レシピの町を除く）
   ========================================================= */
import * as THREE from 'three';
import { plain, rng } from '../EnvKit3D.js';
import { Batch } from '../../engine/Materials.js';
import { canvasTex, texMat, wbox, cyl, drawSetts, floorQuadsH, settsHeight } from './geo.js';
import { buildLandmark } from './landmarks.js';
import { buildVariant76 } from './variants76.js';
import { bdetailSetting } from '../../world/BuildingBuilder3D.js';
import { showpieceFor } from './showpiece76.js';
import { TOWN_EXT82 } from '../theme82.js';
import { wallTex } from './tex82.js';

// 地域ごとの作り方。road/walk：[石の色, 目地, 幅, 高さ, ばらつき]（キャンバスは 256×256。幅・高さは 256 を割り切る値）
export const REGION_STYLE = {
  arcadia: { plaster: ['#f6ead2', '#efe0c4', '#f3e6cf'], frame: true, roofs: ['#a8483a', '#8e5a3a', '#b0603a', '#7a4a32'], pitch: 0.72, road: ['#c9a888', '#7e6a58', 32, 32, 0.18], walk: ['#e2d6bc', '#a49678', 64, 32, 0.1], lamp: 'lantern', light: 0xffc070, fence: null },
  grania: { plaster: ['#cfc4b2', '#c4b8a4'], wall: 'stone', frame: false, roofs: ['#4a4a50', '#5a4a3e', '#6a3e2e'], pitch: 0.6, road: ['#6e665e', '#3e3832', 64, 32, 0.2], walk: ['#a49a8c', '#5e564e', 64, 32, 0.12], lamp: 'oil', light: 0xffa050, fence: 'palisade' },
  kalion: { plaster: ['#fbf6ec', '#f4eee2'], frame: false, roofs: ['#7a2e2e', '#6a2a2a', '#8a3a32'], pitch: 0.55, hip: true, base: 0.5, road: ['#b8b4ac', '#7e7a74', 128, 64, 0.06], walk: ['#d8d4cc', '#9e9a94', 64, 64, 0.05], lamp: 'iron', light: 0xfff0d0, fence: 'railing' },
  islands: { plaster: ['#fdfcf6', '#f6f2e8'], frame: false, roofs: ['#2f7a9a', '#3a8aa8', '#2a6a8a'], pitch: 0.5, road: ['#e8dcc0', '#bba888', 64, 64, 0.08], walk: ['#f0e8d4', '#c8b898', 32, 32, 0.08], lamp: 'rope', light: 0xffd890, fence: 'drift' },
  tempus: { plaster: ['#eeeaf2', '#e6e2ea'], frame: true, roofs: ['#4a5a8a', '#3e4a78', '#5a6a96'], pitch: 0.8, road: ['#9aa4b8', '#5e6678', 64, 32, 0.1], walk: ['#c8ccd8', '#8a90a0', 32, 32, 0.08], lamp: 'brass', light: 0xffe0b0, fence: 'stone' },
  magicka: { plaster: ['#efe8f6', '#e8e0f2'], frame: false, roofs: ['#5a3a7a', '#4a3a6a', '#6a4a8a'], pitch: 0.7, road: ['#d6d0e2', '#9890aa', 128, 64, 0.06], walk: ['#e6e0ee', '#a8a0b8', 64, 64, 0.06], lamp: 'crystal', light: 0xe8d8ff, fence: 'balustrade' },
  sky: { plaster: ['#ffffff', '#f4f8fc'], frame: false, roofs: ['#4a7ab8', '#3a6aa8'], pitch: 0.6, road: ['#eef2f6', '#b8c4d0', 128, 64, 0.04], walk: ['#f6f8fa', '#c4ccd6', 64, 64, 0.04], lamp: 'iron', light: 0xf0f6ff, fence: 'balustrade' },
  dark: { plaster: ['#8a8090', '#7a7080'], wall: 'stone', frame: false, roofs: ['#2e2638', '#3a2a40'], pitch: 0.65, road: ['#5a4e48', '#2e2622', 64, 64, 0.2], walk: ['#6a6058', '#3a322c', 64, 32, 0.18], lamp: 'torch', light: 0xff9a4a, fence: 'palisade' },
  desert: { plaster: ['#efd8b0', '#e8cfa2', '#f2dcb8'], frame: false, flat: true, roofs: ['#b07a4a'], pitch: 0.5, road: ['#e2c89a', '#b09060', 64, 32, 0.1], walk: ['#ead6ae', '#b89c70', 64, 64, 0.08], lamp: 'brass', light: 0xffc880, fence: 'mud' },
  dragon: { plaster: ['#b8a898', '#a89888'], wall: 'stone', frame: false, roofs: ['#5a2418', '#4a2a20'], pitch: 0.6, road: ['#5a524c', '#2e2824', 64, 32, 0.18], walk: ['#7a6e64', '#3e3630', 64, 32, 0.15], lamp: 'brazier', light: 0xff8a40, fence: 'stone' },
  snow: { plaster: ['#f4f2ee', '#ece8e2'], frame: true, roofs: ['#4a5a7a', '#3a4a68', '#5a3a32'], pitch: 0.95, road: ['#a8b0b8', '#6a727a', 64, 32, 0.1], walk: ['#d8dee4', '#98a0a8', 32, 32, 0.08], lamp: 'lantern', light: 0xffc890, fence: 'stone' },
  casino: { plaster: ['#3a1a34'], frame: false, roofs: ['#2a1028'], pitch: 0.5, road: ['#2a2230', '#c9a24a', 128, 128, 0.05], walk: ['#3a3040', '#8a7040', 64, 64, 0.06], lamp: 'brass', light: 0xffd890, fence: 'railing', modern: true },
  skyterrace: { plaster: ['#ffffff'], frame: false, roofs: ['#4a7ab8'], pitch: 0.5, road: ['#f4f6f8', '#c8d0d8', 128, 64, 0.03], walk: ['#fafbfc', '#d0d8e0', 64, 64, 0.03], lamp: 'iron', light: 0xf0f6ff, fence: 'balustrade', modern: true },
  machine: { plaster: ['#d8dce0'], frame: false, roofs: ['#4a5a6a'], pitch: 0.5, road: ['#8a929a', '#4e555c', 128, 64, 0.06], walk: ['#b8bec4', '#80868c', 64, 64, 0.05], lamp: 'iron', light: 0xe0f0ff, fence: 'railing' },
  // v7.8 地球の世界の新しい地域（マップの theme3d.region で選ぶ。js/data/region78-*.js）
  neon: { plaster: ['#6a6e74', '#5e636a', '#74706a'], wall: 'stone', frame: false, roofs: ['#3a2e2a', '#2a3038', '#5a3a2a'], pitch: 0.32, road: ['#3a3e44', '#1e2226', 128, 64, 0.1], walk: ['#4e5258', '#2a2e32', 64, 64, 0.1], lamp: 'iron', light: 0x5ae0ff, fence: 'railing' },
  meridian: { plaster: ['#b4b0a6', '#a8a49a', '#bcb6aa'], wall: 'stone', frame: false, roofs: ['#5a5450', '#4a4642', '#6a5a4e'], pitch: 0.36, road: ['#8a857c', '#55514a', 128, 64, 0.16], walk: ['#a29e94', '#66625a', 64, 64, 0.12], lamp: 'oil', light: 0xffb070, fence: 'palisade' },
  nereia: { plaster: ['#fffcf4', '#f6f2ea', '#fdf8ee'], frame: false, roofs: ['#1e90b8', '#2aa8c0', '#187898'], pitch: 0.42, hip: true, road: ['#ece2c8', '#c0ae8c', 64, 64, 0.08], walk: ['#f4eedc', '#ccbc9c', 32, 32, 0.07], lamp: 'rope', light: 0xffe4a8, fence: 'drift' }
};
const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };   // v7.6 0..1 に直す（以前は半分ほどが負になり、壁・屋根の色の選びが空になって既定の色に落ちていた）
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

// 用途ごとの屋根の形（地域の値と、位置から決まる値で少し変える）
export function townStyle(b, R) {
  if (/^(castle|elevator|watchtower|windmill)$/.test(b.type || '')) return null;
  const h1 = hash(b.x, b.y, 1), h2 = hash(b.x, b.y, 2);
  const st = { plaster: pick(R.plaster, h1), roofColor: pick(R.roofs, h2), pitch: R.pitch, frame: R.frame === false ? false : undefined, wall: R.wall, base: R.base };
  const t = b.type || 'house';
  if (t === 'church') return { plaster: st.plaster, wall: R.wall };   // 教会は鐘楼のある従来の形（壁と屋根の色だけ地域に）
  if (R.flat && t !== 'church') return Object.assign(st, { roof: 'flat', two: t === 'inn' || t === 'elder' || b.w >= 9, chimney: false });
  // 妻入り（棟が南北）は間口の狭い建物だけ。屋根の高さは 2.4 まで（勾配を下げる）
  const narrow = b.w <= b.h + 3; const cap = (span, p) => Math.min(p, Math.atan(2.4 / Math.max(1, span / 2 - 0.2)));
  const gz = (o) => Object.assign(st, o, { roof: 'gableZ', pitch: cap(b.w, st.pitch) }), gx = (o) => Object.assign(st, o, { roof: 'gable', pitch: cap(b.h, st.pitch) });
  if (t === 'house') return h1 < 0.5 || !narrow ? gx({}) : gz({});
  if (t === 'item' || t === 'weapon' || t === 'armor' || t === 'tavern' || t === 'shop') return (narrow ? gz : gx)({ porch: 3.0, chimney: t === 'tavern' ? undefined : false });
  if (t === 'inn') return R.hip ? Object.assign(st, { roof: 'hip', two: true, porch: 3.6 }) : gx({ two: true, porch: 3.6 });
  if (t === 'elder' || t === 'guild' || t === 'bank' || t === 'mansion' || t === 'academy') return Object.assign(st, { roof: 'hip', two: b.w >= 9, chimney: false });
  if (t === 'dojo') return (narrow ? gz : gx)({ frame: false, chimney: false });
  return h1 < 0.5 ? gx({}) : Object.assign(st, { roof: 'hip' });
}

export function townKit(mapId, opt) {
  opt = opt || {};
  return {
    id: 'town_kit.v1' + (opt.style ? ':' + opt.style : ''),
    async prepare(ctx) {
      const map = ctx.map; const prof = ctx.profile || {}; const region = opt.style || (REGION_STYLE[prof.region] ? prof.region : 'arcadia'); const R = TOWN_EXT82[map.id] ? Object.assign({}, REGION_STYLE[region], TOWN_EXT82[map.id]) : REGION_STYLE[region];   // v8.2 町ごとの外観（theme82.js の TOWN_EXT82）
      const brick82 = R.brick ? wallTex('brick', R.brick.c1, R.brick.c2, { soot: R.brick.soot }) : null; if (TOWN_EXT82[map.id]) ctx.stats.ext82 = map.id;
      const tex = (key, a) => texMat('tk_' + key, canvasTex('tk_' + key, 256, 256, drawSetts(a[0], a[1], a[2], a[3], a[4])), { roughness: 0.88 }, { height: settsHeight(a[2], a[3], a[2] * 7 + a[3]), depth: 3 });   // 高画質：石の形から法線・AO（ProcPBR.js）
      const rk = TOWN_EXT82[map.id] && TOWN_EXT82[map.id].road ? map.id : region; const K = { R, region, road: tex(rk + '_road', R.road), walk: tex(rk + '_walk', R.walk) };
      const LM = map.envLayout && map.envLayout.landmark; const inLM = (x, z) => !!LM && x >= LM.x && x < LM.x + LM.w && z >= LM.y && z < LM.y + LM.h;   // 町ごとの目印のマス（js/rpg/envlayout.js）
      // v7.6 露店のマス（カウンター・奥）は露店の形が作る（家具のカウンターを置かない）
      const stallCell = new Set(); (map.buildings || []).forEach((b) => { if (b.shape76 !== 'stall') return; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) stallCell.add(x + ',' + y); });
      const hooks = { skipProp: (t, x, z) => t === 'lamp' || (t === 'fence' && !!R.fence) || inLM(x, z) || stallCell.has(x + ',' + z), skipTree: (x, z) => inLM(x, z) };
      K.inLM = inLM; K.LM = LM;
      // v7.6 町ごとの目玉（showpiece76.js：水路・崖・灯台など）。「建物の作り込み」を使うときだけ
      const SP = bdetailSetting() !== 'off' && !R.modern ? showpieceFor(map) : null; K.SP = SP;
      if (SP && SP.hooks) { const h = SP.hooks; ['groundY', 'waterY', 'walkY', 'skipFloor', 'skipOutTree'].forEach((k) => { if (h[k]) hooks[k] = h[k]; }); }
      // 近未来・娯楽の町（R.modern）：建物はガラスと金属の汎用のまま（舗装・街灯・柵・目印だけ）
      const building = async (b, o) => {
        if (R.modern) return null; const st = townStyle(b, R) || (b.shape76 ? { plaster: R.plaster[0], roofColor: R.roofs[0] } : null); if (!st) return null;
        st.detail76 = true;   // v7.6 建物の作り込み（BuildingBuilder3D.detail76）
        if (brick82) st.wallMat = brick82;   // v8.2 煉瓦の壁
        if (b.shape76 || b.doorSide === 'left' || b.doorSide === 'right' || /^(weapon|armor|tavern)$/.test(b.type || '')) { const r = await buildVariant76(b, Object.assign({}, o, { sample76: true }), R, st, region); if (r) return r; }   // v7.6 丸い家・八角の家・テント・露店・横の入口（variants76.js）
        return o.bb.build(b, o.rnd, { batch: o.batch, design: o.design, theme: o.theme, style: st });
      };
      ctx.stats.region = region;
      return { hooks, building, build: (bb) => build(ctx, K, bb) };
    }
  };
}

// 街灯（地域の形）。y：地面の高さ
function lamp(add, kind, x, y, z, M) {
  switch (kind) {
    case 'oil': add(M.wood, wbox(0.16, 2.3, 0.16, x, y + 1.15, z)); add(M.wood, wbox(0.55, 0.1, 0.1, x + 0.22, y + 2.2, z)); add(M.iron, cyl(0.1, 0.12, 0.26, 6, x + 0.42, y + 1.95, z)); add(M.glow, cyl(0.07, 0.07, 0.16, 6, x + 0.42, y + 1.95, z)); return 1.95;
    case 'iron': add(M.iron, cyl(0.12, 0.16, 0.3, 8, x, y + 0.15, z)); add(M.iron, cyl(0.04, 0.06, 2.6, 8, x, y + 1.6, z)); add(M.glow, new THREE.SphereGeometry(0.16, 12, 8).translate(x, y + 3.0, z)); add(M.iron, cyl(0.06, 0.1, 0.1, 8, x, y + 2.86, z)); return 2.9;
    case 'rope': add(M.wood, cyl(0.07, 0.09, 2.5, 6, x, y + 1.25, z)); add(M.wood, wbox(0.5, 0.07, 0.07, x + 0.2, y + 2.4, z)); add(M.rope, cyl(0.01, 0.01, 0.35, 4, x + 0.4, y + 2.2, z)); add(M.glow, cyl(0.12, 0.12, 0.26, 8, x + 0.4, y + 1.92, z)); return 1.9;
    case 'brass': add(M.brass, cyl(0.1, 0.14, 0.24, 8, x, y + 0.12, z)); add(M.brass, cyl(0.04, 0.05, 2.2, 8, x, y + 1.3, z)); add(M.glow, wbox(0.24, 0.32, 0.24, x, y + 2.55, z)); add(M.brass, new THREE.ConeGeometry(0.22, 0.2, 4).rotateY(Math.PI / 4).translate(x, y + 2.82, z)); return 2.55;
    case 'crystal': add(M.pale, cyl(0.05, 0.08, 2.2, 6, x, y + 1.1, z)); add(M.pale, cyl(0.16, 0.12, 0.08, 6, x, y + 2.24, z)); add(M.crystal, new THREE.OctahedronGeometry(0.18, 0).scale(1, 1.6, 1).translate(x, y + 2.62, z)); return 2.6;
    case 'torch': add(M.wood, cyl(0.07, 0.09, 1.9, 6, x, y + 0.95, z)); add(M.iron, cyl(0.14, 0.08, 0.18, 6, x, y + 1.95, z)); add(M.flame, new THREE.ConeGeometry(0.11, 0.32, 6).translate(x, y + 2.18, z)); return 2.1;
    case 'brazier': add(M.stone, wbox(0.5, 0.7, 0.5, x, y + 0.35, z)); add(M.iron, cyl(0.32, 0.18, 0.22, 10, x, y + 0.81, z)); add(M.flame, new THREE.ConeGeometry(0.22, 0.36, 7).translate(x, y + 1.08, z)); return 1.1;
    default: add(M.iron, wbox(0.12, 2.2, 0.12, x, y + 1.1, z)); add(M.iron, wbox(0.32, 0.06, 0.32, x, y + 2.22, z)); add(M.glow, wbox(0.22, 0.3, 0.22, x, y + 2.05, z)); add(M.iron, new THREE.ConeGeometry(0.24, 0.2, 4).rotateY(Math.PI / 4).translate(x, y + 2.35, z)); add(M.cream, wbox(0.26, 0.26, 0.26, x, y + 2.05, z)); return 2.05;   // lantern
  }
}
// 柵（地域の形）。hx/hz：柵が東西／南北に続く
function fence(add, kind, x, y, z, hx, hz, M, r) {
  const L = (a, b) => (hx ? a : b);
  switch (kind) {
    case 'stone': add(M.stone, wbox(hx ? 1.0 : 0.5, 0.62, hz ? 1.0 : 0.5, x, y + 0.31, z)); add(M.stoneD, wbox(hx ? 1.02 : 0.58, 0.1, hz ? 1.02 : 0.58, x, y + 0.67, z)); break;
    case 'palisade': for (const t of [-0.33, 0, 0.33]) { const h = 1.05 + r() * 0.35; add(M.wood, cyl(0.1, 0.11, h, 6, x + L(t, 0), y + h / 2, z + L(0, t))); add(M.wood, new THREE.ConeGeometry(0.1, 0.2, 6).translate(x + L(t, 0), y + h + 0.1, z + L(0, t))); } add(M.rope, wbox(L(1.0, 0.06), 0.06, L(0.06, 1.0), x, y + 0.8, z)); break;
    case 'railing': for (const t of [-0.25, 0.25]) add(M.iron, wbox(0.05, 1.0, 0.05, x + L(t, 0), y + 0.5, z + L(0, t))); for (const yy of [0.35, 0.95]) add(M.iron, wbox(L(1.0, 0.05), 0.05, L(0.05, 1.0), x, y + yy, z)); add(M.stoneD, wbox(L(1.0, 0.3), 0.14, L(0.3, 1.0), x, y + 0.07, z)); break;
    case 'balustrade': add(M.pale, wbox(L(1.0, 0.44), 0.24, L(0.44, 1.0), x, y + 0.12, z)); add(M.pale, wbox(L(1.02, 0.38), 0.1, L(0.38, 1.02), x, y + 0.92, z)); for (const t of [-0.25, 0.25]) add(M.pale, cyl(0.06, 0.07, 0.62, 8, x + L(t, 0), y + 0.55, z + L(0, t))); break;
    case 'drift': for (const t of [-0.35, -0.12, 0.12, 0.35]) { const h = 0.75 + r() * 0.4; add(M.drift, wbox(L(0.17, 0.08), h, L(0.08, 0.17), x + L(t, 0), y + h / 2, z + L(0, t))); } add(M.rope, wbox(L(1.0, 0.03), 0.03, L(0.03, 1.0), x, y + 0.6, z)); break;
    case 'mud': add(M.mud, wbox(L(1.0, 0.45), 0.7, L(0.45, 1.0), x, y + 0.35, z)); { const c = new THREE.CylinderGeometry(0.22, 0.22, 1.0, 10, 1, false, 0, Math.PI); c.rotateZ(Math.PI / 2); if (!hx) c.rotateY(Math.PI / 2); c.translate(x, y + 0.7, z); add(M.mud, c); } break;
    default: break;
  }
}

async function build(ctx, K, b) {
  const map = ctx.map, W = map.w, H = map.h; const hAt = b.heightAt || (() => 0); const R = K.R;
  const g = new THREE.Group(); g.name = 'env_town_kit'; b.root.add(g);
  const batch = new Batch(); const add = (m, gg) => batch.add(m, gg);
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
  const covered = new Set(); for (const bd of map.buildings) for (let y = bd.y; y < bd.y + bd.h; y++) for (let x = bd.x; x < bd.x + bd.w; x++) covered.add(x + ',' + y);
  const lightHex = '#' + new THREE.Color(R.light).getHexString();
  const M = {
    wood: plain('#6a4e36', { std: { roughness: 0.9 } }), drift: plain('#a89a86', { std: { roughness: 0.95 } }), rope: plain('#b89e70', { std: { roughness: 1 } }),
    iron: plain('#2e3236', { std: { roughness: 0.55 } }), brass: plain('#c49a48', { std: { roughness: 0.4, metalness: 0.5 } }), pale: plain('#efe8f4', { std: { roughness: 0.6 } }),
    stone: plain(R.walk[0], { std: { roughness: 0.9 } }), stoneD: plain(R.road[1], { std: { roughness: 0.9 } }), mud: plain('#d8b888', { std: { roughness: 1 } }), roof: plain(R.roofs[0], { std: { roughness: 0.8 } }),
    glow: plain(lightHex, { emissive: lightHex, ei: 1.3, window: true }), cream: plain('#fff2d0', { emissive: lightHex, ei: 0.35, transparent: true, opacity: 0.55 }), flame: plain('#ffb050', { emissive: '#ff8a30', ei: 2.2, keepGlow: true }),
    crystal: plain('#d8c8f0', { emissive: '#b8a0e8', ei: 0.9, keepGlow: true, std: { roughness: 0.2 } })
  };
  // ---- 床：道と歩道を地域の石に（建物の足元・水・橋・草・畑・砂などは従来のまま）
  const roads = [], walks = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (covered.has(x + ',' + z)) continue; const t = T(x, z); if (t === 'road') roads.push([x, z]); else if (t === 'stone' || t === 'path_stone' || t === 'lamp' || t === 'fountain' || t === 'well' || t === 'bench' || t === 'barrel' || t === 'crate') walks.push([x, z]); }
  if (roads.length && !(map.def && map.def.dirtRoad81)) add(K.road, floorQuadsH(roads, 1 / 2, 1 / 2, hAt, 0.016));   // v8.1 dirtRoad81（開いた村の踏み跡）は石を敷かない（土の道のまま）
  if (walks.length) add(K.walk, floorQuadsH(walks, 1 / 2, 1 / 2, hAt, 0.014));
  // ---- 街灯
  let lamps = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'lamp' || K.inLM(x, z)) continue; const cx = x + 0.5, cz = z + 0.5, y = hAt(cx, cz); const ly = lamp(add, R.lamp, cx, y, cz, M); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, y + ly, cz), color: R.light, power: 0.95, dist: 9 }); lamps++; }
  // ---- 柵
  let fences = 0; const r = rng(map.w * 131 + map.h);
  if (R.fence) for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'fence') continue; const hx = T(x - 1, z) === 'fence' || T(x + 1, z) === 'fence', hz = T(x, z - 1) === 'fence' || T(x, z + 1) === 'fence'; fence(add, R.fence, x + 0.5, hAt(x + 0.5, z + 0.5), z + 0.5, hx || !hz, hz && !hx, M, r); fences++; }
  // ---- v7.6 地面の汚れ・落ち葉・水たまり・石の欠け（通れるマスの上の、平らな模様だけ。当たり判定は変えない）
  let decals = 0; if (bdetailSetting() !== 'off') decals = groundDecals(add, map, T, covered, K, hAt, R, K.region);
  if (K.LM) await buildLandmark(ctx, K.LM, add, g, hAt);   // 町ごとの目印
  if (K.SP) { try { K.SP.build({ add, g, ctx, K, hAt }); } catch (e) { ctx.stats.showpieceError = String(e && e.message || e); console.warn('showpiece76', e); } }   // v7.6 町ごとの目玉
  batch.build(g);
  Object.assign(ctx.stats, { lamps, fences, decals, floor: { road: roads.length, walk: walks.length }, landmark: K.LM ? K.LM.kind : null });
  return g;
}

// v7.6 地面の模様（汚れ・落ち葉・水たまり・石の欠け）：1枚の絵（4つに分けた）を、通れる道・歩道のマスに少しずつ置く。1回の描画
let decalMat = null;
function decalMaterial() {
  if (decalMat) return decalMat;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); const r = rng(4242);
  const blob = (cx, cy, rad, col, n) => { for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = r() * rad * 0.6, rr = rad * (0.25 + r() * 0.35); const gr = g.createRadialGradient(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0, cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - rad * 2, cy - rad * 2, rad * 4, rad * 4); } };
  g.save(); g.beginPath(); g.rect(0, 0, 128, 128); g.clip(); blob(64, 64, 46, 'rgba(70,50,32,0.42)', 12); g.restore();   // 0：汚れ
  g.save(); g.beginPath(); g.rect(128, 0, 128, 128); g.clip();                                                      // 1：落ち葉
  const leafC = ['#c8782a', '#a8502a', '#d8a838', '#7a8a3a', '#8a5a2a'];
  for (let i = 0; i < 12; i++) { const x = 146 + r() * 92, y = 18 + r() * 92; g.save(); g.translate(x, y); g.rotate(r() * 6.3); g.fillStyle = leafC[i % 5]; g.beginPath(); g.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(60,30,10,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); g.stroke(); g.restore(); }
  g.restore();
  g.save(); g.beginPath(); g.rect(0, 128, 128, 128); g.clip(); blob(64, 192, 46, 'rgba(70,90,110,0.55)', 7); g.fillStyle = 'rgba(220,235,255,0.35)'; g.beginPath(); g.ellipse(52, 184, 14, 4, -0.4, 0, Math.PI * 2); g.fill(); g.restore();   // 2：水たまり
  g.save(); g.beginPath(); g.rect(128, 128, 128, 128); g.clip(); g.strokeStyle = 'rgba(40,32,26,0.6)'; g.lineWidth = 2.5;  // 3：石の欠け・ひび
  for (let k = 0; k < 3; k++) { let x = 160 + r() * 60, y = 150 + r() * 60; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += (r() - 0.5) * 26; y += (r() - 0.5) * 26; g.lineTo(x, y); } g.stroke(); }
  blob(200, 200, 14, 'rgba(50,40,30,0.4)', 3); g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  decalMat = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  decalMat.userData.noShadow = true; decalMat.name = 'decal76'; return decalMat;
}
function groundDecals(add, map, T, covered, K, hAt, R, region) {
  const W = map.w, H = map.h; const pos = [], uv = [], nrm = [], idx = []; let v = 0, n = 0;
  const kinds = region === 'desert' ? [0, 0, 3] : region === 'snow' ? [0, 3, 2] : region === 'dark' || region === 'dragon' ? [0, 3, 3] : region === 'sky' || region === 'magicka' ? [0, 3] : [0, 1, 1, 2, 3];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const t = T(x, z); if (t !== 'road' && t !== 'stone' && t !== 'path_stone') continue; if (covered.has(x + ',' + z) || K.inLM(x, z)) continue;
    const h = hash(x, z, 77); if (h > 0.1) continue;
    const c = [hAt(x, z), hAt(x + 1, z), hAt(x + 1, z + 1), hAt(x, z + 1)]; const y = hAt(x + 0.5, z + 0.5); if (c.some((q) => Math.abs(q - y) > 0.02)) continue;   // 平らなマスだけ
    const kind = kinds[Math.floor(hash(x, z, 78) * kinds.length) % kinds.length]; const u0 = (kind % 2) * 0.5, v0 = kind < 2 ? 0.5 : 0;   // 絵の上下（UV の v は下から）
    const s = 0.7 + hash(x, z, 79) * 0.25, a = hash(x, z, 80) * Math.PI * 2, cx = x + 0.5 + (hash(x, z, 81) - 0.5) * 0.1, cz = z + 0.5 + (hash(x, z, 82) - 0.5) * 0.1;   // マスの中に収める
    const ca = Math.cos(a) * s / 2, sa = Math.sin(a) * s / 2;
    for (const [px, pz, uu, vv] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) { pos.push(cx + px * ca - pz * sa, y + 0.024, cz + px * sa + pz * ca); uv.push(u0 + uu * 0.5, v0 + vv * 0.5); nrm.push(0, 1, 0); }
    idx.push(v, v + 2, v + 1, v, v + 3, v + 2); v += 4; n++;
  }
  if (!n) return 0;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
  add(decalMaterial(), g); return n;
}
