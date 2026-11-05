/* =========================================================
   レシピ（全体展開・ダンジョンと屋内）：room_kit — 専用レシピのないダンジョン・屋内の壁と床を、種類（プロファイルの archetype）ごとに作り直す
   ・自然の洞（洞窟・鉱山・火山・海底・氷）：汎用の箱の壁の代わりに、ゆがんだ岩塊（直角を減らす）。歩けるマスへは 0.06 までしかはみ出さない
   ・人の造った所：切石（城・遺跡・書庫・時の塔・教会・塔・砂の神殿・闇の城）／金属の外板（研究所・工場・電脳）／板張り（船）／
     しっくいと腰板（家・宿・酒場・店・野営）。台座・軒蛇腹・付け柱（または腰板と幅木）。床は種類ごとの石・金属の床板（石の床のマスだけ。じゅうたん・木の床はそのまま）
   ・手前（南・カメラの側）の壁は従来と同じく低い（中が見える）。壁を作るのは、歩けるマスにとなり合う壁のマスだけ（従来と同じ）
   ・論理（タイル・当たり判定・ワープ・NPC・イベント・宝箱）は変えない
   ・屋外のダンジョン（森・草原・空）と、壁の種類が木々のマップには当てない
   ・状態：integrated（組み込み・自動の確認まで）。部屋ごとの間取りや見せ場の作り込みはしていない
   ========================================================= */
import * as THREE from 'three';
import { dressPlan76, dressBuild76 } from './shopdress76.js';
import { plain, rng, worldUV, mat4, Merge } from '../EnvKit3D.js';
import { canvasTex, texMat, wbox, cyl, drawSetts, floorQuadsH, shade, settsHeight } from './geo.js';

// 種類 → 作り方。fam：rock（岩塊）／ashlar（切石）／panel（金属）／plank（板）／plaster（しっくいと腰板）
export const ROOM_STYLE = {
  cave: { fam: 'rock', rock: '#6e6456' }, mine: { fam: 'rock', rock: '#685a4a' }, volcano: { fam: 'rock', rock: '#4e3a32' }, undersea: { fam: 'rock', rock: '#4e6e78' }, ice: { fam: 'rock', rock: '#a8bccc' },
  void: { fam: 'ashlar', stone: ['#5a5064', '#342e3e'], floor: ['#4a4254', '#2a2432', 64, 64, 0.12] },
  castle: { fam: 'ashlar', stone: ['#e6dfd2', '#b5ab9a'], floor: ['#cfc6b6', '#8e8676', 64, 64, 0.08] },
  ruin: { fam: 'ashlar', stone: ['#a39a8a', '#6e665a'], floor: ['#958c7c', '#5e564c', 64, 64, 0.16], moss: true },
  archive: { fam: 'ashlar', stone: ['#d8c9a8', '#a08e6c'], floor: ['#bba680', '#7e6c50', 128, 64, 0.08] },
  time: { fam: 'ashlar', stone: ['#d9d6e2', '#9a96a8'], floor: ['#c4c2d2', '#8a879a', 64, 64, 0.06] },
  church: { fam: 'ashlar', stone: ['#efe9dc', '#bdb3a0'], floor: ['#d8d0c0', '#9e9684', 64, 64, 0.05] },
  tower: { fam: 'ashlar', stone: ['#cfc7b8', '#948a7a'], floor: ['#b8b0a2', '#7e766a', 64, 32, 0.08] },
  observatory: { fam: 'ashlar', stone: ['#d6dbe4', '#9aa2b0'], floor: ['#c2c8d4', '#868e9c', 64, 64, 0.05] },
  desert: { fam: 'ashlar', stone: ['#e2c79a', '#a8885c'], floor: ['#d6b888', '#9a7c50', 64, 32, 0.1] },
  dark: { fam: 'ashlar', stone: ['#5e5468', '#3a3244'], floor: ['#4e4658', '#2e2836', 64, 64, 0.12] },
  magic: { fam: 'ashlar', stone: ['#c8bcdc', '#8e82a6'], floor: ['#b4a8cc', '#7a6e94', 64, 64, 0.06] },
  lab: { fam: 'panel', panel: '#c4ccd4', floor: ['#9aa4ae', '#646c76', 64, 64, 0.04] },
  factory: { fam: 'panel', panel: '#a8b0b6', floor: ['#7e868c', '#4e555a', 64, 64, 0.06] },
  cyber: { fam: 'panel', panel: '#d4dade', floor: ['#aab2ba', '#6e767e', 64, 64, 0.03] },
  ship: { fam: 'plank', wood: '#8a6646' },
  house: { fam: 'plaster', plaster: '#f0e6d2', wood: '#7a5a3e' }, inn: { fam: 'plaster', plaster: '#f2e4cc', wood: '#6e4e34' }, tavern: { fam: 'plaster', plaster: '#ead8b8', wood: '#5e4430' },
  shop: { fam: 'plaster', plaster: '#f4ead8', wood: '#7e5e40' }, camp: { fam: 'plank', wood: '#7a6048' }, forest: null, sky: null
};
const WALLS = { wall: 1, castle_wall: 1, cave_wall: 1, wall_wood: 1, _void: 1 };

