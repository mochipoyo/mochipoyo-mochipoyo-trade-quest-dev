/* =========================================================
   furn82（v8.2）：町の作り方（theme82.js の FURN の系統）と部屋の用途で形を変える家具（見た目だけ。当たり判定は 2D 版のタイル）
   ・机（脚・天板・まわりの椅子・机の上の品）・カウンター（前板。銀行は真鍮の格子の窓口、教会は祭壇、酒場は注ぎ口と瓶）・寝台（天蓋・箱・鉄・敷き布団・二段・折りたたみ・カプセル）
   ・棚（薬の引き出し・本・瓶・仕分けの棚・帳簿・ロッカー・枝・ガラスの飾り棚・壁のくぼみ）・戸棚（衣装戸棚・引き出し・金庫・小机・記憶の瓶の棚）
   ・かまど・流し・腰かけ（ブース席・長椅子・待合・ソファ・座布団）・柱（鎧の台・トルソー・真鍮の柱・石や大理石の柱）・樽（樽・水がめ・鉄の缶）・木箱（金床・瓦礫・補給箱・部品）
   ・道具かけ（武器・盾・服・網・工具）・炉（れんがの暖炉・石の暖炉・大理石の暖炉・タイルのストーブ・鉄のストーブ・土のかまど・鍛冶の炉・火鉢）・望遠鏡・作業台・鉢植え・水盤・床の穴（廃墟）
   ・どれも自分のマスの中（となりの歩けるマスへは 0.06 まで）。体の高さより上（1.85）だけ、となりへ 0.6 まで（棚の上の飾りなど）
   ========================================================= */
import * as THREE from 'three';
import { plain } from '../EnvKit3D.js';

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (r0, r1, h, s) => new THREE.CylinderGeometry(r0, r1, h, s || 10);
const SP = (r, s) => new THREE.SphereGeometry(r, s || 10, Math.max(6, (s || 10) >> 1));
const TO = (r, t, a) => new THREE.TorusGeometry(r, t, 6, 16, a || Math.PI * 2);
const M = (hex, o) => { o = o || {}; return plain(hex, { std: { roughness: o.r !== undefined ? o.r : 0.8, metalness: o.m || 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }, emissive: o.glow ? (o.gc || hex) : undefined, ei: o.glow || undefined, keepGlow: !!o.glow, transparent: !!o.op, opacity: o.op, window: !!o.win }); };

export const FURN82_TILES = { table: 1, counter: 1, bed: 1, bookshelf: 1, cupboard: 1, stove: 1, sink: 1, toilet: 1, bench: 1, pillar: 1, barrel: 1, crate: 1, rack: 1, hearth: 1, instrument: 1, flowerbed: 1, well: 1, ledge: 1 };

