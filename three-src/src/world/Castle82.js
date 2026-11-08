/* =========================================================
   Castle82（v8.2）：大きな城の外観（手続きで作る。家のモデルを引き伸ばさない）
   ・依頼（2026-11-07 14:39）：リヴェル城・セントラ王宮・魔導王宮は、城下町の北の道 → 城門・参道・前庭 → 大きな城（正面の幅は今の約 2.5〜4 倍）。
     城下町から城の上の方が見える。リヴェル＝石造の赤屋根の多塔、セントラ＝白い石の巨大な列柱と段丘の宮殿、マクディア＝古い魔法都市の上の非対称の魔導宮殿。
     魔王城・浮天城アエリア・鉄冠将軍の砦にも独自の大きな輪郭
   ・人・扉・家具の大きさは変えない（城を大きくするのは、壁の高さと塔と正面の幅で）。扉は 2D 版の建物の扉のマス（足元）
   ・style：rivel / sentra / magicka / demon / aeria / iron。部品：台座・段丘・城壁と狭間・本丸・塔（丸・角・尖塔）・屋根（円錐・寄棟・丸屋根・鉄の笠）・窓の光・門のアーチ・垂れ幕・列柱
   ・buildCastle82(style, { w, d, doorX, seed })：足元の左上が原点、正面（扉の側）が +z。group と、点の光の位置を返す
   ・buildGate82(style, b)：城下町の側の城門（楼門：二つの塔とアーチ）。buildBackdrop82(map)：城下町の北の外に、城の上の方が見える遠景
   ========================================================= */
import * as THREE from 'three';
import { plain, Merge, rng } from '../environment/EnvKit3D.js';
import { wallTex } from '../environment/recipes/tex82.js';

const M = (hex, o) => { o = o || {}; return plain(hex, { std: { roughness: o.r !== undefined ? o.r : 0.85, metalness: o.m || 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }, emissive: o.glow ? (o.gc || hex) : undefined, ei: o.glow || undefined, keepGlow: !!o.glow, window: !!o.win }); };
export const CASTLE82 = {
  rivel: { stone: ['#d8d0c0', '#a89e8c'], tex: 'ashlar', roof: '#a8382a', roof2: '#8a2a20', trim: '#8a8070', win: '#ffd890', banner: '#8a1e2a', banner2: '#c8a060', towerShape: 'round', cap: 'cone', keepRoof: 'hip', towers: 9, hKeep: 15, hWall: 7, tall: 1.0 },
  sentra: { stone: ['#f6f3ec', '#d8d2c4'], tex: 'marble', roof: '#2e5a9a', roof2: '#c9a24a', trim: '#c9a24a', win: '#fff0c8', banner: '#2e4a8a', banner2: '#c9a24a', towerShape: 'square', cap: 'dome', keepRoof: 'dome', towers: 4, hKeep: 14, hWall: 5, terraces: 3, columns: true, tall: 0.9 },
  magicka: { stone: ['#6a5a50', '#3a302a'], tex: 'brick', roof: '#2e4a3e', roof2: '#4a6a5a', trim: '#2a2420', win: '#ffc27a', banner: '#24402e', banner2: '#7a2a36', towerShape: 'round', cap: 'spire', keepRoof: 'steep', towers: 7, hKeep: 16, hWall: 6, asym: true, magic: '#9ab8ff', tall: 1.25 },
  demon: { stone: ['#2a2430', '#141018'], tex: 'basalt', roof: '#1a1420', roof2: '#3a1018', trim: '#4a1a22', win: '#ff3a3a', banner: '#3a0a10', banner2: '#8a1a22', towerShape: 'jagged', cap: 'spike', keepRoof: 'spike', towers: 8, hKeep: 20, hWall: 8, asym: true, tall: 1.5 },
  aeria: { stone: ['#f4f6fa', '#c8d4e0'], tex: 'marble', roof: '#4a8ac8', roof2: '#e8eef4', trim: '#c8d8e8', win: '#e8f4ff', banner: '#4a8ac8', banner2: '#ffffff', towerShape: 'round', cap: 'cone', keepRoof: 'dome', towers: 6, hKeep: 13, hWall: 4, float: true, tall: 1.1 },
  iron: { stone: ['#6a6a6e', '#3a3a3e'], tex: 'metal_panel', roof: '#2e2e32', roof2: '#5a4a3a', trim: '#2a2a2e', win: '#ffa860', banner: '#3a3a40', banner2: '#8a5a2a', towerShape: 'bastion', cap: 'flat', keepRoof: 'flat', towers: 6, hKeep: 11, hWall: 9, chimneys: true, tall: 0.9 }
};

