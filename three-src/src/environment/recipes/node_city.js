/* =========================================================
   レシピ：演算都市ノード（node_city）— FLAGSHIP_SCENES 4
   目標：中世の家を青くした町にしない。白い外皮と青灰の金属、発光は細い線と機器の一部だけ
   ・中央データ塔（core）：六角の基壇・六角の塔身・リブと細い光の線・環の床・回る環のアンテナ。入口は高い制御門
   ・建物の外殻3型（このレシピの関数）：
       A 公共棟（登録所）＝面取りした白い箱・高い入口・横長の窓帯
       B 設備棟（配給所・防具・整備工場）＝青灰の金属の壁・リブ・のこぎり屋根・ダクト・サービスハッチ・シャッター
       C 規格住居（宿・家・東の家々）＝低い箱を同じ幅の区画に割り、同じ窓・同じ換気口をくり返す（宿はカプセル型）
     学校（no_failure_school）＝閉じた中庭のロの字の棟と屋上の手すり。配給所＝長い庇と待機列の床の線
     自由市場（改革後だけ現れる建物）＝人の手で不規則に足した日よけ・木箱・電球の列
   ・床：広場は六角のタイル、道は青灰の金属板と縁石、主軸（門→塔）と大通りに細い光の破線。噴水の広場と東の広場に六角の区画
   ・外周の壁：白い壁＋上に3本の配管（直線の配管帯）。中の壁の切れ目に配管の橋（パックの pipe_bridge）。南の壁は低い
   ・南の門：パックの server_pillar を門柱にした制御門（走査の線）
   ・町の外（北）：冷却塔（湯気）。見える輪郭を作る（歩ける所の外）
   ・改革後（フラグ zeromea_reformed）：光が暖色に、入口の植木、生活の掲示（色紙）が増える。改革前は灰青の公式の掲示
   ・論理（歩ける所・入口・ワープ・NPC・イベント・宝箱）は変えない。歩けるマスの上に柱や壁を立てない（庇・日よけは頭より高い所だけ）
   ========================================================= */
import * as THREE from 'three';
import { kit, mat, plain, worldUV, rng } from '../EnvKit3D.js';
import { textTexture, Batch } from '../../engine/Materials.js';
import { canvasTex, shade, texMat, wbox, rbox, cyl, chamferPrism, hexPrism, frameOf } from './geo.js';
import { hexHeight, ceramicHeight } from '../ProcPBR.js';

// ---------------- 画像（キャンバスで作る。アプリに1つ）
// 白いセラミックの外板（1枚＝1マス。目地と留め具）
function drawCeramic(g, w, h) {
  const r = rng(77);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = shade('#e6eaed', 0.97 + r() * 0.05); g.fillRect(i * 128, j * 128, 128, 128); }
  g.fillStyle = '#a3adb5'; for (const p of [0, 127, 128, 255]) { g.fillRect(0, p, 256, 1); g.fillRect(p, 0, 1, 256); }
  g.fillStyle = '#bcc5cc'; for (const px of [10, 118, 138, 246]) for (const py of [10, 118, 138, 246]) { g.beginPath(); g.arc(px, py, 2.4, 0, 6.3); g.fill(); }
}
// 六角のタイル（平らな向き。横3マス・縦1.734マスで1回）
const HEX_R = 512 / 12, HEX_SX = 3, HEX_SZ = 3 * 296 / 512;
function drawHex(base, gap, vari) {
  return (g, w, h) => {
    const r = rng(base.length * 31 + 5); g.fillStyle = gap; g.fillRect(0, 0, w, h);
    const R = HEX_R, dy = Math.sqrt(3) * R;
    for (let i = -1; i <= 9; i++) for (let j = -1; j <= 5; j++) {
      const cx = i * 1.5 * R, cy = j * dy + (((i % 2) + 2) % 2 ? dy / 2 : 0);
      g.fillStyle = shade(base, 1 - vari / 2 + r() * vari); g.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const px = cx + (R - 2.2) * Math.cos(a), py = cy + (R - 2.2) * Math.sin(a); if (k) g.lineTo(px, py); else g.moveTo(px, py); }
      g.closePath(); g.fill();
    }
  };
}
// 掲示：改革前＝灰青の公式の予定表／改革後＝色紙の生活の掲示
function drawNotice(kind) {
  return (g, w, h) => {
    if (kind === 'official') {
      g.fillStyle = '#2c3a46'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fb4c2'; g.fillRect(8, 8, w - 16, 18);
      g.fillStyle = '#d8e4ea'; g.font = 'bold 15px sans-serif'; g.fillText('本日の予定', 14, 46); g.fillText('変更：なし', 14, 70);
      g.fillStyle = '#6f8796'; for (let i = 0; i < 5; i++) g.fillRect(14, 86 + i * 12, w - 28 - (i % 2) * 20, 5);
    } else {
      g.fillStyle = '#4a3a2a'; g.fillRect(0, 0, w, h);
      const notes = [['#fff2c8', '釣り仲間'], ['#ffd6d6', '会議6時'], ['#d8f0d0', '花の種'], ['#d8e8ff', '落とし物']];
      notes.forEach(([c, t], i) => { const x = 6 + (i % 2) * 62, y = 6 + Math.floor(i / 2) * 76; g.save(); g.translate(x + 28, y + 34); g.rotate((i % 3 - 1) * 0.08); g.fillStyle = c; g.fillRect(-28, -34, 56, 68); g.fillStyle = '#c04a3a'; g.beginPath(); g.arc(0, -28, 3, 0, 6.3); g.fill(); g.fillStyle = '#3a3a3a'; g.font = '12px sans-serif'; g.fillText(t, -24, -6); g.fillRect(-22, 6, 40, 2); g.fillRect(-22, 14, 30, 2); g.restore(); });
    }
  };
}

// ---------------- 形の道具（世界座標で作る）
// のこぎり屋根の1山（棟は東西。南が緩い斜面、北が立ち上がり）
function sawTooth(xl, xr, zS, zN, y0, rise) {
  const s = new THREE.Shape(); s.moveTo(-zS, y0); s.lineTo(-zN, y0); s.lineTo(-zN, y0 + rise); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: xr - xl, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(xl, 0, 0); return worldUV(g, 2);
}
const TOWERS = [[7, -7.5, 1.0], [57, -7, 0.9], [32, -10.5, 0.75]];   // 町の外の冷却塔（x, z, 大きさ）

