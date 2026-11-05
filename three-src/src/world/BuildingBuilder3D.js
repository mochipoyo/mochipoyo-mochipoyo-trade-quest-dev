/* =========================================================
   BuildingBuilder3D：2D版の建物定義（towns.js の buildings：位置・大きさ・入口・種類・名前）から
   立体的な木組みの建物を組み立てる。足元のタイル（通行判定）とドアの位置は2D版と同じ
   ・石の土台／しっくい壁＋木の梁（ハーフティンバー）／2階のせり出し／板瓦を段に重ねた切妻屋根／破風板
   ・窓（枠・十字の桟・よろい戸・花箱・夜は灯る）／扉（庇・ランタン・石段）／煙突（煙）
   ・施設ごとの吊り看板（3Dアイコン）と名札、教会の鐘楼、修行場の幟
   ========================================================= */
import * as THREE from 'three';
import { box, rbox, Batch, M4, textTexture } from '../engine/Materials.js';

const ROOF = { weapon: '#8a3a3a', armor: '#3f5f9f', item: '#3f8a5a', inn: '#b8603a', church: '#55607a', tavern: '#7a5a2a', bank: '#5a5a6a', guild: '#7a3a6a', dojo: '#2f5f8a', house: '#a8483a', elder: '#7a5a32', warehouse: '#5a6a7a', castle: '#4a4a6a' };
const SHUTTER = { item: 'shutterGreen', inn: 'shutterRed', church: 'shutterBlue', dojo: 'shutterBlue', elder: 'shutterGreen', house: 'shutterRed' };
const ICON = { item: 'icon_potion', inn: 'icon_bed', weapon: 'icon_sword', church: 'icon_bell', dojo: 'icon_chart', elder: 'icon_scroll', armor: 'icon_sword', tavern: 'icon_potion' };

import { buildTownShip } from './ShipModel3D.js';
// v7.6 建物の作り込み（町のレシピが style.detail76 を渡した建物だけ）：厚い屋根と深い軒・壁の足元の汚れと苔・角石・日よけ・つた・洗濯物・
//   窓の灯りのにじみ（夜）・建物の足元（通れないマスの中）の植木鉢・薪・袋・立て看板。当たり判定・扉・名札は変えない
//   切り替え：localStorage 'mtq3d-bdetail'＝'off'（使わない＝以前の形）。URL の ?bdetail=on|off が優先（保存しない）
export function bdetailSetting() {
  try { const q = /[?&]bdetail=(on|off)\b/.exec(location.search || ''); if (q) return q[1]; } catch (e) { /* なし */ }
  try { return localStorage.getItem('mtq3d-bdetail') === 'off' ? 'off' : 'on'; } catch (e) { return 'on'; }
}
export function setBdetailSetting(v) { try { if (v === 'off') localStorage.setItem('mtq3d-bdetail', 'off'); else localStorage.removeItem('mtq3d-bdetail'); } catch (e) { /* なし */ } }
const hashB = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };   // 0..1（符号なしに直す）
const darkHex = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();
const HUMID = { arcadia: 1, grania: 1, kalion: 1, tempus: 1, islands: 1, magicka: 1 };
export class BuildingBuilder3D {
  constructor(mats, models) { this.mats = mats; this.models = models; }

