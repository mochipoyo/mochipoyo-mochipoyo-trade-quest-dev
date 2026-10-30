/* =========================================================
   BuildingBuilder3D：2D版の建物定義（towns.js の buildings：位置・大きさ・入口・種類・名前）から
   立体的な木組みの建物を組み立てる。足元のタイル（通行判定）とドアの位置は2D版と同じ
   ・石の土台／しっくい壁＋木の梁（ハーフティンバー）／2階のせり出し／板瓦を段に重ねた切妻屋根／破風板
   ・窓（枠・十字の桟・よろい戸・花箱・夜は灯る）／扉（庇・ランタン・石段）／煙突（煙）
   ・施設ごとの吊り看板（3Dアイコン）と名札、教会の鐘楼、修行場の幟
   ========================================================= */
import * as THREE from 'three';
import { box, Batch, M4, textTexture } from '../engine/Materials.js';

const ROOF = { weapon: '#8a3a3a', armor: '#3f5f9f', item: '#3f8a5a', inn: '#b8603a', church: '#55607a', tavern: '#7a5a2a', bank: '#5a5a6a', guild: '#7a3a6a', dojo: '#2f5f8a', house: '#a8483a', elder: '#7a5a32', warehouse: '#5a6a7a', castle: '#4a4a6a' };
const SHUTTER = { item: 'shutterGreen', inn: 'shutterRed', church: 'shutterBlue', dojo: 'shutterBlue', elder: 'shutterGreen', house: 'shutterRed' };
const ICON = { item: 'icon_potion', inn: 'icon_bed', weapon: 'icon_sword', church: 'icon_bell', dojo: 'icon_chart', elder: 'icon_scroll', armor: 'icon_sword', tavern: 'icon_potion' };

export class BuildingBuilder3D {
  constructor(mats, models) { this.mats = mats; this.models = models; }

