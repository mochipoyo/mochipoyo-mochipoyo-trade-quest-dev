/* =========================================================
   Organic（v6.8）：道・壁・境界線に丸みを持たせ、自然な形にする（汎用3Dワールド WorldBuilder3D から使う）
   ・まずアルカディア相場大陸だけ（ROUND_REGIONS）。問題がなければ全地域へ広げる方針
     確認用の切り替え：localStorage 'mtq3d-round' = 'off'（使わない＝以前の四角い形）／'all'（全地域で試す）／それ以外（アルカディアだけ）
   ・屋内（家・店・城の中）は対象外（部屋の壁はまっすぐのまま）。建物（BuildingBuilder3D）・柵・木の壁も変えない
   ・見た目だけ：当たり判定・歩ける所・出入り口は2D版のタイルのまま（MapScene3D.resolve と World.onStep）
   ・壁（洞窟の岩壁・石壁・城壁・崖・ダンジョンの外周）：
       タイルごとの柱（箱）の代わりに、外に出た角を丸くした柱を立てる（半径 r）。内側の角（床のマスの角を2方向の壁が囲むとき）には
       すき間を埋める丸い「隅」を足す。岩の壁は、外に面した辺を少しだけ波打たせ、上面の高さも少し揺らす
       （どちらも世界座標から決めるので、となりのタイルとの継ぎ目がずれない）
   ・地面の塗り分け（道・石畳・砂・水辺）：WorldBuilder3D 側で、塗り分けのテクスチャを細かく（4テクセル／タイル）して広くぼかし、
     シェーダーでノイズの揺らぎ（境界のゆがみ）を足す。水辺は水面をとなりのマスまで広げ、岸の高さを揺らして、岸の線を地形で決める
   ========================================================= */
import * as THREE from 'three';

export const ROUND_REGIONS = ['arcadia'];

export function roundSetting() { try { const v = localStorage.getItem('mtq3d-round'); return v === 'off' || v === 'all' ? v : 'region'; } catch (e) { return 'region'; } }
export function setRoundSetting(v) { try { if (v === 'off' || v === 'all') localStorage.setItem('mtq3d-round', v); else localStorage.removeItem('mtq3d-round'); } catch (e) { /* なし */ } }
// このマップで丸みを使うか
export function roundFor(map, theme) {
  const v = roundSetting(); if (v === 'off' || !map || map.kind === 'interior') return false;
  if (v === 'all') return true;
  return ROUND_REGIONS.indexOf(theme && theme.region) >= 0;
}

/* ---------- ノイズ（世界座標 → 0〜1。となりのタイルと同じ点は同じ値） ---------- */
function hash2(x, y) { let h = Math.imul(x | 0, 668265263) + Math.imul(y | 0, 374761393) + 1013904223; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
export function onoise(x, z) { return vnoise(x * 1.7 + 3.1, z * 1.7 + 7.3) * 0.65 + vnoise(x * 4.3 + 11.7, z * 4.3 + 1.9) * 0.35; }

// 辺：0=北（z-）1=東（x+）2=南（z+）3=西（x-）。角 k は辺 k-1 と辺 k のあいだ（0=北西 1=北東 2=南東 3=南西）
const CORNER = [[0, 0], [1, 0], [1, 1], [0, 1]];
const EDGE_DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // 辺を（上から見て時計回りに）たどる向き
const OUTN = [[0, -1], [1, 0], [0, 1], [-1, 0]];      // 辺の外向き
const NB = OUTN;                                        // 辺の向こうのマス

/* 三角形を足す（意図した向き n と逆なら裏返す） */
function tri(P, N, U, a, b, c, na, nb, nc, ua, ub, uc, want) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * want[0] + cy * want[1] + cz * want[2] < 0) { const t = b; b = c; c = t; const tn = nb; nb = nc; nc = tn; const tu = ub; ub = uc; uc = tu; }
  P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); N.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]); U.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
}
function geometry(P, N, U) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); return g;
}

/* 角を丸くした柱（1タイル）
   o = { x, z：タイル, h：高さ, y0：下端, r：角の半径, open(dx,dz)：そのマスが床（開いている）か, hN(dx,dz)：壁のマスの高さ（開いていないマス）, overlap：となりの低い壁との重なり, solidRound(dx,dz)：丸める種類の壁か,
         wave：外に面した辺の波打ち（0〜）, topAmp：上面の高さの揺らぎ, uvS：テクスチャの大きさ }
   戻り値：BufferGeometry（世界座標）。見えない面（となりの壁と接する面）は作らない */