export function buildFurn82(o) {
  const { map, T, walk, wallAt, add, theme, lamps, animated } = o; const F = theme.furnSet; const role = theme.role || 'house'; const sub = theme.sub || null;
  const W = map.w, H = map.h; const stats = {}; let lampN = 0;
  const wood = M(F.wood, { r: 0.75 }), wood2 = M(F.wood2, { r: 0.8 }), fab = M(F.fab, { r: 0.95 }), fab2 = M(F.fab2, { r: 0.95 }), metal = M(F.metal, { r: 0.35, m: 0.7 });
  const iron = M('#2e2e32', { r: 0.6, m: 0.5 }), white = M('#efe9dc', { r: 0.9 }), paper = M('#e8dcc0', { r: 1 }), glass = M('#bcd8e8', { r: 0.1, op: 0.45 }), dark = M('#1e1a16', { r: 0.95 });
  const glowW = M('#ffd890', { glow: 1.3 }), ember = M('#ff7a2a', { glow: 1.6 }), ash = M('#3a3430', { r: 1 }), stone = M('#8a847a', { r: 0.95 }), brick = M('#8a4a34', { r: 0.95 });
  const bottles = ['#6a2a8a', '#2a8a6a', '#a83a2a', '#c8a03a', '#2a5aa8'].map((c) => M(c, { r: 0.15, glow: theme.key === 'magicka_city' ? 0.25 : 0 }));
  const books = ['#6a1e24', '#24402e', '#2a3a6a', '#8a6a2a', '#4a2a4a'].map((c) => M(c, { r: 0.9 }));
  const rot = theme.furn === 'rotten'; const tint = (m) => m;
  const isT = (x, z, t) => T(x, z) === t;
  const nb4 = [[0, 1], [1, 0], [-1, 0], [0, -1]];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const t = T(x, z); if (!FURN82_TILES[t]) continue;
    // 向き：壁を背に（壁のとなり）・なければ歩けるとなりのマスの方（手前を優先）
    let yaw = 0, wallBack = false;
    for (const [dx, dz, a] of [[0, -1, 0], [-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2], [0, 1, Math.PI]]) { if (wallAt(x + dx, z + dz)) { yaw = a; wallBack = true; break; } }
    if (!wallBack) for (const [dx, dz, a] of [[0, 1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, -1, Math.PI]]) { if (walk(x + dx, z + dz)) { yaw = a; break; } }
    const cx = x + 0.5, cz = z + 0.5;
    const base = new THREE.Matrix4().makeTranslation(cx, 0, cz).multiply(new THREE.Matrix4().makeRotationY(yaw));
    const P = (m, g, lx, ly, lz, ry, rx, rz) => { const e = new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ'); const mm = new THREE.Matrix4().compose(new THREE.Vector3(lx, ly, lz), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)); add(m, g, base.clone().multiply(mm)); };
    // ローカルの向き：+z が正面（歩ける側）、-z が背（壁）
    const openL = (dxl, dzl) => { const c = Math.cos(yaw), s = Math.sin(yaw); const wx = Math.round(dxl * c + dzl * s), wz = Math.round(-dxl * s + dzl * c); return walk(x + wx, z + wz); };
    const sameL = (dxl, dzl, tt) => { const c = Math.cos(yaw), s = Math.sin(yaw); const wx = Math.round(dxl * c + dzl * s), wz = Math.round(-dxl * s + dzl * c); return T(x + wx, z + wz) === tt; };
    stats[t] = (stats[t] || 0) + 1;
    const hasProp = (p) => theme.props.indexOf(p) >= 0;
    switch (t) {
      case 'table': table(); break; case 'counter': counter(); break; case 'bed': bed(); break; case 'bookshelf': shelf(); break; case 'cupboard': cupboard(); break;
      case 'stove': stove(); break; case 'sink': sink(); break; case 'toilet': toilet(); break; case 'bench': bench(); break; case 'pillar': pillar(); break;
      case 'barrel': barrel(); break; case 'crate': crate(); break; case 'rack': rack(); break; case 'hearth': hearth(); break; case 'instrument': instrument(); break;
      case 'flowerbed': planter(); break; case 'well': basin(); break; case 'ledge': hole(); break;
    }
    // ---------- 机 ----------
    function legs(h, sx, sz, kind) {
      const L = kind || F.leg; const pts = [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz]];
      if (L === 'pedestal') { P(metal, C(0.05, 0.06, h, 10), 0, h / 2, 0); P(metal, C(0.22, 0.24, 0.04, 16), 0, 0.02, 0); return; }
      if (L === 'trestle') { for (const s of [-1, 1]) { P(wood2, B(0.06, h, sz * 2 + 0.08), s * sx, h / 2, 0); P(wood2, B(0.08, 0.06, sz * 2 + 0.16), s * sx, 0.03, 0); } P(wood2, B(sx * 2, 0.06, 0.06), 0, h * 0.35, 0); return; }
      if (L === 'folding') { for (const s of [-1, 1]) { P(metal, B(0.03, h * 1.15, 0.03), s * sx, h / 2, 0, 0, 0.5); P(metal, B(0.03, h * 1.15, 0.03), s * sx, h / 2, 0, 0, -0.5); } return; }
      pts.forEach(([px, pz], i) => {
        if (L === 'turned') { P(wood2, C(0.03, 0.025, h, 8), px, h / 2, pz); P(wood2, SP(0.045, 8), px, h * 0.62, pz); P(wood2, C(0.04, 0.03, 0.06, 8), px, 0.03, pz); }
        else if (L === 'log') P(wood2, C(0.07, 0.08, h, 8), px, h / 2, pz);
        else if (L === 'iron') P(iron, B(0.035, h, 0.035), px, h / 2, pz);
        else if (L === 'rattan') P(wood, C(0.02, 0.02, h, 6), px * 0.9, h / 2, pz * 0.9, 0, pz > 0 ? 0.12 : -0.12);
        else if (L === 'low') P(wood2, B(0.07, h, 0.07), px, h / 2, pz);
        else if (L === 'broken') { if (i === 3) P(wood2, B(0.05, h * 0.4, 0.05), px, 0.04, pz + 0.1, 0, 1.4); else P(wood2, B(0.05, h, 0.05), px, h / 2, pz); }
        else if (L === 'mixed') { if (i % 2) P(wood2, C(0.03, 0.03, h, 6), px, h / 2, pz); else P(iron, B(0.035, h, 0.035), px, h / 2, pz); }
        else P(wood2, B(0.055, h, 0.055), px, h / 2, pz);
      });
    }
    function chair(lx, lz, face) {
      const k = F.chair; const s = 0.26;
      if (k === 'cushion') { P(fab2, B(0.3, 0.08, 0.3), lx, 0.04, lz, face); return; }
      if (k === 'stump') { P(wood2, C(0.12, 0.13, 0.42, 8), lx, 0.21, lz); return; }
      if (k === 'crate') { P(wood, B(0.28, 0.36, 0.28), lx, 0.18, lz, face); return; }
      if (k === 'stool') { P(wood, C(0.11, 0.11, 0.04, 10), lx, 0.5, lz); for (let i = 0; i < 3; i++) { const a = i * 2.1; P(iron, C(0.012, 0.012, 0.5, 4), lx + Math.cos(a) * 0.08, 0.25, lz + Math.sin(a) * 0.08); } return; }
      if (k === 'broken') { P(wood2, B(s, 0.04, s), lx, 0.06, lz, face, 0.2, 1.2); return; }
      const g = new THREE.Group(); // ローカル（face 向き）
      const seatH = 0.45; const back = (h, m) => P(m, B(s, h, 0.04), lx + Math.sin(face) * -0.12, seatH + h / 2, lz + Math.cos(face) * -0.12, face);
      P(k === 'wingback' || k === 'armchair' ? fab : wood, B(s, 0.07, s), lx, seatH, lz, face);
      if (k === 'wingback') { back(0.62, fab); P(fab, B(0.05, 0.36, s), lx + Math.cos(face) * 0.13, seatH + 0.18, lz - Math.sin(face) * 0.13, face); P(fab, B(0.05, 0.36, s), lx - Math.cos(face) * 0.13, seatH + 0.18, lz + Math.sin(face) * 0.13, face); }
      else if (k === 'armchair') { back(0.4, fab); P(metal, B(0.04, 0.2, s), lx + Math.cos(face) * 0.13, seatH + 0.1, lz - Math.sin(face) * 0.13, face); P(metal, B(0.04, 0.2, s), lx - Math.cos(face) * 0.13, seatH + 0.1, lz + Math.sin(face) * 0.13, face); }
      else if (k === 'office') { back(0.36, fab); P(metal, C(0.02, 0.02, seatH, 6), lx, seatH / 2, lz); P(metal, C(0.12, 0.12, 0.03, 10), lx, 0.02, lz); return; }
      else if (k === 'folding') { back(0.3, fab); }
      else if (k === 'rattan') { back(0.4, wood); }
      else { back(0.5, wood2); }
      for (const [a, b] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) P(F.leg === 'iron' ? iron : wood2, B(0.03, seatH, 0.03), lx + a, seatH / 2, lz + b);
    }
    function table() {
      const n = { e: isT(x + 1, z, 'table'), w: isT(x - 1, z, 'table'), s: isT(x, z + 1, 'table'), nn: isT(x, z - 1, 'table') };
      const long = n.e || n.w || n.s || n.nn; const low = F.leg === 'low';
      const th = low ? 0.36 : 0.74; const round = !long && (role === 'tavern' || theme.furn === 'casino' || F.leg === 'pedestal');
      // 天板（つながる机は端まで）。世界の向きで作る（yaw を打ち消す）
      const x0 = n.w ? -0.5 : -0.36, x1 = n.e ? 0.5 : 0.36, z0 = n.nn ? -0.5 : -0.36, z1 = n.s ? 0.5 : 0.36;
      const topM = F.top === 'marble' ? M('#eeeae0', { r: 0.25 }) : F.top === 'felt' ? M('#1e6a46', { r: 1 }) : F.top === 'glass' ? glass : F.top === 'metal' ? M(F.wood, { r: 0.4, m: 0.5 }) : F.top === 'tile' ? M('#2a6a8a', { r: 0.4 }) : F.top === 'canvas' ? fab : F.top === 'woven' ? M(F.wood, { r: 1 }) : wood;
      const wb = new THREE.Matrix4().makeTranslation(cx, 0, cz);
      const PW = (m, g, lx, ly, lz) => add(m, g, wb.clone().multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz)));
      if (round) { PW(topM, C(0.38, 0.38, 0.05, 20), 0, th, 0); PW(wood2, C(0.06, 0.08, th, 8), 0, th / 2, 0); PW(wood2, C(0.22, 0.24, 0.04, 14), 0, 0.02, 0); }
      else { const tk = F.top === 'thick' || F.top === 'slab' ? 0.08 : 0.05; PW(topM, B(x1 - x0, tk, z1 - z0), (x0 + x1) / 2, th, (z0 + z1) / 2);
        if (F.top === 'broken' || F.top === 'patched') PW(wood2, B(0.2, 0.052, 0.3), (x0 + x1) / 2 + 0.1, th + 0.005, (z0 + z1) / 2);
        if (!long || (!n.w && !n.nn)) { const sx = (x1 - x0) / 2 - 0.06, sz = (z1 - z0) / 2 - 0.06; const sub = new THREE.Matrix4().makeTranslation((x0 + x1) / 2, 0, (z0 + z1) / 2); const keep = base; legsWorld(th, sx, sz, sub); }
        else if (!n.e && !n.s) { const sx = (x1 - x0) / 2 - 0.06, sz = (z1 - z0) / 2 - 0.06; legsWorld(th, sx, sz, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, 0, (z0 + z1) / 2)); } }
      // 椅子（となりが歩けるマスの側。マスの中）
      if (!low) { for (const [dx, dz, face] of [[0, 1, Math.PI], [0, -1, 0], [1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2]]) { if (!walk(x + dx, z + dz)) continue; if (long && (dx ? (n.nn || n.s) : (n.e || n.w)) === false && false) continue; const lx = dx * 0.38, lz = dz * 0.38; chairWorld(lx, lz, face); } }
      else { for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) if (walk(x + dx, z + dz)) PW(fab2, B(dx ? 0.12 : 0.34, 0.08, dz ? 0.12 : 0.34), dx * 0.42, 0.04, dz * 0.42); }
      // 机の上の品
      const ty = th + 0.03; const k = (x * 7 + z * 13) % 6;
      if (role === 'tavern') { PW(M('#c8a050', { r: 0.4, m: 0.6 }), C(0.04, 0.035, 0.12, 8), -0.12, ty + 0.06, 0.05); PW(bottles[k % 5], C(0.035, 0.04, 0.2, 8), 0.1, ty + 0.1, -0.08); PW(M('#e8dcc0'), C(0.09, 0.09, 0.015, 12), 0.05, ty, 0.12); }
      else if (theme.light.kind === 'banker' || role === 'bank') { PW(metal, C(0.02, 0.05, 0.22, 6), 0.15, ty + 0.11, -0.1); const sh = C(0.03, 0.1, 0.07, 10, 1, true); PW(M('#1e6a46', { r: 0.3, glow: 0.25 }), sh, 0.15, ty + 0.24, -0.06); PW(paper, B(0.22, 0.01, 0.16), -0.1, ty, 0.04); if (lampN < 1) { lamps.push({ pos: new THREE.Vector3(cx + 0.15, ty + 0.3, cz - 0.06), color: 0xfff0c8, power: 0.45, dist: 4 }); lampN++; } }
      else if (sub === 'bakery') { for (let i = 0; i < 3; i++) PW(M('#c8904a'), SP(0.07, 8), -0.15 + i * 0.15, ty + 0.05, 0); }
      else if (sub === 'tailor') { PW(fab2, B(0.5, 0.02, 0.3), 0, ty, 0); PW(metal, B(0.12, 0.01, 0.02), 0.1, ty + 0.02, 0.05); }
      else if (hasProp('potion_bottles') || sub === 'mage') { for (let i = 0; i < 3; i++) PW(bottles[(k + i) % 5], C(0.03, 0.045, 0.14, 8), -0.14 + i * 0.13, ty + 0.07, (i % 2) * 0.08 - 0.04); PW(books[k % 5], B(0.22, 0.06, 0.16), 0.08, ty + 0.03, 0.1); }
      else if (hasProp('sea_chart') || hasProp('campaign_map') || hasProp('star_chart') || hasProp('old_map') || role === 'tower') { PW(paper, B(0.5, 0.01, 0.36), 0, ty, 0); PW(metal, C(0.015, 0.015, 0.06, 6), 0.2, ty + 0.03, 0.14); }
      else if (hasProp('ledgers') || hasProp('ledger') || role === 'guild') { PW(books[1], B(0.24, 0.05, 0.18), -0.08, ty + 0.025, 0); PW(paper, B(0.2, 0.01, 0.26), 0.14, ty, 0.04); }
      else if (hasProp('water_jar') || hasProp('pottery')) { PW(M('#b8704a', { r: 0.9 }), SP(0.09, 10), 0, ty + 0.08, 0); PW(M('#c8a050', { r: 0.4, m: 0.6 }), C(0.1, 0.12, 0.02, 12), 0.15, ty + 0.01, 0.1); }
      else if (hasProp('clock_parts') || hasProp('gears')) { PW(metal, C(0.07, 0.07, 0.015, 14), -0.08, ty + 0.01, 0); PW(metal, C(0.04, 0.04, 0.015, 10), 0.08, ty + 0.01, 0.06); PW(M('#c8a050', { r: 0.3, m: 0.8 }), TO(0.05, 0.01), 0.12, ty + 0.05, -0.1); }
      else if (hasProp('terminal') || hasProp('analysis_terminal')) { PW(dark, B(0.32, 0.2, 0.03), 0, ty + 0.12, -0.1); PW(M('#48c9d6', { glow: 1.0 }), B(0.29, 0.17, 0.005), 0, ty + 0.12, -0.084); }
      else if (rot) { PW(M('#d8ccb0'), B(0.14, 0.003, 0.1), -0.1, ty, 0.05, 0); PW(M('#c8bca0'), B(0.12, 0.003, 0.09), 0.12, ty, -0.06); }
      else { PW(M('#e8dcc0'), C(0.1, 0.1, 0.015, 12), -0.1, ty, 0.05); PW(M('#c8a050', { r: 0.4, m: 0.5 }), C(0.025, 0.03, 0.1, 8), 0.12, ty + 0.05, -0.06); if (k % 2 === 0) PW(M('#fff0c0', { glow: 1.0 }), C(0.012, 0.012, 0.05, 6), 0.12, ty + 0.12, -0.06); }
      function legsWorld(h, sx, sz, m) { const pts = [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz]]; if (F.leg === 'pedestal') { add(metal, C(0.05, 0.06, h, 10), wb.clone().multiply(m).multiply(new THREE.Matrix4().makeTranslation(0, h / 2, 0))); return; }
        if (F.leg === 'trestle') { for (const s of [-1, 1]) add(wood2, B(0.06, h, sz * 2 + 0.06), wb.clone().multiply(m).multiply(new THREE.Matrix4().makeTranslation(s * sx, h / 2, 0))); return; }
        pts.forEach(([px, pz], i) => { const mm = wb.clone().multiply(m).multiply(new THREE.Matrix4().makeTranslation(px, 0, pz));
          if (F.leg === 'turned') { add(wood2, C(0.03, 0.025, h, 8), mm.clone().multiply(new THREE.Matrix4().makeTranslation(0, h / 2, 0))); add(wood2, SP(0.045, 8), mm.clone().multiply(new THREE.Matrix4().makeTranslation(0, h * 0.62, 0))); }
          else if (F.leg === 'log') add(wood2, C(0.06, 0.07, h, 8), mm.clone().multiply(new THREE.Matrix4().makeTranslation(0, h / 2, 0)));
          else if (F.leg === 'iron' || F.leg === 'folding' || (F.leg === 'mixed' && i % 2)) add(iron, B(0.035, h, 0.035), mm.clone().multiply(new THREE.Matrix4().makeTranslation(0, h / 2, 0)));
          else if (F.leg === 'broken' && i === 3) add(wood2, B(0.05, 0.3, 0.05), mm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.05, 0.12)).multiply(new THREE.Matrix4().makeRotationX(1.4)));
          else add(wood2, B(0.055, h, 0.055), mm.clone().multiply(new THREE.Matrix4().makeTranslation(0, h / 2, 0))); }); }
      function chairWorld(lx, lz, face) { const save = base.clone(); base.copy(wb); chair(lx, lz, face); base.copy(save); }
    }
    // ---------- カウンター ----------
    function counter() {
      const ce = sameL(1, 0, 'counter'), cw = sameL(-1, 0, 'counter'); const h = 1.0; const x0 = cw ? -0.5 : -0.45, x1 = ce ? 0.5 : 0.45; const w = x1 - x0, mx = (x0 + x1) / 2;
      const K = role === 'church' ? 'altar' : F.counter;
      if (K === 'broken') { P(wood2, B(w, 0.06, 0.5), mx, 0.62, 0, 0, 0, 0.18); P(wood2, B(w * 0.8, 0.5, 0.06), mx, 0.25, 0.22, 0, 0.3); P(ash, B(w, 0.04, 0.5), mx, 0.02, 0); return; }
      if (K === 'altar') { P(white, B(w, h * 0.92, 0.55), mx, h * 0.46, 0); P(M('#c9a24a', { r: 0.35, m: 0.7 }), B(w, 0.05, 0.6), mx, h * 0.93, 0); P(M('#c9a24a', { r: 0.35, m: 0.7 }), B(0.04, 0.3, 0.04), mx, h + 0.15, -0.1); P(M('#c9a24a', { r: 0.35, m: 0.7 }), B(0.18, 0.04, 0.04), mx, h + 0.22, -0.1); P(M('#fff0c0', { glow: 1.1 }), C(0.015, 0.015, 0.08, 6), mx + 0.25, h + 0.05, 0); return; }
      const front = K === 'iron' ? M(F.metal, { r: 0.5, m: 0.6 }) : K === 'marble' ? M('#eeeae0', { r: 0.3 }) : K === 'tile' ? M('#2a6a8a', { r: 0.45 }) : K === 'glass' ? M('#8a949c', { r: 0.4, m: 0.4 }) : K === 'stall' ? fab : wood;
      P(front, B(w, h - 0.06, 0.5), mx, (h - 0.06) / 2, 0);
      P(K === 'marble' || K === 'glass' ? M('#f4f0e6', { r: 0.2 }) : wood2, B(w + 0.02, 0.06, 0.6), mx, h - 0.03, 0.03);
      if (K === 'panel') { for (let i = 0; i < Math.max(1, Math.round(w / 0.45)); i++) { const px = x0 + (i + 0.5) * (w / Math.max(1, Math.round(w / 0.45))); P(wood2, B(0.34, 0.5, 0.02), px, 0.48, 0.26); } P(metal, C(0.015, 0.015, w, 6), mx, 0.12, 0.3, 0, 0, Math.PI / 2); }
      if (K === 'plank') for (let i = 0; i < 5; i++) P(wood2, B(0.012, h - 0.1, 0.01), x0 + (i + 0.5) * w / 5, (h - 0.1) / 2, 0.255);
      if (K === 'tile') for (let i = 0; i < 4; i++) P(M(i % 2 ? '#e8dcc0' : '#c8a03a', { r: 0.4 }), B(w / 4 - 0.02, 0.12, 0.01), x0 + (i + 0.5) * w / 4, 0.7, 0.256);
      if (K === 'iron') for (const px of [x0 + 0.06, x1 - 0.06]) for (const py of [0.15, 0.8]) P(M('#c8c8c8', { r: 0.3, m: 0.8 }), SP(0.015, 6), px, py, 0.26);
      if (K === 'glass') { P(glass, B(w - 0.06, 0.24, 0.4), mx, h + 0.12, 0.02); }
      if (K === 'stall') { P(fab2, B(w, 0.25, 0.02), mx, h - 0.2, 0.27); }
      // 用途
      if (role === 'bank') { const gm = M('#c8a050', { r: 0.3, m: 0.8 }); for (let i = 0; i < 6; i++) P(gm, C(0.008, 0.008, 0.62, 4), x0 + 0.05 + i * (w - 0.1) / 5, h + 0.33, -0.05); P(gm, B(w, 0.03, 0.03), mx, h + 0.64, -0.05); P(gm, TO(0.16, 0.012, Math.PI), mx, h + 0.64, -0.05); P(paper, B(0.16, 0.003, 0.12), mx, h + 0.005, 0.1); }
      else if (role === 'tavern') { P(metal, C(0.02, 0.02, 0.32, 6), mx - 0.1, h + 0.16, -0.12); P(metal, B(0.08, 0.03, 0.06), mx - 0.1, h + 0.3, -0.08); P(bottles[(x + z) % 5], C(0.035, 0.04, 0.24, 8), mx + 0.15, h + 0.12, -0.1); P(M('#c8a050', { r: 0.4, m: 0.5 }), C(0.04, 0.035, 0.11, 8), mx + 0.05, h + 0.055, 0.12); }
      else if (role === 'inn') { if (!cw) { P(metal, SP(0.04, 8), x0 + 0.12, h + 0.03, 0.1); P(books[0], B(0.24, 0.04, 0.18), x0 + 0.38, h + 0.02, 0); } }
      else if (role === 'item') { for (let i = 0; i < 3; i++) P(bottles[(x + i) % 5], C(0.03, 0.04, 0.14, 8), mx - 0.15 + i * 0.15, h + 0.07, -0.05); }
      else if (role === 'weapon') { P(metal, B(0.05, 0.02, 0.5), mx, h + 0.02, 0, 0.7); }
      else if (role === 'armor') { P(metal, SP(0.12, 10), mx, h + 0.1, 0); }
      else if (role === 'post' || hasProp('letters')) { for (let i = 0; i < 3; i++) P(paper, B(0.14, 0.03, 0.1), mx - 0.15 + i * 0.15, h + 0.015 + i * 0.01, 0, i * 0.3); }
      else if (sub === 'bakery') { for (let i = 0; i < 3; i++) P(M('#c8904a'), C(0.06, 0.07, 0.16, 8), mx - 0.15 + i * 0.15, h + 0.06, 0, 0, Math.PI / 2); }
      else if (sub === 'florist') { for (let i = 0; i < 2; i++) { P(M('#8a5a3a'), C(0.06, 0.05, 0.12, 8), mx - 0.12 + i * 0.24, h + 0.06, 0); P(M(i ? '#e85a7a' : '#f0d040'), SP(0.08, 8), mx - 0.12 + i * 0.24, h + 0.18, 0); } }
    }
    // ---------- 寝台 ----------
    function bed() {
      const K = rot ? 'broken' : (theme.key === 'aruna_village' || theme.key === 'dark_camp') && F.bed !== 'cot' ? 'cot' : F.bed; const blanket = M(F.fab, { r: 1 }), sheet = M('#ece6d8', { r: 1 });
      const L = 0.92, Wd = 0.62; // ローカル：頭は背（-z）。寝台のマスの中
      if (K === 'broken') { P(wood2, B(Wd, 0.1, L), 0, 0.12, 0, 0, 0.08, 0.1); P(M('#6a5a48', { r: 1 }), B(Wd * 0.9, 0.06, L * 0.7), 0.05, 0.2, 0.08, 0.3); P(wood2, B(Wd, 0.5, 0.05), 0, 0.25, -0.44, 0, -0.5); return; }
      if (K === 'mat') { P(M(F.fab2, { r: 1 }), B(Wd + 0.1, 0.1, L), 0, 0.05, 0); P(blanket, B(Wd + 0.06, 0.05, L * 0.6), 0, 0.12, 0.12); P(sheet, B(0.36, 0.08, 0.18), 0, 0.14, -0.33); return; }
      if (K === 'cot') { P(fab, B(Wd, 0.04, L), 0, 0.42, 0); for (const s of [-1, 1]) P(metal, B(0.03, 0.03, L), s * Wd / 2, 0.42, 0); for (const s of [-1, 1]) { P(metal, B(Wd, 0.03, 0.03), 0, 0.2, s * 0.4, 0, 0.6); P(metal, B(Wd, 0.03, 0.03), 0, 0.2, s * 0.4, 0, -0.6); } P(M(F.fab2, { r: 1 }), B(Wd * 0.9, 0.04, L * 0.5), 0, 0.46, 0.15); return; }
      if (K === 'pod') { P(M('#e8ecf0', { r: 0.35 }), B(Wd + 0.2, 0.9, L), 0, 0.45, 0); P(M('#3a4048', { r: 0.4 }), B(Wd, 0.55, 0.02), 0, 0.5, L / 2 + 0.005); P(sheet, B(Wd - 0.06, 0.08, L - 0.1), 0, 0.22, 0); P(M('#48c9d6', { glow: 1.2 }), B(Wd, 0.02, 0.02), 0, 0.82, L / 2 + 0.01); return; }
      const fm = K === 'iron' ? iron : wood;
      P(fm, B(Wd, 0.28, L), 0, 0.2, 0); P(sheet, B(Wd - 0.04, 0.12, L - 0.06), 0, 0.38, 0.0); P(blanket, B(Wd - 0.02, 0.06, L * 0.62), 0, 0.45, 0.14); P(sheet, B(0.4, 0.09, 0.2), 0, 0.47, -0.32);
      if (K === 'iron') { P(iron, B(Wd, 0.04, 0.04), 0, 0.82, -0.44); for (let i = 0; i < 5; i++) P(iron, B(0.02, 0.5, 0.02), -Wd / 2 + 0.05 + i * (Wd - 0.1) / 4, 0.58, -0.44); P(iron, B(Wd, 0.04, 0.04), 0, 0.55, 0.44); }
      else P(fm, B(Wd + 0.04, K === 'four_poster' || K === 'canopy' ? 0.8 : 0.62, 0.06), 0, K === 'four_poster' || K === 'canopy' ? 0.55 : 0.45, -0.43);
      if (K === 'four_poster' || K === 'canopy') { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(fm, C(0.025, 0.025, 1.7, 8), a * (Wd / 2 - 0.02), 0.85, b * (L / 2 - 0.02)); P(fm, B(Wd, 0.05, 0.05), 0, 1.72, L / 2 - 0.02); P(fm, B(Wd, 0.05, 0.05), 0, 1.72, -L / 2 + 0.02);
        P(M(F.fab2, { r: 1, ds: true }), B(Wd, 0.02, L), 0, 1.74, 0); P(M(F.fab2, { r: 1, ds: true }), B(0.02, 1.0, 0.24), -Wd / 2 + 0.01, 1.2, -L / 2 + 0.12); P(M(F.fab2, { r: 1, ds: true }), B(0.02, 1.0, 0.24), Wd / 2 - 0.01, 1.2, -L / 2 + 0.12); }
      if (K === 'box' && (role === 'inn' || role === 'inn_up')) P(M(F.fab2, { r: 1 }), B(Wd + 0.02, 0.02, 0.2), 0, 0.485, 0.34);
    }
    // ---------- 棚 ----------
    function shelf() {
      const h = 1.85, w = 0.9, d = 0.38; const zc = -0.28; let K = F.shelf;
      if (rot) K = 'broken'; else if (role === 'tavern') K = 'bottles'; else if (role === 'post') K = 'pigeon'; else if (role === 'bank' || hasProp('ledgers')) K = 'ledger'; else if (sub === 'bakery') K = 'bread';
      else if ((role === 'item' && (F.shelf === 'apothecary' || theme.key === 'magicka_city')) || hasProp('potion_bottles') && role !== 'library') K = 'apothecary'; else if (role === 'library' || role === 'academy' || sub === 'scholar' || sub === 'library') K = 'books';
      if (K === 'broken') { P(wood2, B(w, 0.05, d), 0, 0.5, zc, 0, 0, 0.3); P(wood2, B(0.05, h * 0.8, d), -0.42, h * 0.4, zc, 0, 0, 0.1); P(wood2, B(w, 0.05, d), 0, 1.1, zc, 0, 0, -0.15); for (let i = 0; i < 4; i++) P(books[i % 5], B(0.18, 0.04, 0.12), -0.25 + i * 0.16, 0.03, 0.1 - i * 0.04, i * 0.7); for (let i = 0; i < 3; i++) P(paper, B(0.12, 0.003, 0.09), -0.2 + i * 0.2, 0.004, 0.25, i); return; }
      if (K === 'locker') { const lm = M(F.wood, { r: 0.45, m: 0.5 }); P(lm, B(w, h, d), 0, h / 2, zc); for (let i = 0; i < 3; i++) { P(M(F.wood2, { r: 0.5, m: 0.4 }), B(0.27, h - 0.1, 0.01), -0.3 + i * 0.3, h / 2, zc + d / 2 + 0.005); for (let k = 0; k < 3; k++) P(dark, B(0.14, 0.012, 0.005), -0.3 + i * 0.3, h - 0.2 - k * 0.04, zc + d / 2 + 0.012); } return; }
      if (K === 'niche') { P(M(theme.wall.c1, { r: 0.95 }), B(w, h, d), 0, h / 2, zc); for (let i = 0; i < 3; i++) { P(M(theme.wall.c2, { r: 1 }), B(w - 0.16, 0.36, 0.02), 0, 0.4 + i * 0.5, zc + d / 2 + 0.005); P(M(['#b8704a', '#2a6a8a', '#c8a050'][i], { r: 0.8 }), SP(0.09, 10), (i - 1) * 0.2, 0.32 + i * 0.5, zc + 0.08); } return; }
      if (K === 'branch') { for (const s of [-1, 1]) P(wood2, C(0.04, 0.05, h, 6), s * 0.4, h / 2, zc); for (let i = 0; i < 4; i++) { P(wood, C(0.025, 0.025, w, 6), 0, 0.35 + i * 0.42, zc, 0, 0, Math.PI / 2); P(M(['#7a8a3a', '#a8884a', '#6a4a2a'][i % 3], { r: 1 }), B(0.5, 0.12, 0.2), (i % 2 ? 0.1 : -0.1), 0.43 + i * 0.42, zc); } return; }
      if (K === 'crate') { for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) P(j % 2 ? wood : wood2, B(0.42, 0.5, d), -0.22 + i * 0.44, 0.25 + j * 0.52, zc); return; }
      if (K === 'rack') { P(wood2, B(w, h * 0.9, 0.05), 0, h * 0.45, -0.42); for (let i = 0; i < 5; i++) P(iron, B(0.03, 0.4, 0.03), -0.36 + i * 0.18, 1.0 + (i % 2) * 0.2, -0.38); P(iron, C(0.08, 0.08, 0.02, 10), 0.2, 1.5, -0.38, 0, Math.PI / 2); return; }
      // 枠
      const fm = K === 'glass_case' ? M(F.wood, { r: 0.45 }) : wood;
      P(fm, B(0.05, h, d), -w / 2 + 0.025, h / 2, zc); P(fm, B(0.05, h, d), w / 2 - 0.025, h / 2, zc); P(wood2, B(w, h, 0.03), 0, h / 2, zc - d / 2 + 0.015); P(fm, B(w + 0.06, 0.06, d + 0.04), 0, h + 0.03, zc);
      if (theme.furn === 'victorian' || theme.furn === 'walnut' || theme.furn === 'royal_oak' || theme.furn === 'trade') P(fm, B(w + 0.12, 0.08, d + 0.08), 0, h + 0.1, zc);   // 冠の飾り
      const nS = K === 'apothecary' || K === 'pigeon' ? 0 : 4;
      for (let i = 0; i < nS; i++) P(fm, B(w - 0.08, 0.03, d - 0.04), 0, 0.12 + i * 0.44, zc);
      if (K === 'apothecary') {
        P(fm, B(w - 0.08, h * 0.5, d - 0.02), 0, h * 0.25, zc);
        for (let r2 = 0; r2 < 5; r2++) for (let c2 = 0; c2 < 4; c2++) { P(wood2, B(0.18, 0.15, 0.01), -0.3 + c2 * 0.2, 0.12 + r2 * 0.17, zc + d / 2); P(metal, SP(0.012, 6), -0.3 + c2 * 0.2, 0.12 + r2 * 0.17, zc + d / 2 + 0.012); }
        for (let r2 = 0; r2 < 2; r2++) { P(fm, B(w - 0.08, 0.03, d - 0.04), 0, 1.0 + r2 * 0.4, zc); for (let i = 0; i < 5; i++) P(bottles[(i + r2 + x) % 5], C(0.035, 0.04, 0.18 + (i % 2) * 0.06, 8), -0.32 + i * 0.16, 1.11 + r2 * 0.4 + (i % 2) * 0.03, zc + 0.02); }
        return;
      }
      if (K === 'pigeon') { for (let r2 = 0; r2 < 6; r2++) P(fm, B(w - 0.08, 0.02, d - 0.04), 0, 0.2 + r2 * 0.28, zc); for (let c2 = 1; c2 < 5; c2++) P(fm, B(0.02, h - 0.2, d - 0.04), -w / 2 + c2 * w / 5, h / 2, zc); for (let r2 = 0; r2 < 6; r2++) for (let c2 = 0; c2 < 5; c2++) if ((r2 * 5 + c2 + x) % 3) P(paper, B(0.12, 0.05 + ((r2 + c2) % 3) * 0.04, 0.16), -w / 2 + (c2 + 0.5) * w / 5, 0.26 + r2 * 0.28, zc, ((r2 + c2) % 2) * 0.2); return; }
      for (let i = 0; i < 4; i++) {
        const yy = 0.15 + i * 0.44;
        if (K === 'bottles') { for (let k = 0; k < 6; k++) P(bottles[(k + i) % 5], C(0.035, 0.04, 0.22, 8), -0.36 + k * 0.145, yy + 0.12, zc + 0.02); }
        else if (K === 'bread') { for (let k = 0; k < 4; k++) P(M('#c8904a'), C(0.06, 0.07, 0.18, 8), -0.3 + k * 0.2, yy + 0.08, zc, 0, 0, Math.PI / 2); }
        else if (K === 'ledger') { for (let k = 0; k < 7; k++) P(books[k % 2 ? 1 : 2], B(0.08, 0.3, 0.26), -0.33 + k * 0.11, yy + 0.16, zc); }
        else if (K === 'glass_case') { P(glass, B(w - 0.08, 0.4, 0.01), 0, yy + 0.2, zc + d / 2); for (let k = 0; k < 3; k++) P(hasProp('memory_jars') ? M('#cfe8ff', { r: 0.1, glow: 0.5 }) : bottles[(k + i) % 5], hasProp('memory_jars') ? C(0.06, 0.06, 0.16, 10) : SP(0.06, 8), -0.25 + k * 0.25, yy + 0.1, zc); }
        else if (K === 'open') { if (i % 2) for (let k = 0; k < 3; k++) P(M(['#d8ccb0', '#b8704a', '#8a9a6a'][k], { r: 0.9 }), B(0.22, 0.12, 0.24), -0.26 + k * 0.26, yy + 0.07, zc); else for (let k = 0; k < 4; k++) P(M('#c8b898', { r: 0.6 }), C(0.05, 0.05, 0.14, 8), -0.3 + k * 0.2, yy + 0.08, zc); }
        else { let px = -0.4; let k = 0; while (px < 0.38) { const bw = 0.05 + ((x * 3 + i * 5 + k) % 4) * 0.015, bh = 0.28 + ((k + i) % 3) * 0.04; P(books[(k + i + x) % 5], B(bw, bh, 0.24), px + bw / 2, yy + bh / 2 + 0.02, zc, 0, 0, ((k + x) % 7 === 0) ? 0.2 : 0); px += bw + 0.008; k++; } }
      }
    }
    // ---------- 戸棚 ----------
    function cupboard() {
      const nearBed = nb4.some(([dx, dz]) => T(x + dx, z + dz) === 'bed');
      if (rot) { P(wood2, B(0.8, 0.9, 0.42), 0, 0.42, -0.25, 0, 0, 0.12); P(wood2, B(0.38, 0.8, 0.03), 0.3, 0.3, 0.1, 0.9, 1.2); return; }
      if (role === 'bank') { const sm = M('#4a4e54', { r: 0.4, m: 0.7 }); P(sm, B(0.8, 1.2, 0.6), 0, 0.6, -0.15); P(M('#c8a050', { r: 0.3, m: 0.8 }), C(0.1, 0.1, 0.03, 16), 0, 0.75, 0.16, 0, Math.PI / 2); P(M('#c8a050', { r: 0.3, m: 0.8 }), B(0.04, 0.18, 0.04), 0.25, 0.75, 0.16); return; }
      if (nearBed || role === 'inn_up') { P(wood, B(0.42, 0.55, 0.4), 0, 0.275, -0.2); P(wood2, B(0.38, 0.03, 0.01), 0, 0.4, 0.005); P(metal, C(0.04, 0.06, 0.12, 8), 0, 0.62, -0.2); P(M('#fff0c0', { glow: 0.8 }), SP(0.04, 8), 0, 0.7, -0.2); return; }
      if (hasProp('memory_jars')) { P(M(F.wood, { r: 0.6 }), B(0.86, 1.8, 0.4), 0, 0.9, -0.28); for (let r2 = 0; r2 < 4; r2++) for (let c2 = 0; c2 < 3; c2++) P(M(['#cfe8ff', '#e8d8ff', '#d8ffe8'][(r2 + c2) % 3], { r: 0.1, glow: 0.6 }), C(0.06, 0.06, 0.16, 10), -0.26 + c2 * 0.26, 0.3 + r2 * 0.42, -0.06); P(glass, B(0.82, 1.7, 0.01), 0, 0.9, -0.07); return; }
      if (role === 'item' || hasProp('potion_bottles')) { P(wood, B(0.86, 1.1, 0.4), 0, 0.55, -0.28); for (let r2 = 0; r2 < 4; r2++) for (let c2 = 0; c2 < 4; c2++) { P(wood2, B(0.19, 0.22, 0.01), -0.3 + c2 * 0.2, 0.16 + r2 * 0.25, -0.075); P(metal, SP(0.012, 6), -0.3 + c2 * 0.2, 0.16 + r2 * 0.25, -0.065); } for (let i = 0; i < 4; i++) P(bottles[(i + z) % 5], C(0.04, 0.05, 0.2, 8), -0.3 + i * 0.2, 1.2, -0.28); return; }
      if (F.shelf === 'locker' || theme.furn === 'military' || theme.furn === 'camp') { P(M(F.wood, { r: 0.5, m: theme.furn === 'camp' ? 0 : 0.4 }), B(0.8, theme.furn === 'camp' ? 0.45 : 1.7, 0.45), 0, theme.furn === 'camp' ? 0.225 : 0.85, -0.2); P(metal, B(0.8, 0.04, 0.46), 0, theme.furn === 'camp' ? 0.4 : 1.2, -0.2); return; }
      // 衣装戸棚（高い）か、引き出しの低い箪笥（横に寝台がないとき交互）
      if ((x + z) % 2 === 0) { P(wood, B(0.86, 1.85, 0.48), 0, 0.925, -0.24); P(wood2, B(0.4, 1.6, 0.01), -0.21, 0.92, 0.005); P(wood2, B(0.4, 1.6, 0.01), 0.21, 0.92, 0.005); P(metal, SP(0.02, 6), -0.04, 0.95, 0.02); P(metal, SP(0.02, 6), 0.04, 0.95, 0.02); if (F.leg === 'turned') P(wood2, B(0.94, 0.08, 0.54), 0, 1.89, -0.24); }
      else { P(wood, B(0.86, 0.9, 0.46), 0, 0.45, -0.24); for (let i = 0; i < 3; i++) { P(wood2, B(0.8, 0.24, 0.01), 0, 0.17 + i * 0.27, -0.005); P(metal, B(0.12, 0.02, 0.02), 0, 0.17 + i * 0.27, 0.01); } P(M('#c8a050', { r: 0.4, m: 0.6 }), C(0.04, 0.05, 0.1, 8), 0.25, 0.95, -0.25); P(fab2, B(0.3, 0.02, 0.2), -0.15, 0.91, -0.2); }
    }
    // ---------- 台所 ----------
    function stove() {
      if (sub === 'bakery' || theme.fire === 'clay_oven') { P(M('#b8704a', { r: 0.95 }), SP(0.45, 14), 0, 0.3, -0.1); P(dark, B(0.3, 0.24, 0.1), 0, 0.28, 0.32); P(ember, B(0.22, 0.12, 0.02), 0, 0.22, 0.33); if (lampN < 4) { lamps.push({ pos: new THREE.Vector3(cx, 0.5, cz + 0.3), color: 0xff8a40, power: 0.5, dist: 3.5 }); lampN++; } return; }
      if (theme.fire === 'kamado') { P(M('#e8e0d0', { r: 0.9 }), B(0.9, 0.7, 0.6), 0, 0.35, -0.15); for (const s of [-1, 1]) { P(dark, C(0.14, 0.14, 0.04, 12), s * 0.22, 0.71, -0.15); P(M('#3a3430', { r: 0.4, m: 0.4 }), C(0.13, 0.1, 0.16, 12), s * 0.22, 0.8, -0.15); } P(dark, B(0.22, 0.2, 0.02), -0.22, 0.2, 0.16); P(ember, B(0.16, 0.08, 0.02), -0.22, 0.14, 0.165); return; }
      if (theme.furn === 'modular' || theme.furn === 'folding' || theme.furn === 'luxe' || theme.furn === 'bureau') { P(M('#e8ecf0', { r: 0.3 }), B(0.9, 0.86, 0.6), 0, 0.43, -0.2); P(dark, B(0.8, 0.02, 0.5), 0, 0.87, -0.2); for (const s of [-1, 1]) P(M('#ff6a3a', { glow: 0.6 }), TO(0.09, 0.008), s * 0.2, 0.885, -0.2, 0, Math.PI / 2); return; }
      // 鉄のかまど（煙突つき）
      P(iron, B(0.86, 0.82, 0.6), 0, 0.41, -0.2); P(M('#4a4a50', { r: 0.4, m: 0.6 }), B(0.9, 0.04, 0.64), 0, 0.84, -0.2); P(dark, B(0.3, 0.26, 0.01), -0.18, 0.4, 0.105); P(ember, B(0.2, 0.08, 0.01), -0.18, 0.32, 0.11); P(metal, B(0.06, 0.02, 0.03), 0.22, 0.6, 0.12);
      P(iron, C(0.07, 0.07, 1.5, 10), 0.28, 1.6, -0.38); P(M('#3a3430', { r: 0.4, m: 0.4 }), C(0.14, 0.12, 0.14, 12), -0.15, 0.93, -0.2);
    }
    function sink() { const bm = theme.furn === 'royal' || theme.furn === 'luxe' ? M('#eeeae0', { r: 0.25 }) : theme.furn === 'industrial' || theme.furn === 'modular' ? M('#b8bec4', { r: 0.3, m: 0.6 }) : M('#d8d4cc', { r: 0.4 }); P(wood, B(0.86, 0.82, 0.55), 0, 0.41, -0.22); P(bm, B(0.6, 0.12, 0.42), 0, 0.86, -0.22); P(M('#2a4a5a', { r: 0.1 }), B(0.5, 0.01, 0.32), 0, 0.88, -0.22); P(metal, C(0.015, 0.015, 0.25, 6), 0, 1.0, -0.42); P(metal, B(0.03, 0.03, 0.14), 0, 1.12, -0.36); if (theme.furn === 'rustic' || theme.furn === 'log' || theme.furn === 'family') { P(iron, B(0.08, 0.35, 0.08), 0.32, 1.05, -0.38); P(iron, B(0.25, 0.03, 0.03), 0.32, 1.25, -0.28, 0, 0, -0.3); } }
    function toilet() { P(M('#ece8e0', { r: 0.3 }), B(0.4, 0.42, 0.5), 0, 0.21, -0.1); P(M('#ece8e0', { r: 0.3 }), B(0.42, 0.45, 0.18), 0, 0.62, -0.38); P(wood, B(0.42, 0.03, 0.46), 0, 0.43, -0.06); }
    // ---------- 腰かけ ----------
    function bench() {
      const tableN = nb4.find(([dx, dz]) => T(x + dx, z + dz) === 'table');
      if (rot) { P(wood2, B(0.9, 0.05, 0.3), 0, 0.12, 0, 0.3, 0, 0.2); return; }
      if (role === 'tavern' && tableN && (F.bench === 'booth' || theme.furn === 'walnut' || theme.furn === 'royal_oak')) {   // ブース席：机に向かって座り、背は高い
        const fyaw = Math.atan2(tableN[0], tableN[1]); const bb = new THREE.Matrix4().makeTranslation(cx, 0, cz).multiply(new THREE.Matrix4().makeRotationY(fyaw)); const PB = (m, g, lx, ly, lz) => add(m, g, bb.clone().multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz)));
        PB(wood, B(0.96, 0.42, 0.5), 0, 0.21, -0.1); PB(fab, B(0.92, 0.1, 0.46), 0, 0.47, -0.08); PB(wood, B(0.96, 1.25, 0.1), 0, 0.62, -0.42); PB(fab, B(0.9, 0.6, 0.06), 0, 0.82, -0.35); PB(wood2, B(1.0, 0.06, 0.14), 0, 1.27, -0.42);
        PB(metal, C(0.02, 0.02, 0.24, 6), 0.3, 1.42, -0.42); PB(glowW, SP(0.05, 8), 0.3, 1.58, -0.42); if (lampN < 1) { lamps.push({ pos: new THREE.Vector3(cx, 1.6, cz), color: theme.light.col, power: 0.5, dist: 4 }); lampN++; } return; }
      if (role === 'church') { P(wood, B(1.0, 0.08, 0.4), 0, 0.45, 0); P(wood, B(1.0, 0.5, 0.06), 0, 0.72, -0.2); for (const s of [-1, 1]) P(wood2, B(0.06, 0.95, 0.45), s * 0.47, 0.47, -0.02); return; }
      if (F.bench === 'sofa') { P(fab, B(0.96, 0.4, 0.62), 0, 0.2, -0.02); P(fab, B(0.96, 0.4, 0.18), 0, 0.6, -0.32); P(fab2, B(0.3, 0.14, 0.12), 0.25, 0.48, -0.18, 0.2); return; }
      if (F.bench === 'cushion') { P(fab, B(0.9, 0.14, 0.7), 0, 0.07, 0); P(fab2, B(0.86, 0.32, 0.14), 0, 0.3, -0.3); P(fab2, B(0.26, 0.18, 0.14), -0.3, 0.2, -0.15, 0.3); return; }
      if (F.bench === 'log') { P(wood2, C(0.17, 0.17, 0.95, 10), 0, 0.2, 0, 0, 0, Math.PI / 2); return; }
      if (F.bench === 'crate') { P(wood, B(0.42, 0.4, 0.42), -0.22, 0.2, 0); P(wood2, B(0.42, 0.36, 0.42), 0.24, 0.18, 0.02, 0.2); return; }
      if (F.bench === 'rattan') { P(wood, B(0.92, 0.06, 0.42), 0, 0.42, 0); for (let i = 0; i < 6; i++) P(wood, C(0.012, 0.012, 0.42, 4), -0.42 + i * 0.17, 0.62, -0.2, 0, 0.15); P(wood, C(0.015, 0.015, 0.9, 4), 0, 0.84, -0.22, 0, 0, Math.PI / 2); return; }
      P(wood, B(0.92, 0.07, 0.38), 0, 0.44, 0); for (const s of [-1, 1]) P(F.leg === 'iron' ? iron : wood2, B(0.06, 0.44, 0.34), s * 0.4, 0.22, 0); if (role === 'bank' || role === 'inn') { P(wood, B(0.92, 0.42, 0.05), 0, 0.68, -0.18); P(fab, B(0.86, 0.04, 0.32), 0, 0.49, 0.02); }
    }
    // ---------- 柱・台 ----------
    function pillar() {
      if (role === 'armor') { P(wood2, C(0.18, 0.2, 0.06, 12), 0, 0.03, 0); P(wood2, C(0.025, 0.025, 1.0, 6), 0, 0.53, 0); P(metal, C(0.2, 0.17, 0.45, 12), 0, 1.15, 0); P(metal, SP(0.21, 12), 0, 1.38, 0); P(metal, SP(0.12, 10), 0, 1.65, 0); P(metal, B(0.5, 0.06, 0.12), 0, 1.36, 0); P(M('#8a1e2a', { r: 0.9 }), B(0.22, 0.4, 0.02), 0, 1.12, 0.17); return; }
      if (sub === 'tailor') { P(wood2, C(0.15, 0.17, 0.05, 12), 0, 0.03, 0); P(wood2, C(0.02, 0.02, 0.85, 6), 0, 0.45, 0); P(fab2, C(0.17, 0.12, 0.55, 12), 0, 1.15, 0); P(fab2, SP(0.15, 10), 0, 1.38, 0); P(M('#c8a050', { r: 0.4, m: 0.6 }), SP(0.035, 8), 0, 1.6, 0); return; }
      if (role === 'bank') { P(M('#c8a050', { r: 0.3, m: 0.8 }), C(0.05, 0.06, 1.0, 10), 0, 0.5, 0); P(M('#c8a050', { r: 0.3, m: 0.8 }), SP(0.08, 10), 0, 1.04, 0); P(M('#c8a050', { r: 0.3, m: 0.8 }), C(0.18, 0.2, 0.05, 14), 0, 0.03, 0); P(M('#7a1a22', { r: 0.9 }), C(0.025, 0.025, 0.9, 6), 0.3, 0.85, 0, 0, 0, Math.PI / 2); return; }
      if (role === 'dojo') { P(wood, C(0.12, 0.13, 1.6, 10), 0, 0.8, 0); for (let i = 0; i < 3; i++) P(wood2, C(0.03, 0.03, 0.4, 6), 0, 0.6 + i * 0.35, 0.15, 0, Math.PI / 2); return; }
      const st = theme.wall.kind; const h = 2.5;
      if (/marble|ashlar|coral|stone/.test(st) || theme.furn === 'royal') { const cm = M(theme.wall.c1, { r: 0.6 }); P(cm, C(0.2, 0.22, h - 0.4, 14), 0, h / 2, 0); P(cm, B(0.5, 0.2, 0.5), 0, 0.1, 0); P(theme.wall.gilt ? M(theme.wall.gilt, { r: 0.3, m: 0.8 }) : cm, B(0.52, 0.2, 0.52), 0, h - 0.1, 0); return; }
      if (/metal|pipes|laminate/.test(st)) { P(M('#8a949c', { r: 0.4, m: 0.6 }), B(0.3, h, 0.3), 0, h / 2, 0); P(M('#48c9d6', { glow: 1.0 }), B(0.02, h - 0.4, 0.32), 0, h / 2, 0); return; }
      if (/canvas/.test(st)) { P(wood2, C(0.06, 0.07, h, 8), 0, h / 2, 0); return; }
      P(wood2, B(0.26, h, 0.26), 0, h / 2, 0); P(wood, B(0.34, 0.12, 0.34), 0, 0.06, 0); P(wood, B(0.4, 0.12, 0.4), 0, h - 0.1, 0);
    }
    function barrel() {
      if (theme.furn === 'desert' || theme.furn === 'market' || hasProp('water_jar')) { P(M('#b8704a', { r: 0.9 }), SP(0.32, 12), 0, 0.36, 0); P(M('#b8704a', { r: 0.9 }), C(0.12, 0.16, 0.2, 12), 0, 0.72, 0); P(M('#2a6a8a', { r: 0.5 }), TO(0.3, 0.02), 0, 0.42, 0, 0, Math.PI / 2); return; }
      if (theme.furn === 'industrial' || theme.furn === 'makeshift' || theme.furn === 'modular' || theme.furn === 'military') { P(M(theme.furn === 'military' ? '#4a5a3a' : '#5a6a7a', { r: 0.5, m: 0.5 }), C(0.3, 0.3, 0.85, 14), 0, 0.425, 0); for (const yy of [0.25, 0.6]) P(iron, TO(0.3, 0.015), 0, yy, 0, 0, Math.PI / 2); return; }
      if (theme.furn === 'log' || hasProp('mushroom_basket')) { P(M('#a8884a', { r: 1 }), C(0.3, 0.24, 0.4, 12), 0, 0.2, 0); P(M('#c8a878', { r: 1 }), SP(0.09, 8), 0.05, 0.42, 0); P(M('#e8d8c0', { r: 1 }), SP(0.07, 8), -0.08, 0.42, 0.06); return; }
      if (rot) { P(wood2, C(0.3, 0.3, 0.8, 12), 0.05, 0.3, 0, 0, 1.3); return; }
      const bw = M('#7a5030', { r: 0.85 }); P(bw, C(0.28, 0.3, 0.85, 14), 0, 0.425, 0); P(bw, C(0.3, 0.28, 0.01, 14), 0, 0.85, 0); for (const yy of [0.12, 0.42, 0.72]) P(iron, TO(0.3, 0.015), 0, yy, 0, 0, Math.PI / 2);
      if (role === 'tavern') { P(metal, C(0.02, 0.02, 0.12, 6), 0, 0.3, 0.3, 0, Math.PI / 2); }
    }
    function crate() {
      const forge = nb4.some(([dx, dz]) => T(x + dx, z + dz) === 'hearth');
      if (forge && (role === 'weapon' || sub === 'smith' || theme.fire === 'forge' || theme.furn === 'smith' || theme.furn === 'workshop')) { P(stone, C(0.18, 0.22, 0.45, 10), 0, 0.225, 0); P(iron, B(0.55, 0.18, 0.22), 0, 0.54, 0); P(iron, C(0.0, 0.11, 0.2, 8), 0.36, 0.56, 0, 0, 0, Math.PI / 2); P(iron, B(0.04, 0.02, 0.4), -0.1, 0.65, 0.05, 0.3); return; }   // 金床
      if (rot || theme.furn === 'rotten') { for (let i = 0; i < 7; i++) P(i % 2 ? stone : wood2, B(0.2 + (i % 3) * 0.1, 0.12 + (i % 2) * 0.1, 0.18 + (i % 4) * 0.06), (i % 3 - 1) * 0.22, 0.06 + Math.floor(i / 3) * 0.12, ((i * 7) % 5 - 2) * 0.1, i * 0.7, 0, (i % 2) * 0.3); return; }   // 瓦礫
      if (sub === 'engineer' || hasProp('parts')) { P(M('#5a6a7a', { r: 0.5, m: 0.5 }), B(0.8, 0.4, 0.6), 0, 0.2, 0); for (let i = 0; i < 4; i++) P(metal, i % 2 ? C(0.06, 0.06, 0.03, 10) : B(0.12, 0.06, 0.08), -0.25 + i * 0.17, 0.44, (i % 2) * 0.1); return; }
      if (theme.furn === 'military' || hasProp('supply_crate') || hasProp('relief_crate')) { P(M('#5a6040', { r: 0.9 }), B(0.8, 0.55, 0.6), 0, 0.275, 0); P(M('#e8e0c8', { r: 1 }), B(0.3, 0.12, 0.005), 0, 0.3, 0.3); P(metal, B(0.82, 0.04, 0.04), 0, 0.5, 0.29); return; }
      if (role === 'post') { for (let i = 0; i < 4; i++) P(paper, B(0.3, 0.12, 0.22), (i % 2 - 0.5) * 0.32, 0.06 + Math.floor(i / 2) * 0.12, 0, i * 0.2); return; }
      if (theme.furn === 'family' || theme.furn === 'rustic' || hasProp('grain_sack')) { P(M('#c8b48a', { r: 1 }), SP(0.28, 10), -0.14, 0.24, 0); P(M('#b8a47a', { r: 1 }), SP(0.25, 10), 0.2, 0.22, 0.05); return; }   // 袋
      P(wood, B(0.82, 0.62, 0.72), 0, 0.31, 0); for (const s of [-1, 1]) P(wood2, B(0.84, 0.08, 0.74), 0, 0.31 + s * 0.22, 0); P(wood2, B(0.08, 0.64, 0.74), 0, 0.31, 0, 0.0, 0, 0.75);
      if ((x + z) % 3 === 0) P(wood2, B(0.5, 0.36, 0.44), 0.05, 0.8, 0, 0.3);
    }
    function rack() {
      P(wood2, B(0.92, 1.6, 0.06), 0, 0.85, -0.42); P(wood, B(0.96, 0.08, 0.12), 0, 1.65, -0.38); P(wood, B(0.96, 0.06, 0.12), 0, 0.55, -0.38);
      if (role === 'weapon' || role === 'dojo') { for (let i = 0; i < 4; i++) { P(metal, B(0.04, 1.1, 0.012), -0.33 + i * 0.22, 1.05, -0.33); P(M('#c8a050', { r: 0.4, m: 0.6 }), B(0.16, 0.03, 0.04), -0.33 + i * 0.22, 0.52, -0.33); P(dark, C(0.02, 0.02, 0.14, 6), -0.33 + i * 0.22, 0.43, -0.33); } return; }
      if (role === 'armor') { for (let i = 0; i < 2; i++) { P(metal, C(0.22, 0.22, 0.04, 16), -0.22 + i * 0.44, 1.15, -0.37, 0, Math.PI / 2); P(M(i ? '#2a3a6a' : '#8a1e2a', { r: 0.6 }), C(0.14, 0.14, 0.045, 12), -0.22 + i * 0.44, 1.15, -0.36, 0, Math.PI / 2); } return; }
      if (sub === 'tailor' || hasProp('workclothes') || hasProp('cold_coat') || hasProp('wet_coat')) { P(metal, C(0.012, 0.012, 0.9, 6), 0, 1.5, -0.3, 0, 0, Math.PI / 2); for (let i = 0; i < 4; i++) P(M([F.fab, F.fab2, '#8a6a4a', '#4a5a6a'][i], { r: 1 }), B(0.18, 0.75, 0.06), -0.3 + i * 0.2, 1.08, -0.28); return; }
      if (sub === 'fisher' || hasProp('net') || hasProp('rope_coil') || hasProp('sailcloth')) { const nm = M('#c8b07a', { r: 1, ds: true }); for (let i = 0; i < 7; i++) P(nm, B(0.9, 0.012, 0.012), 0, 0.7 + i * 0.13, -0.36); for (let i = 0; i < 7; i++) P(nm, B(0.012, 0.8, 0.012), -0.42 + i * 0.14, 1.08, -0.36); P(M('#e8c040'), SP(0.06, 8), 0.2, 0.9, -0.33); P(M('#c8b07a', { r: 1 }), TO(0.14, 0.04), -0.25, 0.3, -0.3, 0, Math.PI / 2); return; }
      for (let i = 0; i < 5; i++) P(iron, B(0.03, 0.35 + (i % 2) * 0.15, 0.03), -0.36 + i * 0.18, 1.2, -0.36); P(M('#7a4a2a', { r: 0.9 }), B(0.3, 0.5, 0.04), 0.3, 0.95, -0.36);   // 工具・革の前掛け
    }
    // ---------- 炉 ----------
    function hearth() {
      let K = theme.fire; if (role === 'weapon' || sub === 'smith') K = 'forge'; if (K === 'none') K = 'brazier';
      const fireLight = (y, col, pw) => { if (lampN >= 2) return; lamps.push({ pos: new THREE.Vector3(cx + Math.sin(yaw) * 0.3, y, cz + Math.cos(yaw) * 0.3), color: col || 0xff9040, power: pw || 0.9, dist: 6 }); lampN++; };
      const flame = (lx, ly, lz, s) => { const fm = M('#ffb040', { glow: 2.0 }); P(ember, B(0.3 * s, 0.06, 0.2 * s), lx, ly, lz); const f = new THREE.ConeGeometry(0.1 * s, 0.32 * s, 6); P(fm, f, lx, ly + 0.17 * s, lz); P(M('#ffe080', { glow: 2.2 }), new THREE.ConeGeometry(0.05 * s, 0.2 * s, 6), lx, ly + 0.12 * s, lz + 0.03); };
      if (K === 'cold') { P(stone, B(0.9, 0.8, 0.4), 0, 0.4, -0.3); P(dark, B(0.5, 0.5, 0.05), 0, 0.3, -0.08); P(ash, B(0.5, 0.05, 0.3), 0, 0.03, 0.05); return; }
      if (K === 'brick_mantel' || K === 'stone_mantel' || K === 'marble_mantel') {
        const mm = K === 'brick_mantel' ? brick : K === 'marble_mantel' ? M('#f0ece2', { r: 0.3 }) : M(theme.wall.c1, { r: 0.85 }); const sh = K === 'brick_mantel' ? M('#2a1a10', { r: 0.6 }) : mm;
        P(mm, B(0.98, 1.15, 0.42), 0, 0.575, -0.28); P(dark, B(0.56, 0.62, 0.05), 0, 0.33, -0.05); P(sh, B(1.0, 0.08, 0.5), 0, 1.18, -0.24); P(sh, B(0.12, 1.1, 0.46), -0.44, 0.55, -0.24); P(sh, B(0.12, 1.1, 0.46), 0.44, 0.55, -0.24);
        if (K === 'brick_mantel') { P(M('#3a2a20'), B(0.7, 0.9, 0.3), 0, 1.65, -0.35); P(M('#c8a050', { r: 0.3, m: 0.8 }), C(0.09, 0.09, 0.04, 14), 0, 1.4, -0.3, 0, Math.PI / 2); P(dark, B(0.01, 0.06, 0.005), 0, 1.42, -0.27); for (const s of [-1, 1]) { P(M('#c8a050', { r: 0.3, m: 0.8 }), C(0.02, 0.03, 0.18, 8), s * 0.36, 1.31, -0.24); P(M('#fff0c0', { glow: 1.0 }), C(0.012, 0.012, 0.06, 6), s * 0.36, 1.43, -0.24); } P(iron, B(0.6, 0.2, 0.02), 0, 0.1, 0.0); }
        if (K === 'marble_mantel') P(M('#c9a24a', { r: 0.3, m: 0.8 }), B(1.0, 0.03, 0.5), 0, 1.23, -0.24);
        flame(0, 0.06, -0.12, 1); fireLight(0.5); animated && animated.push && 0; return;
      }
      if (K === 'tiled_stove') { const tm = M('#e8f0f4', { r: 0.25 }); P(tm, B(0.8, 1.8, 0.62), 0, 0.9, -0.15); for (let i = 0; i < 6; i++) P(M('#8aaccc', { r: 0.3 }), B(0.82, 0.02, 0.64), 0, 0.3 + i * 0.26, -0.15); P(tm, B(0.9, 0.1, 0.7), 0, 1.85, -0.15); P(dark, B(0.3, 0.26, 0.02), 0, 0.4, 0.17); P(ember, B(0.2, 0.08, 0.01), 0, 0.33, 0.175); P(metal, B(0.32, 0.03, 0.03), 0, 0.56, 0.18); fireLight(0.5, 0xffa060, 0.6); return; }
      if (K === 'iron_stove' || K === 'heater') { if (K === 'heater') { P(M('#6a7078', { r: 0.4, m: 0.6 }), B(0.6, 0.7, 0.3), 0, 0.35, -0.2); for (let i = 0; i < 6; i++) P(M('#ff5a2a', { glow: 1.2 }), B(0.5, 0.02, 0.01), 0, 0.15 + i * 0.09, -0.04); fireLight(0.4, 0xff6a3a, 0.5); return; }
        P(iron, C(0.3, 0.3, 0.75, 14), 0, 0.42, -0.1); P(iron, C(0.32, 0.32, 0.05, 14), 0, 0.8, -0.1); for (let i = 0; i < 3; i++) P(iron, C(0.03, 0.03, 0.12, 6), Math.cos(i * 2.1) * 0.22, 0.04, -0.1 + Math.sin(i * 2.1) * 0.22); P(dark, B(0.24, 0.2, 0.02), 0, 0.4, 0.2); P(ember, B(0.16, 0.06, 0.01), 0, 0.34, 0.205); P(iron, C(0.07, 0.07, 1.7, 10), 0, 1.65, -0.1); P(M('#3a3430', { r: 0.4, m: 0.4 }), C(0.1, 0.12, 0.16, 12), 0.05, 0.9, -0.05); fireLight(0.5, 0xff9a4a, 0.7); return; }
      if (K === 'forge') { P(brick, B(0.96, 0.75, 0.82), 0, 0.375, -0.06); P(ash, B(0.7, 0.04, 0.55), 0, 0.77, -0.06); P(ember, B(0.5, 0.06, 0.35), 0, 0.8, -0.06); P(M('#ffb040', { glow: 2.2 }), new THREE.ConeGeometry(0.16, 0.3, 6), 0, 0.98, -0.06); P(brick, B(0.7, 0.9, 0.5), 0, 1.6, -0.25); P(brick, C(0.12, 0.12, 0.8, 8), 0, 2.4, -0.3); P(M('#7a4a2a', { r: 0.9 }), B(0.24, 0.3, 0.22), 0.36, 0.95, 0.2, 0.2); fireLight(1.0, 0xff7030, 1.2); return; }
      if (K === 'clay_oven' || K === 'kamado') { P(M('#b8704a', { r: 0.95 }), SP(0.44, 14), 0, 0.3, -0.1); P(dark, B(0.3, 0.26, 0.1), 0, 0.26, 0.3); flame(0, 0.18, 0.22, 0.6); fireLight(0.4, 0xff8a40, 0.6); return; }
      if (K === 'brazier') { P(iron, C(0.3, 0.18, 0.25, 12), 0, 0.55, 0); for (let i = 0; i < 3; i++) P(iron, B(0.03, 0.5, 0.03), Math.cos(i * 2.1) * 0.18, 0.25, Math.sin(i * 2.1) * 0.18); flame(0, 0.64, 0, 1); fireLight(0.9, 0xff9040, 0.8); return; }
      // 石の炉（暖炉の輪・地面の炉）
      const rm = K === 'earth_hearth' ? M('#5a4a3c', { r: 1 }) : stone;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; P(rm, SP(0.11, 6), Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32); }
      P(ash, C(0.28, 0.28, 0.03, 12), 0, 0.02, 0); for (let i = 0; i < 3; i++) P(wood2, C(0.04, 0.04, 0.45, 6), 0, 0.08, 0, i * 1.05, 0, Math.PI / 2); flame(0, 0.06, 0, 0.9);
      if (K === 'stone_hearth') { P(stone, B(0.96, 1.4, 0.3), 0, 0.7, -0.35); P(stone, B(0.7, 1.0, 0.3), 0, 1.9, -0.38); } fireLight(0.5, 0xff9040, 0.8);
    }
    function instrument() {
      if (role === 'tower' || role === 'tower_up' || hasProp('telescope')) { for (let i = 0; i < 3; i++) P(wood2, C(0.015, 0.015, 1.1, 6), Math.cos(i * 2.1) * 0.15, 0.5, Math.sin(i * 2.1) * 0.15, 0, Math.cos(i * 2.1) * 0.25, Math.sin(i * 2.1) * -0.25); P(M('#c8a050', { r: 0.3, m: 0.8 }), C(0.05, 0.07, 0.75, 12), 0, 1.15, 0.05, 0, 1.0); return; }
      P(wood, B(0.9, 0.06, 0.6), 0, 0.85, -0.1); for (const s of [-1, 1]) P(wood2, B(0.06, 0.85, 0.55), s * 0.4, 0.42, -0.1); P(iron, B(0.2, 0.12, 0.1), -0.25, 0.94, -0.15); for (let i = 0; i < 3; i++) P(metal, C(0.05 + i * 0.02, 0.05 + i * 0.02, 0.015, 12), 0.1 + i * 0.1, 0.89, -0.05); P(wood2, B(0.9, 0.6, 0.04), 0, 1.3, -0.4); for (let i = 0; i < 5; i++) P(iron, B(0.03, 0.2, 0.03), -0.36 + i * 0.18, 1.35, -0.36);
    }
    function planter() { P(wood, B(0.86, 0.4, 0.86), 0, 0.2, 0); P(M('#4a3424', { r: 1 }), B(0.8, 0.02, 0.8), 0, 0.41, 0); for (let i = 0; i < 5; i++) { P(M('#4e7a3a', { r: 1 }), SP(0.14, 8), -0.25 + (i % 3) * 0.25, 0.52, -0.2 + Math.floor(i / 3) * 0.35); P(M(['#e85a7a', '#f0d040', '#f8f0f0'][i % 3], { r: 0.9 }), SP(0.05, 6), -0.25 + (i % 3) * 0.25, 0.64, -0.2 + Math.floor(i / 3) * 0.35); } }
    function basin() { P(M('#e8e0d0', { r: 0.6 }), C(0.42, 0.45, 0.4, 16), 0, 0.2, 0); P(M('#2a8a8a', { r: 0.5 }), TO(0.43, 0.04), 0, 0.38, 0, 0, Math.PI / 2); P(M('#4a90b0', { r: 0.05, op: 0.8 }), C(0.38, 0.38, 0.02, 16), 0, 0.36, 0); P(M('#e8e0d0', { r: 0.6 }), C(0.05, 0.07, 0.4, 8), 0, 0.55, 0); }
    function hole() {   // 床の抜けた所（通れない。落ちない）：暗い穴と折れた床板
      P(M('#0e0a08', { r: 1 }), B(0.86, 0.02, 0.86), 0, 0.012, 0); for (let i = 0; i < 4; i++) P(wood2, B(0.12, 0.05, 0.5 + (i % 2) * 0.2), -0.36 + i * 0.24, 0.03, 0.05, 0, (i % 2 ? 0.25 : -0.2), 0); P(wood2, B(0.9, 0.06, 0.1), 0, 0.03, -0.42); P(wood2, B(0.9, 0.06, 0.1), 0, 0.03, 0.42, 0.05);
    }
  }
  return { stats };
}