function cone(r, h, seg) { return new THREE.ConeGeometry(r, h, seg || 12); }
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
function cyl(r0, r1, h, seg, x, y, z) { const g = new THREE.CylinderGeometry(r0, r1, h, seg || 14); g.translate(x, y, z); return g; }

// 城の本体。足元：x 0..w、z 0..d（正面＝z が大きい側）。扉の中心 x＝doorX＋0.5
export function buildCastle82(styleId, o) {
  const S = CASTLE82[styleId] || CASTLE82.rivel; o = o || {}; const W = o.w || 40, D = o.d || 14, doorX = (o.doorX !== undefined ? o.doorX : Math.floor(W / 2)) + 0.5; const r = rng(o.seed || (W * 131 + D));
  const g = new THREE.Group(); g.name = 'castle82_' + styleId; const mg = new Merge(); const add = (m, gg) => mg.add(m, gg); const mgNo = new Merge(); const addNo = (m, gg) => mgNo.add(m, gg);
  const stone = wallTex(S.tex === 'marble' ? 'marble' : S.tex === 'brick' ? 'brick' : S.tex === 'basalt' ? 'basalt' : S.tex === 'metal_panel' ? 'metal_panel' : 'ashlar', S.stone[0], S.stone[1], { soot: S.tex === 'brick' ? 0.5 : 0 });
  const stoneD = M(S.stone[1], { r: 0.9 }); const trim = M(S.trim, { r: 0.6, m: S.tex === 'metal_panel' ? 0.5 : 0 }); const roof = M(S.roof, { r: 0.7, m: styleId === 'iron' ? 0.5 : 0 }), roof2 = M(S.roof2, { r: 0.5, m: S.cap === 'dome' ? 0.4 : 0 });
  const win = M('#1a1410', { glow: 1.1, gc: S.win, win: true }); const dark = M('#0c0a08', { r: 1 }); const ban = M(S.banner, { r: 0.95, ds: true }), ban2 = M(S.banner2, { r: 0.6, m: 0.4 });
  const lights = []; const T = S.tall || 1;
  const sbox = (w, h, d, x, y, z) => { const gg = box(w, h, d, x, y, z); const p = gg.attributes.position, n = gg.attributes.normal, u = gg.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); if (ay > 0.5) u.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); else if (ax > 0.5) u.setXY(i, p.getZ(i) / 4, p.getY(i) / 4); else u.setXY(i, p.getX(i) / 4, p.getY(i) / 4); } add(stone, gg); };
  const crenel = (x0, x1, z, y, alongZ) => { const L = Math.abs(x1 - x0); for (let t = 0.3; t < L; t += 0.9) { const x = Math.min(x0, x1) + t; add(stoneD, alongZ ? box(0.5, 0.55, 0.45, z, y + 0.27, x) : box(0.45, 0.55, 0.5, x, y + 0.27, z)); } };
  const windowsRow = (x0, x1, z, y, every, h, arched) => { for (let x = x0; x <= x1; x += every) { addNo(win, box(0.55, h, 0.06, x, y, z + 0.02)); add(trim, box(0.75, 0.12, 0.1, x, y - h / 2 - 0.05, z + 0.04)); if (arched) { const a = new THREE.CircleGeometry(0.28, 10, 0, Math.PI); a.translate(x, y + h / 2, z + 0.021); addNo(win, a); } } };
  // ---- 台座・段丘（セントラは 3 段の段丘と大階段）
  let baseY = 0;
  if (S.terraces) {
    for (let k = 0; k < S.terraces; k++) { const inset = k * 2.2; const hh = 1.6; sbox(W - inset * 2, hh, D - inset, W / 2, baseY + hh / 2, (D - inset) / 2); add(trim, box(W - inset * 2 + 0.2, 0.18, 0.3, W / 2, baseY + hh, D - inset));
      if (S.columns) for (let x = inset + 1; x <= W - inset - 1; x += 1.6) { if (Math.abs(x - doorX) < 3) continue; add(M(S.stone[0], { r: 0.5 }), cyl(0.22, 0.26, 1.3, 10, x, baseY + hh + 0.65, D - inset - 0.6)); }
      for (let s = 0; s < 6; s++) add(M(S.stone[0], { r: 0.6 }), box(5.6, 0.27, 0.45, doorX, baseY + s * 0.27 + 0.13, D - inset + 0.2 - s * 0.45 + 2.6));   // 大階段
      baseY += hh; }
  } else sbox(W, 1.0, D, W / 2, 0.5, D / 2);
  if (!S.terraces) baseY = 1.0;
  // ---- 前の城壁（狭間つき）と門
  const wz = D - 0.6, hW = S.hWall * T;
  if (!S.terraces) {
    sbox(doorX - 3 - 0.5, hW, 1.2, (0.5 + doorX - 3) / 2, hW / 2, wz); sbox(W - 0.5 - (doorX + 3), hW, 1.2, (doorX + 3 + W - 0.5) / 2, hW / 2, wz);
    crenel(0.5, doorX - 3, wz, hW, false); crenel(doorX + 3, W - 0.5, wz, hW, false);
    // 門楼：アーチと落とし格子
    sbox(6.4, hW + 3, 2.2, doorX, (hW + 3) / 2, wz); const ar = new THREE.TorusGeometry(1.6, 0.25, 6, 16, Math.PI); ar.translate(doorX, 3.1, wz + 1.12); add(trim, ar); addNo(dark, box(3.0, 3.1, 0.1, doorX, 1.55, wz + 1.11)); const arc = new THREE.CircleGeometry(1.5, 14, 0, Math.PI); arc.translate(doorX, 3.1, wz + 1.111); addNo(dark, arc);
    for (let i = 0; i < 6; i++) add(M('#2a2a2e', { r: 0.5, m: 0.6 }), box(0.08, 3.4, 0.08, doorX - 1.25 + i * 0.5, 3.3, wz + 1.2)); crenel(doorX - 3.2, doorX + 3.2, wz, hW + 3, false);
    add(ban, box(1.1, 3.4, 0.05, doorX - 2.2, hW + 0.8, wz + 1.14)); add(ban, box(1.1, 3.4, 0.05, doorX + 2.2, hW + 0.8, wz + 1.14)); add(ban2, box(0.5, 0.5, 0.06, doorX - 2.2, hW + 1.2, wz + 1.17)); add(ban2, box(0.5, 0.5, 0.06, doorX + 2.2, hW + 1.2, wz + 1.17));
    lights.push({ x: doorX, y: 3.4, z: wz + 2.2, color: 0xffc070 });
  } else { // 段丘の上の正面の列柱と大扉
    const cy = baseY; for (let x = 3; x <= W - 3; x += 2.2) add(M(S.stone[0], { r: 0.45 }), cyl(0.38, 0.44, 6.2, 14, x, cy + 3.1, D - S.terraces * 2.2 - 0.6)); add(trim, box(W - 4, 0.6, 1.4, W / 2, cy + 6.5, D - S.terraces * 2.2 - 0.6));
    const tz = D - S.terraces * 2.2 - 0.6; const ped = new THREE.BufferGeometry(); ped.setAttribute('position', new THREE.Float32BufferAttribute([doorX - 7, cy + 6.8, tz + 0.7, doorX + 7, cy + 6.8, tz + 0.7, doorX, cy + 9.6, tz + 0.7], 3)); ped.computeVertexNormals(); add(M(S.stone[0], { r: 0.5, ds: true }), ped);
    addNo(dark, box(3.2, 4.2, 0.1, doorX, 2.1, D + 0.02)); add(ban2, box(3.6, 0.3, 0.2, doorX, 4.3, D + 0.05)); lights.push({ x: doorX, y: 3.0, z: D + 1.5, color: 0xfff0d0 });
  }
  // ---- 本丸（奥の大きな建物）
  const kw = W * (S.asym ? 0.46 : 0.56), kd = D * 0.55, kx = S.asym ? W * 0.38 : W / 2, kz = D * 0.38; const hK = S.hKeep * T;
  sbox(kw, hK, kd, kx, baseY + hK / 2, kz); add(trim, box(kw + 0.3, 0.3, kd + 0.3, kx, baseY + hK, kz));
  for (let fl = 0; fl < 3; fl++) windowsRow(kx - kw / 2 + 1.5, kx + kw / 2 - 1.5, kz + kd / 2, baseY + 3 + fl * (hK - 4) / 3, 2.2, 1.4, true);
  if (S.keepRoof === 'hip' || S.keepRoof === 'steep') { const rh = (S.keepRoof === 'steep' ? 0.9 : 0.5) * kd; const rg = new THREE.ConeGeometry(Math.hypot(kw, kd) / 2, rh, 4, 1); rg.rotateY(Math.PI / 4); rg.scale(kw / Math.hypot(kw, kd) * 1.42, 1, kd / Math.hypot(kw, kd) * 1.42); rg.translate(kx, baseY + hK + rh / 2, kz); add(roof, rg);
    if (S.keepRoof === 'steep') for (let x = kx - kw / 2 + 2; x < kx + kw / 2 - 1; x += 3) { add(roof, box(1.0, 1.2, 1.0, x, baseY + hK + 0.9, kz + kd / 2 - 0.8)); addNo(win, box(0.4, 0.6, 0.05, x, baseY + hK + 0.9, kz + kd / 2 - 0.27)); } }
  else if (S.keepRoof === 'dome') { const dm = new THREE.SphereGeometry(Math.min(kw, kd) * 0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); dm.translate(kx, baseY + hK, kz); add(roof, dm); add(roof2, cyl(0.25, 0.4, 2.0, 8, kx, baseY + hK + Math.min(kw, kd) * 0.36 + 1.0, kz)); add(roof2, new THREE.SphereGeometry(0.4, 10, 8).translate(kx, baseY + hK + Math.min(kw, kd) * 0.36 + 2.2, kz)); }
  else if (S.keepRoof === 'spike') { for (let i = 0; i < 5; i++) { const sx = kx - kw / 2 + 1.5 + i * (kw - 3) / 4, h2 = 4 + r() * 6; add(roof, cone(0.8 + r() * 0.6, h2, 6).translate(sx, baseY + hK + h2 / 2, kz + (r() - 0.5) * kd * 0.5)); } }
  else { crenel(kx - kw / 2, kx + kw / 2, kz + kd / 2, baseY + hK, false); if (S.chimneys) for (let i = 0; i < 4; i++) { add(M('#3a3a3e', { r: 0.6, m: 0.4 }), cyl(0.5, 0.6, 5, 10, kx - kw / 2 + 2 + i * (kw - 4) / 3, baseY + hK + 2.5, kz - kd / 4)); } }
  // ---- 塔
  const towers = []; const N = S.towers; const tw = (x, z, rr, hh, cap) => towers.push({ x, z, rr, hh, cap });
  tw(0.8, D - 0.8, 1.8, hW + 6, S.cap); tw(W - 0.8, D - 0.8, 1.8, hW + 6, S.cap);   // 正面の両すみ
  tw(1.2, 1.2, 2.0, hK + 4, S.cap); tw(W - 1.2, 1.2, 2.0, hK + 4, S.cap);   // 奥の両すみ
  for (let i = 4; i < N; i++) { const t = (i - 3) / (N - 3); const x = S.asym ? W * (0.15 + 0.75 * t) + (r() - 0.5) * 3 : W * (i % 2 ? 0.3 : 0.7) + (i > 6 ? (i % 2 ? -4 : 4) : 0); const z = D * (0.15 + 0.4 * r()); tw(x, z, 1.2 + r() * 1.0, hK + 3 + r() * (S.asym ? 16 : 7) * T, S.cap); }
  if (S.asym) tw(W * 0.78, D * 0.3, 1.4, hK + 22 * T, 'spire');   // 魔導宮殿：いちばん高い塔（ずらして）
  towers.forEach((tt, i) => {
    const y0 = 0; const shape = S.towerShape;
    if (shape === 'square') sbox(tt.rr * 2, tt.hh, tt.rr * 2, tt.x, y0 + tt.hh / 2, tt.z);
    else if (shape === 'jagged') { const gg = new THREE.CylinderGeometry(tt.rr * 0.7, tt.rr * 1.1, tt.hh, 6, 4); const p = gg.attributes.position; for (let k = 0; k < p.count; k++) { p.setX(k, p.getX(k) + Math.sin(p.getY(k) * 0.7 + i) * 0.35); } gg.computeVertexNormals(); gg.translate(tt.x, y0 + tt.hh / 2, tt.z); add(stone, gg); }
    else if (shape === 'bastion') { add(stone, cyl(tt.rr * 1.3, tt.rr * 1.5, tt.hh * 0.75, 16, tt.x, y0 + tt.hh * 0.375, tt.z)); }
    else add(stone, cyl(tt.rr, tt.rr * 1.08, tt.hh, 16, tt.x, y0 + tt.hh / 2, tt.z));
    const top = y0 + (shape === 'bastion' ? tt.hh * 0.75 : tt.hh);
    add(trim, cyl(tt.rr + 0.25, tt.rr + 0.25, 0.4, 16, tt.x, top, tt.z));
    if (tt.cap === 'cone') add(i % 2 ? roof : roof, cone(tt.rr + 0.35, tt.rr * 2.6 * T, 16).translate(tt.x, top + tt.rr * 1.3 * T + 0.2, tt.z));
    else if (tt.cap === 'spire') { add(roof, cone(tt.rr + 0.2, tt.rr * 5.0 * T, 10).translate(tt.x, top + tt.rr * 2.5 * T + 0.2, tt.z)); if (S.magic) { const ring = new THREE.TorusGeometry(tt.rr + 1.2, 0.08, 6, 24); ring.rotateX(Math.PI / 2 + 0.2); ring.translate(tt.x, top + tt.rr * 2.2, tt.z); addNo(M(S.magic, { glow: 1.4 }), ring); } }
    else if (tt.cap === 'dome') { add(roof, new THREE.SphereGeometry(tt.rr * 1.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(tt.x, top, tt.z)); add(roof2, cyl(0.06, 0.12, 1.4, 6, tt.x, top + tt.rr + 0.6, tt.z)); }
    else if (tt.cap === 'spike') { for (let k = 0; k < 3; k++) add(roof, cone(0.35, 2.5 + k, 5).translate(tt.x + Math.cos(k * 2.1) * tt.rr * 0.6, top + 1.2 + k * 0.5, tt.z + Math.sin(k * 2.1) * tt.rr * 0.6)); add(M(S.win, { glow: 1.6 }), cyl(tt.rr * 0.3, tt.rr * 0.3, 0.2, 8, tt.x, top + 0.2, tt.z)); }
    else { crenel(tt.x - tt.rr, tt.x + tt.rr, tt.z + tt.rr, top, false); add(M('#2e2e32', { r: 0.4, m: 0.6 }), cyl(tt.rr * 1.4, tt.rr * 1.4, 0.3, 16, tt.x, top + 0.2, tt.z)); }
    // 塔の窓（細い光）
    for (let k = 1; k < 4; k++) addNo(win, box(0.25, 0.9, 0.05, tt.x, y0 + k * tt.hh / 4, tt.z + (shape === 'square' ? tt.rr : tt.rr * (shape === 'bastion' ? 1.4 : 1.02)) + 0.01));
  });
  // ---- 浮く城（アエリア）：足元の岩盤
  if (S.float) { const rk = new THREE.ConeGeometry(Math.max(W, D) * 0.55, 10, 9, 3); const p = rk.attributes.position; for (let k = 0; k < p.count; k++) { p.setX(k, p.getX(k) * (1 + Math.sin(k * 1.7) * 0.12)); p.setZ(k, p.getZ(k) * (1 + Math.cos(k * 2.3) * 0.12)); } rk.computeVertexNormals(); rk.rotateX(Math.PI); rk.translate(W / 2, -5, D / 2); add(M('#8a7a68', { r: 1 }), rk); }
  // ---- 魔導宮殿：まわりの古い煉瓦の町の屋根（宮殿の足元の古い街並み）と浮く光の輪
  if (styleId === 'magicka') { for (let i = 0; i < 9; i++) { const x = 1 + i * (W - 2) / 8, hh = 3 + r() * 3; add(M('#6a3a2e', { r: 0.95 }), box(2.6, hh, 2.6, x, hh / 2, D * 0.82 - (i % 2) * 1.5)); add(M('#2e4a3e', { r: 0.8 }), cone(2.0, 1.8, 4).rotateY(Math.PI / 4).translate(x, hh + 0.9, D * 0.82 - (i % 2) * 1.5)); add(M('#4a2a20', { r: 0.9 }), box(0.4, 1.4, 0.4, x + 0.7, hh + 1.2, D * 0.82 - (i % 2) * 1.5)); } }
  mg.build(g); mgNo.build(g, { shadow: false });
  return { group: g, lights };
}

