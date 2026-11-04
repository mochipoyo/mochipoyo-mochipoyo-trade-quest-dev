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
import { plain, rng, worldUV, mat4, Merge } from '../EnvKit3D.js';
import { canvasTex, texMat, wbox, drawSetts, floorQuadsH, shade } from './geo.js';

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
      const hooks = { skipWall: (t) => !!WALLS[t] };
      ctx.stats.family = style.fam;
      return { hooks, build: (bb) => build(ctx, style, bb) };
    }
  };
}

function vnoise(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
function smooth(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi; const f = (t) => t * t * (3 - 2 * t); let v = 0; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) v += (a ? f(xf) : 1 - f(xf)) * (b ? f(yf) : 1 - f(yf)) * (c ? f(zf) : 1 - f(zf)) * vnoise(xi + a, yi + b, zi + c); return v; }

async function build(ctx, S, b) {
  const map = ctx.map, W = map.w, H = map.h, hi = ctx.quality !== 'low'; const hAt = b.heightAt || (() => 0);
  const g = new THREE.Group(); g.name = 'env_room_kit'; b.root.add(g); const mg = new Merge(); const add = (m, gg) => mg.add(m, gg);
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_void' : map.tile(x, z));
  const walkish = (x, z) => x >= 0 && z >= 0 && x < W && z < H && !WALLS[T(x, z)];   // 壁でないマス（小物の置かれたマスも、壁の面を見せる側）
  const r = rng(W * 7919 + H * 104729);
  let walls = 0, pil = 0;
  // ---- 壁
  const rockM = S.fam === 'rock' ? plain('#ffffff', { std: { roughness: 0.95, vertexColors: true } }) : null;
  const tex = (key, a) => texMat('rk_' + key, canvasTex('rk_' + key, 256, 256, drawSetts(a[0], a[1], a[2], a[3], a[4])), { roughness: 0.85 });
  let body = null, trim = null, low = null;
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
      if (h > 1.5 && dz > 0 && x % 3 === 0 && S.fam !== 'plaster') { add(trim, wbox(0.32, h, 0.07, cx, h / 2, fz + 0.035)); pil++; }   // 付け柱（奥の壁の正面）
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
    if (sc.kind === 'climax') { ctx.scene.lampSpots.push({ pos: new THREE.Vector3(x, y + 2.6, z), color: ACC[S.fam] || 0xffd890, power: 1.5, dist: 10 }); lit++;
      if (S.fam === 'rock') { const cm = plain('#9ad8ff', { emissive: '#6ac0ff', ei: 1.2, keepGlow: true, std: { roughness: 0.2 } }); for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3, rr = 2.2 + (k % 2) * 0.6; const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; if (walkish(Math.floor(px), Math.floor(pz))) continue; add(cm, new THREE.OctahedronGeometry(0.16 + (k % 3) * 0.05, 0).scale(1, 2.2, 1).translate(px, y + 0.3, pz)); } }
      else { const ring = new THREE.RingGeometry(1.1, 1.3, 32); ring.rotateX(-Math.PI / 2); ring.translate(x, y + 0.03, z); add(low || trim, ring); } }
  }
  mg.build(g);
  Object.assign(ctx.stats, { walls, pilasters: pil, floors, sectionsLit: lit });
  return g;
}