// 材質（パックの金属の画像＋キャンバスの外板・六角タイル）。改革のあと（zeromea_reformed）は光が暖色、生活の掲示
async function makeK(ctx) {
  const flags = (window.State && window.State.data && window.State.data.flags) || {}; const reformed = !!flags.zeromea_reformed;
  const K = {
    reformed,
    ind: await mat(ctx, 'metal_industrial', { repeat: 2, color: '#c3ced6', bright: 1.9, roughness: 0.6, metalness: 0.1 }),
    road: await mat(ctx, 'metal_industrial', { repeat: 2, color: '#9aa7b1', bright: 1.15, roughness: 0.75, metalness: 0.08 }),
    ceramic: texMat('ceramic', canvasTex('ceramic', 256, 256, drawCeramic), { roughness: 0.5 }, { height: ceramicHeight(), depth: 2, rough0: 0.8, rough1: 1.0 }),
    hexL: texMat('hexL', canvasTex('hexL', 512, 296, drawHex('#dde3e7', '#8f99a1', 0.06)), { roughness: 0.62 }, { height: hexHeight(HEX_R), depth: 2.5 }),
    hexD: texMat('hexD', canvasTex('hexD', 512, 296, drawHex('#b9c4cc', '#6f7c86', 0.08)), { roughness: 0.55 }, { height: hexHeight(HEX_R), depth: 2.5 }),
    hexP: texMat('hexP', canvasTex('hexP', 512, 296, drawHex('#eef1f2', '#a6b0b8', 0.04)), { roughness: 0.45 }, { height: hexHeight(HEX_R), depth: 2 }),
    metal: plain('#93a2ad', { std: { roughness: 0.5, metalness: 0.18 } }),
    metalD: plain('#5f6d78', { std: { roughness: 0.55, metalness: 0.15 } }),
    roof: plain('#d3dade', { std: { roughness: 0.85 } }), roofD: plain('#aeb8bf', { std: { roughness: 0.8 } }),
    white: plain('#f0f2f2', { std: { roughness: 0.5 } }),
    glass: plain('#1d2a33', { std: { roughness: 0.12, metalness: 0.35 }, window: true, emissive: reformed ? '#ffd9a0' : '#bfe6ff', ei: 0.2 }),
    acc: reformed ? plain('#ffcf7a', { emissive: '#ffb850', ei: 1.5, keepGlow: true, std: { roughness: 0.4 } }) : plain('#5fd6e2', { emissive: '#48c9d6', ei: 1.5, keepGlow: true, std: { roughness: 0.4 } }),
    warn: reformed ? plain('#ffcf7a', { emissive: '#ffb850', ei: 1.4, keepGlow: true }) : plain('#ff6a4a', { emissive: '#ff3a2a', ei: 1.6, keepGlow: true }),
    paint: plain('#e2c044', { std: { roughness: 0.7 } }),
    notice: texMat(reformed ? 'noticeLife' : 'noticeOfficial', canvasTex(reformed ? 'noticeLife' : 'noticeOfficial', 128, 160, drawNotice(reformed ? 'life' : 'official')), { roughness: 0.8 }),
    pot: plain('#8a6a54', { std: { roughness: 0.85 } }), leaf: plain('#4f8f4a', { std: { roughness: 0.85 } }), leaf2: plain('#6aa85a', { std: { roughness: 0.85 } }),
    cloth: ['#d9534a', '#f0c24a', '#3fa7a0', '#e88a3a', '#7a6ad8'].map((c) => plain(c, { std: { roughness: 0.9, side: THREE.DoubleSide } })),
    bulb: plain('#ffe2a0', { emissive: '#ffc060', ei: 2.0, keepGlow: true }),
    crate: plain('#9a7a54', { std: { roughness: 0.9 } }),
    lightColor: reformed ? 0xffc070 : 0xd8f0ff
  };
  return K;
}

export const recipe = {
  id: 'node_city.v1',
  async prepare(ctx) {
    const map = ctx.map;
    const need = ['core', 'registry', 'school', 'ration', 'inn', 'armor', 'house'];
    const ids = (map.buildings || []).map((b) => b.id); const miss = need.filter((id) => !ids.includes(id)); if (miss.length) throw new Error('建物がない：' + miss.join(','));
    const core = map.buildings.find((b) => b.id === 'core'); if (core.w !== 10 || core.h !== 6 || map.w !== 64 || map.h !== 30) throw new Error('中央データ塔・地図の大きさが想定と違う');
    const K = await makeK(ctx);
    const hooks = {
      skipWall: (t) => t === 'castle_wall' || t === 'roof_blue',
      skipProp: (t) => t === 'lamp' || t === 'fountain',
      skipOutTree: (x, z) => z >= map.h - 1 || TOWERS.some(([tx, tz, s]) => (x - tx) ** 2 + (z - tz) ** 2 < (5 * s) ** 2)   // 南（カメラの側）と冷却塔の足元には木を置かない
    };
    const building = async (b, o) => { const f = BUILD[b.id]; if (!f) return null; const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] }; out.group.name = 'building_env_' + b.id; await f(ctx, K, b, o.batch, out); return out; };
    return { hooks, building, build: (bb) => build(ctx, K, bb, { plazas: [[50, 15.5, 2.3]], lot: 'sealed' }) };
  }
};