  async build(b, rnd, opts) {
    const M = this.mats; const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] };
    out.group.name = 'building_' + (b.id || b.name);
    const batch = (opts && opts.batch) || new Batch();
    const type = b.type || 'house';
    const rng = rnd || Math.random;
    // ---- 寸法
    const xl = b.x + 0.18, xr = b.x + b.w - 0.18, zb = b.y + 0.2, zf = b.y + b.h - 0.62;
    const W = xr - xl, D = zf - zb, cx = (xl + xr) / 2, cz = (zb + zf) / 2;
    const two = (type === 'elder' || type === 'inn') && b.w >= 10;
    const base = 0.32;
    const h1 = type === 'church' ? 3.3 : two ? 2.3 : 3.0;
    const h2 = two ? 2.0 : 0; const jet = two ? 0.16 : 0;
    const top = base + h1 + h2;
    const doorX = b.doorAbs.x + 0.5;
    const plaster = M.get('plaster'), timber = M.get('timber'), stone = M.get('stonewall');

    // ---- 土台
    batch.add(stone, box(W + 0.16, base, D + 0.16, 1.6), M4(cx, base / 2, cz));
    // ---- 壁（1階・2階）
    batch.add(plaster, box(W, h1, D, 2.2), M4(cx, base + h1 / 2, cz));
    if (two) {
      batch.add(plaster, box(W + jet * 2, h2, D + jet * 2, 2.2), M4(cx, base + h1 + h2 / 2, cz));
      batch.add(timber, box(W + jet * 2 + 0.08, 0.16, D + jet * 2 + 0.08, 1.5), M4(cx, base + h1 + 0.02, cz));   // 2階床の梁
      for (let x = xl + 0.4; x < xr; x += 0.55) { batch.add(timber, box(0.12, 0.12, jet + 0.15, 1), M4(x, base + h1 - 0.06, zf + jet / 2)); batch.add(timber, box(0.12, 0.12, jet + 0.15, 1), M4(x, base + h1 - 0.06, zb - jet / 2)); }   // 根太の先
    }
    // ---- 木組み（柱・梁・筋かい）
    const frameFace = (y0, h, ex, ez) => {   // ex,ez：その階の外形
      const x0 = cx - ex / 2, x1 = cx + ex / 2, z0 = cz - ez / 2, z1 = cz + ez / 2;
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) batch.add(timber, box(0.2, h, 0.2, 1), M4(x, y0 + h / 2, z));
      for (const z of [z0, z1]) { batch.add(timber, box(ex + 0.06, 0.14, 0.08, 1.5), M4(cx, y0 + 0.07, z + (z === z1 ? 0.03 : -0.03))); batch.add(timber, box(ex + 0.06, 0.14, 0.08, 1.5), M4(cx, y0 + h - 0.07, z + (z === z1 ? 0.03 : -0.03))); }
      for (const x of [x0, x1]) { batch.add(timber, box(0.08, 0.14, ez + 0.06, 1.5), M4(x + (x === x1 ? 0.03 : -0.03), y0 + 0.07, cz)); batch.add(timber, box(0.08, 0.14, ez + 0.06, 1.5), M4(x + (x === x1 ? 0.03 : -0.03), y0 + h - 0.07, cz)); }
      return { x0, x1, z0, z1 };
    };
    const f1 = frameFace(base, h1, W, D); const f2 = two ? frameFace(base + h1, h2, W + jet * 2, D + jet * 2) : null;

    // ---- 窓と扉の配置（正面）
    const winsFront = []; const step = 2.1;
    for (let x = xl + 1.25; x < xr - 0.9; x += step) { if (Math.abs(x - doorX) < 1.35) continue; winsFront.push(x); }
    const studsAt = (x0, x1, avoid) => { const xs = []; for (let x = x0 + 1.05; x < x1 - 0.5; x += 1.05) if (!avoid.some((a) => Math.abs(a - x) < 0.62)) xs.push(x); return xs; };
    // 正面・背面の間柱
    for (const z of [f1.z0 - 0.03, f1.z1 + 0.03]) for (const x of studsAt(f1.x0, f1.x1, winsFront.concat(z > cz ? [doorX] : []))) batch.add(timber, box(0.12, h1 - 0.2, 0.06, 1), M4(x, base + h1 / 2, z));
    if (f2) for (const z of [f2.z0 - 0.03, f2.z1 + 0.03]) for (const x of studsAt(f2.x0, f2.x1, winsFront)) batch.add(timber, box(0.12, h2 - 0.2, 0.06, 1), M4(x, base + h1 + h2 / 2, z));
    // 筋かい（両端の壁面）
    const brace = (x, z, y0, h, dir, depthAxis) => {
      const len = Math.sqrt(1.0 + (h - 0.3) * (h - 0.3)); const ang = Math.atan2(h - 0.3, 1.0) * dir;
      const g = box(0.1, len, 0.06, 1);
      batch.add(timber, g, depthAxis ? M4(x, y0 + h / 2, z, Math.PI / 2, 0, ang) : M4(x, y0 + h / 2, z, 0, 0, ang));
    };
    const side1 = [f1.x0 + 0.6, f1.x1 - 0.6];
    if (!winsFront.some((x) => x < f1.x0 + 1.3)) brace(side1[0], f1.z1 + 0.035, base, h1, 1);
    if (!winsFront.some((x) => x > f1.x1 - 1.3)) brace(side1[1], f1.z1 + 0.035, base, h1, -1);
    if (f2) { if (!winsFront.some((x) => x < f2.x0 + 1.3)) brace(f2.x0 + 0.6, f2.z1 + 0.035, base + h1, h2, 1); if (!winsFront.some((x) => x > f2.x1 - 1.3)) brace(f2.x1 - 0.6, f2.z1 + 0.035, base + h1, h2, -1); brace(f2.x0 + 0.6, f2.z0 - 0.035, base + h1, h2, -1); brace(f2.x1 - 0.6, f2.z0 - 0.035, base + h1, h2, 1); }
    for (const x of [f1.x0 - 0.035, f1.x1 + 0.035]) for (const z of [cz - D / 4, cz + D / 4]) batch.add(timber, box(0.06, h1 - 0.2, 0.12, 1), M4(x, base + h1 / 2, z));

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
    winsFront.forEach((x, i) => { window_(x, wy1, f1.z1 + 0.02, 1, 0.82, 0.92, { flowers: i % 2 === 0 }); if (f2) window_(x, wy2, f2.z1 + 0.02, 1, 0.74, 0.8); });
    for (let x = xl + 1.6; x < xr - 1.0; x += 2.8) { window_(x, wy1, f1.z0 - 0.02, -1, 0.75, 0.85, { shutters: false }); if (f2) window_(x, wy2, f2.z0 - 0.02, -1, 0.7, 0.75, { shutters: false }); }
    if (D > 3) { window_(f1.x0 - 0.02, wy1, cz, 'L', 0.75, 0.85); window_(f1.x1 + 0.02, wy1, cz, 'R', 0.75, 0.85); }

    // ---- 扉（枠・石段・取っ手）。教会は鐘楼の正面
    const dz = type === 'church' ? (zf - 0.6 + 1.0) : f1.z1;
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
    const pitch = type === 'church' ? 0.88 : 0.72;   // 約50度／41度
    const ovZ = 0.3, ovX = 0.38;
    const ex = (two ? W + jet * 2 : W), ez = (two ? D + jet * 2 : D);
    const half = ez / 2 + ovZ; const rise = (ez / 2) * Math.tan(pitch); const slope = half / Math.cos(pitch);
    const roofMat = M.roof(ROOF[type] || '#a8483a'); roofMat.vertexColors = true;
    const rowLen = 0.27; const rows = Math.ceil(slope / (rowLen * 0.92));
    const roofColRng = () => 0.82 + rng() * 0.3;
    for (const s of [1, -1]) {
      for (let r = 0; r < rows; r++) {
        const t = (r + 0.5) / rows;   // 0=軒先 1=棟
        const dist = slope * (1 - t);
        const zz = cz + s * Math.cos(pitch) * dist, yy = top + rise - Math.sin(pitch) * dist + 0.05 + r * 0.006;
        const g = box(ex + ovX * 2 + (rng() - 0.5) * 0.05, 0.055, rowLen + 0.05, 1);
        // 板瓦のUV：横は 2 単位で1回、縦は1段＝テクスチャの1行
        const uv = g.attributes.uv, pos = g.attributes.position, nrm = g.attributes.normal;
        for (let i = 0; i < uv.count; i++) { if (nrm.getY(i) > 0.5) { uv.setXY(i, (pos.getX(i) + cx) / 2.0 + (r % 2) * 0.0, ((r % 8) + (pos.getZ(i) * s > 0 ? 0 : 1)) / 8); } }
        const c = roofColRng(); const cols = new Float32Array(pos.count * 3).fill(c); g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        batch.add(roofMat, g, M4(cx + (rng() - 0.5) * 0.03, yy, zz, 0, s * pitch + (rng() - 0.5) * 0.02, (rng() - 0.5) * 0.01));
      }
    }
    // 棟と破風板
    batch.add(M.get('ridge'), box(ex + ovX * 2 + 0.1, 0.16, 0.16, 1), M4(cx, top + rise + 0.1, cz, 0, Math.PI / 4, 0));
    for (const sx of [-1, 1]) {
      const gx = cx + sx * (ex / 2 + ovX - 0.02);
      for (const s of [1, -1]) { batch.add(timber, box(0.08, 0.22, slope + 0.1, 1), M4(gx, top + (rise - ovZ * Math.tan(pitch)) / 2 + 0.06, cz + s * half / 2, 0, s * pitch, 0)); }
      // 妻壁（三角形）：しっくい＋梁
      const tri = new THREE.BufferGeometry();
      const xw = cx + sx * (ex / 2); const v = [xw, top, cz - ez / 2, xw, top, cz + ez / 2, xw, top + rise, cz];
      tri.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, ez / 2.2, 0, ez / 4.4, rise / 2.2], 2));
      tri.setIndex(sx > 0 ? [0, 2, 1] : [0, 1, 2]); tri.computeVertexNormals();
      batch.add(plaster, tri);
      batch.add(timber, box(0.06, 0.12, ez, 1), M4(xw + sx * 0.03, top + 0.06, cz));
      batch.add(timber, box(0.06, rise - 0.1, 0.12, 1), M4(xw + sx * 0.03, top + rise / 2, cz));
      for (const s of [-1, 1]) batch.add(timber, box(0.06, 0.1, Math.sqrt((ez / 2) ** 2 + rise ** 2) * 0.55, 1), M4(xw + sx * 0.035, top + rise * 0.45, cz + s * ez * 0.16, 0, s * Math.atan2(rise, ez / 2), 0));
      if (rise > 1.2) window_(xw + sx * 0.02, top + rise * 0.38, cz, sx > 0 ? 'R' : 'L', 0.5, 0.55, { shutters: false });
    }
    // ドーマー（大きい建物の正面屋根）
    if (two || type === 'elder') {
      for (const x of winsFront.filter((_, i) => i % 2 === 1).slice(0, 2)) {
        const dzp = cz + ez / 2 * 0.45, dy = top + rise * 0.45;
        batch.add(plaster, box(1.1, 1.0, 1.1, 2), M4(x, dy + 0.3, dzp));
        window_(x, dy + 0.3, dzp + 0.56, 1, 0.55, 0.55, { shutters: false });
        for (const s of [1, -1]) batch.add(roofMat, box(0.7, 0.06, 1.35, 1), M4(x + s * 0.32, dy + 0.98, dzp, 0, 0, s * 0.7));
      }
    }
    // 煙突（宿屋・村長の家・民家・道具屋）
    if (['inn', 'elder', 'house', 'item', 'dojo'].includes(type)) {
      const chx = type === 'item' ? xr - 1.2 : xl + 1.4, chz = cz - ez * 0.22;
      const chTop = top + rise + 0.9; const yFoot = top + rise * 0.35;
      batch.add(stone, box(0.62, chTop - yFoot, 0.62, 1.2), M4(chx, (chTop + yFoot) / 2, chz));
      batch.add(stone, box(0.78, 0.14, 0.78, 1), M4(chx, chTop + 0.05, chz));
      out.smokes.push(new THREE.Vector3(chx, chTop + 0.2, chz));
    }

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

    if (!(opts && opts.batch)) batch.build(out.group);
    return out;
  }

  async churchTower(b, batch, out, o) {
    const M = this.mats; const { cx, zf, base, plaster, timber, stone } = o;
    const tw = 2.0, tz = zf - 0.6; const h = 6.4;
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