export function roundedPillar(o) {
  const x0 = o.x, z0 = o.z, h = o.h, y0 = o.y0 === undefined ? -0.15 : o.y0, r = o.r, uvS = o.uvS || 1.5, wave = o.wave || 0, topAmp = o.topAmp || 0;
  const openE = [0, 1, 2, 3].map((e) => o.open(NB[e][0], NB[e][1]));
  const convex = [0, 1, 2, 3].map((k) => openE[(k + 3) % 4] && openE[k]);
  // 外周の点（上から見て時計回り）：{ p:[x,z], n:[nx,nz]（外向き・なめらかな陰影用）, seg：次の点までの区間（辺の番号 or 'arc'） }
  const pts = [];
  for (let e = 0; e < 4; e++) {
    const a = CORNER[e], b = CORNER[(e + 1) % 4], d = EDGE_DIR[e], n = OUTN[e];
    const s = convex[e] ? [a[0] + d[0] * r, a[1] + d[1] * r] : [a[0], a[1]];
    const t = convex[(e + 1) % 4] ? [b[0] - d[0] * r, b[1] - d[1] * r] : [b[0], b[1]];
    // 外に面した辺がとなりの壁へまっすぐ続くときは、タイルの角の点も波打たせる（となりの壁も同じ点を同じだけ動かす＝継ぎ目がずれない）
    if (wave && openE[e] && o.solidRound) {
      const mv = (q, sg) => { if (o.solidRound(d[0] * sg, d[1] * sg) && o.open(d[0] * sg + n[0], d[1] * sg + n[1])) { const off = (onoise(x0 + q[0], z0 + q[1]) - 0.5) * 2 * wave; q[0] += n[0] * off; q[1] += n[1] * off; } };
      if (!convex[e]) mv(s, -1); if (!convex[(e + 1) % 4]) mv(t, 1);
    }
    pts.push({ p: s, n, seg: e });
    if (wave && openE[e]) {   // 外に面した辺：途中の点を外・内へ少し動かす（世界座標のノイズ）
      const len = Math.abs(t[0] - s[0]) + Math.abs(t[1] - s[1]); const k = len > 0.55 ? 3 : len > 0.25 ? 1 : 0;
      for (let i = 1; i <= k; i++) { const f = i / (k + 1); const px = s[0] + (t[0] - s[0]) * f, pz = s[1] + (t[1] - s[1]) * f; const off = (onoise(x0 + px, z0 + pz) - 0.5) * 2 * wave; pts.push({ p: [px + n[0] * off, pz + n[1] * off], n, seg: e }); }
    }
    if (convex[(e + 1) % 4]) {   // 丸い角（4分割）
      const c = [t[0] - n[0] * r, t[1] - n[1] * r]; const th0 = Math.atan2(n[1], n[0]);
      pts.push({ p: t, n, seg: 'arc' });
      for (let i = 1; i < 4; i++) { const th = th0 + (Math.PI / 2) * (i / 4); const cs = Math.cos(th), sn = Math.sin(th); pts.push({ p: [c[0] + cs * r, c[1] + sn * r], n: [cs, sn], seg: 'arc' }); }
    } else pts.push({ p: t, n, seg: 'corner' });
  }
  const P = [], N = [], U = [];
  const top = (px, pz) => h + (topAmp ? (onoise(x0 + px + 0.31, z0 + pz + 0.77) - 0.5) * 2 * topAmp : 0);
  // 側面
  for (let i = 0; i < pts.length; i++) {
    const A = pts[i], B = pts[(i + 1) % pts.length]; const seg = A.seg; if (seg === 'corner') continue;   // 角の点から次の辺の始まりまで（同じ点）
    let lo = y0;
    if (seg !== 'arc') { if (!openE[seg]) { const hn = o.hN(NB[seg][0], NB[seg][1]); if (hn >= h - 0.01) continue; lo = Math.max(y0, hn - (o.overlap || 0)); } }   // となりの壁の上面が揺れても、すき間が出ないように少し重ねる
    const ax = x0 + A.p[0], az = z0 + A.p[1], bx = x0 + B.p[0], bz = z0 + B.p[1];
    const segN = seg === 'arc' ? null : OUTN[seg];
    const nA = seg === 'arc' ? [A.n[0], 0, A.n[1]] : [segN[0], 0, segN[1]], nB = seg === 'arc' || B.seg === 'arc' ? [B.n[0], 0, B.n[1]] : [segN[0], 0, segN[1]];
    const tA = top(A.p[0], A.p[1]), tB = top(B.p[0], B.p[1]);
    const a0 = [ax, lo, az], a1 = [ax, tA, az], b0 = [bx, lo, bz], b1 = [bx, tB, bz];
    const uA = (ax + az) / uvS, uB = (bx + bz) / uvS; const want = [(nA[0] + nB[0]) / 2, 0, (nA[2] + nB[2]) / 2];
    tri(P, N, U, a0, b1, b0, nA, nB, nB, [uA, lo / uvS], [uB, tB / uvS], [uB, lo / uvS], want);
    tri(P, N, U, a0, a1, b1, nA, nA, nB, [uA, lo / uvS], [uA, tA / uvS], [uB, tB / uvS], want);
  }
  // 上面（中心からの扇）
  const cY = top(0.5, 0.5); const C = [x0 + 0.5, cY, z0 + 0.5]; const up = [0, 1, 0];
  const ring = pts;
  for (let i = 0; i < ring.length; i++) {
    const A = ring[i], B = ring[(i + 1) % ring.length]; if (Math.abs(A.p[0] - B.p[0]) < 1e-6 && Math.abs(A.p[1] - B.p[1]) < 1e-6) continue;
    const a = [x0 + A.p[0], top(A.p[0], A.p[1]), z0 + A.p[1]], b = [x0 + B.p[0], top(B.p[0], B.p[1]), z0 + B.p[1]];
    tri(P, N, U, C, a, b, up, up, up, [C[0] / uvS, C[2] / uvS], [a[0] / uvS, a[2] / uvS], [b[0] / uvS, b[2] / uvS], up);
  }
  return geometry(P, N, U);
}