// ---------------- 建物の共通部品
function namePlate(out, b, x, y, z, ry) {
  const tex = textTexture(b.name || '', { bg: '#1c2730', panel: '#e9eef1', fg: '#24323c' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); m.geometry.userData.own = true;
  m.position.set(x, y, z); m.rotation.y = ry || 0; m.castShadow = false; out.group.add(m);
}
function door(add, K, x, zf, w, h, canopy) {
  add(K.metalD, wbox(w + 0.36, h + 0.2, 0.2, x, (h + 0.2) / 2, zf + 0.06));
  add(K.glass, wbox(w, h, 0.04, x, h / 2 + 0.02, zf + 0.17));
  add(K.acc, wbox(w, 0.03, 0.03, x, h + 0.06, zf + 0.19));
  add(K.metal, wbox(w + 0.8, 0.1, 0.36, x, 0.05, zf + 0.34));
  if (canopy) add(K.metal, wbox(w + 0.9, 0.08, 0.8, x, h + 0.42, zf + 0.42));
}
function extras(add, K, f, out, o) {   // 改革前後の差：掲示・植木・入口の灯り
  o = o || {}; const nx = o.noticeX !== undefined ? o.noticeX : f.doorX + (f.doorX + 1.25 < f.xr - 0.3 ? 1.25 : -1.25);
  if (o.notice !== false) { add(K.metalD, wbox(0.6, 0.74, 0.04, nx, 1.45, f.zf + 0.02)); const g = new THREE.PlaneGeometry(0.52, 0.66); g.translate(nx, 1.45, f.zf + 0.045); add(K.notice, g); }
  if (K.reformed && o.plant !== false) { const po = o.plantOff || 0.95; const px = f.doorX + (nx > f.doorX ? -po : po); add(K.pot, cyl(0.16, 0.12, 0.34, 10, px, 0.17, f.zf + 0.2)); const s = new THREE.IcosahedronGeometry(0.26, 1); s.scale(1, 1.2, 1); s.translate(px, 0.62, f.zf + 0.2); add(K.leaf, s); }
  out.lights.push({ pos: new THREE.Vector3(f.doorX, 2.3, f.zf + 0.7), color: K.lightColor, power: 0.9, dist: 7 });
}
// 窓を置く x（扉の近くと端を避ける）
function slots(f, step, margin, avoid) { const xs = []; for (let x = f.xl + margin; x <= f.xr - margin + 0.01; x += step) if (!avoid.some(([a, r]) => Math.abs(a - x) < r)) xs.push(x); return xs; }
function noticeAt(f) { return f.doorX + (f.doorX + 1.25 < f.xr - 0.3 ? 1.25 : -1.25); }

// A 公共棟（登録所）：面取りした白い箱・高い入口（扉の2倍近い枠）・横長の窓帯
async function shellPublic(ctx, K, b, batch, out, o) {
  o = o || {}; const add = (m, g) => batch.add(m, g); const f = frameOf(b); const H = o.H || 4.0, c = 0.55, ph = 3.15;
  add(K.metalD, chamferPrism(f.xl - 0.08, f.xr + 0.08, f.zb - 0.08, f.zf + 0.08, c + 0.05, 0, 0.32));
  add(K.ceramic, chamferPrism(f.xl, f.xr, f.zb, f.zf, c, 0.32, H - 0.32));
  add(K.roof, chamferPrism(f.xl - 0.06, f.xr + 0.06, f.zb - 0.06, f.zf + 0.06, c + 0.03, H, 0.18));
  add(K.acc, wbox(f.W - 2 * c - 0.2, 0.035, 0.03, f.cx, H - 0.22, f.zf + 0.02));
  // 窓帯（上の階）：入口の上は切る
  const L = (f.doorX - 1.05) - (f.xl + c + 0.1), R = (f.xr - c - 0.1) - (f.doorX + 1.05);
  if (L > 0.4) { add(K.metalD, wbox(L + 0.08, 0.6, 0.05, f.xl + c + 0.1 + L / 2, H - 0.75, f.zf + 0.015)); add(K.glass, wbox(L, 0.5, 0.05, f.xl + c + 0.1 + L / 2, H - 0.75, f.zf + 0.04)); }
  if (R > 0.4) { add(K.metalD, wbox(R + 0.08, 0.6, 0.05, f.doorX + 1.05 + R / 2, H - 0.75, f.zf + 0.015)); add(K.glass, wbox(R, 0.5, 0.05, f.doorX + 1.05 + R / 2, H - 0.75, f.zf + 0.04)); }
  // 下の階：縦の細い窓（同じ間隔）
  const nX = noticeAt(f); for (const x of slots(f, 0.85, c + 0.45, [[f.doorX, 1.3], [nX, 0.5]])) { add(K.metalD, wbox(0.3, 1.36, 0.05, x, 1.42, f.zf + 0.015)); add(K.glass, wbox(0.22, 1.28, 0.05, x, 1.42, f.zf + 0.04)); }
  // 高い入口：門の枠（柱・まぐさ）と奥まった扉
  for (const sx of [-1, 1]) add(K.metal, wbox(0.24, ph, 0.42, f.doorX + sx * 0.82, ph / 2, f.zf + 0.12));
  add(K.metal, wbox(1.9, 0.3, 0.46, f.doorX, ph + 0.1, f.zf + 0.12)); add(K.acc, wbox(1.5, 0.03, 0.03, f.doorX, ph - 0.08, f.zf + 0.34));
  add(K.metalD, wbox(1.4, ph - 0.05, 0.05, f.doorX, ph / 2, f.zf + 0.0));
  door(add, K, f.doorX, f.zf - 0.1, 1.2, 2.2, false);
  namePlate(out, b, f.doorX, 2.66, f.zf + 0.04);
  // 屋上：機械室・アンテナ
  add(K.metal, wbox(1.4, 0.7, 1.0, f.xl + 1.6, H + 0.53, f.zb + 0.9)); add(K.metalD, cyl(0.03, 0.03, 1.6, 6, f.xr - 1.0, H + 0.98, f.zb + 0.7)); add(K.warn, cyl(0.07, 0.07, 0.08, 8, f.xr - 1.0, H + 1.8, f.zb + 0.7));
  extras(add, K, f, out, Object.assign({ plantOff: 1.35, noticeX: nX }, o));
}
// B 設備棟（配給・防具・整備工場）：金属の壁＋リブ・のこぎり屋根・ダクト・ハッチ・シャッター
async function shellFacility(ctx, K, b, batch, out, o) {
  o = o || {}; const add = (m, g) => batch.add(m, g); const f = frameOf(b); const H = o.H || 2.9;
  add(K.metalD, wbox(f.W + 0.12, 0.3, f.D + 0.12, f.cx, 0.15, f.cz));
  add(K.ind, wbox(f.W, H - 0.3, f.D, f.cx, 0.3 + (H - 0.3) / 2, f.cz, 2));
  add(K.roofD, wbox(f.W + 0.1, 0.14, f.D + 0.1, f.cx, H + 0.07, f.cz));
  // シャッター（扉のとなり。入るのは扉）
  const shX = o.shutter ? (f.doorX + 2.1 < f.xr - 0.9 ? f.doorX + 2.1 : f.doorX - 2.1) : null;
  const side = o.counter ? f.doorX + 2.1 : shX; const nX = side !== null ? (side > f.doorX ? f.doorX - 1.25 : f.doorX + 1.25) : noticeAt(f);
  const avoid = [f.doorX, nX]; if (shX !== null) avoid.push(shX - 0.5, shX + 0.5); if (o.counter) avoid.push(f.doorX + 1.8, f.doorX + 2.4);
  // リブ（縦の金属の帯）
  for (let x = f.xl + 0.6; x < f.xr - 0.3; x += 1.2) { if (avoid.some((a) => Math.abs(a - x) < 0.9)) continue; add(K.metalD, wbox(0.1, H - 0.4, 0.06, x, 0.3 + (H - 0.4) / 2, f.zf + 0.02)); }
  if (shX !== null) { add(K.metalD, wbox(2.0, 2.3, 0.12, shX, 1.15, f.zf + 0.04)); for (let i = 0; i < 9; i++) add(K.metal, wbox(1.8, 0.16, 0.05, shX, 0.18 + i * 0.235, f.zf + 0.11)); add(K.paint, wbox(1.8, 0.08, 0.06, shX, 0.08, f.zf + 0.12)); }
  // 換気口（ルーバー）とサービスハッチ
  const vx = f.doorX > f.cx ? f.xl + 0.8 : f.xr - 0.8; for (let i = 0; i < 4; i++) add(K.metalD, rbox(0.7, 0.05, 0.12, vx, H - 0.9 + i * 0.14, f.zf + 0.06, 0, -0.5));
  add(K.metalD, wbox(0.56, 0.56, 0.04, vx, 0.75, f.zf + 0.02)); add(K.metal, wbox(0.46, 0.46, 0.05, vx, 0.75, f.zf + 0.04)); add(K.paint, wbox(0.12, 0.04, 0.06, vx, 0.95, f.zf + 0.06));
  // ダクト（側面の上を前後に走る）
  const dx = f.doorX > f.cx ? f.xl - 0.2 : f.xr + 0.2; add(K.metal, wbox(0.32, 0.32, f.D + 0.2, dx, H - 0.45, f.cz)); add(K.metal, wbox(0.32, H - 0.6, 0.32, dx, (H - 0.6) / 2 + 0.05, f.zf - 0.3));
  for (let z = f.zb + 0.4; z < f.zf; z += 1.1) add(K.metalD, wbox(0.38, 0.38, 0.06, dx, H - 0.45, z));
  // 屋根：のこぎり屋根（北に採光）または平ら＋機械
  if (o.saw) { const n = Math.max(2, Math.round(f.D / 2.0)); const td = f.D / n; for (let k = 0; k < n; k++) { const zS = f.zf - k * td, zN = zS - td; add(K.metal, sawTooth(f.xl, f.xr, zS, zN, H + 0.14, 0.85)); add(K.glass, wbox(f.W - 0.2, 0.7, 0.04, f.cx, H + 0.55, zN - 0.025)); } }
  else { add(K.metal, wbox(1.2, 0.6, 1.0, f.cx + (f.doorX > f.cx ? -1.5 : 1.5), H + 0.44, f.cz - 0.4)); add(K.metalD, cyl(0.32, 0.32, 0.2, 14, f.cx + (f.doorX > f.cx ? -1.5 : 1.5), H + 0.84, f.cz - 0.4)); }
  if (o.exhaust) { const ex = f.xl + 0.9, ez = f.zb + 0.8; add(K.metalD, cyl(0.22, 0.26, 1.8, 12, ex, H + 1.05, ez)); add(K.warn, cyl(0.24, 0.24, 0.1, 12, ex, H + 1.9, ez)); out.smokes.push(new THREE.Vector3(ex, H + 2.1, ez)); }
  // 警告灯（角）
  add(K.warn, wbox(0.12, 0.12, 0.08, f.xr - 0.25, H - 0.25, f.zf + 0.05));
  door(add, K, f.doorX, f.zf, 1.1, 2.1, true);
  namePlate(out, b, f.doorX, 2.42, f.zf + 0.52);
  extras(add, K, f, out, Object.assign({}, o, { noticeX: nX }));
}
// C 規格住居：同じ幅の区画をくり返す（宿はカプセルの箱）
async function shellHousing(ctx, K, b, batch, out, o) {
  o = o || {}; const add = (m, g) => batch.add(m, g); const f = frameOf(b); const H = o.H || 2.5;
  add(K.metalD, wbox(f.W + 0.1, 0.28, f.D + 0.1, f.cx, 0.14, f.cz));
  add(K.ceramic, wbox(f.W, H - 0.28, f.D, f.cx, 0.28 + (H - 0.28) / 2, f.cz));
  add(K.roof, wbox(f.W + 0.12, 0.12, f.D + 0.12, f.cx, H + 0.06, f.cz)); add(K.metalD, wbox(f.W + 0.14, 0.05, 0.05, f.cx, H + 0.1, f.zf + 0.07));
  const n = Math.max(1, Math.round(f.W / (o.capsule ? 1.8 : 2.4))); const uw = f.W / n;
  for (let i = 1; i < n; i++) add(K.metalD, wbox(0.06, H - 0.3, 0.05, f.xl + i * uw, 0.28 + (H - 0.3) / 2, f.zf + 0.015));
  for (let i = 0; i < n; i++) {
    const ux = f.xl + (i + 0.5) * uw; const hasDoor = Math.abs(ux - f.doorX) < uw / 2 + 0.05;
    if (o.capsule) {   // カプセル：2段の箱・丸窓
      for (const y of [1.15, 2.45]) {
        if (hasDoor) continue; add(K.white, wbox(uw - 0.3, 1.05, 0.18, ux, y, f.zf + 0.09));
        const w = new THREE.CircleGeometry(0.32, 20); w.translate(ux, y, f.zf + 0.185); add(K.glass, w);
        const ring = new THREE.TorusGeometry(0.34, 0.045, 6, 20); ring.translate(ux, y, f.zf + 0.19); add(K.metal, ring);
        add(K.acc, wbox(0.06, 0.06, 0.03, ux + uw / 2 - 0.3, y + 0.38, f.zf + 0.19));
      }
    } else {
      const wx = hasDoor ? (uw >= 2.2 ? ux + (f.doorX > ux ? -0.62 : 0.62) : null) : ux;
      if (wx !== null && !(hasDoor && Math.abs(wx - f.doorX) < 1.0)) { add(K.metalD, wbox(0.96, 0.82, 0.05, wx, H * 0.55, f.zf + 0.015)); add(K.glass, wbox(0.86, 0.72, 0.05, wx, H * 0.55, f.zf + 0.04)); add(K.metal, wbox(1.0, 0.06, 0.16, wx, H * 0.55 - 0.42, f.zf + 0.08)); }
      add(K.acc, wbox(0.07, 0.07, 0.03, ux + uw / 2 - 0.25, H - 0.35, f.zf + 0.02));   // 区画の状態灯
    }
    add(K.metal, wbox(0.42, 0.3, 0.42, ux, H + 0.27, f.zb + 0.5));   // 区画ごとの同じ換気口
  }
  door(add, K, f.doorX, f.zf, 1.0, 2.05, true);
  namePlate(out, b, f.doorX, o.capsule ? 2.62 : H + 0.45, o.capsule ? f.zf + 0.06 : f.zf + 0.1);
  extras(add, K, f, out, o);
}

// ---------------- 建物ごと
const BUILD = {
  core: coreTower,
  registry: (c, K, b, bt, out) => shellPublic(c, K, b, bt, out, { H: 4.0 }),
  school: school,
  ration: ration,
  inn: (c, K, b, bt, out) => shellHousing(c, K, b, bt, out, { capsule: true, H: 3.3, notice: false }),
  armor: (c, K, b, bt, out) => shellFacility(c, K, b, bt, out, { saw: true, shutter: true }),
  house: (c, K, b, bt, out) => shellHousing(c, K, b, bt, out, { H: 2.4 }),
  a3_node_family: (c, K, b, bt, out) => shellHousing(c, K, b, bt, out, { H: 2.3 }),
  market: market,
  x72_house: (c, K, b, bt, out) => shellHousing(c, K, b, bt, out, { H: 2.6 }),
  x72_ex0: (c, K, b, bt, out) => shellHousing(c, K, b, bt, out, { H: 2.5 }),
  x72_ex1: flowerShop,
  x72_hall: (c, K, b, bt, out) => shellFacility(c, K, b, bt, out, { saw: true, shutter: true, exhaust: true, H: 3.1 })
};

// 中央データ塔：六角の基壇＋六角の塔身（リブ・光の線・環の床）＋冠＋回る環のアンテナ。入口は高い制御門
async function coreTower(ctx, K, b, batch, out) {
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const cx = f.cx, cz = f.cz;
  // 基壇（東西に尖った六角。南の平らな面が足元の前の線）
  const rP = f.W / 2, sz = (f.D / 2) / (0.866 * rP);
  add(K.metalD, hexPrism(rP + 0.05, 0.25, cx, 0.125, cz, sz)); add(K.ind, hexPrism(rP - 0.15, 0.7, cx, 0.6, cz, sz)); add(K.acc, hexPrism(rP - 0.13, 0.03, cx, 0.9, cz, sz));
  // 塔身
  const tz = cz - 0.2, r = 1.8, y0 = 0.95, y1 = 13.0;
  add(K.ceramic, hexPrism(r, y1 - y0, cx, (y0 + y1) / 2, tz));
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + k * Math.PI / 3; const vx = cx + r * Math.sin(a), vz = tz + r * Math.cos(a);
    add(K.metalD, wbox(0.2, y1 - y0, 0.2, vx, (y0 + y1) / 2, vz));
    add(K.acc, wbox(0.035, y1 - y0 - 1.2, 0.035, vx + 0.12 * Math.sin(a), (y0 + y1) / 2, vz + 0.12 * Math.cos(a)));
  }
  // 南側3面の縦の窓
  for (const a of [0, Math.PI / 3, -Math.PI / 3]) { const d = r * 0.866 + 0.025; const g = new THREE.BoxGeometry(0.42, 8.4, 0.04); g.rotateY(a); g.translate(cx + d * Math.sin(a), 7.2, tz + d * Math.cos(a)); add(K.glass, g); }
  // 環の床（3段）
  for (const y of [4.4, 8.2, 11.6]) { add(K.metal, hexPrism(2.5, 0.14, cx, y, tz)); add(K.acc, hexPrism(2.52, 0.03, cx, y + 0.085, tz)); }
  // 冠・アンテナ
  add(K.ceramic, hexPrism(1.35, 1.6, cx, y1 + 0.8, tz)); add(K.metal, hexPrism(1.5, 0.2, cx, y1 + 1.7, tz)); add(K.metalD, cyl(0.07, 0.1, 3.4, 8, cx, y1 + 3.5, tz));
  add(K.warn, new THREE.SphereGeometry(0.14, 10, 8).translate(cx, y1 + 5.3, tz));
  const pivot = new THREE.Group(); pivot.position.set(cx, y1 + 3.2, tz); pivot.rotation.x = -Math.PI / 2; const spin = new THREE.Group(); pivot.add(spin);
  for (const [rad, tilt] of [[1.15, 0.28], [0.85, -0.42]]) { const g = new THREE.TorusGeometry(rad, 0.045, 6, 40); g.userData.own = true; const ring = new THREE.Mesh(g, K.acc); ring.rotation.x = tilt; spin.add(ring); }
  out.group.add(pivot); ctx.scene.animated.push({ kind: 'spin', obj: spin, speed: 0.35 });
  // 基壇の上のデータ柱（パックの server_pillar）
  out.group.add(await kit(ctx, 'server_pillar', [{ x: cx - 3.1, y: 0.95, z: cz + 0.7, s: [0.5, 0.62, 0.5] }, { x: cx + 3.1, y: 0.95, z: cz + 0.7, s: [0.5, 0.62, 0.5] }]));
  // 制御門（入口）：塔の前の高い枠。扉は地面の高さ
  const dx = f.doorX, zf = f.zf;
  add(K.ceramic, wbox(2.7, 3.9, 1.3, dx, 1.95, zf - 0.65)); add(K.metal, wbox(2.9, 0.22, 1.45, dx, 3.98, zf - 0.65));
  for (const sx of [-1, 1]) { add(K.metalD, wbox(0.26, 3.6, 0.3, dx + sx * 1.0, 1.8, zf + 0.04)); add(K.acc, wbox(0.035, 3.0, 0.035, dx + sx * 0.84, 1.7, zf + 0.2)); }
  add(K.metalD, wbox(2.26, 0.3, 0.3, dx, 3.45, zf + 0.04));
  door(add, K, dx, zf - 0.08, 1.3, 2.4, false);
  namePlate(out, b, dx, 2.92, zf + 0.21);
  out.lights.push({ pos: new THREE.Vector3(dx, 2.6, zf + 0.9), color: K.lightColor, power: 1.1, dist: 8 }, { pos: new THREE.Vector3(cx, 9, tz + 2.2), color: K.reformed ? 0xffc070 : 0x9fe8f0, power: 0.7, dist: 10 });
}
// 学校：閉じた中庭（ロの字）・同じ大きさの四角い窓の格子・屋上の手すり
async function school(ctx, K, b, batch, out) {
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const H = 3.1;
  const fd = 1.35, bd = 1.1, sw = 1.4; const ix0 = f.xl + sw, ix1 = f.xr - sw, iz0 = f.zb + bd, iz1 = f.zf - fd;
  add(K.metalD, wbox(f.W + 0.1, 0.28, f.D + 0.1, f.cx, 0.14, f.cz));
  add(K.ceramic, wbox(f.W, H - 0.28, fd, f.cx, 0.28 + (H - 0.28) / 2, f.zf - fd / 2));
  add(K.ceramic, wbox(f.W, H - 0.28, bd, f.cx, 0.28 + (H - 0.28) / 2, f.zb + bd / 2));
  for (const sx of [-1, 1]) add(K.ceramic, wbox(sw, H - 0.28, iz1 - iz0, sx < 0 ? f.xl + sw / 2 : f.xr - sw / 2, 0.28 + (H - 0.28) / 2, (iz0 + iz1) / 2));
  // 屋根の縁と屋上の手すり（外周）
  for (const [w, d, x, z] of [[f.W + 0.1, fd + 0.05, f.cx, f.zf - fd / 2], [f.W + 0.1, bd + 0.05, f.cx, f.zb + bd / 2], [sw + 0.05, iz1 - iz0, f.xl + sw / 2, (iz0 + iz1) / 2], [sw + 0.05, iz1 - iz0, f.xr - sw / 2, (iz0 + iz1) / 2]]) add(K.roof, wbox(w, 0.12, d, x, H + 0.06, z));
  for (const [x0, z0, x1, z1] of [[f.xl, f.zf, f.xr, f.zf], [f.xl, f.zb, f.xr, f.zb], [f.xl, f.zb, f.xl, f.zf], [f.xr, f.zb, f.xr, f.zf]]) {
    const len = Math.hypot(x1 - x0, z1 - z0), along = x1 !== x0; add(K.metalD, wbox(along ? len : 0.05, 0.05, along ? 0.05 : len, (x0 + x1) / 2, H + 0.75, (z0 + z1) / 2));
    for (let t = 0; t <= len + 0.01; t += 0.8) add(K.metalD, wbox(0.04, 0.62, 0.04, x0 + (along ? t : 0), H + 0.43, z0 + (along ? 0 : t)));
  }
  // 中庭：六角の床・改革前は「正解の掲示塔」、改革後は木と鉢
  const cg = new THREE.PlaneGeometry(ix1 - ix0, iz1 - iz0); cg.rotateX(-Math.PI / 2); cg.translate((ix0 + ix1) / 2, 0.32, (iz0 + iz1) / 2); const uv = cg.attributes.uv, p = cg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / HEX_SX, p.getZ(i) / HEX_SZ); add(K.hexP, cg);
  const mx = (ix0 + ix1) / 2, mz = (iz0 + iz1) / 2;
  if (!K.reformed) { add(K.metalD, wbox(0.36, 1.5, 0.2, mx, 1.07, mz)); add(K.acc, wbox(0.26, 0.9, 0.02, mx, 1.15, mz + 0.11)); }
  else { add(K.pot, cyl(0.12, 0.18, 0.5, 8, mx, 0.57, mz)); const t = new THREE.IcosahedronGeometry(0.62, 1); t.scale(1, 1.15, 1); t.translate(mx, 1.45, mz); add(K.leaf, t); for (const sx of [-1, 1]) { add(K.pot, wbox(0.6, 0.3, 0.3, mx + sx * 1.3, 0.47, mz)); const l = new THREE.IcosahedronGeometry(0.2, 0); l.translate(mx + sx * 1.3, 0.72, mz); add(K.leaf2, l); } }
  // 正面：同じ大きさの四角い窓（2段）
  for (const y of [1.15, 2.3]) for (let x = f.xl + 0.55; x < f.xr - 0.3; x += 0.75) { if (y < 2 && Math.abs(x - f.doorX) < 1.25) continue; if (y > 2 && Math.abs(x - f.doorX) < 1.05) continue; add(K.glass, wbox(0.44, 0.44, 0.04, x, y, f.zf + 0.02)); }
  door(add, K, f.doorX, f.zf, 1.1, 2.05, true);
  namePlate(out, b, f.doorX, 2.48, f.zf + 0.1);
  extras(add, K, f, out, { notice: false });
}
// 配給所：設備棟＋長い庇（壁から出す。柱は立てない）・受け取り口・待機列の床の線
async function ration(ctx, K, b, batch, out) {
  await shellFacility(ctx, K, b, batch, out, { counter: true, H: 2.8 });
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const map = ctx.map;
  add(K.metal, wbox(f.W + 0.2, 0.1, 1.5, f.cx, 2.75, f.zf + 0.75)); add(K.acc, wbox(f.W, 0.03, 0.03, f.cx, 2.68, f.zf + 1.48));
  for (let x = f.xl + 0.3; x < f.xr; x += 1.6) add(K.metalD, rbox(0.06, 0.06, 1.2, x, 2.5, f.zf + 0.5, 0, -0.55));   // 腕木
  // 受け取り口（扉の東）
  const qx = f.doorX + 2.1; add(K.metalD, wbox(1.3, 0.85, 0.06, qx, 1.35, f.zf + 0.02)); add(K.glass, wbox(1.1, 0.6, 0.05, qx, 1.45, f.zf + 0.05)); add(K.metal, wbox(1.4, 0.07, 0.42, qx, 0.95, f.zf + 0.21)); add(K.acc, wbox(0.5, 0.16, 0.03, qx, 2.05, f.zf + 0.04));
  // 待機列：受け取り口の前から東へ（歩けるマスの床に描いた線だけ）
  const zq = b.y + b.h + 0.5; let n = 0;
  for (let x = qx; x < f.xr + 2 && n < 5; x += 0.8) { const tx = Math.floor(x), tz = Math.floor(zq); if (window.Tiles.isSolid(map.tile(tx, tz))) break; for (const [w, d, ox, oz] of [[0.5, 0.04, 0, -0.25], [0.5, 0.04, 0, 0.25], [0.04, 0.5, -0.25, 0], [0.04, 0.5, 0.25, 0]]) add(K.paint, wbox(w, 0.012, d, x + ox, 0.03, zq + oz)); n++; }
  if (n) add(K.paint, wbox(0.8 * n - 0.4, 0.012, 0.05, qx + (0.8 * n - 0.8) / 2, 0.03, zq + 0.45));
  ctx.stats.queueMarks = n;
}
// 自由市場（改革後だけ）：低い箱に、人が不規則に足した日よけ・木箱・電球の列・屋上の小屋
async function market(ctx, K, b, batch, out) {
  await shellHousing(ctx, K, b, batch, out, { H: 2.4, notice: true });
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const r = rng(4242);
  let i = 0; for (let x = f.xl + 0.2; x < f.xr - 0.6; i++) { const w = 1.2 + r() * 0.9; if (Math.abs(x + w / 2 - f.doorX) < 0.6 + w / 2 && i % 2 === 0) { x += 0.4; continue; } add(K.cloth[i % K.cloth.length], rbox(Math.min(w, f.xr - x - 0.1), 0.04, 1.0 + r() * 0.3, x + w / 2, 2.15 + r() * 0.35, f.zf + 0.45, (r() - 0.5) * 0.06, 0.32 + r() * 0.15)); x += w + 0.1; }
  for (let k = 0; k < 14; k++) { const t = k / 13; const x = f.xl + 0.2 + t * (f.W - 0.4); const y = 2.85 - Math.sin(t * Math.PI) * 0.25 - (k % 2) * 0.02; add(K.bulb, new THREE.SphereGeometry(0.05, 6, 5).translate(x, y, f.zf + 0.95)); }
  add(K.metalD, wbox(f.W - 0.2, 0.015, 0.015, f.cx, 2.78, f.zf + 0.95));
  for (const [x, y, s] of [[f.xl + 0.45, 0.2, 0.38], [f.xl + 0.5, 0.58, 0.32], [f.xr - 0.5, 0.2, 0.4]]) add(K.crate, rbox(s, s, s, x, y, f.zf + 0.2, r() * 0.5));
  add(K.crate, rbox(1.6, 1.0, 1.3, f.xl + 1.3, 2.9, f.cz - 0.2, 0.12)); add(K.cloth[2], rbox(1.9, 0.06, 1.6, f.xl + 1.3, 3.5, f.cz - 0.2, 0.12, 0.15));
  add(K.metal, cyl(0.45, 0.45, 0.9, 12, f.xr - 1.2, 2.95, f.cz - 0.6)); add(K.metalD, rbox(0.03, 1.4, 0.03, f.xr - 0.5, 3.1, f.zb + 0.5, 0, 0.18));
  out.lights.push({ pos: new THREE.Vector3(f.cx, 2.6, f.zf + 1.2), color: 0xffb860, power: 1.0, dist: 8 });
}
// 花屋（東の地区）：規格住居＋店先の花の鉢と日よけ
async function flowerShop(ctx, K, b, batch, out) {
  await shellHousing(ctx, K, b, batch, out, { H: 2.5 });
  const add = (m, g) => batch.add(m, g); const f = frameOf(b); const r = rng(808); const petals = K.cloth;
  add(K.cloth[1], rbox(f.W - 0.4, 0.04, 0.9, f.cx, 2.25, f.zf + 0.4, 0, 0.35));
  for (let x = f.xl + 0.35; x < f.xr - 0.2; x += 0.5) { if (Math.abs(x - f.doorX) < 0.75) continue; add(K.pot, cyl(0.15, 0.11, 0.26, 8, x, 0.13, f.zf + 0.2)); const s = new THREE.IcosahedronGeometry(0.17, 0); s.translate(x, 0.38, f.zf + 0.2); add(r() < 0.4 ? K.leaf2 : petals[Math.floor(r() * petals.length)], s); }
}