export function roomKit(style) {
  return {
    id: 'room_kit.v1:' + style.fam,
    async prepare(ctx) {
      const plan = dressPlan76(ctx.map); ctx.dress76 = plan;   // v7.6 見本の町の店・酒場の中の飾り（shopdress76.js）
      const hooks = { skipWall: (t) => !!WALLS[t] }; if (plan) hooks.skipProp = (t, x, z) => plan.skip.has(x + ',' + z);
      ctx.stats.family = style.fam;
      return { hooks, build: (bb) => build(ctx, style, bb) };
    }
  };
}

// 地域の色（屋内の壁・木・石）。用途の作り方と混ぜる（地域×用途）
export const REGION_PAL = {
  arcadia: { plaster: '#f2e6cc', wood: '#7a5a3e', stone: '#e6dfd2' }, grania: { plaster: '#d8cdbb', wood: '#5a4434', stone: '#b8b0a2' }, kalion: { plaster: '#f8f2e6', wood: '#6a3a2a', stone: '#ece6da' },
  islands: { plaster: '#fbf8f0', wood: '#9a8a70', stone: '#e8e2d4' }, tempus: { plaster: '#ece8f0', wood: '#5e4a42', stone: '#d9d6e2' }, magicka: { plaster: '#ebe4f2', wood: '#3e3048', stone: '#d0c6e0' },
  sky: { plaster: '#ffffff', wood: '#b8a890', stone: '#eef2f8' }, dark: { plaster: '#8e8494', wood: '#3a2e34', stone: '#6a6070' }, desert: { plaster: '#ecd4a8', wood: '#8a6a44', stone: '#e2c79a' },
  dragon: { plaster: '#c8b4a4', wood: '#4a2e24', stone: '#a89484' }, snow: { plaster: '#f2f2f0', wood: '#6e5a46', stone: '#dfe2e6' }, machine: { plaster: '#dfe3e6', wood: '#5e646a', stone: '#c8ced4' }
};
const mixHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
// 城の部屋の種類（名前から）：玉座・回廊・庭・地下・宝物庫・武器庫・書斎・塔・広間
export function castleRoom(name) {
  const n = name || '';
  if (/玉座|謁見/.test(n)) return 'throne'; if (/回廊|廊下|通路/.test(n)) return 'corridor'; if (/庭|園/.test(n)) return 'garden'; if (/地下|牢|獄|地底/.test(n)) return 'cellar';
  if (/宝物|宝庫|金庫/.test(n)) return 'treasury'; if (/武器|兵舎|練兵/.test(n)) return 'armory'; if (/書|図書|執務|記録/.test(n)) return 'study'; if (/塔|屋上|[0-9]+階|上階/.test(n)) return 'tower';
  return 'hall';
}
function vnoise(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
function smooth(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi; const f = (t) => t * t * (3 - 2 * t); let v = 0; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) v += (a ? f(xf) : 1 - f(xf)) * (b ? f(yf) : 1 - f(yf)) * (c ? f(zf) : 1 - f(zf)) * vnoise(xi + a, yi + b, zi + c); return v; }