  async build(b, rnd, opts) {
    const M = this.mats; const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] };
    out.group.name = 'building_' + (b.id || b.name);
    const batch = (opts && opts.batch) || new Batch();
    const type = b.type || 'house';
    const rng = rnd || Math.random;
    // v7.6 環境リデザイン：建物の形の指定（町・用途ごと。three-src/src/environment/ のレシピが渡す）。なければ従来どおり
    //   roof：'gable'（棟が東西・従来）／'gableZ'（棟が南北＝妻入り）／'hip'（寄棟）／'flat'（平屋根＋胸壁）。pitch・eave：勾配・軒の出
    //   two：2階建て／base・h1：土台・1階の高さ／plaster：壁の色／frame：false で木組みなし（石・土の壁）／wall：'stone'（壁を石に）
    //   roofColor：屋根の色／porch：扉の上の庇／bell：屋根の上の小さな鐘楼／chimney：false で煙突なし
    const st = (opts && opts.style) || {};
    const DET = !!st.detail76 && bdetailSetting() !== 'off';   // v7.6 建物の作り込み
    // ---- 寸法
    const xl = b.x + 0.18, xr = b.x + b.w - 0.18, zb = b.y + 0.2, zf = b.y + b.h - 0.62;
    const W = xr - xl, D = zf - zb, cx = (xl + xr) / 2, cz = (zb + zf) / 2;
    const two = st.two !== undefined ? !!st.two : (type === 'elder' || type === 'inn') && b.w >= 10;
    const base = st.base || 0.32;
    const h1 = st.h1 || (type === 'church' ? 3.3 : two ? 2.3 : 3.0);
    const h2 = two ? 2.0 : 0; const jet = two ? 0.16 : 0;
    const top = base + h1 + h2;
    const doorX = b.doorAbs.x + 0.5;
    const theme = opts && opts.theme;   // Phase 1 地域テーマ（壁の色・家の屋根の色）。ポヨ村では渡さない（従来どおり）
    if (type === 'castle' && theme) return this.castle(b, out, batch, theme);
    if (type === 'ship') {   // v7.6 港町マリナの「修理中の船」：家の形ではなく帆船（world/ShipModel3D.js）。2D版は船の絵
      buildTownShip(b, (m, g) => batch.add(m, g), out, rng);
      if (!(opts && opts.batch)) batch.build(out.group);
      return out;
    }
    const plaster = st.wall === 'stone' ? M.tinted('stonewall', st.plaster || '#d8d0c0') : st.plaster ? M.tinted('plaster', st.plaster) : theme && theme.plaster ? M.tinted('plaster', theme.plaster) : M.get('plaster'), timber = M.get('timber'), stone = M.get('stonewall');
    const tb = st.frame === false ? { add() { } } : batch;   // 木組み（柱・梁・間柱・筋かい）。frame:false の建物は描かない

    // ---- 土台
    const wbox = DET ? (w, h, d, s, r) => rbox(w, h, d, s, r) : (w, h, d, s) => box(w, h, d, s);   // v7.6 作り込み：壁と土台の角を丸く（人形・ジオラマ風）
    batch.add(stone, wbox(W + 0.16, base, D + 0.16, 1.6, 0.07), M4(cx, base / 2, cz));
    // ---- 壁（1階・2階）
    batch.add(plaster, wbox(W, h1, D, 2.2, 0.13), M4(cx, base + h1 / 2, cz));
    if (two) {
      batch.add(plaster, wbox(W + jet * 2, h2, D + jet * 2, 2.2, 0.13), M4(cx, base + h1 + h2 / 2, cz));
      batch.add(timber, box(W + jet * 2 + 0.08, 0.16, D + jet * 2 + 0.08, 1.5), M4(cx, base + h1 + 0.02, cz));   // 2階床の梁
      for (let x = xl + 0.4; x < xr; x += 0.55) { batch.add(timber, box(0.12, 0.12, jet + 0.15, 1), M4(x, base + h1 - 0.06, zf + jet / 2)); batch.add(timber, box(0.12, 0.12, jet + 0.15, 1), M4(x, base + h1 - 0.06, zb - jet / 2)); }   // 根太の先
    }
    // ---- 木組み（柱・梁・筋かい）
    const frameFace = (y0, h, ex, ez) => {   // ex,ez：その階の外形
      const x0 = cx - ex / 2, x1 = cx + ex / 2, z0 = cz - ez / 2, z1 = cz + ez / 2;
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) tb.add(timber, box(0.2, h, 0.2, 1), M4(x, y0 + h / 2, z));
      for (const z of [z0, z1]) { tb.add(timber, box(ex + 0.06, 0.14, 0.08, 1.5), M4(cx, y0 + 0.07, z + (z === z1 ? 0.03 : -0.03))); tb.add(timber, box(ex + 0.06, 0.14, 0.08, 1.5), M4(cx, y0 + h - 0.07, z + (z === z1 ? 0.03 : -0.03))); }
      for (const x of [x0, x1]) { tb.add(timber, box(0.08, 0.14, ez + 0.06, 1.5), M4(x + (x === x1 ? 0.03 : -0.03), y0 + 0.07, cz)); tb.add(timber, box(0.08, 0.14, ez + 0.06, 1.5), M4(x + (x === x1 ? 0.03 : -0.03), y0 + h - 0.07, cz)); }
      return { x0, x1, z0, z1 };
    };
    const f1 = frameFace(base, h1, W, D); const f2 = two ? frameFace(base + h1, h2, W + jet * 2, D + jet * 2) : null;

    // ---- 窓と扉の配置（正面）
    const winsFront = []; const step = 2.1;
    for (let x = xl + 1.25; x < xr - 0.9; x += step) { if (Math.abs(x - doorX) < 1.35) continue; winsFront.push(x); }
    const studsAt = (x0, x1, avoid) => { const xs = []; for (let x = x0 + 1.05; x < x1 - 0.5; x += 1.05) if (!avoid.some((a) => Math.abs(a - x) < 0.62)) xs.push(x); return xs; };
    // 正面・背面の間柱
    for (const z of [f1.z0 - 0.03, f1.z1 + 0.03]) for (const x of studsAt(f1.x0, f1.x1, winsFront.concat(z > cz ? [doorX] : []))) tb.add(timber, box(0.12, h1 - 0.2, 0.06, 1), M4(x, base + h1 / 2, z));
    if (f2) for (const z of [f2.z0 - 0.03, f2.z1 + 0.03]) for (const x of studsAt(f2.x0, f2.x1, winsFront)) tb.add(timber, box(0.12, h2 - 0.2, 0.06, 1), M4(x, base + h1 + h2 / 2, z));
    // 筋かい（両端の壁面）
    const brace = (x, z, y0, h, dir, depthAxis) => {
      const len = Math.sqrt(1.0 + (h - 0.3) * (h - 0.3)); const ang = Math.atan2(h - 0.3, 1.0) * dir;
      const g = box(0.1, len, 0.06, 1);
      tb.add(timber, g, depthAxis ? M4(x, y0 + h / 2, z, Math.PI / 2, 0, ang) : M4(x, y0 + h / 2, z, 0, 0, ang));
    };
    const side1 = [f1.x0 + 0.6, f1.x1 - 0.6];
    if (!winsFront.some((x) => x < f1.x0 + 1.3)) brace(side1[0], f1.z1 + 0.035, base, h1, 1);
    if (!winsFront.some((x) => x > f1.x1 - 1.3)) brace(side1[1], f1.z1 + 0.035, base, h1, -1);
    if (f2) { if (!winsFront.some((x) => x < f2.x0 + 1.3)) brace(f2.x0 + 0.6, f2.z1 + 0.035, base + h1, h2, 1); if (!winsFront.some((x) => x > f2.x1 - 1.3)) brace(f2.x1 - 0.6, f2.z1 + 0.035, base + h1, h2, -1); brace(f2.x0 + 0.6, f2.z0 - 0.035, base + h1, h2, -1); brace(f2.x1 - 0.6, f2.z0 - 0.035, base + h1, h2, 1); }
    for (const x of [f1.x0 - 0.035, f1.x1 + 0.035]) for (const z of [cz - D / 4, cz + D / 4]) tb.add(timber, box(0.06, h1 - 0.2, 0.12, 1), M4(x, base + h1 / 2, z));

    // ---- 窓
    const shutterMat = M.get(SHUTTER[type] || 'shutterGreen'); const glass = M.get('glass');
    const flowersCols = [0xe8506a, 0xf0d040, 0xf4f4f8, 0xa060d8, 0xff8a40];
    const flowerGeo = new THREE.IcosahedronGeometry(0.06, 0);
    const window_ = (x, y, z, face, w, h, opts) => {   // face：+1 正面（+Z）, -1 背面, 'L','R' 側面
      opts = opts || {};
      const along = (face === 'L' || face === 'R'); const s = face === 'R' ? 1 : face === 'L' ? -1 : face;
      const P = (u, v, d) => along ? [x + d * s, y + v, z + u] : [x + u, y + v, z + d * s];
      const ry = along ? Math.PI / 2 : 0;
      const B = (mat, ww, hh, dd, u, v, d, rz) => { const g = box(along ? dd : ww, hh, along ? ww : dd, 0.7); const p = P(u, v, d); batch.add(mat, g, M4(p[0], p[1], p[2], 0, 0, rz || 0)); };
      B(glass, w, h, 0.04, 0, 0, 0.0);
      B(timber, w + 0.2, 0.12, 0.1, 0, h / 2 + 0.03, 0.04); B(timber, w + 0.28, 0.1, 0.18, 0, -h / 2 - 0.05, 0.07);
      B(timber, 0.1, h + 0.1, 0.1, -w / 2 - 0.04, 0, 0.04); B(timber, 0.1, h + 0.1, 0.1, w / 2 + 0.04, 0, 0.04);
      B(timber, 0.05, h, 0.06, 0, 0, 0.03); B(timber, w, 0.05, 0.06, 0, 0, 0.03);
      if (opts.shutters !== false) {   // よろい戸（開いている）
        for (const sd of [-1, 1]) {
          const g = box(along ? 0.04 : w * 0.5, h + 0.05, along ? w * 0.5 : 0.04, 0.5);
          const p = P(sd * (w / 2 + w * 0.27), 0, 0.12);
          batch.add(shutterMat, g, M4(p[0], p[1], p[2], (along ? 0 : 0) + sd * 0.35 * (along ? 0 : 1), 0, 0));
        }
      }
      if (opts.flowers) {
        B(timber, w + 0.1, 0.18, 0.22, 0, -h / 2 - 0.2, 0.14);
        for (let i = 0; i < 6; i++) { const p = P(-w / 2 + 0.1 + i * (w - 0.2) / 5, -h / 2 - 0.06, 0.15); const mat = M.tinted('soil', '#' + flowersCols[(i + Math.floor(x)) % 5].toString(16).padStart(6, '0')); batch.add(mat, flowerGeo, M4(p[0], p[1], p[2])); }
      }
    };
    const wy1 = base + Math.min(1.45, h1 * 0.55), wy2 = base + h1 + h2 * 0.5;
    winsFront.forEach((x, i) => { window_(x, wy1, f1.z1 + 0.02, 1, 0.82, 0.92, { flowers: i % 2 === 0 }); if (f2) window_(x, wy2, f2.z1 + 0.02, 1, 0.74, 0.8, { flowers: DET && i % 2 === 1 }); });
    for (let x = xl + 1.6; x < xr - 1.0; x += 2.8) { window_(x, wy1, f1.z0 - 0.02, -1, 0.75, 0.85, { shutters: false }); if (f2) window_(x, wy2, f2.z0 - 0.02, -1, 0.7, 0.75, { shutters: false }); }
    if (D > 3) { window_(f1.x0 - 0.02, wy1, cz, 'L', 0.75, 0.85); window_(f1.x1 + 0.02, wy1, cz, 'R', 0.75, 0.85); }

    // ---- 扉（枠・石段・取っ手）。教会は鐘楼の正面
    // 教会は鐘楼の正面に扉（扉のタイルの中に収め、塔の正面と面をそろえる）
    const dz = type === 'church' ? zf + 0.5 : f1.z1;
    const doorMat = M.get('door'); const iron = M.get('iron');
    batch.add(doorMat, box(1.0, 1.95, 0.08, 1.2), M4(doorX, base + 0.98, dz + 0.0));
    for (const sx of [-1, 1]) batch.add(timber, box(0.16, 2.12, 0.16, 1), M4(doorX + sx * 0.58, base + 1.06, dz + 0.05));
    batch.add(timber, box(1.4, 0.18, 0.18, 1), M4(doorX, base + 2.08, dz + 0.06));
    for (const y of [0.45, 1.5]) batch.add(iron, box(0.55, 0.05, 0.03, 1), M4(doorX - 0.18, base + y, dz + 0.05));
    batch.add(M.get('gold'), new THREE.SphereGeometry(0.045, 10, 8), M4(doorX + 0.32, base + 1.0, dz + 0.07));
    // 石段（2段）
    batch.add(stone, box(1.5, 0.16, 0.42, 1), M4(doorX, 0.08, dz + 0.5)); batch.add(stone, box(1.3, 0.16, 0.3, 1), M4(doorX, 0.22, dz + 0.32));
    // 壁掛けランタン（両側）＋灯り
    for (const sx of [-1, 1]) { out.props.push({ id: 'wall_lantern', m: M4(doorX + sx * 0.95, base + 2.0, dz + 0.02, Math.PI) }); }
    out.lights.push({ pos: new THREE.Vector3(doorX, base + 1.9, dz + 0.45), color: 0xffb05a, power: 1.0 });
    // 名札（扉の上）
    const nameTex = textTexture(b.name || '');
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshStandardMaterial({ map: nameTex, roughness: 0.8 }));
    plate.position.set(doorX, two ? base + h1 + 0.42 : base + 2.4, two ? f2.z1 + 0.05 : dz + 0.07); plate.castShadow = false; out.group.add(plate);

    // ---- 屋根（切妻・棟は X 方向・板瓦を段に重ねる）
    const pitch = st.pitch || (type === 'church' ? 0.88 : 0.72);   // 約50度／41度
    const ovZ = st.eave || 0.3, ovX = (st.eave || (DET ? 0.42 : 0.3)) + 0.08;   // v7.6 作り込み：妻側の軒を深く（正面の軒は名札が隠れないよう従来のまま）
    // v7.6 棟の向き：gableZ は棟を南北に（妻入り）。屋根の部品を建物の中心で90度回して置く
    const rotZ = st.roof === 'gableZ'; const RM = rotZ ? new THREE.Matrix4().makeTranslation(cx, 0, cz).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(-cx, 0, -cz)) : null;
    const RB = { add: (mm, g, mx) => { if (!RM) return batch.add(mm, g, mx); const g2 = g.index ? g.toNonIndexed() : g.clone(); if (mx) g2.applyMatrix4(mx); g2.applyMatrix4(RM); return batch.add(mm, g2); } };
    let ex = (two ? W + jet * 2 : W), ez = (two ? D + jet * 2 : D); if (rotZ) { const t0 = ex; ex = ez; ez = t0; }
    const gableRoof = !st.roof || st.roof === 'gable' || rotZ;
    const half = ez / 2 + ovZ; const rise = (ez / 2) * Math.tan(pitch); const slope = half / Math.cos(pitch);
    // v6.2 場所のデザイン（materials.roof3d・thatch3d）。茅葺き：わら色・厚い段・色むらを小さく
    const des = opts && opts.design; const r3 = des && des.materials && des.materials.roof3d; const thatch = !!(des && des.materials && des.materials.thatch3d && type !== 'church' && type !== 'dojo');
    const roofMat = M.roof(st.roofColor || (r3 && (r3[type] || r3.default)) || (theme && theme.roof && type === 'house' ? theme.roof : null) || ROOF[type] || '#a8483a'); roofMat.vertexColors = true;
    const rowLen = thatch ? 0.22 : 0.27; const rows = Math.ceil(slope / (rowLen * 0.92));
    const roofColRng = thatch ? () => 0.9 + rng() * 0.14 : () => 0.82 + rng() * 0.3;
    const rowThick = thatch ? 0.1 : 0.055;
    if (gableRoof) for (const s of [1, -1]) {
      for (let r = 0; r < rows; r++) {
        const t = (r + 0.5) / rows;   // 0=軒先 1=棟
        const dist = slope * (1 - t);
        const zz = cz + s * Math.cos(pitch) * dist, yy = top + rise - Math.sin(pitch) * dist + 0.05 + r * 0.006;
        const g = box(ex + ovX * 2 + (rng() - 0.5) * 0.05 + (thatch ? 0.12 : 0), rowThick, rowLen + 0.05, 1);
        // 板瓦のUV：横は 2 単位で1回、縦は1段＝テクスチャの1行
        const uv = g.attributes.uv, pos = g.attributes.position, nrm = g.attributes.normal;
        for (let i = 0; i < uv.count; i++) { if (nrm.getY(i) > 0.5) { uv.setXY(i, (pos.getX(i) + cx) / 2.0 + (r % 2) * 0.0, ((r % 8) + (pos.getZ(i) * s > 0 ? 0 : 1)) / 8); } }
        const c = roofColRng(); const cols = new Float32Array(pos.count * 3).fill(c); g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        RB.add(roofMat, g, M4(cx + (rng() - 0.5) * 0.03, yy, zz, 0, s * pitch + (rng() - 0.5) * 0.02, (rng() - 0.5) * 0.01));
      }
    }
    // 棟と破風板
    if (gableRoof) RB.add(M.get('ridge'), box(ex + ovX * 2 + 0.1, 0.16, 0.16, 1), M4(cx, top + rise + 0.1, cz, 0, Math.PI / 4, 0));
    if (gableRoof) for (const sx of [-1, 1]) {
      const gx = cx + sx * (ex / 2 + ovX - 0.02);
      for (const s of [1, -1]) { RB.add(timber, box(0.08, 0.22, slope + 0.1, 1), M4(gx, top + (rise - ovZ * Math.tan(pitch)) / 2 + 0.06, cz + s * half / 2, 0, s * pitch, 0)); }
      // 妻壁（三角形）：しっくい＋梁
      const tri = new THREE.BufferGeometry();
      const xw = cx + sx * (ex / 2); const v = [xw, top, cz - ez / 2, xw, top, cz + ez / 2, xw, top + rise, cz];
      tri.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, ez / 2.2, 0, ez / 4.4, rise / 2.2], 2));
      tri.setIndex(sx > 0 ? [0, 2, 1] : [0, 1, 2]); tri.computeVertexNormals();
      RB.add(plaster, tri);
      RB.add(timber, box(0.06, 0.12, ez, 1), M4(xw + sx * 0.03, top + 0.06, cz));
      RB.add(timber, box(0.06, rise - 0.1, 0.12, 1), M4(xw + sx * 0.03, top + rise / 2, cz));
      for (const s of [-1, 1]) RB.add(timber, box(0.06, 0.1, Math.sqrt((ez / 2) ** 2 + rise ** 2) * 0.55, 1), M4(xw + sx * 0.035, top + rise * 0.45, cz + s * ez * 0.16, 0, s * Math.atan2(rise, ez / 2), 0));
      if (rise > 1.2 && !rotZ) window_(xw + sx * 0.02, top + rise * 0.38, cz, sx > 0 ? 'R' : 'L', 0.5, 0.55, { shutters: false });
    }
    // v7.6 寄棟（hip）・平屋根（flat）
    if (st.roof === 'hip') {
      const L = ex + ovX * 2, Dd = ez + ovZ * 2, rH = (ez / 2) * Math.tan(pitch) * 0.85, ridge = Math.max(0, L - Dd);
      const y0 = top + 0.02, y1 = top + rH; const x0 = cx - L / 2, x1 = cx + L / 2, z0 = cz - Dd / 2, z1 = cz + Dd / 2, r0 = cx - ridge / 2, r1 = cx + ridge / 2;
      const P = [x0, y0, z1, x1, y0, z1, r1, y1, cz, r0, y1, cz, x1, y0, z0, x0, y0, z0];
      const hipG = new THREE.BufferGeometry(); hipG.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      hipG.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 3, 4, 3, 2, 1, 4, 2, 5, 0, 3]); hipG.computeVertexNormals();
      const uvs = []; for (let i = 0; i < P.length; i += 3) uvs.push(P[i] / 2, P[i + 2] / 2); hipG.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      hipG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(6 * 3).fill(0.95), 3));
      batch.add(roofMat, hipG); batch.add(M.get('ridge'), box(Math.max(0.2, ridge + 0.1), 0.14, 0.14, 1), M4(cx, y1 + 0.05, cz));
      batch.add(timber, box(L + 0.04, 0.12, 0.08, 1), M4(cx, y0, z1)); batch.add(timber, box(L + 0.04, 0.12, 0.08, 1), M4(cx, y0, z0));
    }
    if (st.roof === 'flat') {
      batch.add(stone, box(ex + 0.3, 0.22, ez + 0.3, 1.5), M4(cx, top + 0.11, cz));
      for (const zz of [cz - ez / 2 - 0.1, cz + ez / 2 + 0.1]) batch.add(stone, box(ex + 0.3, 0.45, 0.14, 1.5), M4(cx, top + 0.45, zz));
      for (const xx of [cx - ex / 2 - 0.1, cx + ex / 2 + 0.1]) batch.add(stone, box(0.14, 0.45, ez + 0.3, 1.5), M4(xx, top + 0.45, cz));
    }
    // ドーマー（大きい建物の正面屋根）
    if ((two || type === 'elder') && gableRoof && !rotZ) {
      for (const x of winsFront.filter((_, i) => i % 2 === 1).slice(0, 2)) {
        const dzp = cz + ez / 2 * 0.45, dy = top + rise * 0.45;
        batch.add(plaster, box(1.1, 1.0, 1.1, 2), M4(x, dy + 0.3, dzp));
        window_(x, dy + 0.3, dzp + 0.56, 1, 0.55, 0.55, { shutters: false });
        for (const s of [1, -1]) batch.add(roofMat, box(0.7, 0.06, 1.35, 1), M4(x + s * 0.32, dy + 0.98, dzp, 0, 0, s * 0.7));
      }
    }
    // 煙突（宿屋・村長の家・民家・道具屋）
    if (st.chimney !== false && ['inn', 'elder', 'house', 'item', 'dojo'].includes(type)) {
      const chx = type === 'item' ? xr - 1.2 : xl + 1.4, chz = cz - (rotZ ? D : ez) * 0.22;
      const chTop = top + rise + 0.9; const yFoot = top + rise * 0.35;
      batch.add(stone, DET ? rbox(0.62, chTop - yFoot, 0.62, 1.2, 0.08) : box(0.62, chTop - yFoot, 0.62, 1.2), M4(chx, (chTop + yFoot) / 2, chz));
      batch.add(stone, box(0.78, 0.14, 0.78, 1), M4(chx, chTop + 0.05, chz));
      out.smokes.push(new THREE.Vector3(chx, chTop + 0.2, chz));
    }

    // v7.6 庇（扉の上。歩けるマスの上に柱は立てない＝腕木で壁から出す）・屋根の上の小さな鐘楼
    if (st.porch) { const pw = Math.min(W - 0.4, st.porch === true ? 3.2 : st.porch); batch.add(M.roof(st.roofColor || '#7a5a3a'), box(pw, 0.08, 1.0, 1), M4(doorX, base + 2.55, dz + 0.45, 0, -0.25, 0)); for (const sx of [-1, 1]) batch.add(timber, box(0.08, 0.08, 0.95, 1), M4(doorX + sx * (pw / 2 - 0.15), base + 2.3, dz + 0.42, 0, 0.6, 0)); }
    if (st.bell) { const by = top + (gableRoof ? (ez / 2) * Math.tan(pitch) : 0.4); batch.add(timber, box(0.7, 0.9, 0.7, 1), M4(cx, by + 0.45, cz)); batch.add(M.roof(st.roofColor || '#5a4a3a'), new THREE.ConeGeometry(0.62, 0.7, 4), M4(cx, by + 1.25, cz, Math.PI / 4)); batch.add(M.get('gold'), new THREE.CylinderGeometry(0.12, 0.2, 0.3, 10), M4(cx, by + 0.55, cz)); }
    // ---- 種類ごとの飾り
    if (type === 'church') await this.churchTower(b, batch, out, { cx: doorX, zf: dz, base, top, plaster, timber, stone, roofMat, rng });
    if (ICON[type] && type !== 'church') {
      // 吊り看板：鉄の腕木＋板＋アイコン
      const sxp = doorX + (doorX > cx ? -1.55 : 1.55);
      batch.add(iron, box(0.05, 0.05, 0.85, 1), M4(sxp, base + 2.55, dz + 0.42));
      batch.add(iron, box(0.04, 0.5, 0.04, 1), M4(sxp, base + 2.32, dz + 0.1, 0, 0.9, 0));
      for (const dx of [-0.25, 0.25]) batch.add(iron, box(0.015, 0.22, 0.015, 1), M4(sxp + dx, base + 2.43, dz + 0.72));
      batch.add(M.get('door'), box(0.72, 0.5, 0.06, 0.8), M4(sxp, base + 2.08, dz + 0.72, Math.PI / 2));
      out.props.push({ id: ICON[type], m: M4(sxp, base + 1.86, dz + 0.72, Math.PI / 2, 0, 0, 1.15) });
      out.props.push({ id: ICON[type], m: M4(sxp + 0.0, base + 1.86, dz + 0.72, -Math.PI / 2, 0, 0, 1.15) });
    }
    if (type === 'dojo') {   // 幟（チャートの図柄）
      const banner = new THREE.MeshStandardMaterial({ map: this.bannerTexture(), side: THREE.DoubleSide, roughness: 1 });
      for (const sx of [-1, 1]) {
        const px = doorX + sx * 2.3, pz = dz + 0.9;
        batch.add(timber, box(0.08, 3.0, 0.08, 1), M4(px, 1.5, pz)); batch.add(timber, box(0.7, 0.06, 0.06, 1), M4(px + sx * 0.3, 2.9, pz));
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.9, 1, 6), banner); cloth.position.set(px + sx * 0.32, 1.9, pz); cloth.castShadow = true; cloth.userData.sway = true; out.group.add(cloth);
      }
    }
    // 店先の小物
    const front = dz + 0.32;
    if (type === 'item') { out.props.push({ id: 'crate', m: M4(xl + 0.7, 0, front + 0.05, 0.2) }, { id: 'crate', m: M4(xl + 0.75, 0.54, front + 0.05, 0.6, 0, 0, 0.8) }, { id: 'barrel', m: M4(xr - 0.7, 0, front) }, { id: 'barrel', m: M4(xr - 1.35, 0, front + 0.08) }); }
    if (type === 'inn') { out.props.push({ id: 'bench', m: M4(xl + 1.4, 0, front + 0.12) }, { id: 'barrel', m: M4(xr - 0.7, 0, front) }); }
    if (type === 'elder') { out.props.push({ id: 'flowerbed', m: M4(xl + 0.8, 0, front) }, { id: 'flowerbed', m: M4(xr - 0.8, 0, front) }); }
    if (type === 'house') { out.props.push({ id: 'barrel', m: M4(xr - 0.6, 0, front) }, { id: 'crate', m: M4(xr - 1.3, 0, front + 0.05, 0.3) }); }
    if (type === 'dojo') { out.props.push({ id: 'barrel', m: M4(xl + 0.7, 0, front) }); }

    if (DET) this.detail76({ b, type, st, theme, batch, RB, out, rng, plaster, timber, stone, xl, xr, zb, zf, W, D, cx, cz, base, h1, h2, two, jet, top, rise, pitch, ex, ez, ovX, ovZ, half, slope, gableRoof, f1, f2, winsFront, wy1, wy2, doorX, dz, front });

    if (!(opts && opts.batch)) batch.build(out.group);
    return out;
  }

  // v7.6 建物の作り込み（DQ3 リメイク・DQ7 リイマジンドの「人形・ジオラマ」風の厚みと生活感に近づける。形・色は仮の値）
  detail76(o) {
    const M = this.mats; const { b, type, st, batch, RB, xl, xr, zf, W, D, cx, cz, base, h1, h2, two, jet, top, rise, pitch, ex, ovX, half, slope, f1, f2 } = o;
    const region = (o.theme && o.theme.region) || 'arcadia'; const hx = (k) => hashB(b.x, b.y, k); const rng = o.rng;
    const stoneWall = st.wall === 'stone'; const wallHex = st.plaster || (o.theme && o.theme.plaster) || '#efe6d6';
    const add = (m, g, mx) => batch.add(m, g, mx);
    // ---- 厚い屋根：屋根の下地（厚さ）・軒先の鼻隠し
    if (o.gableRoof) for (const s of [1, -1]) {
      const yy = top + rise - Math.sin(pitch) * slope / 2 - 0.02, zz = cz + s * Math.cos(pitch) * slope / 2;
      RB.add(o.timber, box(ex + ovX * 2 - 0.02, 0.1, slope, 1.5), M4(cx, yy, zz, 0, s * pitch, 0));   // 屋根の厚み（瓦の下地）
      const ye = top + rise - Math.sin(pitch) * slope, ze = cz + s * half;
      RB.add(o.timber, box(ex + ovX * 2 + 0.06, 0.15, 0.1, 1.5), M4(cx, ye + 0.05, ze, 0, s * pitch, 0));   // 軒先の板（下へは垂らさない：扉の上の名札を隠さない）
    }
    if (st.roof === 'hip') {
      const L = ex + ovX * 2, Dd = (two ? D + jet * 2 : D) + o.ovZ * 2;
      for (const zz of [cz - Dd / 2, cz + Dd / 2]) add(o.timber, box(L + 0.1, 0.16, 0.12, 1.5), M4(cx, top + 0.06, zz));
      for (const xx of [cx - L / 2, cx + L / 2]) add(o.timber, box(0.12, 0.16, Dd + 0.1, 1.5), M4(xx, top + 0.06, cz));
    }
    // ---- 壁の足元の汚れ（色の濃い帯）と苔
    const grime = stoneWall ? M.tinted('stonewall', darkHex(wallHex, 0.7)) : M.tinted('plaster', darkHex(wallHex, 0.8));
    add(grime, rbox(W + 0.03, 0.4, D + 0.03, 2.2, 0.14), M4(cx, base + 0.2, cz));
    if (two && st.frame === false) add(grime, rbox(W + jet * 2 + 0.03, 0.12, D + jet * 2 + 0.03, 2.2, 0.05), M4(cx, base + h1 + 0.06, cz));   // 2階の床の線
    if (HUMID[region] && hx(3) < 0.7) {
      const moss = M.tinted('plaster', region === 'magicka' ? '#5a6a4a' : '#5f7a3c'); const blob = new THREE.IcosahedronGeometry(1, 0);
      for (const [x0, sgn] of [[xl, 1], [xr, -1]]) for (let i = 0; i < 4; i++) { const r = 0.1 + rng() * 0.1; add(moss, blob, M4(x0 + sgn * (0.05 + rng() * 0.45), base + 0.05 + rng() * 0.25, zf + 0.02 + rng() * 0.05, rng() * 3, 0, 0, r, r * 0.6, r * 0.5)); }
    }
    // ---- 角石（木組みのない壁）
    if (st.frame === false && !stoneWall) {
      const q = M.tinted('stonewall', region === 'desert' ? '#d8b88a' : '#d4ccbc'); const hh = h1 + (two ? h2 : 0);
      for (const [x, sx] of [[f1.x0, -1], [f1.x1, 1]]) for (let y = base + 0.1, i = 0; y < base + hh - 0.1; y += 0.34, i++) { const lng = i % 2 === 0; add(q, box(lng ? 0.42 : 0.26, 0.3, 0.06, 1), M4(x - sx * (lng ? 0.17 : 0.1), y + 0.15, zf + 0.03)); add(q, box(0.06, 0.3, lng ? 0.26 : 0.42, 1), M4(x + sx * 0.03, y + 0.15, zf - (lng ? 0.1 : 0.17))); }
    }
    // ---- 日よけ（店・宿・一部の家の1階の正面の窓）
    const shop = /^(item|weapon|armor|tavern|shop|inn|bank|guild)$/.test(type);
    if (shop) {
      const cols = [['#c8463a', '#f4ead8'], ['#3a6a9a', '#f0ecdc'], ['#3e7a4a', '#f2ead6'], ['#d89a2a', '#f6eedc'], ['#7a4a8a', '#f0e8f4']];
      const awn = this.awningMat(cols[Math.floor(hx(7) * cols.length) % cols.length]);
      o.winsFront.forEach((x) => { const w = 1.15, y = o.wy1 + 0.74, dep = 0.36, drop = 0.24; const g = new THREE.PlaneGeometry(w, Math.hypot(dep, drop), 1, 1); g.rotateX(-Math.PI / 2 + Math.atan2(drop, dep)); add(awn, g, M4(x, y - drop / 2, f1.z1 + 0.04 + dep / 2)); add(awn, box(w, 0.1, 0.02, 1), M4(x, y - drop - 0.05, f1.z1 + 0.05 + dep)); });   // 浅く・高めに（夜の窓の灯りを隠しすぎない）
    }
    // ---- つた（家・村長の家・宿の正面の端）
    if (HUMID[region] && /^(house|elder|inn|tavern)$/.test(type) && hx(5) < 0.45) {
      const leaf = M.tinted('plaster', '#4e6e34'), leaf2 = M.tinted('plaster', '#6a8a42'); const blob = new THREE.IcosahedronGeometry(1, 0);
      const sx = hx(8) < 0.5 ? 1 : -1; const x0 = sx > 0 ? f1.x0 + 0.15 : f1.x1 - 0.15; const hh = h1 * 0.95 + (two ? h2 * 0.6 : 0);
      for (let i = 0; i < 22; i++) { const t = rng(); const y = base + t * hh; const spread = 0.25 + (1 - t) * 0.35; const r = 0.09 + rng() * 0.08; add(i % 3 ? leaf : leaf2, blob, M4(x0 + sx * rng() * spread, y, zf + 0.04, rng() * 3, 0, 0, r, r, r * 0.45)); }
    }
    // ---- 洗濯物（家：正面の、扉から遠い側の壁）
    if (type === 'house' && hx(6) < 0.55) {
      const left = (o.doorX - xl) > (xr - o.doorX); const a = left ? xl + 0.35 : o.doorX + 1.1, c = left ? o.doorX - 1.1 : xr - 0.35;
      if (c - a >= 1.3) {
        const iron = M.get('iron'); const y = base + h1 - 0.3, z = zf + 0.42;
        for (const x of [a, c]) add(iron, box(0.04, 0.04, 0.42, 1), M4(x, y, zf + 0.21));
        add(M.tinted('plaster', '#d8ccb0'), box(c - a, 0.02, 0.02, 1), M4((a + c) / 2, y, z));
        const cloth = ['#f4f2ec', '#8ab0d8', '#e8a8b8', '#f0d878', '#a8c890']; let x = a + 0.25;
        for (let i = 0; x < c - 0.2; i++) { const w = 0.26 + rng() * 0.16, h = 0.32 + rng() * 0.22; add(M.tinted('plaster', cloth[(i + Math.floor(hx(9) * 5)) % 5]), box(w, h, 0.03, 1), M4(x + w / 2, y - h / 2 - 0.01, z, (rng() - 0.5) * 0.15)); x += w + 0.1; }
      }
    }
    // ---- 窓の灯りのにじみ（夜だけ見える。影は落とさない）
    const glow = this.winGlowMat(); const gp = new THREE.PlaneGeometry(1, 1);
    o.winsFront.forEach((x) => { add(glow, gp, M4(x, o.wy1, f1.z1 + 0.09, 0, 0, 0, 1.5, 1.6, 1)); if (f2) add(glow, gp, M4(x, o.wy2, f2.z1 + 0.09, 0, 0, 0, 1.35, 1.45, 1)); });
    // ---- 建物の足元の小物（前の帯：扉のマスと店先の小物を避ける）
    const used = []; const busy = { item: [xl + 0.7, xl + 0.75, xr - 0.7, xr - 1.35], inn: [xl + 1.4, xr - 0.7], elder: [xl + 0.8, xr - 0.8], house: [xr - 0.6, xr - 1.3], dojo: [xl + 0.7] }[type] || [];
    busy.forEach((x) => used.push(x)); if (/^(weapon|armor|tavern)$/.test(type)) [1.75, -1.75, 2.6, -2.6].forEach((d) => used.push(o.doorX + d));   // 店先の小物（variants76.js の shopFront）の位置
    const free = (x, r) => type !== 'church' && x - r > xl + 0.05 && x + r < xr - 0.05 && Math.abs(x - o.doorX) > 0.8 + r && !used.some((u) => Math.abs(u - x) < 0.45 + r);
    const zf2 = zf + 0.3;
    const pot = (x) => { const terra = M.tinted('plaster', '#b0623e'); add(terra, new THREE.CylinderGeometry(0.17, 0.12, 0.3, 10), M4(x, 0.15, zf2)); add(M.tinted('plaster', '#3f6a34'), new THREE.IcosahedronGeometry(0.22, 1), M4(x, 0.42, zf2, 0, 0, 0, 1, 0.85, 1)); if (hx(11) < 0.6) add(M.tinted('plaster', ['#e8506a', '#f0d040', '#f4f4f8'][Math.floor(hx(12) * 3) % 3]), new THREE.IcosahedronGeometry(0.06, 0), M4(x + 0.08, 0.58, zf2 + 0.08)); used.push(x); };
    for (const sx of [-1, 1]) { const x = o.doorX + sx * 1.0; if (free(x, 0.2)) pot(x); }
    if (type === 'house' && st.chimney !== false) {   // 薪の山
      const x = (o.doorX - xl) > (xr - o.doorX) ? xl + 0.75 : xr - 0.75;
      if (free(x, 0.5)) { const wood = M.tinted('timber', '#a07a52'); const lg = new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6); lg.rotateZ(Math.PI / 2); for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) add(wood, lg, M4(x, 0.08 + r * 0.13, zf + 0.12 + k * 0.13 + r * 0.065)); used.push(x); }
    }
    if (type === 'item' || type === 'shop') {   // 袋
      const x = (xl + xr) / 2 + (o.doorX > cx ? -1.6 : 1.6);
      if (free(x, 0.35)) { const sack = M.tinted('plaster', '#c8b088'); for (const [dx, dz2, r] of [[-0.18, 0, 0.2], [0.16, 0.04, 0.18], [0, 0.0, 0.17]]) add(sack, new THREE.SphereGeometry(r, 8, 6), M4(x + dx, r * 0.9 + (dx === 0 ? 0.25 : 0), zf2 + dz2, 0, 0, 0, 1, 1.15, 0.85)); used.push(x); }
    }
    if (/^(inn|tavern|item|weapon|armor)$/.test(type)) {   // 立て看板（扉の横・前の帯の中）
      for (const sx of [1, -1]) { const x = o.doorX + sx * 1.55; if (!free(x, 0.3)) continue; const brd = M.tinted('timber', '#8a6444'), slate = M.tinted('plaster', '#3e5248');
        for (const t of [1, -1]) { add(brd, box(0.42, 0.6, 0.04, 1), M4(x, 0.31, zf2 + t * 0.08, 0, t * 0.22, 0)); add(slate, box(0.32, 0.4, 0.01, 1), M4(x, 0.33, zf2 + t * 0.105, 0, t * 0.22, 0)); }
        used.push(x); break; }
    }
    o.out.detail76 = true;
  }
  awningMat(c) {
    this._awn = this._awn || {}; const k = c.join(); if (this._awn[k]) return this._awn[k];
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 8; const g = cv.getContext('2d');
    for (let i = 0; i < 8; i++) { g.fillStyle = c[i % 2]; g.fillRect(i * 8, 0, 8, 8); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: 1, side: THREE.DoubleSide }); this._awn[k] = m; return m;
  }
  winGlowMat() {
    if (this._wg) return this._wg;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshBasicMaterial({ map: t, color: 0xffb860, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    m.userData.nightGlow = 0.42; m.userData.noShadow = true; m.userData.noReceive = true; m.visible = false; this._wg = m; return m;
  }

  // Phase 1 城（type 'castle'）：石の外壁・四隅の塔（円錐の屋根）・胸壁・門。足元・入口の位置は2D版と同じ。形は仮（仮3D）
  castle(b, out, batch, theme) {
    const M = this.mats; const stone = M.tinted('stonewall', theme.region === 'dark' ? '#6a6070' : theme.region === 'desert' ? '#d8b88a' : '#c8c2b8');
    const roof = M.roof(theme.roof || '#3f4f8a'); const dark = M.tinted('planks', '#4a3020');
    const x0 = b.x + 0.15, x1 = b.x + b.w - 0.15, z0 = b.y + 0.15, z1 = b.y + b.h - 0.55; const W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const h = 4.2;
    batch.add(stone, box(W, h, D, 2), M4(cx, h / 2, cz));
    for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.9) for (const z of [z0 + 0.15, z1 - 0.15]) batch.add(stone, box(0.45, 0.45, 0.3, 1), M4(x, h + 0.22, z));
    for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.9) for (const x of [x0 + 0.15, x1 - 0.15]) batch.add(stone, box(0.3, 0.45, 0.45, 1), M4(x, h + 0.22, z));
    // 中央の館（一段高い）
    const kw = W * 0.5, kd = D * 0.55; batch.add(stone, box(kw, 2.4, kd, 2), M4(cx, h + 1.2, cz - D * 0.1));
    batch.add(roof, new THREE.ConeGeometry(Math.max(kw, kd) * 0.62, 2.2, 4), M4(cx, h + 2.4 + 1.1, cz - D * 0.1, Math.PI / 4, 0, 0, 1, 1, kd / kw));
    // 四隅の塔
    for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      batch.add(stone, new THREE.CylinderGeometry(0.85, 0.95, h + 1.6, 14), M4(tx, (h + 1.6) / 2, tz));
      batch.add(roof, new THREE.ConeGeometry(1.1, 2.0, 14), M4(tx, h + 1.6 + 1.0, tz));
    }
    // 門（入口の位置）と窓
    const dx = b.doorAbs.x + 0.5; batch.add(dark, box(1.4, 2.2, 0.2, 1), M4(dx, 1.1, z1 + 0.02));
    const glass = M.get('glass'); for (let x = x0 + 1.5; x < x1 - 1; x += 2.2) { if (Math.abs(x - dx) < 1.2) continue; batch.add(glass, box(0.4, 0.8, 0.06, 1), M4(x, 2.8, z1 + 0.02)); }
    out.lights.push({ pos: new THREE.Vector3(dx, 2.4, z1 + 0.6), color: 0xffb05a, power: 1.0, dist: 8 });
    for (const sx of [-1, 1]) out.props.push({ id: 'wall_lantern', m: M4(dx + sx * 1.0, 2.2, z1 + 0.05, Math.PI) });
    return out;
  }
  async churchTower(b, batch, out, o) {
    const M = this.mats; const { cx, zf, base, plaster, timber, stone } = o;
    const tw = 2.0, tz = zf - tw / 2 - 0.01; const h = 6.4;   // zf＝扉の面。塔の正面は扉のすぐ後ろ
    batch.add(stone, box(tw + 0.2, base + 0.1, tw + 0.2, 1.6), M4(cx, (base + 0.1) / 2, tz));
    batch.add(plaster, box(tw, h - base, tw, 2.2), M4(cx, base + (h - base) / 2, tz));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) batch.add(timber, box(0.2, h - base, 0.2, 1), M4(cx + sx * tw / 2, base + (h - base) / 2, tz + sz * tw / 2));
    for (const y of [base + 0.1, base + 3.4, h - 0.08]) { batch.add(timber, box(tw + 0.08, 0.14, 0.1, 1), M4(cx, y, tz + tw / 2 + 0.02)); batch.add(timber, box(tw + 0.08, 0.14, 0.1, 1), M4(cx, y, tz - tw / 2 - 0.02)); batch.add(timber, box(0.1, 0.14, tw + 0.08, 1), M4(cx + tw / 2 + 0.02, y, tz)); batch.add(timber, box(0.1, 0.14, tw + 0.08, 1), M4(cx - tw / 2 - 0.02, y, tz)); }
    // 鐘楼（柱だけの空間）
    const by = h; const bh = 1.4;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) batch.add(timber, box(0.22, bh, 0.22, 1), M4(cx + sx * (tw / 2 - 0.1), by + bh / 2, tz + sz * (tw / 2 - 0.1)));
    batch.add(timber, box(tw + 0.3, 0.16, tw + 0.3, 1), M4(cx, by + bh, tz));
    out.props.push({ id: 'icon_bell', m: M4(cx, by + 0.25, tz, 0, 0, 0, 2.6) });
    // 尖塔（四角錐）
    const spire = new THREE.ConeGeometry((tw + 0.5) * 0.72, 2.8, 4, 1); spire.rotateY(Math.PI / 4);
    const uv = spire.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 6);
    batch.add(o.roofMat, spire, M4(cx, by + bh + 1.45, tz));
    batch.add(M.get('gold'), box(0.06, 0.7, 0.06, 1), M4(cx, by + bh + 3.15, tz)); batch.add(M.get('gold'), box(0.36, 0.06, 0.06, 1), M4(cx, by + bh + 3.25, tz));
    // バラ窓（ステンドグラス）
    const rose = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), new THREE.MeshStandardMaterial({ map: this.roseTexture(), emissive: 0xffffff, emissiveMap: this.roseTexture(), emissiveIntensity: 0.5, roughness: 0.3 }));
    rose.material.userData.window = true; rose.position.set(cx, base + 3.9, tz + tw / 2 + 0.03); out.group.add(rose);
    batch.add(timber, new THREE.TorusGeometry(0.5, 0.06, 6, 24), M4(cx, base + 3.9, tz + tw / 2 + 0.05));
  }

  bannerTexture() {
    if (this._banner) return this._banner;
    const c = document.createElement('canvas'); c.width = 128; c.height = 384; const g = c.getContext('2d');
    g.fillStyle = '#1f4f8a'; g.fillRect(0, 0, 128, 384); g.fillStyle = '#e8c15a'; g.fillRect(0, 0, 128, 14); g.fillRect(0, 370, 128, 14);
    g.fillStyle = '#0b1226'; g.fillRect(14, 60, 100, 120);
    const cs = [[22, 140, 110, 160, '#4cc38a'], [42, 120, 100, 150, '#e5484d'], [62, 100, 130, 110, '#4cc38a'], [82, 80, 95, 120, '#4cc38a']];
    cs.forEach(([x, y0, y1, yb, col]) => { g.fillStyle = col; g.fillRect(x, Math.min(y0, y1), 14, Math.abs(y1 - y0) + 10); });
    g.fillStyle = '#ffd24a'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('修', 64, 240); g.fillText('行', 64, 290); g.fillText('場', 64, 340);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; this._banner = t; return t;
  }
  roseTexture() {
    if (this._rose) return this._rose;
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const cols = ['#e5484d', '#3f6fc9', '#e8c15a', '#4cc38a', '#a060d8', '#3f6fc9'];
    for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 64, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2); g.closePath(); g.fillStyle = cols[i % cols.length]; g.fill(); g.strokeStyle = '#2a2a3a'; g.lineWidth = 4; g.stroke(); }
    g.beginPath(); g.arc(64, 64, 20, 0, Math.PI * 2); g.fillStyle = '#ffe08a'; g.fill(); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; this._rose = t; return t;
  }
}