// 城下町の側の城門（楼門）：二つの丸い塔と、アーチの門。足元 b（2D 版の建物）の中に収める
export function buildGate82(styleId, b) {
  const S = CASTLE82[styleId] || CASTLE82.rivel; const g = new THREE.Group(); g.name = 'gate82_' + styleId; const mg = new Merge(); const add = (m, gg) => mg.add(m, gg);
  const stone = wallTex(S.tex === 'marble' ? 'marble' : S.tex === 'brick' ? 'brick' : 'ashlar', S.stone[0], S.stone[1], {}); const trim = M(S.trim, { r: 0.6 }); const roof = M(S.roof, { r: 0.7 }); const dark = M('#0c0a08', { r: 1 }); const ban = M(S.banner, { r: 0.95, ds: true });
  const x0 = b.x, z0 = b.y, W = b.w, D = b.h; const dx = b.doorAbs.x + 0.5; const zf = z0 + D - 0.5; const H = S.hWall + 3;
  add(stone, box(W - 2, H, D * 0.6, x0 + W / 2, H / 2, z0 + D * 0.5));
  for (const s of [-1, 1]) { const tx = dx + s * 3.6; add(stone, cyl(1.6, 1.75, H + 4, 16, tx, (H + 4) / 2, zf - 1.2)); add(trim, cyl(1.9, 1.9, 0.4, 16, tx, H + 4, zf - 1.2)); if (S.cap === 'cone' || S.cap === 'spire') add(roof, cone(2.0, 4.2, 16).translate(tx, H + 6.2, zf - 1.2)); else if (S.cap === 'dome') add(roof, new THREE.SphereGeometry(1.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(tx, H + 4, zf - 1.2)); add(ban, box(1.0, 3.0, 0.05, tx, H - 1, zf + 0.52)); }
  const ar = new THREE.TorusGeometry(1.4, 0.22, 6, 14, Math.PI); ar.translate(dx, 2.6, zf + 0.02); add(trim, ar); add(dark, box(2.6, 2.6, 0.1, dx, 1.3, zf)); const arc = new THREE.CircleGeometry(1.3, 12, 0, Math.PI); arc.translate(dx, 2.6, zf + 0.01); add(dark, arc);
  for (let t = 0.3; t < W - 2; t += 0.9) add(M(S.stone[1]), box(0.45, 0.55, 0.5, x0 + 1 + t, H + 0.27, z0 + D * 0.5 + D * 0.3));
  mg.build(g); return { group: g, lights: [{ pos: new THREE.Vector3(dx, 3.2, zf + 1.4), color: 0xffc070, power: 1.0, dist: 9 }], smokes: [], props: [] };
}

// 城下町の北の外に、城の上の方（遠景）。地図の北の端（z=0）より奥に置く
export const BACKDROP82 = { rivel_town: { style: 'rivel', x: 36, w: 52, d: 16, back: 3 }, sentra_capital: { style: 'sentra', x: 34, w: 44, d: 16, back: 3 }, magicka_city: { style: 'magicka', x: 33, w: 36, d: 16, back: 3 },
 };   // 魔王城・鉄冠将軍の砦は、フィールドの目印（Field82.js）。浮天城アエリアは海の上の空（Join76.js の AERIA82）
export function buildBackdrop82(ms) {
  const map = ms.map; const P = map && BACKDROP82[map.id]; if (!P) return null;
  const cx = P.x === null ? map.w / 2 : P.x; const c = buildCastle82(P.style, { w: P.w, d: P.d, doorX: Math.floor(P.w / 2), seed: 77 + P.w });
  c.group.position.set(cx - P.w / 2, P.y || 0, -P.back - P.d); c.group.name = 'backdrop82_' + P.style; ms.root.add(c.group);
  c.lights.slice(0, 1).forEach((l) => ms.lampSpots.push({ pos: new THREE.Vector3(cx - P.w / 2 + l.x, l.y, -P.back - P.d + l.z), color: l.color, power: 0.8, dist: 10 }));
  ms.backdrop82 = { style: P.style, w: P.w, d: P.d }; return c;
}

// 場所ごとのカメラ（v8.2）：城郭区画の中（城へ向かう参道・前庭）と、城下町の城門の前（南へ 14 マスまで）では、角度を起こして遠くを見せる（城の輪郭・城下町から城の上の方）
export function cameraZone82(ms, pos) {
  const map = ms && ms.map; if (!map || !map.def) return null;
  if (map.def.castle82) return { pitch: 33, dist: 27 };
  const R = map.def.castleRoad82;   // v8.3 城郭区画へ出る道（北の端の門）：道の中と、道の入口の南 14 マスまで
  if (R) { const dz = pos.z - (R.yB + 1), dx = Math.abs(pos.x - R.cx); if (dz < -(R.yB + 2) || dz > 14 || dx > 16) return null; return { pitch: 34 + Math.max(0, dz - 8) * 1.5, dist: 26 }; }
  const g = map.buildings && map.buildings.find((b) => b.gate82); if (!g || !g.doorAbs) return null;
  const dz = pos.z - (g.doorAbs.y + 1), dx = Math.abs(pos.x - (g.doorAbs.x + 0.5)); if (dz < -1 || dz > 14 || dx > 16) return null;
  return { pitch: 34 + Math.max(0, dz - 8) * 1.5, dist: 26 };
}
