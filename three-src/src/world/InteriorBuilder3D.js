/* =========================================================
   InteriorBuilder3D：屋内マップ（2D版の 12×9 などの部屋）を立体の部屋にする
   ・奥と左右の壁は高く、手前（入口側）の壁は低くして中が見えるようにする（ジオラマ式）
   ・床板・じゅうたん・腰板・柱と梁・窓（昼は外光、夜は暗い）・吊りランプ
   ・家具はタイルの種類から：本棚・ベッド・机・カウンター・樽・木箱・柱・クリスタル
   ・施設ごとの飾り：教会（長椅子・祭壇・ろうそく・色ガラス）、修行場（人工チャートの掲示板）、
     道具屋（薬瓶の棚）、宿屋・村長の家（暖炉）
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4, textTexture } from '../engine/Materials.js';
import { rngFrom } from './TerrainBuilder3D.js';

const KIND = { poyo_church: 'church', poyo_dojo: 'dojo', poyo_item_shop: 'shop', poyo_inn: 'inn', poyo_elder_house: 'elder', poyo_house: 'house',
  // v7.1 ポヨ村の新しい部屋・上の階（同じ作りの屋内）
  poyo_mill: 'mill', poyo_watch: 'watch', poyo_watch_2f: 'watch', poyo_watch_3f: 'watch', poyo_barn: 'barn', poyo_barn_2f: 'barn', poyo_hall: 'hall', poyo_hall_2f: 'hall',
  poyo_elder_house_2f: 'elder2', poyo_inn_2f: 'inn2', poyo_church_2f: 'church', poyo_church_3f: 'belfry' };
export const INTERIOR_KINDS = KIND;   // 専用に作り込んだ屋内（それ以外の屋内は WorldBuilder3D の汎用表示）

export function chartTexture(title) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576; const g = c.getContext('2d');
  g.fillStyle = '#2a1c10'; g.fillRect(0, 0, 1024, 576); g.fillStyle = '#0f1830'; g.fillRect(24, 24, 976, 528);
  g.strokeStyle = 'rgba(120,150,210,0.18)'; g.lineWidth = 1; for (let x = 60; x < 1000; x += 60) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 520); g.stroke(); } for (let y = 90; y < 520; y += 50) { g.beginPath(); g.moveTo(30, y); g.lineTo(994, y); g.stroke(); }
  const r = rngFrom(42); let p = 300; const cw = 18;
  const ema = []; let e = p;
  for (let i = 0; i < 46; i++) {
    const o = p; const wave = Math.sin(i / 7) * 9 + Math.sin(i / 2.3) * 4; const cl = o + wave * 0.9 + (r() - 0.5) * 26; const hi = Math.min(o, cl) - r() * 16, lo = Math.max(o, cl) + r() * 16;
    const x = 50 + i * 20.5; const up = cl < o; g.strokeStyle = up ? '#4cc38a' : '#e5484d'; g.fillStyle = g.strokeStyle; g.lineWidth = 2; g.beginPath(); g.moveTo(x, hi + 0); g.lineTo(x, lo); g.stroke();
    g.fillRect(x - cw / 2 + 2, Math.min(o, cl), cw - 4, Math.max(3, Math.abs(cl - o)));
    p = cl; e = e + (cl - e) * 0.18; ema.push([x, e]);
  }
  g.strokeStyle = '#ffd24a'; g.lineWidth = 3; g.beginPath(); ema.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
  g.fillStyle = '#e8c15a'; g.font = 'bold 34px "Hiragino Sans","Noto Sans JP",sans-serif'; g.fillText(title || '波形の読み方', 44, 62);
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '22px "Hiragino Sans","Noto Sans JP",sans-serif'; g.fillText('学習用の人工チャート（実在の相場ではありません）', 44, 548);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function stainedTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#1a1a2a'; g.fillRect(0, 0, 128, 256); const cols = ['#3a6ad8', '#d84a4a', '#e8c040', '#4ab86a', '#a050d0', '#40b8d8'];
  const r = rngFrom(5); for (let y = 8; y < 248; y += 30) for (let x = 8; x < 120; x += 28) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, 24, 26); }
  g.strokeStyle = '#1a1a2a'; g.lineWidth = 5; g.beginPath(); g.arc(64, 70, 50, Math.PI, 0); g.stroke();
  g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(64, 64, 16, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class InteriorBuilder3D {
  constructor(mats, models) { this.mats = mats; this.models = models; }

  async build(map) {
    const M = this.mats; const W = map.w, H = map.h; const kind = KIND[map.id] || 'house';
    const group = new THREE.Group(); group.name = 'interior_' + map.id;
    const b = new Batch(); const rnd = rngFrom(77 + W * 13);
    const props = []; const lights = []; const animated = [];
    const T = (x, y) => map.tile(x, y);
    const plaster = M.get('plaster'), timber = M.get('timber'), planks = M.get('planks'), stone = M.get('stonewall');
    const floorMat = (kind === 'church' || kind === 'belfry') ? M.tinted('stonewall', '#d8d2c8') : kind === 'barn' ? M.tinted('planks', '#b89060') : planks;
    const wallH = 3.3, lowH = 0.6;
    // ---- 床
    b.add(floorMat, box(W - 2, 0.12, H - 2, kind === 'church' ? 1.6 : 2.2), M4(W / 2, -0.06, (H - 1) / 2 + 0.5));
    // じゅうたん
    const carpetMat = kind === 'dojo' ? M.tinted('carpet', '#9ab070') : kind === 'church' ? M.tinted('carpet', '#c04040') : M.get('carpet');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (T(x, y) === 'carpet') b.add(carpetMat, box(1.0, 0.03, 1.0, kind === 'dojo' ? 1 : 3), M4(x + 0.5, 0.015, y + 0.5));
    // ---- 壁（奥・左右は高く、手前は低く）
    const doorT = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (T(x, y) === 'door') doorT.push({ x, y });
    // 外周の壁は薄く（奥 0.28・左右 0.28・手前は低い 0.22）。内側の壁タイルは1マスぶん
    const TH = 0.28;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (T(x, y) !== 'wall') continue;
      const parts = [];
      if (y === 0) parts.push([x, 1 - TH, x + 1, 1, wallH]);
      if (y === H - 1) parts.push([x, H - 1, x + 1, H - 1 + 0.22, lowH]);
      if (x === 0) parts.push([1 - TH, Math.max(y, 1 - TH), 1, Math.min(y + 1, H - 1 + 0.22), y === H - 1 ? lowH : wallH]);
      if (x === W - 1) parts.push([W - 1, Math.max(y, 1 - TH), W - 1 + TH, Math.min(y + 1, H - 1 + 0.22), y === H - 1 ? lowH : wallH]);
      if (!parts.length) parts.push([x, y, x + 1, y + 1, wallH]);
      for (const [x0, z0, x1, z1, h] of parts) {
        if (x1 - x0 < 0.01 || z1 - z0 < 0.01) continue;
        b.add(plaster, box(x1 - x0, h, z1 - z0, 2.2), M4((x0 + x1) / 2, h / 2, (z0 + z1) / 2));
        b.add(timber, box(x1 - x0 + 0.04, 0.1, z1 - z0 + 0.04, 1), M4((x0 + x1) / 2, h + 0.05, (z0 + z1) / 2));
      }
    }
    // 内側の腰板・横梁・柱
    const inner = [];   // 壁の内側の面 { x0,z0,x1,z1, nx,nz }
    inner.push({ x0: 1, z0: 1, x1: W - 1, z1: 1, nx: 0, nz: 1 });          // 奥
    inner.push({ x0: 1, z0: 1, x1: 1, z1: H - 1, nx: 1, nz: 0 });          // 左
    inner.push({ x0: W - 1, z0: 1, x1: W - 1, z1: H - 1, nx: -1, nz: 0 }); // 右
    for (const f of inner) {
      const len = Math.hypot(f.x1 - f.x0, f.z1 - f.z0); const mx = (f.x0 + f.x1) / 2 + f.nx * 0.03, mz = (f.z0 + f.z1) / 2 + f.nz * 0.03; const ry = f.nz ? 0 : Math.PI / 2;
      b.add(planks, box(len, 0.95, 0.06, 1.2), M4(mx, 0.48, mz, ry));
      b.add(timber, box(len, 0.1, 0.1, 1), M4(mx + f.nx * 0.02, 0.98, mz + f.nz * 0.02, ry));
      b.add(timber, box(len, 0.16, 0.12, 1), M4(mx + f.nx * 0.02, wallH - 0.4, mz + f.nz * 0.02, ry));
      for (let u = 0; u <= len + 0.01; u += len / Math.max(1, Math.round(len / 2.2))) { const px = f.x0 + (f.x1 - f.x0) * (u / len) + f.nx * 0.06, pz = f.z0 + (f.z1 - f.z0) * (u / len) + f.nz * 0.06; b.add(timber, box(0.18, wallH, 0.18, 1), M4(px, wallH / 2, pz)); }
    }
    // 窓（奥の壁：その前が床のところ）
    const glass = kind === 'church' ? new THREE.MeshStandardMaterial({ map: stainedTexture(), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0.0, roughness: 0.3 }) : M.get('glassCold');
    if (kind === 'church') { glass.emissiveMap = glass.map; glass.emissiveIntensity = 0.9; }
    const winXs = []; for (let x = 2; x < W - 2; x++) { if (T(x, 1) === 'floor_wood' || T(x, 1) === 'carpet') { if (!winXs.some((w) => Math.abs(w - x) < 3)) winXs.push(x); } }
    if (kind === 'dojo') winXs.length = 0;
    for (const x of winXs.slice(0, 3)) {
      const cx = x + 0.5, y = 2.0;
      b.add(glass, box(0.9, kind === 'church' ? 1.5 : 1.0, 0.04, 1), M4(cx, y, 1.02));
      b.add(timber, box(1.1, 0.12, 0.12, 1), M4(cx, y + (kind === 'church' ? 0.8 : 0.56), 1.06)); b.add(timber, box(1.1, 0.14, 0.18, 1), M4(cx, y - (kind === 'church' ? 0.8 : 0.56), 1.09));
      b.add(timber, box(0.06, kind === 'church' ? 1.5 : 1.0, 0.07, 1), M4(cx, y, 1.05)); b.add(timber, box(0.9, 0.06, 0.07, 1), M4(cx, y, 1.05));
      lights.push({ pos: new THREE.Vector3(cx, 1.6, 1.8), color: kind === 'church' ? 0xc8d8ff : 0xdce8ff, power: 0.35, dist: 4 });
    }
    // 入口：扉の枠と敷物、外の光
    for (const d of doorT) {
      for (const sx of [-1, 1]) b.add(timber, box(0.16, 1.2, 0.3, 1), M4(d.x + 0.5 + sx * 0.55, 0.6, d.y + 0.5));
      b.add(M.tinted('carpet', '#7a4a3a'), box(0.9, 0.03, 0.7, 1), M4(d.x + 0.5, 0.02, d.y - 0.3));
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.9), new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.35, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.set(d.x + 0.5, 0.035, d.y + 0.15); group.add(glow);
    }
    // ---- 家具（タイルから）
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = T(x, y); const cx = x + 0.5, cz = y + 0.5; const againstBack = y === 1;
      switch (t) {
        case 'bookshelf': break;   // v7.3 本が並ぶ本棚は Furniture73 で作る
        case 'bed': props.push({ id: 'furn_bed', m: M4(cx, 0, againstBack ? 1.0 + 0.56 : cz, 0, 0, 0, 0.8, 0.9, 0.6) }); break;
        case 'table':
          if (kind === 'church') this.pew(b, cx, cz);
          else if (kind === 'dojo') { props.push({ id: 'furn_table', m: M4(cx, 0, cz, Math.PI / 2, 0, 0, 0.62, 0.85, 0.62) }); props.push({ id: 'icon_chart', m: M4(cx, 0.88, cz, 0, -0.5, 0, 1.0) }); }
          else props.push({ id: 'furn_table', m: M4(cx, 0, cz, 0, 0, 0, 0.62, 0.92, 0.85) });
          if (kind === 'watch' && map.id === 'poyo_watch_3f' && T(x - 1, y) !== 'table') { b.add(M.get('iron'), new THREE.CylinderGeometry(0.07, 0.1, 0.9, 12), M4(cx + 0.5, 1.25, cz, 0, -0.5)); b.add(M.get('gold'), new THREE.CylinderGeometry(0.11, 0.11, 0.1, 12), M4(cx + 0.5, 1.47, cz - 0.38, 0, -0.5)); }   // v7.1 見張り台の望遠鏡
          break;
        case 'counter': props.push({ id: 'furn_counter', m: M4(cx, 0, cz, 0, 0, 0, 0.98, 1, 1) }); if (kind === 'shop' && rnd() < 0.6) props.push({ id: 'icon_potion', m: M4(cx + (rnd() - 0.5) * 0.4, 1.06, cz + (rnd() - 0.5) * 0.2, rnd() * 6, 0, 0, 0.7) }); break;
        case 'barrel': props.push({ id: 'barrel', m: M4(cx, 0, cz, rnd() * 6) }); break;
        case 'crate': if (kind === 'barn') { const hay = M.tinted('plaster', '#d8b860'); b.add(hay, box(0.9, 0.55, 0.62, 1), M4(cx, 0.28, cz, rnd() * 0.3)); if (rnd() < 0.6) b.add(hay, box(0.8, 0.5, 0.58, 1), M4(cx + 0.03, 0.8, cz, rnd() * 0.4)); break; } props.push({ id: 'crate', m: M4(cx, 0, cz, rnd() * 0.5) }); break;   // v7.1 納屋は干し草の束
        case 'pillar':
          if (kind === 'mill') { if (T(x - 1, y) !== 'pillar') { const mx = cx + (T(x + 1, y) === 'pillar' ? 0.5 : 0); b.add(stone, new THREE.CylinderGeometry(0.85, 0.9, 0.35, 20), M4(mx, 0.18, cz)); b.add(M.tinted('stonewall', '#a8a29a'), new THREE.CylinderGeometry(0.8, 0.8, 0.28, 20), M4(mx, 0.5, cz)); b.add(timber, box(0.12, 2.6, 0.12, 1), M4(mx, 1.6, cz)); b.add(timber, box(1.6, 0.1, 0.1, 1), M4(mx, 0.72, cz, 0.6)); } break; }   // v7.1 水車小屋の石臼と軸
          props.push({ id: 'furn_pillar', m: M4(cx, 0, cz) }); break;
        case 'slot_machine': {   // v6.1 カジノのスロット台
          b.add(M.tinted('planks', '#7a1a3a'), box(0.82, 1.45, 0.62, 1), M4(cx, 0.725, cz)); b.add(M.get('gold'), box(0.86, 0.12, 0.66, 1), M4(cx, 1.5, cz));
          b.add(M.get('glass'), box(0.62, 0.36, 0.04, 1), M4(cx, 1.05, cz + 0.32)); b.add(M.get('iron'), box(0.05, 0.45, 0.05, 1), M4(cx + 0.46, 0.95, cz));
          lights.push({ pos: new THREE.Vector3(cx, 1.6, cz + 0.6), color: 0xffb04a, power: 0.35, dist: 2.5 }); break;
        }
        case 'stairs_up': case 'stairs_down': this.stairs(b, group, map, x, y, t === 'stairs_up'); break;   // v7.1 階段（上り＝壁へ上がる段・下り＝床の口へ下りる段）
        case 'crystal': {
          if (kind === 'belfry') { if (T(x - 1, y) !== 'crystal') this.bell(b, group, cx + (T(x + 1, y) === 'crystal' ? 0.5 : 0), cz, animated); break; }   // v7.1 鐘楼の鐘
          b.add(stone, box(0.9, 0.5, 0.8, 1), M4(cx, 0.25, cz)); props.push({ id: 'furn_crystal', m: M4(cx, 0.5, cz, rnd() * 3, 0, 0, 0.8) });
          lights.push({ pos: new THREE.Vector3(cx, 1.5, cz + 0.4), color: 0x7fc8ff, power: 0.8, dist: 5 }); break;
        }
        default: break;
      }
    }
    // ---- 施設ごとの飾り
    if (kind === 'church') {
      // 祭壇のろうそく
      const cr = []; for (let x = 0; x < W; x++) if (T(x, 1) === 'crystal') cr.push(x);
      if (cr.length) { const ax0 = Math.min(...cr), ax1 = Math.max(...cr) + 1; for (const x of [ax0 - 0.35, ax1 + 0.35]) this.candle(b, group, x, 1.5, 0.0, animated); b.add(M.tinted('carpet', '#e8d8a0'), box(ax1 - ax0 + 0.6, 0.04, 0.9, 1), M4((ax0 + ax1) / 2, 0.52, 1.6)); }
    }
    if (kind === 'dojo') {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshStandardMaterial({ map: chartTexture('師匠の講義：波形と上位足'), roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.12 }));
      board.material.emissiveMap = board.material.map; board.position.set(W / 2, 2.05, 1.04); group.add(board);
      b.add(timber, box(3.6, 2.1, 0.06, 1), M4(W / 2, 2.05, 1.01));
      // 幟（左右の壁）
      for (const sx of [1.06, W - 1.06]) { const ban = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.6), new THREE.MeshStandardMaterial({ color: 0x2f5f8a, side: THREE.DoubleSide, roughness: 1 })); ban.position.set(sx, 2.0, 3.0); ban.rotation.y = Math.PI / 2; group.add(ban); }
    }
    if (kind === 'inn' || kind === 'elder') {
      // 暖炉（右の壁）
      const fx = W - 1.35, fz = kind === 'inn' ? 5.6 : 4.5;
      b.add(stone, box(0.7, 1.3, 1.5, 1), M4(fx, 0.65, fz)); b.add(stone, box(0.8, 0.2, 1.7, 1), M4(fx - 0.05, 1.36, fz)); b.add(stone, box(0.5, 1.9, 0.9, 1), M4(fx + 0.1, 2.4, fz));
      b.add(M.tinted('soil', '#120a06'), box(0.08, 0.7, 0.9, 1), M4(fx - 0.33, 0.5, fz));
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x401000, emissive: 0xff7a20, emissiveIntensity: 3 })); fire.position.set(fx - 0.25, 0.35, fz); group.add(fire); animated.push({ kind: 'flame', obj: fire });
      lights.push({ pos: new THREE.Vector3(fx - 0.7, 0.9, fz), color: 0xff8a3a, power: 1.3, dist: 6, flicker: true });
    }
    if (kind === 'elder') {
      const mapTex = textTexture('アルカディア相場大陸', { w: 512, h: 128, panel: '#e8d8b0', bg: '#6a4a2a' });
      const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.5), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 })); wm.position.set(W / 2 + 2.5, 2.4, 1.04); group.add(wm);
    }
    if (kind === 'shop') {
      for (let x = 0; x < W; x++) if (T(x, 1) === 'bookshelf') for (let k = 0; k < 3; k++) props.push({ id: 'icon_potion', m: M4(x + 0.25 + k * 0.25, 1.0 + (k % 2) * 0.55, 1.3, 0, 0, 0, 0.55) });
    }
    // v7.1 壁の飾り（床をふさがない壁掛けの物だけ）：奥の壁の棚と瓶・左右の壁の額・梁から下がる干した薬草・壁ぎわの花瓶の棚
    {
      const jarC = ['#3a7a5a', '#8a3a3a', '#3a5a8a', '#c8a050', '#6a4a8a'].map((c) => M.tinted('glass', c));
      const shelfXs = []; for (let x = 2; x < W - 2; x++) { if ((T(x, 1) === 'floor_wood' || T(x, 1) === 'carpet' || T(x, 1) === 'floor_stone') && !winXs.slice(0, 3).some((w) => Math.abs(w - x) < 2) && !shelfXs.some((w) => Math.abs(w - x) < 3)) shelfXs.push(x); }
      for (const x of shelfXs.slice(0, 2)) { const cx = x + 0.5; b.add(timber, box(1.2, 0.06, 0.24, 1), M4(cx, 1.55, 1.14)); b.add(timber, box(1.2, 0.06, 0.24, 1), M4(cx, 2.05, 1.14)); for (let i = 0; i < 4; i++) { const jm = jarC[(i + x) % jarC.length]; b.add(jm, new THREE.CylinderGeometry(0.07, 0.08, 0.2 + (i % 2) * 0.08, 8), M4(cx - 0.42 + i * 0.28, 1.68 + (i % 2) * 0.04, 1.15)); } for (let i = 0; i < 3; i++) b.add(M.tinted('planks', ['#8a2a2a', '#2a4a7a', '#3a6a3a'][i]), box(0.12, 0.28, 0.18, 1), M4(cx - 0.3 + i * 0.16, 2.22, 1.15)); }
      // 額（左右の壁）
      const frameMat = M.tinted('planks', '#6a4a2a'); const pics = [M.tinted('plaster', '#7ab0d8'), M.tinted('plaster', '#d8b070'), M.tinted('plaster', '#8ac08a')];
      for (const [wx, ry] of [[1.04, Math.PI / 2], [W - 1.04, -Math.PI / 2]]) { const pz = Math.round(H * 0.4) + 0.5; if (kind === 'church' || kind === 'belfry') continue; b.add(frameMat, box(0.9, 0.7, 0.05, 1), M4(wx, 2.0, pz, ry)); b.add(pics[(W + Math.round(wx)) % 3], box(0.76, 0.56, 0.02, 1), M4(wx + (ry > 0 ? 0.03 : -0.03), 2.0, pz, ry)); }
      // 梁から下がる干した薬草（民家・宿・水車小屋・納屋）
      if (/^(house|inn|inn2|mill|barn|elder|elder2)$/.test(kind)) for (let i = 0; i < 5; i++) { const hx = 2 + i * ((W - 4) / 4), hz = 1.5 + (i % 2) * 0.3; b.add(M.tinted('plaster', '#3a2a1a'), box(0.02, 0.4, 0.02, 1), M4(hx, wallH - 0.62, hz)); b.add(M.tinted('carpet', ['#6a8a3a', '#8a7a3a', '#5a7a4a'][i % 3]), new THREE.ConeGeometry(0.1, 0.36, 6), M4(hx, wallH - 0.95, hz, 0, Math.PI)); }
    }
    // 吊りランプ（部屋の中央付近に2つ）
    for (const lx of [W * 0.33, W * 0.67]) {
      const lz = H * 0.48;
      b.add(M.get('iron'), box(0.03, 0.9, 0.03, 1), M4(lx, wallH - 0.2, lz));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({ color: 0x402a10, emissive: 0xffb04a, emissiveIntensity: 2.2 })); lamp.position.set(lx, wallH - 0.75, lz); group.add(lamp);
      lights.push({ pos: new THREE.Vector3(lx, wallH - 0.9, lz), color: 0xffc070, power: 1.0, dist: 8 });
    }
    // 机の上のろうそく（宿屋・村長・民家）
    if (kind !== 'church' && kind !== 'dojo') for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (T(x, y) === 'table' && rnd() < 0.7) this.candle(b, group, x + 0.5 + 0.2, y + 0.5, 0.92, animated, 0.6);
    b.build(group);
    // 小物をまとめてインスタンス化
    const byId = {}; props.forEach((p) => { (byId[p.id] = byId[p.id] || []).push(p.m); });
    await Promise.all(Object.keys(byId).map((id) => this.models.instanced(id, byId[id]).then((g) => group.add(g))));
    // 部屋の外は暗い床
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x0a0806 })); outside.rotation.x = -Math.PI / 2; outside.position.set(W / 2, -0.15, H / 2); group.add(outside);
    return { group, lights, animated, bounds: { x0: 1, z0: 1, x1: W - 1, z1: H - 1 } };
  }

  // v7.1 階段：いちばん近い壁の方へ上がる（上り）／床の口から下りる（下り）
  stairs(b, group, map, x, y, up) {
    const M = this.mats; const W = map.w, H = map.h; const wood = M.get('planks'), timber = M.get('timber');
    const d = y <= 1 ? [0, -1] : x <= 1 ? [-1, 0] : x >= W - 2 ? [1, 0] : [0, 1];   // 上がっていく向き（壁の方）
    const cx = x + 0.5, cz = y + 0.5; const along = d[0] !== 0;
    if (up) {
      for (let i = 0; i < 5; i++) { const t = -0.4 + i * 0.2; const h = 0.18 * (i + 1); b.add(wood, box(along ? 0.2 : 0.9, h, along ? 0.9 : 0.2, 1), M4(cx + d[0] * t, h / 2, cz + d[1] * t)); }
      for (const s of [-0.48, 0.48]) b.add(timber, box(along ? 1.0 : 0.06, 0.06, along ? 0.06 : 1.0, 1), M4(cx + (along ? 0 : s), 0.95, cz + (along ? s : 0), 0, along ? 0 : 0.7 * -d[1], along ? 0.7 * d[0] : 0));
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.3), new THREE.MeshBasicMaterial({ color: 0x0c0806 })); hole.position.set(cx + d[0] * 0.5, 1.55, cz + d[1] * 0.5); hole.rotation.y = d[0] ? -d[0] * Math.PI / 2 : (d[1] < 0 ? 0 : Math.PI); group.add(hole);
    } else {
      const pit = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x060404 })); pit.rotation.x = -Math.PI / 2; pit.position.set(cx, 0.012, cz); group.add(pit);
      for (let i = 0; i < 3; i++) { const t = 0.3 - i * 0.25; b.add(wood, box(along ? 0.24 : 0.82, 0.04, along ? 0.82 : 0.24, 1), M4(cx + d[0] * t, 0.02 - i * 0.002, cz + d[1] * t)); }
      for (const s of [-0.48, 0.48]) b.add(timber, box(along ? 0.96 : 0.08, 0.1, along ? 0.08 : 0.96, 1), M4(cx + (along ? 0 : s), 0.05, cz + (along ? s : 0)));
    }
  }
  // v7.1 鐘楼の鐘（ゆっくり揺れる）
  bell(b, group, x, z, animated) {
    const M = this.mats; const timber = M.get('timber');
    b.add(timber, box(2.2, 0.18, 0.18, 1), M4(x, 2.6, z)); for (const s of [-1.0, 1.0]) b.add(timber, box(0.18, 2.6, 0.18, 1), M4(x + s, 1.3, z));
    const g = new THREE.Group(); g.position.set(x, 2.5, z); g.name = 'bell';
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.12 + Math.pow(t, 1.6) * 0.55, -t * 0.95)); }
    const bell = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide })); g.add(bell);
    const clap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x6a5a3a, metalness: 0.6 })); clap.position.y = -0.8; g.add(clap);
    group.add(g); animated.push({ kind: 'swing', obj: g });
  }
  pew(b, cx, cz) {
    const M = this.mats; const wood = M.tinted('planks', '#9a6a44');
    b.add(wood, box(0.92, 0.08, 0.42, 1), M4(cx, 0.45, cz + 0.05));
    b.add(wood, box(0.92, 0.5, 0.07, 1), M4(cx, 0.72, cz + 0.27, 0, -0.12, 0));
    for (const sx of [-0.42, 0.42]) b.add(wood, box(0.07, 0.48, 0.5, 1), M4(cx + sx, 0.24, cz + 0.08));
  }
  candle(b, group, x, z, y0, animated, s) {
    s = s || 1; const M = this.mats;
    b.add(M.get('gold'), new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.06 * s, 10), M4(x, y0 + 0.03 * s, z));
    b.add(M.get('gold'), new THREE.CylinderGeometry(0.02 * s, 0.02 * s, (y0 > 0.5 ? 0.15 : 1.0) * s, 6), M4(x, y0 + (y0 > 0.5 ? 0.1 : 0.5) * s, z));
    const top = y0 + (y0 > 0.5 ? 0.18 : 1.0) * s;
    b.add(M.tinted('plaster', '#f4ead8'), new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.14 * s, 8), M4(x, top + 0.07 * s, z));
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 8, 6), new THREE.MeshStandardMaterial({ color: 0x402000, emissive: 0xffc060, emissiveIntensity: 4 })); fl.scale.y = 1.8; fl.position.set(x, top + 0.19 * s, z); group.add(fl); animated.push({ kind: 'flame', obj: fl });
  }
}