async function build(ctx, S0, b) {
  let S = S0;
  const map = ctx.map, W = map.w, H = map.h, hi = ctx.quality !== 'low'; const hAt = b.heightAt || (() => 0);
  const g = new THREE.Group(); g.name = 'env_room_kit'; b.root.add(g); const mg = new Merge(); const add = (m, gg) => mg.add(m, gg);
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_void' : map.tile(x, z));
  const walkish = (x, z) => x >= 0 && z >= 0 && x < W && z < H && !WALLS[T(x, z)];   // 壁でないマス（小物の置かれたマスも、壁の面を見せる側）
  const r = rng(W * 7919 + H * 104729);
  let walls = 0, pil = 0;
  // ---- 地域×用途：地域の色を、用途の作り方に混ぜる（プロファイルの region。屋内は親の町の地域）
  const RP = REGION_PAL[(ctx.profile && ctx.profile.region) || ''] || null;
  if (RP) { S = Object.assign({}, S); if (S.fam === 'plaster') { S.plaster = mixHex(S.plaster, RP.plaster, 0.65); S.wood = mixHex(S.wood, RP.wood, 0.6); } if (S.fam === 'plank') S.wood = mixHex(S.wood, RP.wood, 0.5); if (S.fam === 'ashlar') S.stone = [mixHex(S.stone[0], RP.stone, 0.35), mixHex(S.stone[1], RP.stone, 0.2)]; }
  const castleLike = S.fam === 'ashlar' && (/castle|void|dark/.test(S.archetype || '') || /城|宮/.test(map.name || ''));
  const room = castleLike ? castleRoom(map.name) : null; ctx.stats.room = room; ctx.stats.use = S.archetype || null;
  const D = {   // 壁の飾りの材質
    frame: plain('#5a4030', { std: { roughness: 0.8 } }), canvas: [plain('#8aa4c8', { std: { roughness: 0.9 } }), plain('#c8a070', { std: { roughness: 0.9 } }), plain('#7a9a6a', { std: { roughness: 0.9 } })],
    cloth: plain(room === 'throne' ? '#8a2a3a' : '#2e4a7a', { std: { roughness: 0.95, side: THREE.DoubleSide } }), gold: plain('#c9a24a', { std: { roughness: 0.35, metalness: 0.6 } }),
    glow: plain('#ffe0a8', { emissive: '#ffc070', ei: 1.4, keepGlow: true }), glass: plain('#a8c8f0', { emissive: '#8ab8ff', ei: 0.7, window: true }), iron: plain('#3a3e44', { std: { roughness: 0.55 } }),
    pipe: plain('#8a949c', { std: { roughness: 0.45, metalness: 0.3 } }), green: plain('#4e7a3a', { std: { roughness: 0.95, side: THREE.DoubleSide } }), night: plain('#1e2a4a', { emissive: '#3a5aa0', ei: 0.4 }),
    bottle: [plain('#c84a4a', { std: { roughness: 0.3 } }), plain('#4a8ac8', { std: { roughness: 0.3 } }), plain('#5ab86a', { std: { roughness: 0.3 } })]
  };
  const TALL = { bookshelf: 1, cupboard: 1, stove: 1, counter: 1, bed: 1 };
  let decor = 0;
  // 奥の壁（南向きの面）の飾り：用途・城の部屋の種類ごと。前のマスに背の高い家具があるときは置かない
  // 奥の壁の飾り：歩けるマスへ 0.1 より出る形は、体の高さ（1.8）より上（1.85 以上）に置く
  const decorFace = (cx, fz, x, z, h) => {
    if (h < 1.5 || TALL[T(x, z + 1)]) return; const u = S.archetype || 'house'; const k = (x * 7 + z * 3) % 3; const y = 2.0;
    const zf = fz + 0.02;
    if (room === 'throne' || room === 'hall') { if (x % (room === 'throne' ? 2 : 4)) return; const cl = new THREE.PlaneGeometry(0.62, 1.5); cl.translate(cx, y + 0.1, zf + 0.01); add(D.cloth, cl); add(D.gold, wbox(0.72, 0.06, 0.05, cx, y + 0.88, zf + 0.02)); if (room === 'throne') add(D.gold, wbox(0.08, 0.08, 0.04, cx, y - 0.2, zf + 0.03)); decor++; return; }
    if (room === 'corridor') { if (x % 2) return; add(trim, wbox(0.26, h, 0.1, cx - 0.5, h / 2, zf + 0.04)); const ar = new THREE.TorusGeometry(0.5, 0.06, 6, 14, Math.PI); ar.translate(cx, h - 0.75, zf + 0.05); add(trim, ar); if (x % 4 === 0) { add(D.iron, wbox(0.1, 0.24, 0.12, cx, 2.0, zf + 0.06)); add(D.glow, wbox(0.08, 0.12, 0.08, cx, 2.18, zf + 0.12)); } decor++; return; }
    if (room === 'garden') { const iv = new THREE.PlaneGeometry(0.9, 0.6 + k * 0.4); iv.translate(cx, h - 0.4 - k * 0.2, zf + 0.01); add(D.green, iv); decor++; return; }
    if (room === 'cellar') { if (x % 3) return; for (let i = -2; i <= 2; i++) add(D.iron, wbox(0.04, 1.0, 0.04, cx + i * 0.14, 1.4, zf + 0.04)); add(D.iron, wbox(0.7, 0.05, 0.05, cx, 1.9, zf + 0.04)); decor++; return; }
    if (room === 'treasury') { add(D.gold, wbox(1.0, 0.07, 0.04, cx, h - 0.35, zf + 0.02)); if (x % 3 === 0) { add(D.gold, new THREE.CircleGeometry(0.22, 16).translate(cx, 1.9, zf + 0.03)); } decor++; return; }
    if (room === 'armory') { if (x % 3) return; add(D.frame, wbox(0.9, 0.08, 0.1, cx, 1.2, zf + 0.06)); add(D.frame, wbox(0.9, 0.08, 0.1, cx, 2.2, zf + 0.06)); for (let i = 0; i < 4; i++) add(D.iron, wbox(0.04, 1.3, 0.04, cx - 0.33 + i * 0.22, 1.75, zf + 0.08)); decor++; return; }
    if (room === 'study') { if (x % 3) return; add(D.frame, wbox(0.9, 1.2, 0.08, cx, 1.9, zf + 0.04)); for (let i = 0; i < 3; i++) add(D.canvas[i], wbox(0.24, 0.3, 0.06, cx - 0.28 + i * 0.28, 1.6 + (i % 2) * 0.5, zf + 0.09)); decor++; return; }
    if (room === 'tower') { if (x % 2) return; add(D.glass, wbox(0.12, 0.8, 0.04, cx, 2.0, zf + 0.02)); decor++; return; }
    if (x % 3) return;
    if (u === 'house' || u === 'inn') { add(D.frame, wbox(0.62, 0.48, 0.05, cx, y, zf + 0.025)); add(D.canvas[k], wbox(0.52, 0.38, 0.03, cx, y, zf + 0.05)); if (u === 'inn') { add(D.iron, wbox(0.08, 0.22, 0.1, cx + 0.7, 2.0, zf + 0.05)); add(D.glow, wbox(0.1, 0.12, 0.1, cx + 0.7, 2.17, zf + 0.12)); } decor++; return; }
    if (u === 'tavern' || u === 'camp') { add(D.iron, wbox(0.08, 0.24, 0.12, cx, 1.85, zf + 0.06)); add(D.glow, wbox(0.12, 0.16, 0.12, cx, 2.04, zf + 0.14)); add(D.frame, wbox(0.5, 0.7, 0.04, cx + 0.6, 1.9, zf + 0.02)); decor++; return; }
    if (u === 'shop') { add(D.frame, wbox(0.9, 0.06, 0.25, cx, 1.95, zf + 0.12)); for (let i = 0; i < 4; i++) add(D.bottle[(i + k) % 3], cyl(0.05, 0.05, 0.2, 6, cx - 0.33 + i * 0.22, 2.08, zf + 0.12)); decor++; return; }
    if (u === 'church') { add(D.glass, wbox(0.5, 1.4, 0.03, cx, 2.0, zf + 0.015)); const top = new THREE.CircleGeometry(0.25, 12, 0, Math.PI); top.translate(cx, 2.7, zf + 0.016); add(D.glass, top); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, 2.0, fz + 1.0), color: 0xbcd4ff, power: 0.5, dist: 5 }); decor++; return; }
    if (u === 'lab' || u === 'factory' || u === 'cyber') { const pp = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8); pp.rotateZ(Math.PI / 2); pp.translate(cx, 2.3, zf + 0.08); add(D.pipe, pp); add(D.iron, new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14).rotateX(Math.PI / 2).translate(cx + 0.25, 2.0, zf + 0.03)); decor++; return; }
    if (u === 'archive' || u === 'time') { add(D.frame, wbox(0.8, 0.6, 0.04, cx, y, zf + 0.02)); add(D.canvas[1], wbox(0.7, 0.5, 0.03, cx, y, zf + 0.045)); decor++; return; }
    if (u === 'observatory') { add(D.night, new THREE.CircleGeometry(0.42, 20).translate(cx, y, zf + 0.02)); decor++; return; }
  };
  // ---- 壁
  const rockM = S.fam === 'rock' ? plain('#ffffff', { std: { roughness: 0.95, vertexColors: true } }) : null;
  const tex = (key, a) => texMat('rk_' + key, canvasTex('rk_' + key, 256, 256, drawSetts(a[0], a[1], a[2], a[3], a[4])), { roughness: 0.85 }, { height: settsHeight(a[2], a[3], a[2] * 7 + a[3]), depth: a[3] >= 128 ? 2 : 3 });   // 高画質：石・板の形から法線・AO（ProcPBR.js）
  let body = null, trim = null, low = null;
  if (room === 'cellar') S = Object.assign({}, S, { stone: [shade(S.stone[0], 0.5), shade(S.stone[1], 0.45)], moss: true });
  if (S.fam === 'ashlar') { body = tex('ash_' + S.stone[0], [S.stone[0], S.stone[1], 128, 64, 0.08]); trim = plain(shade(S.stone[0], 0.82), { std: { roughness: 0.85 } }); }
  if (S.fam === 'panel') { body = tex('pan_' + S.panel, [S.panel, shade(S.panel, 0.7), 128, 128, 0.04]); trim = plain(shade(S.panel, 0.6), { std: { roughness: 0.5, metalness: 0.2 } }); low = plain('#48c9d6', { emissive: '#48c9d6', ei: 1.2, keepGlow: true }); }
  if (S.fam === 'plank') { body = tex('plk_' + S.wood, [S.wood, shade(S.wood, 0.6), 32, 256, 0.18]); trim = plain(shade(S.wood, 0.7), { std: { roughness: 0.9 } }); }
  if (S.fam === 'plaster') { body = plain(S.plaster, { std: { roughness: 0.92 } }); trim = plain(S.wood, { std: { roughness: 0.8 } }); low = tex('wain_' + S.wood, [S.wood, shade(S.wood, 0.65), 64, 256, 0.12]); }
  const moss = S.moss ? plain('#6e7e4a', { std: { roughness: 1 } }) : null;
  for (let z = -1; z <= H; z++) for (let x = -1; x <= W; x++) {
    if (!WALLS[T(x, z)]) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]; if (!nb.some(([dx, dz]) => walkish(x + dx, z + dz))) continue;
    const front = walkish(x, z - 1) && !walkish(x, z + 1);   // カメラの側（南）の壁は低い
    const cx = x + 0.5, cz = z + 0.5; const y0 = 0;
    if (S.fam === 'rock') {
      const h = front ? 0.72 + vnoise(x, 0, z) * 0.2 : 2.2 + smooth(x * 0.7, 1, z * 0.7) * 0.7;
      const geo = new THREE.BoxGeometry(1.12, h, 1.12, hi ? 3 : 2, Math.max(2, Math.round(h * (hi ? 2 : 1))), hi ? 3 : 2); const p = geo.attributes.position; const col = new Float32Array(p.count * 3); const base = new THREE.Color(S.rock);
      const LIM = 0.06, oE = walkish(x + 1, z), oW = walkish(x - 1, z), oS = walkish(x, z + 1), oN = walkish(x, z - 1); const oD = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dz]) => [dx, dz, walkish(x + dx, z + dz)]);
      for (let i = 0; i < p.count; i++) {
        const lx = p.getX(i), ly = p.getY(i) + h / 2, lz = p.getZ(i); const wx = cx + lx, wz = cz + lz;
        let nx = wx + (smooth(wx * 1.7, ly * 1.3, wz * 1.7) - 0.5) * 0.5, nz = wz + (smooth(wx * 1.7 + 9, ly * 1.3 + 3, wz * 1.7 + 5) - 0.5) * 0.5, ny = ly;
        if (ly > h - 0.05) ny = ly + (smooth(wx * 2.3, 7, wz * 2.3) - 0.5) * (front ? 0.18 : 0.5);
        if (oE) nx = Math.min(nx, x + 1 + LIM); if (oW) nx = Math.max(nx, x - LIM); if (oS) nz = Math.min(nz, z + 1 + LIM); if (oN) nz = Math.max(nz, z - LIM);
        for (const [dx, dz, on] of oD) if (on) { const ox = dx > 0 ? nx - (x + 1) : x - nx, oz = dz > 0 ? nz - (z + 1) : z - nz; if (ox > LIM && oz > LIM) { if (ox < oz) nx = dx > 0 ? x + 1 + LIM : x - LIM; else nz = dz > 0 ? z + 1 + LIM : z - LIM; } }
        p.setXYZ(i, nx - cx, ny - h / 2, nz - cz);
        const k = (1.0 + 0.22 * Math.sin(ny * 3.1 + 0.6)) * (0.7 + 0.45 * smooth(wx * 3, ny * 3, wz * 3)); col[i * 3] = base.r * k; col[i * 3 + 1] = base.g * k; col[i * 3 + 2] = base.b * k;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); worldUV(geo, 2.5);
      add(rockM, geo.applyMatrix4(mat4(cx, h / 2 - 0.08, cz))); walls++; continue;
    }
    const h = front ? 0.7 : 2.4;
    add(body, wbox(1, h, 1, cx, y0 + h / 2, cz));
    // 歩けるマスに面した面：台座（幅木）・軒蛇腹・付け柱／腰板
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!walkish(x + dx, z + dz)) continue; const fx = cx + dx * 0.5, fz = cz + dz * 0.5; const along = dz !== 0;   // 面が東西に延びる
      const strip = (hh, yy, dd, m) => add(m, wbox(along ? 1.0 : dd, hh, along ? dd : 1.0, fx + dx * dd / 2, yy, fz + dz * dd / 2));
      if (S.fam === 'plaster') { strip(Math.min(0.9, h - 0.05), Math.min(0.9, h - 0.05) / 2, 0.04, low); strip(0.12, 0.06, 0.06, trim); if (h > 1) strip(0.08, Math.min(0.9, h - 0.05) + 0.04, 0.06, trim); if (h > 1.5) strip(0.12, h - 0.06, 0.07, trim); }
      else { strip(0.3, 0.15, 0.06, trim); if (h > 1.5) strip(0.12, h - 0.06, 0.08, trim); if (S.fam === 'panel' && h > 1.5) strip(0.03, 1.1, 0.065, low); }
      if (h > 1.5 && dz > 0 && x % 3 === 0 && S.fam !== 'plaster' && !room) { add(trim, wbox(0.32, h, 0.07, cx, h / 2, fz + 0.035)); pil++; }   // 付け柱（奥の壁の正面）
      if (dz > 0 && S.fam !== 'rock') decorFace(cx, fz, x, z, h);   // 奥の壁の飾り（地域×用途・城の部屋の種類）
      if (moss && h > 1.5 && r() < 0.18) add(moss, wbox(along ? 0.5 + r() * 0.4 : 0.03, 0.25 + r() * 0.5, along ? 0.03 : 0.5 + r() * 0.4, fx + dx * 0.015, 0.2 + r() * 1.2, fz + dz * 0.015));
    }
    walls++;
  }
  // ---- 床（石の床のマスだけ。じゅうたん・木の床・水・溶岩などはそのまま）
  let floors = 0;
  if (S.floor) { const list = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const t = T(x, z); if (t === 'floor_stone' || t === 'stone' || t === 'path_stone' || t === 'cave_floor') list.push([x, z]); } if (list.length) { add(tex('fl_' + S.floor[0], S.floor), floorQuadsH(list, 1 / 2, 1 / 2, hAt, 0.012)); floors = list.length; } }
  // ---- 空間の流れ（js/rpg/envlayout.js の区間）：入口は白い光、主要な空間は暖かい光と床の輪、見せ場は種類ごとの強い光と目印
  const secs = (map.envLayout && map.envLayout.sections) || []; let lit = 0;
  const ACC = { rock: 0x8ad0ff, ashlar: 0xffd890, panel: 0x48c9d6, plank: 0xffb060, plaster: 0xffc890 };
  for (const sc of secs) {
    const x = sc.x + 0.5, z = sc.y + 0.5, y = hAt(x, z);
    if (sc.kind === 'entry') { ctx.scene.lampSpots.push({ pos: new THREE.Vector3(x, y + 2.4, z), color: 0xe8f0ff, power: 0.9, dist: 8 }); lit++; }
    if (sc.kind === 'main') { ctx.scene.lampSpots.push({ pos: new THREE.Vector3(x, y + 2.8, z), color: 0xffc070, power: 1.3, dist: 11 }); lit++;
      if (S.fam !== 'rock') { const ring = new THREE.RingGeometry(1.6, 1.85, 32); ring.rotateX(-Math.PI / 2); ring.translate(x, y + 0.03, z); add(trim, ring); } }
    if (sc.kind === 'climax') { ctx.scene.lampSpots.push({ pos: new THREE.Vector3(x, y + 2.6, z), color: ACC[S.fam] || 0xffd890, power: S.fam === 'ashlar' || S.fam === 'plaster' ? 0.9 : 1.3, dist: 9 }); lit++;
      if (S.fam === 'rock') { const cm = plain('#9ad8ff', { emissive: '#6ac0ff', ei: 1.2, keepGlow: true, std: { roughness: 0.2 } }); for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3, rr = 2.2 + (k % 2) * 0.6; const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; if (walkish(Math.floor(px), Math.floor(pz))) continue; add(cm, new THREE.OctahedronGeometry(0.16 + (k % 3) * 0.05, 0).scale(1, 2.2, 1).translate(px, y + 0.3, pz)); } }
      else { const ring = new THREE.RingGeometry(1.1, 1.3, 32); ring.rotateX(-Math.PI / 2); ring.translate(x, y + 0.03, z); add(low || trim, ring); } }
  }
  if (ctx.dress76) { try { ctx.stats.dress76 = dressBuild76(ctx.dress76, { add, T, scene: ctx.scene }); ctx.stats.dressKind = ctx.dress76.kind; } catch (e) { ctx.stats.dress76Error = String(e && e.message || e); console.warn('dress76', e); } }
  mg.build(g);
  Object.assign(ctx.stats, { walls, pilasters: pil, floors, sectionsLit: lit, decor });
  return g;
}