/* 内側の角の「隅」：床のマス (x,z) の角 k（0=北西 1=北東 2=南東 3=南西）を、2方向の壁が囲むときに埋める丸い面（半径 r・高さ h）
   上から見ると、角と、角を中心から見た 1/4 円の弧に囲まれた小さな形 */
export function cornerFillet(x, z, k, h, r, o) {
  const y0 = o && o.y0 !== undefined ? o.y0 : -0.15, uvS = (o && o.uvS) || 1.5, topAmp = (o && o.topAmp) || 0;
  const c = CORNER[k]; const ix = c[0] === 0 ? 1 : -1, iz = c[1] === 0 ? 1 : -1;   // 床の内側へ向かう向き
  const cen = [c[0] + ix * r, c[1] + iz * r];   // 弧の中心（床の内側）
  const pts = []; for (let i = 0; i <= 4; i++) { const th = (Math.PI / 2) * (i / 4); const dx = -ix * Math.cos(th), dz = -iz * Math.sin(th); pts.push({ p: [cen[0] + dx * r, cen[1] + dz * r], n: [ix * Math.cos(th), iz * Math.sin(th)] }); }   // 法線は弧の中心（床）側を向く
  const P = [], N = [], U = []; const top = (px, pz) => h + (topAmp ? (onoise(x + px + 0.31, z + pz + 0.77) - 0.5) * 2 * topAmp : 0);
  for (let i = 0; i < 4; i++) {
    const A = pts[i], B = pts[i + 1]; const ax = x + A.p[0], az = z + A.p[1], bx = x + B.p[0], bz = z + B.p[1];
    const nA = [A.n[0], 0, A.n[1]], nB = [B.n[0], 0, B.n[1]]; const tA = top(A.p[0], A.p[1]), tB = top(B.p[0], B.p[1]); const want = [(nA[0] + nB[0]) / 2, 0, (nA[2] + nB[2]) / 2];
    const uA = (ax + az) / uvS, uB = (bx + bz) / uvS;
    tri(P, N, U, [ax, y0, az], [bx, tB, bz], [bx, y0, bz], nA, nB, nB, [uA, y0 / uvS], [uB, tB / uvS], [uB, y0 / uvS], want);
    tri(P, N, U, [ax, y0, az], [ax, tA, az], [bx, tB, bz], nA, nA, nB, [uA, y0 / uvS], [uA, tA / uvS], [uB, tB / uvS], want);
  }
  const Cp = [x + c[0], top(c[0], c[1]), z + c[1]]; const up = [0, 1, 0];
  for (let i = 0; i < 4; i++) { const A = pts[i], B = pts[i + 1]; const a = [x + A.p[0], top(A.p[0], A.p[1]), z + A.p[1]], b = [x + B.p[0], top(B.p[0], B.p[1]), z + B.p[1]]; tri(P, N, U, Cp, a, b, up, up, up, [Cp[0] / uvS, Cp[2] / uvS], [a[0] / uvS, a[2] / uvS], [b[0] / uvS, b[2] / uvS], up); }
  return geometry(P, N, U);
}
