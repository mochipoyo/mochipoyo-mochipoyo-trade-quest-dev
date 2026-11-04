/* =========================================================
   帆船の形（v7.6）：港町マリナの「修理中の船」（町の建物 type:'ship'）と、その甲板のマップ（environment/recipes/ship_deck.js）が使う
   ・船体：船首から船尾へ断面を並べて張る（ロフト）。断面は「舷墻（ブルワーク）→甲板の縁→丸い船底→竜骨」。喫水より下は銅板の色、甲板の下に黄土色の帯
   ・帆柱・帆桁・帆（張った帆／たたんだ帆／破れた帆）・索具（シュラウド）・旗・船首の斜檣（バウスプリット）
   ・町の船：船尾楼（窓に灯り）・修理の足場・張り替えた板・タラップ（扉のマスの中だけ）。歩けるマスの体の高さ（0.15〜1.8）には形を出さない
   ・形は世界座標で作り、add(材質, 形) に渡す（呼ぶ側が Batch でまとめる）。材質は色だけ（plain。マップをまたいで使い回す）
   ========================================================= */
import * as THREE from 'three';
import { plain } from '../environment/EnvKit3D.js';

export function shipMats() {
  return {
    hull: plain('#ffffff', { std: { roughness: 0.82, vertexColors: true } }), deck: plain('#b08458', { std: { roughness: 0.85 } }), deckD: plain('#8a6440', { std: { roughness: 0.9 } }),
    rail: plain('#6a4428', { std: { roughness: 0.8 } }), wood: plain('#7a5232', { std: { roughness: 0.85 } }), newWood: plain('#d2a878', { std: { roughness: 0.85 } }),
    mast: plain('#8a6a46', { std: { roughness: 0.8 } }), rope: plain('#3a2e22', { std: { roughness: 1 } }), iron: plain('#3a3e44', { std: { roughness: 0.55, metalness: 0.3 } }),
    brass: plain('#c9a24a', { std: { roughness: 0.35, metalness: 0.6 } }), sail: plain('#efe6d2', { std: { roughness: 0.95, side: THREE.DoubleSide } }), sailOld: plain('#d8ccb0', { std: { roughness: 1, side: THREE.DoubleSide } }),
    flag: plain('#2f6ab0', { std: { roughness: 0.9, side: THREE.DoubleSide } }), window: plain('#ffd890', { emissive: '#ffb860', ei: 1.1, keepGlow: true }), dark: plain('#2a1c12', { std: { roughness: 0.9 } })
  };
}
const C_BOTTOM = new THREE.Color('#8a4a32'), C_HULL = new THREE.Color('#5a3a22'), C_BAND = new THREE.Color('#c99a4a'), C_RAIL = new THREE.Color('#6a4428');