// ---------------- 町全体：床・壁と配管・門・街灯・噴水・広場・外の冷却塔
async function build(ctx, K, b, opt) {
  opt = opt || {};
  const map = ctx.map, W = map.w, H = map.h; const hi = ctx.quality !== 'low'; const hAt = b.heightAt || (() => 0);
  const g = new THREE.Group(); g.name = 'env_node_city'; b.root.add(g);
  const batch = new Batch(); const add = (m, gg) => batch.add(m, gg);
  const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H ? '_out' : map.tile(x, z));
  const covered = new Set(); for (const bd of map.buildings) for (let y = bd.y; y < bd.y + bd.h; y++) for (let x = bd.x; x < bd.x + bd.w; x++) covered.add(x + ',' + y);
  // ---- 床（1マス1枚。道＝金属板、東の石の広場＝暗い六角、ほか＝明るい六角）
  const lists = { road: [], hexD: [], hexL: [] };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const t = T(x, z); if (t === 'castle_wall' || t === 'roof_blue' || covered.has(x + ',' + z)) continue; const y = hAt(x + 0.5, z + 0.5) + 0.014; (t === 'road' ? lists.road : t === 'path_stone' ? lists.hexD : lists.hexL).push([x, z, y]); }
  const quads = (list, su, sv) => { const pos = [], uv = [], nrm = [], idx = []; let v = 0; for (const [x, z, y] of list) { pos.push(x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1); uv.push(x * su, z * sv, (x + 1) * su, z * sv, (x + 1) * su, (z + 1) * sv, x * su, (z + 1) * sv); nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0); idx.push(v, v + 3, v + 2, v, v + 2, v + 1); v += 4; } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); gg.setIndex(idx); return gg; };
  add(K.road, quads(lists.road, 1, 1)); add(K.hexD, quads(lists.hexD, 1 / HEX_SX, 1 / HEX_SZ)); add(K.hexL, quads(lists.hexL, 1 / HEX_SX, 1 / HEX_SZ));
  // 縁石（道と広場の境）
  let curbs = 0; for (const [x, z] of lists.road) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = T(x + dx, z + dz); if (n === 'road' || n === 'castle_wall' || n === '_out' || covered.has((x + dx) + ',' + (z + dz))) continue; const y = hAt(x + 0.5, z + 0.5) + 0.03; add(K.metalD, dx ? wbox(0.06, 0.04, 1.0, x + (dx > 0 ? 1 : 0), y, z + 0.5) : wbox(1.0, 0.04, 0.06, x + 0.5, y, z + (dz > 0 ? 1 : 0))); curbs++; }
  // 光の破線：門→塔の主軸（x=20）と、東西の大通りの中心線
  const dash = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (T(Math.floor(x - 0.01), Math.floor(z - 0.01)) !== 'road' && T(Math.floor(x + 0.01), Math.floor(z + 0.01)) !== 'road') continue; add(K.acc, x1 !== x0 ? wbox(0.55, 0.012, 0.045, x, 0.035, z) : wbox(0.045, 0.012, 0.55, x, 0.035, z)); } };
  dash(20, 19.5, 20, 29); dash(20, 7, 20, 10.6); dash(1, 10, 38, 10); dash(1, 20, 38, 20); dash(40, 8.5, 63, 8.5); dash(40, 21.5, 63, 21.5);
  // 六角の広場（噴水のまわり・東の広場）：六角の床と細い光の縁
  const hexPlaza = (cx, cz, R) => {
    const fill = new THREE.CircleGeometry(R, 6); fill.rotateX(-Math.PI / 2); fill.translate(cx, 0.024, cz); const uv = fill.attributes.uv, p = fill.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / HEX_SX, p.getZ(i) / HEX_SZ); add(K.hexP, fill);
    for (let k = 0; k < 6; k++) { const a0 = k * Math.PI / 3, a1 = a0 + Math.PI / 3; for (const [rr, m, w] of [[R, K.acc, 0.05], [R + 0.18, K.metalD, 0.14]]) { const x0 = cx + rr * Math.cos(a0), z0 = cz - rr * Math.sin(a0), x1 = cx + rr * Math.cos(a1), z1 = cz - rr * Math.sin(a1); const len = Math.hypot(x1 - x0, z1 - z0); add(m, rbox(len, 0.014, w, (x0 + x1) / 2, 0.034, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0))); } }
  };
  const fountain = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (T(x, z) === 'fountain') fountain.push([x, z]);
  for (const [x, z] of fountain) hexPlaza(x + 0.5, z + 0.5, 3.4);
  for (const [px, pz, pr] of opt.plazas || []) hexPlaza(px, pz, pr);
  // 噴水 → データの泉（六角の水盤＋データ柱）
  for (const [x, z] of fountain) { add(K.metalD, hexPrism(0.5, 0.42, x + 0.5, 0.21, z + 0.5)); add(K.acc, hexPrism(0.42, 0.02, x + 0.5, 0.43, z + 0.5)); }
  if (fountain.length) g.add(await kit(ctx, 'server_pillar', fountain.map(([x, z]) => ({ x: x + 0.5, y: 0.42, z: z + 0.5, s: [0.42, 0.72, 0.42] }))));
  // ---- 外周の壁：白い壁＋配管の帯（南は低い）
  const wallH = (x, z) => (z === H - 1 ? 1.25 : 2.4);
  let wallN = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'castle_wall') continue; const h = wallH(x, z); add(K.metalD, wbox(1, 0.4, 1, x + 0.5, 0.2, z + 0.5)); add(K.ceramic, wbox(1, h - 0.55, 1, x + 0.5, 0.4 + (h - 0.55) / 2, z + 0.5)); add(K.metal, wbox(1.04, 0.15, 1.04, x + 0.5, h - 0.075, z + 0.5)); wallN++; }
  // 配管：壁が続く所（横の列・縦の列）に3本。2マスごとに受け台
  const PIPES = [[-0.28, 0.1, K.metal], [0, 0.14, K.white], [0.27, 0.075, K.metalD]]; let pipeRuns = 0;
  const run = (x0, z0, x1, z1, h) => { const along = x1 !== x0; const len = along ? x1 - x0 : z1 - z0; if (len < 2) return; pipeRuns++;
    for (const [off, r, m] of PIPES) { const c = new THREE.CylinderGeometry(r, r, len, hi ? 10 : 6); if (along) c.rotateZ(Math.PI / 2); else c.rotateX(Math.PI / 2); c.translate(along ? (x0 + x1) / 2 : x0 + off, h + 0.02 + r, along ? z0 + off : (z0 + z1) / 2); add(m, c); }
    for (let t = 1; t < len; t += 2) add(K.metalD, along ? wbox(0.12, 0.1, 0.8, x0 + t, h + 0.05, z0) : wbox(0.8, 0.1, 0.12, x0, h + 0.05, z0 + t)); };
  for (let z = 0; z < H; z++) { let s = -1; for (let x = 0; x <= W; x++) { const on = T(x, z) === 'castle_wall' && (T(x, z - 1) !== 'castle_wall' || T(x, z + 1) !== 'castle_wall'); if (on && s < 0) s = x; if (!on && s >= 0) { if (x - s >= 3) run(s, z + 0.5, x, z + 0.5, wallH(s, z)); s = -1; } } }
  for (let x = 0; x < W; x++) { let s = -1; for (let z = 1; z <= H - 1; z++) { const on = z < H - 1 && T(x, z) === 'castle_wall' && (T(x - 1, z) !== 'castle_wall' || T(x + 1, z) !== 'castle_wall'); if (on && s < 0) s = z; if (!on && s >= 0) { if (z - s >= 3) run(x + 0.5, s, x + 0.5, z, 2.4); s = -1; } } }
  // 中の壁の切れ目（道が東西に抜ける所）に配管の橋
  const bridges = []; for (let x = 1; x < W - 1; x++) for (let z = 1; z < H - 2; z++) { if (T(x, z - 1) === 'castle_wall' && T(x, z) !== 'castle_wall' && T(x, z + 1) !== 'castle_wall' && T(x, z + 2) === 'castle_wall' && T(x - 1, z - 1) !== 'castle_wall' && T(x + 1, z - 1) !== 'castle_wall') bridges.push({ x: x + 0.5, y: 0, z: z + 1, ry: Math.PI / 2, s: [1, 1.05, 1] }); }
  if (bridges.length) g.add(await kit(ctx, 'pipe_bridge', bridges));
  // 南の壁の切れ目＝門：パックの server_pillar を門柱に、梁と走査の線
  let gate = null; for (let x = 1; x < W - 1 && !gate; x++) if (T(x, H - 1) !== 'castle_wall' && T(x - 1, H - 1) === 'castle_wall') { let x1 = x; while (T(x1, H - 1) !== 'castle_wall' && x1 < W) x1++; gate = [x - 1, x1]; }
  if (gate) {
    const [ga, gb] = gate, gz = H - 0.5, gx = (ga + gb + 1) / 2, gw = gb - ga + 1;
    g.add(await kit(ctx, 'server_pillar', [{ x: ga + 0.5, y: 1.2, z: gz, s: [0.55, 0.8, 0.55] }, { x: gb + 0.5, y: 1.2, z: gz, s: [0.55, 0.8, 0.55] }]));
    add(K.metal, wbox(gw + 0.3, 0.32, 0.5, gx, 3.7, gz)); add(K.metalD, wbox(gw - 0.6, 0.12, 0.3, gx, 3.48, gz)); add(K.warn, wbox(gw - 1.0, 0.03, 0.03, gx, 3.4, gz + 0.16));
    const tex = textTexture(map.name || '演算都市ノード', { bg: '#1c2730', panel: '#e9eef1', fg: '#24323c' }); const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); plate.geometry.userData.own = true; plate.position.set(gx, 3.72, gz + 0.27); g.add(plate);
    ctx.scene.lampSpots.push({ pos: new THREE.Vector3(gx, 3.0, gz - 1.0), color: K.lightColor, power: 1.0, dist: 8 });
  }
  // ---- 封鎖区画（改革前：自由市場の場所。青い屋根のマス）：金網の柵と同じ形のコンテナ
  const lot = []; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (T(x, z) === 'roof_blue') lot.push([x, z]);
  if (lot.length && opt.lot === 'housing') ctx.stats.blocks = housingBlocks(add, K, map, T, g);
  else if (lot.length) {
    const x0 = Math.min(...lot.map((p) => p[0])), x1 = Math.max(...lot.map((p) => p[0])) + 1, z0 = Math.min(...lot.map((p) => p[1])), z1 = Math.max(...lot.map((p) => p[1])) + 1;
    add(K.metalD, wbox(x1 - x0 - 0.1, 0.12, z1 - z0 - 0.1, (x0 + x1) / 2, 0.06, (z0 + z1) / 2));
    for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) { const along = bx !== ax, len = along ? bx - ax : bz - az; const sh = az === z1 && !along ? 1.0 : (az === z1 ? 1.0 : 1.9); add(K.metal, wbox(along ? len : 0.06, 0.06, along ? 0.06 : len, (ax + bx) / 2 + (along ? 0 : (ax === x0 ? 0.08 : -0.08)), sh, (az + bz) / 2 + (along ? (az === z0 ? 0.08 : -0.08) : 0))); for (let t = 0; t <= len; t += 1) add(K.metalD, wbox(0.06, sh, 0.06, ax + (along ? t : 0) + (along ? 0 : (ax === x0 ? 0.08 : -0.08)), sh / 2, az + (along ? 0 : t) + (along ? (az === z0 ? 0.08 : -0.08) : 0))); }
    const cw = 2.2, cd = 1.6; for (let cx = x0 + 0.4 + cw / 2; cx + cw / 2 < x1 - 0.2; cx += cw + 0.25) for (let cz = z0 + 0.4 + cd / 2; cz + cd / 2 < z1 - 0.3; cz += cd + 0.3) { add(K.ind, wbox(cw, 1.2, cd, cx, 0.72, cz)); for (let k = -3; k <= 3; k++) add(K.metalD, wbox(0.05, 1.1, 0.04, cx + k * 0.3, 0.72, cz + cd / 2 + 0.01)); add(K.paint, wbox(0.5, 0.12, 0.03, cx - 0.6, 1.1, cz + cd / 2 + 0.03)); }
    ctx.stats.sealedLot = lot.length;
  }
  // ---- 街灯（街灯のマス）：細い六角の柱と光る横棒
  let lamps = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'lamp') continue; const cx = x + 0.5, cz = z + 0.5, y = hAt(cx, cz); add(K.metalD, hexPrism(0.17, 0.12, cx, y + 0.06, cz)); add(K.metal, cyl(0.06, 0.08, 2.7, 6, cx, y + 1.35, cz)); add(K.metal, wbox(0.62, 0.08, 0.14, cx, y + 2.7, cz)); add(K.acc, wbox(0.52, 0.025, 0.08, cx, y + 2.65, cz)); ctx.scene.lampSpots.push({ pos: new THREE.Vector3(cx, 2.5, cz), color: K.lightColor, power: 0.95, dist: 9 }); lamps++; }
  // ---- 町の外（北）の冷却塔：輪郭と湯気
  const ct = new THREE.Group(); ct.name = 'env_cooling_towers';
  const pts = []; for (let i = 0; i <= 14; i++) { const y = i / 14 * 10; pts.push(new THREE.Vector2(1.75 * Math.sqrt(1 + ((y - 7) / 4.5) ** 2), y)); }
  const concrete = plain('#cdd3d6', { std: { roughness: 0.9, side: THREE.DoubleSide } });
  for (const [x, z, s] of opt.noTowers ? [] : TOWERS) { const lg = new THREE.LatheGeometry(pts, hi ? 28 : 16); lg.scale(s, s, s); lg.translate(x, 0, z); add(concrete, lg); add(K.metalD, cyl(2.15 * s, 2.15 * s, 0.25 * s, 24, x, 9.9 * s, z)); add(K.metalD, cyl(3.3 * s, 3.4 * s, 0.4, 24, x, 0.2, z)); add(K.warn, new THREE.SphereGeometry(0.12, 8, 6).translate(x + 2.0 * s, 10.15 * s, z)); ctx.scene.addSmoke(new THREE.Vector3(x, 10.3 * s, z)); }
  batch.build(g);
  ctx.stats.lamps = lamps; ctx.stats.walls = wallN; ctx.stats.pipeRuns = pipeRuns; ctx.stats.curbs = curbs; ctx.stats.pipeBridges = bridges.length; ctx.stats.reformed = K.reformed;
  return g;
}