// 船体のロフト。o：{ x0（船首）, x1（船尾）, zc（中心）, hb(t)（甲板の半幅。t=0 船首〜1 船尾）, yD(t)（甲板）, yK(t)（竜骨）, rail（舷墻の高さ）, wl（喫水の高さ）, N（断面の数）}
export function loftHull(o) {
  const N = o.N || 28, K = 12; const pos = [], col = [], idx = [];
  const ring = (t) => {
    const x = o.x0 + (o.x1 - o.x0) * t, hb = Math.max(0.02, o.hb(t)), yd = o.yD(t), yk = o.yK(t), yr = yd + o.rail; const pts = [];
    pts.push([x, yr, o.zc - hb * 1.0]);   // 左舷の舷墻の上
    for (let k = 0; k <= K; k++) { const ph = (k / K) * Math.PI; const z = o.zc - hb * Math.cos(ph) * (1 - 0.06 * Math.sin(ph)); const y = yd - (yd - yk) * Math.pow(Math.sin(ph), 0.8); pts.push([x, y, z]); }
    pts.push([x, yr, o.zc + hb * 1.0]);   // 右舷の舷墻の上
    return pts;
  };
  const rings = []; for (let i = 0; i <= N; i++) rings.push(ring(i / N));
  const R = rings[0].length; const colorOf = (y, yd) => (y < o.wl + 0.12 ? C_BOTTOM : y > yd - 0.42 && y < yd - 0.2 ? C_BAND : y >= yd - 0.02 ? C_RAIL : C_HULL);
  rings.forEach((r, i) => { const yd = o.yD(i / N); r.forEach((p) => { pos.push(p[0], p[1], p[2]); const c = colorOf(p[1], yd); col.push(c.r, c.g, c.b); }); });
  for (let i = 0; i < N; i++) for (let k = 0; k < R - 1; k++) { const a = i * R + k, b = (i + 1) * R + k; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // 船尾の板（トランサム）：最後の断面を中心から扇で閉じる
  const last = N * R; const cx = o.x1, cy = (o.yD(1) + o.yK(1)) / 2; pos.push(cx, cy, o.zc); col.push(C_HULL.r, C_HULL.g, C_HULL.b); const ci = pos.length / 3 - 1;
  for (let k = 0; k < R - 1; k++) idx.push(ci, last + k + 1, last + k);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// 甲板の面（船首〜船尾、左右の縁のあいだ）。inset：縁から内側へ
export function deckGeo(o, inset) {
  const N = o.N || 28; const pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const t = i / N, x = o.x0 + (o.x1 - o.x0) * t, hb = Math.max(0.01, o.hb(t) - (inset || 0)), y = o.yD(t) + 0.01; pos.push(x, y, o.zc - hb, x, y, o.zc + hb); }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const uv = []; for (let i = 0; i <= N; i++) { const x = o.x0 + (o.x1 - o.x0) * i / N; uv.push(x / 2, 0, x / 2, 1); } g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
}
// 舷墻の内側の板と、上の手すり（gap：手すりを切る x の範囲 [[x0, x1, side(+1/-1)]]）
export function railGeos(o, add, M, gaps) {
  const N = o.N || 28; const cut = (x, s) => (gaps || []).some((g) => x > g[0] && x < g[1] && s === g[2]);
  for (let i = 0; i < N; i++) for (const s of [-1, 1]) {
    const t0 = i / N, t1 = (i + 1) / N; const xa = o.x0 + (o.x1 - o.x0) * t0, xb = o.x0 + (o.x1 - o.x0) * t1; if (cut((xa + xb) / 2, s)) continue;
    const ha = o.hb(t0), hbb = o.hb(t1); if (ha < 0.08 && hbb < 0.08) continue; const ya = o.yD(t0), yb = o.yD(t1);
    const za = o.zc + s * (ha - 0.07), zb = o.zc + s * (hbb - 0.07);
    // 内側の板（甲板〜手すり）
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([xa, ya, za, xb, yb, zb, xa, ya + o.rail, za, xb, yb + o.rail, zb], 3)); g.setIndex(s > 0 ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 1, 3, 2]); g.computeVertexNormals(); add(M.rail, g);
    // 手すり（上の角材）
    const len = Math.hypot(xb - xa, zb - za), ang = Math.atan2(zb - za, xb - xa); const cap = new THREE.BoxGeometry(len + 0.04, 0.08, 0.16); cap.rotateY(-ang); cap.translate((xa + xb) / 2, (ya + yb) / 2 + o.rail + 0.04, o.zc + s * ((ha + hbb) / 2 - 0.02)); add(M.wood, cap);
  }
}
const cyl = (r0, r1, h, seg, x, y, z) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y, z); return g; };
const lineGeo = (a, b, r) => { const d = new THREE.Vector3().subVectors(b, a); const L = d.length(); const g = new THREE.CylinderGeometry(r, r, L, 4); g.translate(0, L / 2, 0); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.applyQuaternion(q); g.translate(a.x, a.y, a.z); return g; };
// 帆（帆桁の下に垂れる、少し膨らんだ四角。torn：下の縁が破れている）
function sailGeo(x, yTop, zc, width, height, belly, torn, rnd) {
  const sx = 6, sy = 5; const g = new THREE.PlaneGeometry(width, height, sx, sy); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / width + 0.5, v = 0.5 - p.getY(i) / height; let yy = p.getY(i); if (torn && v > 0.7) yy += (rnd() * 0.5 + 0.2) * height * 0.25 * (v - 0.7) / 0.3; p.setXYZ(i, belly * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.2 + 0.1)), yy, p.getX(i)); }
  g.computeVertexNormals(); g.translate(x, yTop - height / 2, zc); return g;
}
// 帆柱・帆桁・帆・索具。masts：[{ x, h, yards: [{ y（甲板からの高さ）, len, sail: 'set'|'furled'|'torn'|null }] }]。base：甲板の高さ(x)。sides：索具を留める舷の z
export function rig(add, M, o, masts, rnd) {
  rnd = rnd || Math.random;
  for (const m of masts) {
    const t = (m.x - o.x0) / (o.x1 - o.x0); const y0 = o.yD(t); const top = y0 + m.h;
    add(M.mast, cyl(0.11, 0.17, m.h, 10, m.x, y0 + m.h / 2, o.zc)); add(M.wood, cyl(0.2, 0.2, 0.12, 10, m.x, y0 + m.h * 0.62, o.zc));   // 檣楼
    add(M.mast, cyl(0.05, 0.05, 0.25, 6, m.x, top + 0.12, o.zc));
    for (const yd of m.yards || []) {
      const yy = y0 + yd.y; const yg = new THREE.CylinderGeometry(0.06, 0.06, yd.len, 8); yg.rotateX(Math.PI / 2); yg.translate(m.x, yy, o.zc); add(M.mast, yg);
      if (yd.sail === 'furled') { const fg = new THREE.CylinderGeometry(0.14, 0.14, yd.len * 0.9, 8); fg.rotateX(Math.PI / 2); fg.translate(m.x + 0.05, yy - 0.12, o.zc); add(M.sailOld, fg); }
      else if (yd.sail) add(yd.sail === 'torn' ? M.sailOld : M.sail, sailGeo(m.x + 0.05, yy - 0.05, o.zc, yd.len * 0.86, yd.drop || 1.6, 0.35, yd.sail === 'torn', rnd));
    }
    // シュラウド（帆柱の上から左右の舷へ）
    const hbm = o.hb(t); for (const s of [-1, 1]) for (const dx of [-0.35, 0, 0.35]) add(M.rope, lineGeo(new THREE.Vector3(m.x, top - 0.4, o.zc), new THREE.Vector3(m.x + dx, y0 + o.rail + 0.05, o.zc + s * (hbm - 0.04)), 0.015));
    if (m.flag) { const fg = new THREE.PlaneGeometry(0.7, 0.42); fg.rotateY(Math.PI / 2); fg.translate(m.x, top + 0.05, o.zc + 0.36); add(M.flag, fg); }
  }
  // 帆柱どうしの綱（前後）
  for (let i = 0; i + 1 < masts.length; i++) { const a = masts[i], b = masts[i + 1]; const ta = (a.x - o.x0) / (o.x1 - o.x0), tb = (b.x - o.x0) / (o.x1 - o.x0); add(M.rope, lineGeo(new THREE.Vector3(a.x, o.yD(ta) + a.h - 0.5, o.zc), new THREE.Vector3(b.x, o.yD(tb) + b.h * 0.62, o.zc), 0.015)); }
}
// 船首の斜檣（バウスプリット）と、そこから前の帆柱への綱
export function bowsprit(add, M, o, len, foreMast) {
  const yb = o.yD(0.02) + 0.35; const a = new THREE.Vector3(o.x0 + 0.6, yb, o.zc), b = new THREE.Vector3(o.x0 - len, yb + len * 0.35, o.zc);
  add(M.mast, lineGeo(a, b, 0.08));
  if (foreMast) { const tf = (foreMast.x - o.x0) / (o.x1 - o.x0); add(M.rope, lineGeo(b, new THREE.Vector3(foreMast.x, o.yD(tf) + foreMast.h - 0.4, o.zc), 0.015)); }
}

// ---- 町の「修理中の船」（BuildingBuilder3D の type:'ship'）。b：建物（x, y, w, h, doorAbs）
//   船体は建物のマスの中（南北）に収め、東西は水のマスへ少し出す（町の外の歩けるマスには出さない）。扉のマスにタラップ
export function buildTownShip(b, add, out, rnd) {
  const M = shipMats(); rnd = rnd || Math.random;
  const zN = b.y + 0.12, zS = b.y + b.h - 1.05;   // 南の1列（扉の列）はタラップの場所。船体はその北
  const o = { x0: b.x - 1.6, x1: b.x + b.w + 1.6, zc: (zN + zS) / 2, rail: 0.62, wl: -0.2, N: 30,
    hb: (t) => { const B = (zS - zN) / 2; if (t < 0.38) return B * Math.pow(t / 0.38, 0.55); if (t > 0.9) return B * (1 - (t - 0.9) / 0.1 * 0.22); return B; },
    yD: (t) => 1.25 + 0.42 * Math.pow(1 - t, 3) + 0.3 * Math.pow(t, 4), yK: (t) => -1.15 + 0.7 * Math.pow(Math.abs(t - 0.5) * 2, 3) };
  add(M.hull, loftHull(o)); add(M.deck, deckGeo(o, 0.08));
  const door = b.doorAbs ? b.doorAbs.x + 0.5 : b.x + b.w / 2;
  railGeos(o, add, M, [[door - 0.45, door + 0.45, 1]]);
  // 船尾楼（甲板の上の箱と窓）
  const tq = 0.86, xq = o.x0 + (o.x1 - o.x0) * tq; const yq = o.yD(0.95), hq = o.hb(0.93);
  const qb = new THREE.BoxGeometry(o.x1 - xq - 0.1, 0.95, hq * 2 - 0.3); qb.translate((xq + o.x1) / 2 - 0.05, yq + 0.47, o.zc); add(M.wood, qb);
  const qr = new THREE.BoxGeometry(o.x1 - xq - 0.05, 0.08, hq * 2 - 0.2); qr.translate((xq + o.x1) / 2 - 0.05, yq + 0.98, o.zc); add(M.rail, qr);
  for (const dz of [-0.6, 0, 0.6]) { const wg = new THREE.PlaneGeometry(0.34, 0.3); wg.rotateY(Math.PI / 2); wg.translate(o.x1 + 0.02, yq + 0.2, o.zc + dz); add(M.window, wg); }
  out.lights.push({ pos: new THREE.Vector3(o.x1 + 0.4, yq + 0.3, o.zc), color: 0xffc070, power: 0.8, dist: 6 });
  // 帆柱：前・主・後ろ（主帆は破れた帆、ほかはたたんだ帆＝修理中）
  const L = o.x1 - o.x0; const masts = [
    { x: o.x0 + L * 0.27, h: 8.2, yards: [{ y: 3.0, len: 3.6, sail: 'furled' }, { y: 5.4, len: 2.8, sail: 'set', drop: 1.5 }, { y: 7.2, len: 1.9, sail: null }] },
    { x: o.x0 + L * 0.52, h: 9.6, flag: true, yards: [{ y: 3.2, len: 4.2, sail: 'torn', drop: 2.2 }, { y: 6.0, len: 3.2, sail: 'furled' }, { y: 8.2, len: 2.2, sail: null }] },
    { x: o.x0 + L * 0.76, h: 7.4, yards: [{ y: 3.0, len: 3.0, sail: 'furled' }, { y: 5.4, len: 2.2, sail: null }] }
  ];
  rig(add, M, o, masts, rnd); bowsprit(add, M, o, 2.6, masts[0]);
  // 甲板の荷（木箱・樽・巻いた帆布）。甲板の上だけ
  const dk = (x, w, h, d, dz, m) => { const t = (x - o.x0) / L; const g = new THREE.BoxGeometry(w, h, d); g.translate(x, o.yD(t) + h / 2, o.zc + dz); add(m || M.wood, g); };
  dk(o.x0 + L * 0.4, 0.5, 0.5, 0.5, -0.5); dk(o.x0 + L * 0.42, 0.45, 0.45, 0.45, -0.95); dk(o.x0 + L * 0.63, 0.6, 0.4, 0.5, 0.6, M.newWood);
  { const t = 0.6; const rg = new THREE.CylinderGeometry(0.22, 0.22, 1.3, 10); rg.rotateZ(Math.PI / 2); rg.translate(o.x0 + L * t, o.yD(t) + 0.22, o.zc - 0.4); add(M.sail, rg); }
  // 修理：船首の足場（水の上）・張り替えた板（新しい木の色）
  const xs = o.x0 + 0.9; for (const dz of [-1, 1]) for (const dx of [0, 1.2]) add(M.wood, cyl(0.05, 0.05, 2.6, 6, xs + dx, 0.9, o.zc + dz * (o.hb((dx + 0.9) / L) + 0.25)));
  for (const yy of [0.9, 1.9]) { const pg = new THREE.BoxGeometry(1.5, 0.05, 0.32); pg.translate(xs + 0.6, yy, o.zc + (o.hb(1.5 / L) + 0.25)); add(M.newWood, pg); const pg2 = pg.clone(); pg2.translate(0, 0, -2 * (o.hb(1.5 / L) + 0.25)); add(M.newWood, pg2); }
  for (const [t, dy] of [[0.3, -0.5], [0.34, -0.15], [0.47, -0.65], [0.66, -0.35]]) { const x = o.x0 + L * t; const hb = o.hb(t); const pg = new THREE.BoxGeometry(0.9, 0.16, 0.04); pg.translate(x, o.yD(t) + dy, o.zc + hb * 0.985 + 0.02); add(M.newWood, pg); }
  // タラップ（扉のマスの中だけ：南の通路の縁 z=b.y+b.h から甲板の縁へ上がる）
  const zT0 = b.y + b.h - 0.02, zT1 = o.zc + o.hb((door - o.x0) / L) - 0.1; const yT0 = 0.06, yT1 = o.yD((door - o.x0) / L) + 0.05;
  const a = new THREE.Vector3(door, yT0, zT0), c = new THREE.Vector3(door, yT1, zT1); const len = a.distanceTo(c); const ang = Math.atan2(yT1 - yT0, zT0 - zT1);
  const pl = new THREE.BoxGeometry(0.62, 0.06, len); pl.rotateX(ang); pl.translate(door, (yT0 + yT1) / 2, (zT0 + zT1) / 2); add(M.newWood, pl);
  for (let i = 1; i < 6; i++) { const f = i / 6; const cg = new THREE.BoxGeometry(0.58, 0.04, 0.05); cg.translate(door, yT0 + (yT1 - yT0) * f + 0.04, zT0 + (zT1 - zT0) * f); add(M.wood, cg); }
  for (const s of [-1, 1]) { const p0 = new THREE.Vector3(door + s * 0.3, yT0 + 0.75, zT0 - 0.04), p1 = new THREE.Vector3(door + s * 0.3, yT1 + 0.7, zT1); add(M.rope, lineGeo(p0, p1, 0.018)); add(M.wood, lineGeo(new THREE.Vector3(door + s * 0.3, yT0, zT0 - 0.04), p0, 0.03)); }
  out.lights.push({ pos: new THREE.Vector3(door, yT1 + 0.9, zT1), color: 0xffd8a0, power: 0.5, dist: 4 });
  return o;
}