// 規格の居住棟（青い屋根のマス＝入口のない棟。第7居住区）：同じ形の棟を並べ、棟ごとに大きな番号（居住棟の番号ゲート）
function housingBlocks(add, K, map, T, g) {
  const seen = new Set(); let n = 0;
  for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) {
    if (T(x, z) !== 'roof_blue' || seen.has(x + ',' + z)) continue;
    let x1 = x; while (T(x1 + 1, z) === 'roof_blue') x1++; let z1 = z; while (T(x, z1 + 1) === 'roof_blue') z1++;
    for (let zz = z; zz <= z1; zz++) for (let xx = x; xx <= x1; xx++) seen.add(xx + ',' + zz);
    n++; const xl = x + 0.12, xr = x1 + 0.88, zb = z + 0.12, zf = z1 + 0.88, W = xr - xl, D = zf - zb, cx = (xl + xr) / 2, cz = (zb + zf) / 2, H = 2.7;
    add(K.metalD, wbox(W + 0.08, 0.28, D + 0.08, cx, 0.14, cz)); add(K.ceramic, wbox(W, H - 0.28, D, cx, 0.28 + (H - 0.28) / 2, cz)); add(K.roof, wbox(W + 0.12, 0.12, D + 0.12, cx, H + 0.06, cz));
    const units = Math.max(2, Math.round(W / 1.5)); const uw = W / units;
    for (let i = 0; i < units; i++) { const ux = xl + (i + 0.5) * uw; for (const y of [0.95, 1.95]) { add(K.metalD, wbox(0.62, 0.52, 0.05, ux, y, zf + 0.015)); add(K.glass, wbox(0.54, 0.44, 0.05, ux, y, zf + 0.04)); } if (i) add(K.metalD, wbox(0.05, H - 0.3, 0.05, xl + i * uw, 0.28 + (H - 0.3) / 2, zf + 0.015)); add(K.metal, wbox(0.36, 0.26, 0.36, ux, H + 0.25, zb + 0.4)); }
    // 棟の番号（妻の面の上の大きな板）
    const tex = numberTex(n, K.reformed); const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); plate.geometry.userData.own = true; plate.position.set(xl + 0.6, H - 0.55, zf + 0.06); g.add(plate);
    add(K.acc, wbox(W - 0.2, 0.03, 0.03, cx, H - 0.1, zf + 0.03));
  }
  return n;
}
const NUM_TX = {};
function numberTex(n, warm) { const k = n + (warm ? 'w' : 'c'); if (NUM_TX[k]) return NUM_TX[k]; const t = canvasTex('num_' + k, 128, 128, (g2, w, h) => { g2.fillStyle = warm ? '#f4e2c0' : '#2c3a46'; g2.fillRect(0, 0, w, h); g2.fillStyle = warm ? '#6a4a2a' : '#e6f0f4'; g2.font = 'bold 72px sans-serif'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(String(n).padStart(2, '0'), w / 2, h / 2 + 4); }); NUM_TX[k] = t; return t; }
// 第7居住区（scheduled_district）：演算都市ノードと同じ作り方（外殻・六角の床・配管の帯・門）＋規格の居住棟の並び
const SCHED_BUILD = { house: (c, K, b, bt, out) => shellHousing(c, K, b, bt, out, { H: 2.4 }), inn: (c, K, b, bt, out) => shellHousing(c, K, b, bt, out, { capsule: true, H: 3.3, notice: false }), item: (c, K, b, bt, out) => shellFacility(c, K, b, bt, out, { counter: true, H: 2.8 }), dojo: (c, K, b, bt, out) => shellFacility(c, K, b, bt, out, { saw: true, shutter: true, H: 3.0 }) };
export const scheduledRecipe = {
  id: 'scheduled_district.v1',
  async prepare(ctx) {
    const map = ctx.map; if (!(map.buildings || []).length) throw new Error('建物がない');
    const K = await makeK(ctx);
    const hooks = { skipWall: (t) => t === 'castle_wall' || t === 'roof_blue', skipProp: (t) => t === 'lamp' || t === 'fountain', skipOutTree: (x, z) => z >= map.h - 1 };
    const building = async (b, o) => { const f = SCHED_BUILD[b.type]; if (!f) return null; const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] }; out.group.name = 'building_env_' + b.id; await f(ctx, K, b, o.batch, out); return out; };
    return { hooks, building, build: (bb) => build(ctx, K, bb, { plazas: [], lot: 'housing', noTowers: true }) };
  }
};
