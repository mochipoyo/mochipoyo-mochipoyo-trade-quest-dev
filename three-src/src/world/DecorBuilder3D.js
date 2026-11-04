/* =========================================================
   DecorBuilder3D（v7.0）：場所ごとの「個性」の飾り（汎用3Dのマップだけ。ポヨ村などの専用3Dには足さない）
   ・テーマは 2D 版のデータ js/data/placedecor70.js（PLACE_DECOR.forMap）。近未来・機械・魔導・王都・港・鉱山・洞窟・書庫・時計…
   ・壁の飾り：床に面した壁（カメラから見える南向きの面）に、テーマの物（画面・配管・旗・歯車・水晶・本棚など）を数マスおきに
   ・遠景：町の外（北・東・西。カメラの手前の南には置かない）に、テーマの高い建物（高層ビル・煙突・水晶の塔・城の塔・灯台など）
   ・床の小物：壁ぎわ（屋内・ダンジョン）／広い所（フィールド）に、足もとの小さな飾り・光る模様（踏んでも通れる。草や花と同じ扱い）
   ・当たり判定は 2D 版のタイルのまま（飾りで通れなくなる場所・通れるようになる場所はない）
   ・形は箱・円柱・円錐・八面体などの組み合わせ（仮3D）。マテリアルごとにまとめて1つの形にする（Batch）
   ========================================================= */
import * as THREE from 'three';
import { Batch, box, M4 } from '../engine/Materials.js';
import { addCutout } from '../engine/Cutout.js';

const WALLS = { wall: 1, castle_wall: 1, wall_wood: 1, cave_wall: 1, window: 1 };
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const MAT = new Map();
// 光る部分：昼でも見える明るさにする（LightingManager の夜の強弱の対象から外す：userData.keepGlow）
function mat(hex, o) {
  o = o || {}; const key = hex + '|' + [o.rough, o.metal, o.glow, o.glowHex, o.opacity, o.map ? o.map.uuid : ''].join(','); if (MAT.has(key)) return MAT.get(key);
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: o.rough !== undefined ? o.rough : 0.7, metalness: o.metal || 0 });
  if (o.glow) { m.emissive = new THREE.Color(o.glowHex || hex); m.emissiveIntensity = o.glow; m.userData.keepGlow = true; }
  if (o.map) { m.map = o.map; if (o.glow) m.emissiveMap = o.map; }
  if (o.opacity) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
  m.name = 'decor70_' + key; addCutout(m); MAT.set(key, m); return m;
}
const TEX = {};
function canvasTex(key, w, h, draw) { if (TEX[key]) return TEX[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (g) draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; TEX[key] = t; return t; }
// 相場の画面（ローソク足と線）
const chartTex = (seed) => canvasTex('chart' + seed, 128, 72, (g, w, h) => {
  g.fillStyle = '#04121c'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,224,255,0.25)'; g.lineWidth = 1; for (let y = 12; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  let p = 36 + seed * 3; for (let i = 0; i < 14; i++) { const o = p, c = Math.max(10, Math.min(h - 10, p + (hash(i, seed, 7) - 0.48) * 18)); const up = c < o; g.fillStyle = up ? '#3ae08a' : '#ff4a6a'; g.fillRect(6 + i * 8.5, Math.min(o, c), 5, Math.max(2, Math.abs(c - o))); g.fillRect(8 + i * 8.5, Math.min(o, c) - 4, 1, Math.abs(c - o) + 8); p = c; }
  g.strokeStyle = '#ffd24a'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 14; i++) { const y = 40 + Math.sin(i * 0.6 + seed) * 12; if (i) g.lineTo(8 + i * 8.5, y); else g.moveTo(8, y); } g.stroke();
});
const runeTex = () => canvasTex('rune', 96, 96, (g) => { g.strokeStyle = '#e8d0ff'; g.lineWidth = 4; g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(48, 48, 28, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(48 + Math.cos(a) * 28, 48 + Math.sin(a) * 28); g.lineTo(48 + Math.cos(a + 2.094) * 28, 48 + Math.sin(a + 2.094) * 28); g.stroke(); } });
const paperTex = () => canvasTex('paper', 64, 80, (g, w, h) => { g.fillStyle = '#efe4c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a2a2a'; g.fillRect(6, 6, w - 12, 8); g.fillStyle = '#5a4a3a'; for (let y = 22; y < h - 6; y += 7) g.fillRect(6, y, (w - 12) * (0.5 + hash(y, 3) * 0.5), 2); });
const clockTex = () => canvasTex('clock', 96, 96, (g) => { g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(48, 48, 44, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(48 + Math.cos(a) * 36, 48 + Math.sin(a) * 36); g.lineTo(48 + Math.cos(a) * 42, 48 + Math.sin(a) * 42); g.stroke(); } g.lineWidth = 4; g.beginPath(); g.moveTo(48, 48); g.lineTo(48, 18); g.moveTo(48, 48); g.lineTo(70, 56); g.stroke(); });
const boardTex = () => canvasTex('board', 128, 80, (g, w, h) => { g.fillStyle = '#1e4a34'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(240,240,220,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, 60); for (let i = 0; i < 10; i++) g.lineTo(14 + i * 11, 58 - i * 3 - Math.sin(i) * 8); g.stroke(); g.fillStyle = 'rgba(240,240,220,0.85)'; g.font = '14px sans-serif'; g.fillText('RCI EMA', 10, 18); });
const tickerTex = () => canvasTex('ticker', 256, 32, (g, w, h) => { g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h); g.font = 'bold 20px monospace'; const items = [['USD/JPY ▲', '#3ae08a'], ['EUR ▼', '#ff4a6a'], ['GOLD ▲', '#ffd24a'], ['IDX ▲', '#3ae08a']]; let x = 6; items.forEach(([t, c]) => { g.fillStyle = c; g.fillText(t, x, 23); x += g.measureText(t).width + 16; }); });

export class DecorBuilder3D {
  constructor() { this.stats = { wall: 0, floor: 0, sky: 0, field: 0 }; }
  // map：GameMap、T：タイル（外側も）、heightAt、group：足す先、OUT：外側の幅
  build(map, o) {
    const PD = window.PLACE_DECOR; const key = o && o.key !== undefined ? o.key : PD && PD.forMap ? PD.forMap(map.id) : null; this.key = key; if (!key) return { key: null, smokes: [], lamps: [] };   // v7.6 o.key：環境レシピが飾りのテーマを差し替える（null で飾りなし）
    const th = PD.THEMES[key] || {}; const A = th.accent || '#ffffff', A2 = th.accent2 || '#ffffff';
    const b = new Batch(); const add = (m, g, mx) => b.add(m, g, mx); this.b = b; this.add = add; this.A = A; this.A2 = A2; this.key = key;
    const out = { key, smokes: [], lamps: [] }; this.out = out; const W = map.w, H = map.h; const T = o.T; const hAt = o.heightAt || (() => 0);
    const kind = map.kind; const dungeon = kind === 'dungeon' || kind === 'interior'; const field = kind === 'field';
    const walk = (x, z) => x >= 0 && z >= 0 && x < W && z < H && !window.Tiles.isSolid(map.tile(x, z));
    const busy = (x, z) => !!(map.warpAt(x, z) || map.eventAt(x, z) || map.chestAt(x, z) || map.npcAt(x, z));
    // ---- 壁の飾り（町・屋内・ダンジョン）
    if (!field) {
      let n = 0; const every = kind === 'interior' ? 3 : 4; const lim = kind === 'interior' ? 14 : 48;
      for (let z = 0; z < H - 1 && n < lim; z++) for (let x = 0; x < W && n < lim; x++) {
        const t = map.tile(x, z); if (!WALLS[t] || map.warpAt(x, z)) continue;
        // 南が床（カメラから見える面）。屋内で壁ぎわに棚・机などが並ぶときは、その上の高い所にだけ飾る（high）
        const high = kind === 'interior' && !walk(x, z + 1) && !WALLS[map.tile(x, z + 1)] && walk(x, z + 2) && !busy(x, z + 2);
        if (!high && (!walk(x, z + 1) || busy(x, z + 1))) continue;
        if (hash(x * 3, (z + 1) * 7) <= 0.14) continue;                          // 壁のたいまつ（WorldBuilder3D）と同じ所は避ける
        if ((x + z * 3) % every !== 0 && hash(x, z, 11) > 0.12) continue;
        const wh = t === 'castle_wall' ? (dungeon ? 2.2 : 2.6) : t === 'cave_wall' || t === 'wall_wood' ? 2.0 : 2.2;
        if (this.wallItem(x + 0.5, hAt(x + 0.5, z + 1.2), z + 1.0, wh, hash(x, z, 5), dungeon, high) !== false) n++;
      }
      this.stats.wall = n;
      // 床の小物：壁ぎわ（北が壁）の床。屋外の町は道でない所
      let f = 0; const flim = kind === 'town' ? 30 : 20;
      for (let z = 1; z < H - 1 && f < flim; z++) for (let x = 1; x < W - 1 && f < flim; x++) {
        if (!walk(x, z) || busy(x, z)) continue; const t = map.tile(x, z); if (/road|path|bridge|dock|stairs|door|carpet/.test(t)) continue;
        if (!WALLS[map.tile(x, z - 1)] && !(kind === 'town' && !walk(x, z - 1))) continue;
        if (hash(x, z, 23) > (kind === 'town' ? 0.07 : 0.1)) continue;
        this.floorItem(x + 0.5 + (hash(x, z, 2) - 0.5) * 0.3, hAt(x + 0.5, z + 0.5), z + 0.35, hash(x, z, 9)); f++;
      }
      this.stats.floor = f;
    }
    // ---- 遠景（町だけ。外側の北・東・西）
    if (kind === 'town') {
      const OUT = o.OUT || 12; let s = 0;
      const spots = [];
      for (let i = 0; i < 9; i++) spots.push([W * (i + 0.5) / 9 + (hash(i, 1) - 0.5) * 3, -4 - hash(i, 2) * (OUT - 7)]);
      for (let i = 0; i < 3; i++) { spots.push([-4 - hash(i, 3) * (OUT - 7), H * (0.1 + i * 0.22)]); spots.push([W + 4 + hash(i, 4) * (OUT - 7), H * (0.1 + i * 0.22)]); }
      spots.forEach(([x, z], i) => { this.skyItem(x, hAt(x, z), z, hash(i, 13), i); s++; });
      this.stats.sky = s;
    }
    // ---- フィールド：足もとの小さな飾り・光る模様
    if (field) {
      let n = 0; const LIM = 90;
      for (let z = 2; z < H - 2 && n < LIM; z += 2) for (let x = 2; x < W - 2 && n < LIM; x += 2) {
        if (hash(x, z, 31) > 0.022) continue; const t = map.tile(x, z); if (!walk(x, z) || busy(x, z) || /road|path|bridge|dock|stone/.test(t)) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dz]) => map.warpAt(x + dx, z + dz))) continue;
        const px = x + 0.5 + (hash(x, z, 4) - 0.5) * 0.6, pz = z + 0.5 + (hash(x, z, 6) - 0.5) * 0.6;
        this.fieldItem(px, hAt(px, pz), pz, hash(x, z, 8)); n++;
      }
      this.stats.field = n;
    }
    // v7.1 雲の上の町（空の区画など）：雲のマスの上に、ふわふわの雲のかたまり（浮島のまわり・遠く）
    if (kind === 'town') {
      let nCloud = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (map.tile(x, z) === 'cloud') nCloud++;
      if (nCloud > 40) {
        const puff = mat('#ffffff', { rough: 1, opacity: 0.92 }), puff2 = mat('#e8f0fa', { rough: 1, opacity: 0.85 }); let n = 0;
        for (let z = -10; z < H + 10; z += 3) for (let x = -10; x < W + 10; x += 3) {
          const inside = x >= 0 && z >= 0 && x < W && z < H; if (inside && map.tile(x, z) !== 'cloud') continue; if (hash(x, z, 71) > 0.42) continue;
          const nearIsland = inside && [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dz]) => { const t = map.tile(Math.max(0, Math.min(W - 1, x + dx)), Math.max(0, Math.min(H - 1, z + dz))); return t !== 'cloud'; });
          if (nearIsland) continue; const y = -0.85 + hash(x, z, 5) * 0.25; const k = 0.8 + hash(x, z, 9) * 1.4;   // 雲の海の面（-0.95）の上に浮かべる
          for (let i = 0; i < 4; i++) add(i % 2 ? puff2 : puff, new THREE.SphereGeometry(0.9 * k, 10, 8), M4(x + 0.5 + (hash(i, x, z) - 0.5) * 2.2 * k, y + hash(z, i) * 0.5 * k, z + 0.5 + (hash(x, i, 3) - 0.5) * 2.2 * k, 0, 0, 0, 1.3, 0.55, 1.1)); n++;
        }
        this.stats.clouds = n;
      }
    }
    // v7.1 がっつり飾る（壁ぎわの小物・床の散らばり・洞窟の支え木・森の光の筋・町の家の前の小物）
    try { this.dense(map, walk, busy, hAt); } catch (e) { console.warn('decor71 dense', e); }
    const g = new THREE.Group(); g.name = 'decor70_' + key; b.build(g, { castShadow: false }); o.group.add(g); this.group = g;
    return out;
  }

  /* ---------- v7.1 がっつり飾る（見た目だけ。当たり判定は 2D 版のタイルのまま）
     ・ダンジョン・屋内：床に面した壁の根もと（北・東・西・南の壁ぎわ）に、テーマの小物（石筍・きのこ・水晶・本の山・配管・樽・壺・燭台など）を3〜4マスに1つ
       ＋ 広い床に小さな散らばり（小石・苔・水たまり・紙・格子・溶岩のひび・光の粒）
       ＋ 洞窟・鉱山：幅2〜3マスの通路に、7マスおきに支え木（両側の壁の上の柱と梁）
       ＋ 森：木漏れ日の光の筋・ホタル
     ・町：家（建物）の前の、入口でないマスに樽・木箱・花の鉢・ベンチ・鉢植えなど／草地に花
     ・フィールド：足もとの飾りを v7.0 の約3倍
     ・出入口・宝箱・人・出来事のマスとそのとなりには置かない（目印や宝箱が隠れないように） */
  dense(map, walk, busy, hAt) {
    const A = this.A, A2 = this.A2, k = this.key; const W = map.w, H = map.h; const kind = map.kind;
    // 大きさ：小物は置き場所（x, y, z）を中心に sc 倍にする（がっつり見えるように）
    let pre = null; const add = (m, g, mx) => this.add(m, g, pre ? pre.clone().multiply(mx) : mx);
    const at = (x, y, z, sc) => { pre = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeScale(sc, sc, sc)).multiply(new THREE.Matrix4().makeTranslation(-x, -y, -z)); };
    const T = (x, z) => map.tile(x, z);
    const isWall = (x, z) => x < 0 || z < 0 || x >= W || z >= H || WALLS[T(x, z)] || /forest|tree|cliff|mountain|bookshelf/.test(T(x, z));
    const near = (x, z, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (busy(x + dx, z + dz) || map.warpAt(x + dx, z + dz)) return true; return false; };
    const FAM = /^(cave|mine|forge)$/.test(k) ? 'rock' : /^(forest|pastoral)$/.test(k) ? 'forest' : /^(library|bureau|academy)$/.test(k) ? 'book' : /^(machine|tech)$/.test(k) ? 'mech' : 'misc';
    const st = this.stats; st.base = 0; st.scatter = 0; st.arch = 0; st.shaft = 0; st.town = 0;
    // 小物の部品
    const rockM = mat('#6e665c', { rough: 0.95 }), rockD = mat('#4a443c', { rough: 1 }), woodM = mat('#6a4a2c', { rough: 0.9 }), woodD = mat('#4a3420', { rough: 0.95 });
    const leaf = mat('#3f7a34', { rough: 0.9 }), leaf2 = mat('#5a9a44', { rough: 0.9 }), cap = mat('#c8483a', { rough: 0.6 }), stem = mat('#efe6d0', { rough: 0.8 });
    const glowA = mat(A, { glow: 2.0, rough: 0.3 }), glowA2 = mat(A2, { glow: 1.8, rough: 0.3 });
    const P = {
      stalagmite: (x, y, z, r) => { for (let i = 0; i < 3; i++) { const h = 0.35 + hash(i, r * 99) * 0.6; add(i ? rockM : rockD, new THREE.ConeGeometry(0.09 + h * 0.12, h, 6), M4(x + (i - 1) * 0.16, y + h / 2, z + (hash(r * 50, i) - 0.5) * 0.18)); } },
      rubble: (x, y, z, r) => { for (let i = 0; i < 4; i++) add(i % 2 ? rockM : rockD, new THREE.DodecahedronGeometry(0.06 + hash(i, r * 77) * 0.08), M4(x + (hash(i, 3, r * 9) - 0.5) * 0.5, y + 0.05, z + (hash(i, 5, r * 9) - 0.5) * 0.3, i)); },
      glowshroom: (x, y, z, r) => { for (let i = 0; i < 3; i++) { const h = 0.12 + hash(i, r * 31) * 0.16; add(stem, new THREE.CylinderGeometry(0.02, 0.025, h, 5), M4(x + (i - 1) * 0.12, y + h / 2, z + (hash(i, r) - 0.5) * 0.15)); add(i === 1 ? glowA2 : glowA, new THREE.SphereGeometry(0.07, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), M4(x + (i - 1) * 0.12, y + h, z + (hash(i, r) - 0.5) * 0.15)); } },
      crystal: (x, y, z, r) => { for (let i = 0; i < 3; i++) add(i === 1 ? glowA2 : glowA, new THREE.OctahedronGeometry(0.08 + i * 0.03), M4(x - 0.14 + i * 0.14, y + 0.14 + i * 0.05, z, i * 0.7, 0, (i - 1) * 0.35, 0.7, 2.2, 0.7)); },
      lantern: (x, y, z) => { add(woodD, box(0.06, 0.9, 0.06), M4(x, y + 0.45, z)); add(woodD, box(0.26, 0.04, 0.04), M4(x + 0.1, y + 0.88, z)); add(mat('#ffcf70', { glow: 2.6 }), box(0.1, 0.14, 0.1), M4(x + 0.2, y + 0.76, z)); },
      ember: (x, y, z, r) => { for (let i = 0; i < 3; i++) add(mat('#ff6a20', { glow: 3.0 }), box(0.5 + hash(i, r) * 0.4, 0.015, 0.04), M4(x, y + 0.02, z + (i - 1) * 0.1, r * 4 + i * 0.5)); },
      fern: (x, y, z, r) => { for (let i = 0; i < 5; i++) { const a = i * 1.26 + r; add(i % 2 ? leaf : leaf2, box(0.06, 0.02, 0.42), M4(x + Math.cos(a) * 0.14, y + 0.12, z + Math.sin(a) * 0.14, -a + Math.PI / 2, 0.5, 0)); } },
      mushroom: (x, y, z, r) => { for (let i = 0; i < 2; i++) { const h = 0.14 + i * 0.08; add(stem, new THREE.CylinderGeometry(0.025, 0.03, h, 6), M4(x + i * 0.14, y + h / 2, z)); add(cap, new THREE.SphereGeometry(0.08 + i * 0.03, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), M4(x + i * 0.14, y + h, z)); } },
      flowers: (x, y, z, r) => { const cols = ['#ffd24a', '#ff8ab0', '#ffffff', '#9fd4ff', '#c08aff']; for (let i = 0; i < 6; i++) { const fx = x + (hash(i, r * 13) - 0.5) * 0.5, fz = z + (hash(i, r * 17) - 0.5) * 0.4; add(leaf2, new THREE.CylinderGeometry(0.01, 0.01, 0.16, 4), M4(fx, y + 0.08, fz)); add(mat(cols[(i + Math.floor(r * 5)) % 5], { rough: 0.7 }), new THREE.SphereGeometry(0.045, 6, 4), M4(fx, y + 0.17, fz)); } },
      log: (x, y, z, r) => { add(woodM, new THREE.CylinderGeometry(0.11, 0.12, 0.8, 8), M4(x, y + 0.11, z, r * 2, 0, Math.PI / 2)); add(leaf, new THREE.SphereGeometry(0.09, 6, 4), M4(x + 0.2, y + 0.2, z, 0, 0, 0, 1.4, 0.6, 1)); },
      books: (x, y, z, r) => { const cols = ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#8a6a2a', '#5a3a6a']; for (let i = 0; i < 5; i++) add(mat(cols[(i + Math.floor(r * 5)) % 5], { rough: 0.8 }), box(0.28, 0.07, 0.2), M4(x, y + 0.035 + i * 0.07, z, (hash(i, r * 7) - 0.5) * 0.6)); },
      candle: (x, y, z, r) => { for (let i = 0; i < 3; i++) { const h = 0.1 + hash(i, r * 3) * 0.18; add(stem, new THREE.CylinderGeometry(0.025, 0.025, h, 6), M4(x + (i - 1) * 0.1, y + h / 2, z + (i % 2) * 0.06)); add(mat('#ffcf70', { glow: 3.0 }), new THREE.ConeGeometry(0.018, 0.05, 5), M4(x + (i - 1) * 0.1, y + h + 0.03, z + (i % 2) * 0.06)); } },
      scroll: (x, y, z, r) => { add(mat('#e8dcc0', { rough: 0.9 }), new THREE.CylinderGeometry(0.04, 0.04, 0.34, 8), M4(x, y + 0.04, z, r * 3, 0, Math.PI / 2)); add(mat('#e8dcc0', { rough: 0.9 }), new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), M4(x + 0.06, y + 0.11, z + 0.04, r * 3 + 0.4, 0, Math.PI / 2)); },
      pipe: (x, y, z, r, ax) => { const pm = mat('#6a7078', { rough: 0.4, metal: 0.7 }); add(pm, new THREE.CylinderGeometry(0.07, 0.07, 1.0, 8), M4(x, y + 0.12, z, ax ? Math.PI / 2 : 0, 0, Math.PI / 2)); add(glowA, box(0.06, 0.06, 0.06), M4(x, y + 0.24, z)); },
      crate: (x, y, z, r) => { add(woodM, box(0.36, 0.36, 0.36), M4(x, y + 0.18, z, r)); add(woodD, box(0.38, 0.04, 0.38), M4(x, y + 0.36, z, r)); if (r > 0.5) add(woodM, box(0.26, 0.26, 0.26), M4(x + 0.05, y + 0.5, z, r + 0.5)); },
      techbox: (x, y, z, r) => { add(mat('#2a2e36', { metal: 0.6, rough: 0.4 }), box(0.34, 0.5, 0.3), M4(x, y + 0.25, z)); for (let i = 0; i < 3; i++) add(i % 2 ? glowA2 : glowA, box(0.2, 0.03, 0.02), M4(x, y + 0.15 + i * 0.12, z + 0.16)); },
      barrel: (x, y, z) => { add(woodM, new THREE.CylinderGeometry(0.17, 0.15, 0.42, 10), M4(x, y + 0.21, z)); add(mat('#3a3a3a', { metal: 0.6 }), new THREE.TorusGeometry(0.165, 0.015, 4, 12), M4(x, y + 0.3, z, 0, Math.PI / 2)); },
      pot: (x, y, z, r) => { add(mat(r > 0.5 ? '#b0683a' : '#8a7a6a', { rough: 0.8 }), new THREE.SphereGeometry(0.15, 10, 8), M4(x, y + 0.15, z, 0, 0, 0, 1, 1.15, 1)); add(mat('#3a2a1a'), new THREE.CylinderGeometry(0.07, 0.09, 0.06, 10), M4(x, y + 0.32, z)); },
      plant: (x, y, z, r) => { add(mat('#b0683a', { rough: 0.8 }), new THREE.CylinderGeometry(0.12, 0.09, 0.22, 10), M4(x, y + 0.11, z)); add(r > 0.5 ? leaf : leaf2, new THREE.SphereGeometry(0.2, 8, 6), M4(x, y + 0.36, z, 0, 0, 0, 1, 0.9, 1)); },
      bench: (x, y, z, r, ax) => { add(woodM, box(ax ? 0.3 : 0.8, 0.06, ax ? 0.8 : 0.3), M4(x, y + 0.3, z)); for (const s of [-0.3, 0.3]) add(woodD, box(0.06, 0.3, 0.06), M4(x + (ax ? 0 : s), y + 0.15, z + (ax ? s : 0))); },
      bones: (x, y, z, r) => { add(stem, new THREE.SphereGeometry(0.09, 8, 6), M4(x, y + 0.09, z)); for (let i = 0; i < 2; i++) add(stem, new THREE.CylinderGeometry(0.02, 0.02, 0.36, 5), M4(x + 0.18, y + 0.03, z + (i - 0.5) * 0.12, r + i, 0, Math.PI / 2)); },
      shell: (x, y, z, r) => { add(mat('#ff8aa8', { rough: 0.7 }), new THREE.ConeGeometry(0.05, 0.4, 6), M4(x, y + 0.2, z)); add(mat('#ffb07a', { rough: 0.7 }), new THREE.ConeGeometry(0.04, 0.3, 6), M4(x + 0.12, y + 0.15, z + 0.05)); add(mat('#f4e8d8'), new THREE.SphereGeometry(0.08, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M4(x - 0.12, y, z + 0.08)); },
      icicle: (x, y, z, r) => { for (let i = 0; i < 3; i++) add(mat(A, { glow: 0.5, rough: 0.1, opacity: 0.85 }), new THREE.ConeGeometry(0.07, 0.3 + hash(i, r) * 0.3, 6), M4(x + (i - 1) * 0.14, y + 0.2, z)); },
      urn: (x, y, z, r) => { add(mat('#b8b0a4', { rough: 0.8 }), new THREE.CylinderGeometry(0.12, 0.16, 0.36, 10), M4(x, y + 0.18, z)); add(glowA, new THREE.ConeGeometry(0.06, 0.14, 6), M4(x, y + 0.43, z)); }
    };
    const BASE = { rock: ['stalagmite', 'rubble', 'glowshroom', 'crystal', 'stalagmite', 'rubble'], forest: ['fern', 'mushroom', 'flowers', 'log', 'fern', 'flowers'], book: ['books', 'candle', 'scroll', 'books'], mech: ['pipe', 'techbox', 'crate', 'pipe'],
      misc: { royal: ['urn', 'pot', 'plant', 'candle'], temple: ['candle', 'urn', 'pot'], clock: ['crate', 'candle', 'pot'], ruins: ['rubble', 'fern', 'pot', 'bones'], dark: ['bones', 'crystal', 'rubble'], arcane: ['crystal', 'candle', 'books'], sky: ['crystal', 'plant', 'urn'], sea: ['shell', 'rubble', 'shell'], frost: ['icicle', 'rubble', 'crystal'], desert: ['pot', 'rubble', 'pot'], harbor: ['barrel', 'crate', 'barrel'], casino: ['plant', 'techbox', 'urn'] } };
    if (k === 'mine') BASE.rock = ['rubble', 'lantern', 'crate', 'stalagmite', 'barrel', 'crystal'];
    if (k === 'forge') BASE.rock = ['rubble', 'stalagmite', 'ember', 'crystal'];
    const baseList = FAM === 'misc' ? (BASE.misc[k] || ['pot', 'crate', 'plant']) : BASE[FAM];
    const scat = (x, y, z, r) => {
      if (FAM === 'rock') { if (k === 'forge' && r < 0.5) P.ember(x, y, z, r); else { for (let i = 0; i < 3; i++) add(i ? rockM : rockD, new THREE.DodecahedronGeometry(0.03 + hash(i, r * 9) * 0.04), M4(x + (hash(i, r) - 0.5) * 0.6, y + 0.02, z + (hash(r, i) - 0.5) * 0.6, i)); if (k === 'cave' && r > 0.6) add(mat('#4a8a5a', { rough: 1, opacity: 0.8 }), new THREE.CircleGeometry(0.28, 10), M4(x, y + 0.02, z, r * 3, -Math.PI / 2)); } }
      else if (FAM === 'forest') { for (let i = 0; i < 4; i++) add(i % 2 ? leaf : leaf2, new THREE.ConeGeometry(0.05, 0.18, 4), M4(x + (hash(i, r) - 0.5) * 0.6, y + 0.08, z + (hash(r, i) - 0.5) * 0.6)); if (r > 0.55) add(mat('#e8ff9a', { glow: 3.0 }), new THREE.SphereGeometry(0.035, 6, 4), M4(x, y + 0.6 + r * 0.7, z)); }
      else if (FAM === 'book') add(mat('#efe4c8', { rough: 0.9 }), box(0.22, 0.01, 0.28), M4(x, y + 0.01, z, r * 4));
      else if (FAM === 'mech') { add(mat('#2a2e36', { metal: 0.6, rough: 0.5 }), box(0.6, 0.02, 0.6), M4(x, y + 0.01, z)); add(glowA, box(0.6, 0.025, 0.03), M4(x, y + 0.015, z)); }
      else add(mat(A, { glow: 1.4 }), new THREE.SphereGeometry(0.03, 5, 4), M4(x + (r - 0.5) * 0.5, y + 0.05, z));
    };
    const dungeonish = kind === 'dungeon' || kind === 'interior';
    if (dungeonish) {
      const lim = kind === 'interior' ? 70 : 600, slim = kind === 'interior' ? 40 : 360; let n = 0, s = 0;
      for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
        if (!walk(x, z) || near(x, z, 1)) continue; const r = hash(x, z, 71);
        const sides = [[0, -1], [-1, 0], [1, 0], [0, 1]].filter(([dx, dz]) => isWall(x + dx, z + dz));
        if (sides.length && n < lim && r < (kind === 'interior' ? 0.2 : 0.42)) {
          const [dx, dz] = sides[Math.floor(hash(x, z, 73) * sides.length)]; const px = x + 0.5 + dx * 0.4, pz = z + 0.5 + dz * 0.4;
          at(px, hAt(px, pz), pz, kind === 'interior' ? 1.3 : 1.6 + hash(x, z, 74) * 0.5); P[baseList[Math.floor(hash(x, z, 75) * baseList.length)]](px, hAt(px, pz), pz, hash(x, z, 77), dx !== 0); pre = null; n++;
        } else if (!sides.length && s < slim && r > 0.8) { const px = x + 0.5, pz = z + 0.5; at(px, hAt(px, pz), pz, 1.4); scat(px, hAt(px, pz), pz, hash(x, z, 79)); pre = null; s++; }
      }
      st.base = n; st.scatter = s;
      // 洞窟・鉱山：通路の支え木（両側の壁の上に柱、上に梁）
      if (kind === 'dungeon' && (k === 'cave' || k === 'mine')) {
        const beam = woodM, post = woodD; let a = 0; const used = {};
        for (let z = 1; z < H - 1 && a < 40; z++) for (let x = 1; x < W - 3 && a < 40; x++) {
          for (const wdt of [2, 3]) {
            if (!(isWall(x - 1, z) && isWall(x + wdt, z))) continue; let ok = true; for (let i = 0; i < wdt; i++) ok = ok && walk(x + i, z) && !busy(x + i, z); if (!ok || (z * 7 + x) % 7 !== 0 || used[(z >> 2) + ',' + (x >> 2)]) continue;
            used[(z >> 2) + ',' + (x >> 2)] = 1; const y = hAt(x + 0.5, z + 0.5); const x0 = x - 0.12, x1 = x + wdt + 0.12;
            add(post, box(0.18, 2.1, 0.18), M4(x0, y + 1.05, z + 0.5)); add(post, box(0.18, 2.1, 0.18), M4(x1, y + 1.05, z + 0.5)); add(beam, box(x1 - x0 + 0.3, 0.2, 0.22), M4((x0 + x1) / 2, y + 2.1, z + 0.5));
            if (a % 2 === 0) add(mat('#ffcf70', { glow: 2.6 }), box(0.1, 0.14, 0.1), M4((x0 + x1) / 2, y + 1.9, z + 0.62));
            a++;
          }
        }
        st.arch = a;
      }
    }
    // 森（ダンジョン・フィールドの森）：木漏れ日の光の筋
    if (k === 'forest' && kind !== 'interior') {
      const shaft = mat('#fff4c0', { glow: 0.6, opacity: 0.16, rough: 1 }); let n = 0;
      for (let z = 2; z < H - 2 && n < 10; z += 3) for (let x = 2; x < W - 2 && n < 10; x += 3) { if (!walk(x, z) || hash(x, z, 81) > 0.06) continue; add(shaft, new THREE.CylinderGeometry(0.35, 0.9, 6, 10, 1, true), M4(x + 0.5, hAt(x + 0.5, z + 0.5) + 3, z + 0.5, 0, 0.25, 0.15)); n++; }
      st.shaft = n;
    }
    // 町：家の前の小物・草地の花
    if (kind === 'town') {
      let n = 0; const LIM = 160; const TOWN = { tech: ['techbox', 'plant'], machine: ['crate', 'barrel', 'techbox'], harbor: ['barrel', 'crate', 'barrel', 'pot'], desert: ['pot', 'pot', 'crate'], frost: ['barrel', 'crate', 'icicle'], royal: ['plant', 'urn', 'bench'], mine: ['crate', 'barrel', 'rubble'], forge: ['barrel', 'crate', 'rubble'] };
      const list = TOWN[k] || ['barrel', 'crate', 'plant', 'pot', 'bench'];
      for (let z = 1; z < H - 1 && n < LIM; z++) for (let x = 1; x < W - 1 && n < LIM; x++) {
        if (!walk(x, z) || near(x, z, 1) || /road|path|bridge|dock|stairs|door/.test(T(x, z))) continue;
        const front = T(x, z - 1) === 'bld_block'; const side = T(x - 1, z) === 'bld_block' || T(x + 1, z) === 'bld_block';
        const r = hash(x, z, 91);
        if ((front && r < 0.45) || (side && r < 0.3)) { const px = x + 0.5, pz = z + (front ? 0.25 : 0.5); at(px, hAt(px, pz), pz, 1.35); P[list[Math.floor(hash(x, z, 93) * list.length)]](px, hAt(px, pz), pz, hash(x, z, 95), side); pre = null; n++; }
        else if (/grass/.test(T(x, z)) && r > 0.9) { const px = x + 0.5, pz = z + 0.5; at(px, hAt(px, pz), pz, 1.5); P.flowers(px, hAt(px, pz), pz, hash(x, z, 97)); pre = null; n++; }
      }
      st.town = n;
    }
    // フィールド：v7.0 の飾りに加えて、草花・小石をもっと
    if (kind === 'field') {
      let n = 0; const LIM = 320;
      for (let z = 2; z < H - 2 && n < LIM; z++) for (let x = 2; x < W - 2 && n < LIM; x++) {
        if (hash(x, z, 101) > 0.05) continue; const t = T(x, z); if (!walk(x, z) || near(x, z, 2) || /road|path|bridge|dock|stone|sand|snow|water/.test(t)) continue;
        const px = x + 0.5 + (hash(x, z, 103) - 0.5) * 0.5, pz = z + 0.5 + (hash(x, z, 105) - 0.5) * 0.5; const r = hash(x, z, 107);
        at(px, hAt(px, pz), pz, 1.8); if (/grass/.test(t)) (r < 0.5 ? P.flowers : r < 0.75 ? P.fern : P.rubble)(px, hAt(px, pz), pz, r); else P.rubble(px, hAt(px, pz), pz, r); pre = null;
        n++;
      }
      st.scatter = n;
    }
  }

  /* ---------- 壁の飾り（中心 x・床の高さ y・壁の面 z（南向き）・壁の高さ wh） ---------- */
  wallItem(x, y, z, wh, r, dungeon, high) {
    const add = this.add, A = this.A, A2 = this.A2; const k = this.key; const zf = z + 0.03; const dark = mat('#20242c', { rough: 0.5, metal: 0.4 });
    const HIGH_OK = { tech: 1, arcane: 1, royal: 1, bureau: 1, clock: 1, academy: 1, sky: 1, desert: 1, frost: 1, casino: 1 }; if (high && !HIGH_OK[k]) return false;
    const top = high ? wh - 0.08 : Math.min(wh - 0.25, 1.7); const low = !high;   // high：棚の上（下の方の飾りは付けない）
    switch (k) {
      case 'tech': {
        add(dark, box(0.86, 0.54, 0.06), M4(x, y + top - 0.25, zf));
        add(mat('#ffffff', { glow: 1.6, map: chartTex(Math.floor(r * 6)), rough: 0.3 }), new THREE.PlaneGeometry(0.78, 0.44), M4(x, y + top - 0.25, zf + 0.035));
        if (low) add(mat(A, { glow: 2.2 }), box(0.9, 0.04, 0.03), M4(x, y + 0.32, zf));
        if (low && r > 0.55) { add(dark, box(0.36, 0.9, 0.3), M4(x + 0.28, y + 0.45, zf + 0.15)); for (let i = 0; i < 4; i++) add(mat(i % 2 ? A2 : A, { glow: 2.4 }), box(0.04, 0.04, 0.02), M4(x + 0.18, y + 0.2 + i * 0.18, zf + 0.31)); }
        break;
      }
      case 'machine': {
        const pipe = mat('#6a7078', { rough: 0.4, metal: 0.7 });
        add(pipe, new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), M4(x, y + top - 0.1, zf + 0.06, 0, 0, Math.PI / 2));
        add(pipe, new THREE.CylinderGeometry(0.045, 0.045, top - 0.2, 8), M4(x + 0.32, y + (top - 0.1) / 2, zf + 0.06));
        add(mat('#3a3e46', { metal: 0.5 }), new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16), M4(x - 0.18, y + 0.95, zf + 0.03, 0, Math.PI / 2));
        add(mat(A, { glow: 2.0 }), new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), M4(x - 0.18, y + 0.95, zf + 0.06, 0, Math.PI / 2));
        if (r > 0.5) { add(dark, box(0.5, 0.3, 0.08), M4(x - 0.05, y + 0.35, zf + 0.04)); for (let i = 0; i < 3; i++) add(mat(A, { glow: 1.8 }), box(0.4, 0.025, 0.02), M4(x - 0.05, y + 0.27 + i * 0.07, zf + 0.09)); }
        break;
      }
      case 'arcane': {
        add(mat('#ffffff', { glow: 1.8, glowHex: A, map: runeTex(), opacity: 0.9 }), new THREE.CircleGeometry(0.34, 24), M4(x, y + top - 0.4, zf + 0.01));
        add(mat(A2, { glow: 1.6, rough: 0.2 }), new THREE.OctahedronGeometry(0.13), M4(x, y + top + 0.05, zf + 0.25, r * 3, 0, 0, 0.8, 1.6, 0.8));
        break;
      }
      case 'royal': case 'bureau': {
        const cloth = mat(A, { rough: 0.9 });
        add(cloth, box(0.48, 1.0, 0.025), M4(x, y + top - 0.55, zf + 0.02));
        add(mat(A2, { metal: 0.6, rough: 0.35 }), box(0.56, 0.05, 0.05), M4(x, y + top - 0.03, zf + 0.04));
        add(mat(A2, { metal: 0.5, rough: 0.4 }), new THREE.CircleGeometry(0.12, 12), M4(x, y + top - 0.45, zf + 0.04));
        if (low && k === 'bureau' && r > 0.45) { add(mat('#6a4a2a'), box(0.6, 0.5, 0.04), M4(x + (r > 0.7 ? 0.0 : 0.0), y + 0.75, zf + 0.06)); add(mat('#ffffff', { map: paperTex(), rough: 0.9 }), new THREE.PlaneGeometry(0.5, 0.4), M4(x, y + 0.75, zf + 0.085)); }
        break;
      }
      case 'clock': {
        add(mat('#ffffff', { map: clockTex(), glow: 0.5, glowHex: '#fff4d8', rough: 0.5 }), new THREE.CircleGeometry(0.3, 24), M4(x, y + top - 0.35, zf + 0.03));
        add(mat(A, { metal: 0.8, rough: 0.3 }), new THREE.TorusGeometry(0.31, 0.035, 6, 24), M4(x, y + top - 0.35, zf + 0.03));
        if (low && r > 0.4) { const gear = mat('#8a7a5a', { metal: 0.7, rough: 0.35 }); add(gear, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), M4(x + 0.3, y + 0.55, zf + 0.04, 0, Math.PI / 2)); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add(gear, box(0.07, 0.07, 0.05), M4(x + 0.3 + Math.cos(a) * 0.22, y + 0.55 + Math.sin(a) * 0.22, zf + 0.04, 0, 0, a)); } }
        break;
      }
      case 'harbor': {
        add(mat('#f4f0e8'), new THREE.TorusGeometry(0.17, 0.05, 8, 18), M4(x - 0.15, y + 1.05, zf + 0.06));
        for (let i = 0; i < 4; i++) add(mat(A), box(0.07, 0.12, 0.11), M4(x - 0.15 + Math.cos(i * Math.PI / 2) * 0.17, y + 1.05 + Math.sin(i * Math.PI / 2) * 0.17, zf + 0.06, 0, 0, i * Math.PI / 2));
        if (r > 0.35) for (let i = 0; i < 5; i++) add(mat('#c8b890', { rough: 0.95 }), box(0.012, 0.7, 0.012), M4(x + 0.12 + i * 0.07, y + top - 0.45, zf + 0.03, 0, 0, (i - 2) * 0.12));
        break;
      }
      case 'mine': {
        const wood = mat('#6a4a2a', { rough: 0.95 });
        add(wood, box(0.12, top + 0.15, 0.12), M4(x - 0.42, y + (top + 0.15) / 2, zf + 0.06)); add(wood, box(0.12, top + 0.15, 0.12), M4(x + 0.42, y + (top + 0.15) / 2, zf + 0.06)); add(wood, box(1.0, 0.12, 0.14), M4(x, y + top + 0.1, zf + 0.07));
        if (r > 0.5) { add(mat('#2a2420', { metal: 0.6 }), box(0.12, 0.16, 0.12), M4(x, y + top - 0.12, zf + 0.12)); add(mat(A, { glow: 2.4 }), box(0.08, 0.1, 0.08), M4(x, y + top - 0.12, zf + 0.12)); }
        break;
      }
      case 'library': {
        add(mat('#5a3a22', { rough: 0.9 }), box(0.92, Math.min(1.7, top), 0.26), M4(x, y + Math.min(1.7, top) / 2, zf + 0.13));
        const cols = ['#8a2a2a', '#2a4a8a', '#3a6a3a', '#a8883a', '#5a3a6a'];
        for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) add(mat(cols[(i + row * 2 + Math.floor(r * 5)) % cols.length], { rough: 0.8 }), box(0.1, 0.3 + hash(i, row) * 0.08, 0.2), M4(x - 0.3 + i * 0.12, y + 0.35 + row * 0.5, zf + 0.15));
        break;
      }
      case 'temple': {
        add(mat('#d8d0c0', { rough: 0.6 }), new THREE.CylinderGeometry(0.06, 0.08, 0.9, 8), M4(x, y + 0.45, zf + 0.12));
        add(mat('#e8e0d0'), new THREE.CylinderGeometry(0.16, 0.12, 0.06, 12), M4(x, y + 0.92, zf + 0.12));
        for (let i = -1; i <= 1; i++) { add(mat('#f4ecd8'), new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), M4(x + i * 0.08, y + 1.01, zf + 0.12)); add(mat(A, { glow: 3.0 }), new THREE.ConeGeometry(0.025, 0.07, 6), M4(x + i * 0.08, y + 1.11, zf + 0.12)); }
        break;
      }
      case 'sea': {
        const coral = [mat(A, { rough: 0.8 }), mat('#ffb060', { rough: 0.8 })];
        for (let i = 0; i < 4; i++) add(coral[i % 2], new THREE.ConeGeometry(0.06, 0.35 + hash(i, 4) * 0.3, 6), M4(x - 0.3 + i * 0.18, y + 0.2, zf + 0.12, 0, 0, (hash(i, 5) - 0.5) * 0.6));
        add(mat(A2, { glow: 1.2, opacity: 0.8 }), new THREE.SphereGeometry(0.06, 8, 6), M4(x + 0.2, y + 1.2 + r * 0.4, zf + 0.2));
        break;
      }
      case 'dark': {
        add(mat('#1a141e', { metal: 0.4 }), new THREE.CylinderGeometry(0.14, 0.09, 0.2, 8), M4(x, y + 1.25, zf + 0.14));
        add(mat(A, { glow: 3.0 }), new THREE.ConeGeometry(0.1, 0.32, 8), M4(x, y + 1.5, zf + 0.14));
        for (let i = 0; i < 3; i++) add(mat('#2a2030', { metal: 0.3 }), new THREE.ConeGeometry(0.05, 0.35, 5), M4(x - 0.3 + i * 0.3, y + 0.17, zf + 0.06));
        break;
      }
      case 'desert': {
        const c1 = mat(A, { rough: 0.95 }), c2 = mat(A2, { rough: 0.95 });
        for (let i = 0; i < 4; i++) add(i % 2 ? c2 : c1, box(0.24, 0.5, 0.02), M4(x - 0.36 + i * 0.24, y + top - 0.3, zf + 0.02));
        if (low) add(mat('#c8945a', { rough: 0.9 }), new THREE.SphereGeometry(0.16, 10, 8), M4(x + (r - 0.5) * 0.5, y + 0.16, zf + 0.2, 0, 0, 0, 1, 1.2, 1));
        break;
      }
      case 'forge': {
        add(mat('#2a2220', { metal: 0.5 }), box(0.7, 0.45, 0.12), M4(x, y + 0.3, zf + 0.06));
        add(mat(A, { glow: 3.2 }), box(0.52, 0.08, 0.02), M4(x, y + 0.34, zf + 0.13)); add(mat(A2, { glow: 2.4 }), box(0.4, 0.05, 0.02), M4(x, y + 0.24, zf + 0.13));
        if (r > 0.5) for (let i = 0; i < 4; i++) add(mat('#4a4440', { metal: 0.8 }), new THREE.TorusGeometry(0.04, 0.012, 4, 8), M4(x + 0.3, y + top - 0.1 - i * 0.08, zf + 0.05, 0, i % 2 ? Math.PI / 2 : 0));
        break;
      }
      case 'frost': {
        const ice = mat(A, { glow: 0.6, rough: 0.15, opacity: 0.85 });
        for (let i = 0; i < 5; i++) add(ice, new THREE.ConeGeometry(0.045, 0.22 + hash(i, 6) * 0.25, 6), M4(x - 0.36 + i * 0.18, y + top - 0.05, zf + 0.06, 0, Math.PI));
        if (low && r > 0.45) for (let i = 0; i < 3; i++) add(ice, new THREE.OctahedronGeometry(0.1 + i * 0.03), M4(x - 0.2 + i * 0.18, y + 0.12 + i * 0.03, zf + 0.15, i, 0, 0, 0.7, 1.6, 0.7));
        break;
      }
      case 'casino': {
        add(mat(A, { glow: 2.6 }), box(0.92, 0.05, 0.04), M4(x, y + top - 0.1, zf + 0.03)); add(mat(A2, { glow: 2.6 }), box(0.92, 0.05, 0.04), M4(x, y + top - 0.22, zf + 0.03));
        if (low && r > 0.4) { add(mat('#5a1a2a', { metal: 0.4 }), box(0.5, 0.9, 0.3), M4(x, y + 0.45, zf + 0.16)); add(mat('#ffffff', { glow: 1.5, map: tickerTex() }), new THREE.PlaneGeometry(0.4, 0.2), M4(x, y + 0.65, zf + 0.315)); add(mat(A2, { glow: 2.0 }), new THREE.SphereGeometry(0.06, 8, 6), M4(x, y + 0.95, zf + 0.16)); }
        break;
      }
      case 'academy': {
        add(mat('#4a3a2a'), box(0.92, 0.6, 0.04), M4(x, y + top - 0.4, zf + 0.02)); add(mat('#ffffff', { map: boardTex(), rough: 0.9 }), new THREE.PlaneGeometry(0.84, 0.52), M4(x, y + top - 0.4, zf + 0.045));
        break;
      }
      case 'sky': {
        add(mat('#f4f4ff', { rough: 0.8 }), box(0.4, 0.9, 0.02), M4(x, y + top - 0.5, zf + 0.02));
        add(mat(A, { glow: 2.4 }), new THREE.OctahedronGeometry(0.11), M4(x, y + top + 0.1, zf + 0.25, r * 3, 0, 0, 1, 1.4, 1));
        break;
      }
      case 'forest': case 'pastoral': {
        const vine = mat('#4a7a3a', { rough: 0.95 }); for (let i = 0; i < 3; i++) add(vine, box(0.04, 0.6 + hash(i, 8) * 0.6, 0.03), M4(x - 0.3 + i * 0.3, y + top - 0.35, zf + 0.02));
        add(mat(A, { glow: 1.6 }), new THREE.SphereGeometry(0.05, 6, 5), M4(x, y + 0.9, zf + 0.25));
        break;
      }
      case 'ruins': case 'cave': default: {
        if (k === 'ruins') { const vine = mat('#5a7a44', { rough: 0.95 }); for (let i = 0; i < 4; i++) add(vine, box(0.04, 0.5 + hash(i, 9) * 0.9, 0.03), M4(x - 0.36 + i * 0.24, y + top - 0.45, zf + 0.02)); break; }
        const cr = mat(A, { glow: 1.8, rough: 0.15, opacity: 0.9 }), cr2 = mat(A2, { glow: 1.4, rough: 0.15, opacity: 0.9 });
        for (let i = 0; i < 3; i++) add(i === 1 ? cr2 : cr, new THREE.OctahedronGeometry(0.09 + i * 0.03), M4(x - 0.2 + i * 0.16 + (r - 0.5) * 0.3, y + 0.15 + i * 0.05, zf + 0.12, i * 0.7, 0, (i - 1) * 0.3, 0.7, 2.0, 0.7));
      }
    }
  }

  /* ---------- 床の小物（壁ぎわ・町の外れ） ---------- */
  floorItem(x, y, z, r) {
    const add = this.add, A = this.A; const k = this.key;
    switch (k) {
      case 'tech': case 'machine': add(mat('#3a3e46', { metal: 0.6, rough: 0.4 }), box(0.34, 0.34, 0.34), M4(x, y + 0.17, z, r * 3)); add(mat(A, { glow: 2.0 }), box(0.36, 0.03, 0.36), M4(x, y + 0.26, z, r * 3)); break;
      case 'arcane': case 'sky': add(mat(A, { glow: 1.8, rough: 0.2 }), new THREE.OctahedronGeometry(0.14), M4(x, y + 0.35 + r * 0.2, z, r * 3, 0, 0, 0.8, 1.5, 0.8)); break;
      case 'harbor': add(mat('#8a6a42', { rough: 0.9 }), new THREE.CylinderGeometry(0.17, 0.17, 0.42, 10), M4(x, y + 0.21, z)); add(mat('#3a2a1a'), new THREE.TorusGeometry(0.17, 0.02, 4, 12), M4(x, y + 0.32, z, 0, Math.PI / 2)); break;
      case 'mine': case 'forge': add(mat('#3a3430', { rough: 0.9 }), new THREE.DodecahedronGeometry(0.2), M4(x, y + 0.12, z, r * 5)); add(mat(A, { glow: 1.6 }), new THREE.OctahedronGeometry(0.05), M4(x + 0.1, y + 0.24, z + 0.05)); break;
      case 'clock': { const gear = mat('#8a7a5a', { metal: 0.7, rough: 0.35 }); add(gear, new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12), M4(x, y + 0.03, z)); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add(gear, box(0.07, 0.05, 0.07), M4(x + Math.cos(a) * 0.2, y + 0.03, z + Math.sin(a) * 0.2, a)); } break; }
      case 'library': case 'bureau': add(mat('#e8dcc0', { rough: 0.9 }), box(0.3, 0.12, 0.22), M4(x, y + 0.06, z, r * 2)); add(mat('#7a2a2a'), box(0.28, 0.06, 0.2), M4(x, y + 0.15, z, r * 2 + 0.3)); break;
      case 'desert': add(mat('#c8945a', { rough: 0.9 }), new THREE.SphereGeometry(0.17, 10, 8), M4(x, y + 0.17, z, 0, 0, 0, 1, 1.2, 1)); break;
      case 'frost': add(mat(A, { glow: 0.6, rough: 0.15, opacity: 0.85 }), new THREE.OctahedronGeometry(0.16), M4(x, y + 0.2, z, r * 3, 0, 0, 0.7, 1.6, 0.7)); break;
      case 'casino': add(mat(this.A2, { glow: 1.8 }), new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14), M4(x, y + 0.02, z)); add(mat(A, { glow: 1.8 }), new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14), M4(x + 0.05, y + 0.05, z + 0.03)); break;
      case 'dark': add(mat('#2a2030', { metal: 0.3 }), new THREE.ConeGeometry(0.08, 0.5, 5), M4(x, y + 0.25, z)); add(mat(A, { glow: 2.0 }), new THREE.OctahedronGeometry(0.08), M4(x + 0.15, y + 0.12, z, r)); break;
      case 'sea': add(mat(A, { rough: 0.8 }), new THREE.ConeGeometry(0.06, 0.4, 6), M4(x, y + 0.2, z)); add(mat('#f4e8d8'), new THREE.SphereGeometry(0.08, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M4(x + 0.15, y, z + 0.1)); break;
      case 'temple': add(mat('#f4ecd8'), new THREE.CylinderGeometry(0.035, 0.035, 0.2, 6), M4(x, y + 0.1, z)); add(mat(A, { glow: 3.0 }), new THREE.ConeGeometry(0.03, 0.08, 6), M4(x, y + 0.24, z)); break;
      default: add(mat(A, { glow: 1.5 }), new THREE.SphereGeometry(0.06, 6, 5), M4(x, y + 0.08, z)); add(mat('#5a7a44', { rough: 0.95 }), new THREE.ConeGeometry(0.12, 0.25, 6), M4(x + 0.12, y + 0.12, z));
    }
  }

  /* ---------- 遠景（町の外） ---------- */
  skyItem(x, y, z, r, i) {
    const add = this.add, A = this.A, A2 = this.A2; const k = this.key; const out = this.out;
    switch (k) {
      case 'tech': {   // 高層ビル（窓の光の帯・屋上のアンテナ・相場の大画面）
        const h = 9 + r * 11, w = 2 + hash(i, 3) * 1.8; add(mat('#1a2634', { metal: 0.6, rough: 0.25 }), box(w, h, w), M4(x, y + h / 2, z));
        for (let yy = 1.5; yy < h - 0.5; yy += 1.4) add(mat(hash(i, yy * 10) > 0.5 ? A : '#bfe8ff', { glow: 1.6 }), box(w + 0.02, 0.12, w + 0.02), M4(x, y + yy, z));
        add(mat('#8a9098', { metal: 0.8 }), new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), M4(x, y + h + 1.1, z)); add(mat('#ff3a3a', { glow: 3.0 }), new THREE.SphereGeometry(0.16, 8, 6), M4(x, y + h + 2.3, z));
        if (r > 0.6) add(mat('#ffffff', { glow: 1.6, map: chartTex(i % 6) }), new THREE.PlaneGeometry(w * 0.9, w * 0.55), M4(x, y + h * 0.6, z + w / 2 + 0.03));
        // v7.1 空の区画へのエレベーターは町の中の本物（buildElevatorTower）になったので、遠景の見た目だけの塔はなくした
        break;
      }
      case 'machine': { const h = 7 + r * 7; add(mat('#5a5e66', { metal: 0.5 }), new THREE.CylinderGeometry(0.7, 0.9, h, 12), M4(x, y + h / 2, z)); add(mat('#c84a3a'), new THREE.CylinderGeometry(0.72, 0.72, 0.5, 12), M4(x, y + h - 1, z)); add(mat('#4a4e56', { metal: 0.4 }), box(3, 3 + r * 2, 2.5), M4(x + 1.6, y + 1.5 + r, z + 0.5)); out.smokes.push(new THREE.Vector3(x, y + h + 0.2, z)); break; }
      case 'arcane': { const h = 6 + r * 6; add(mat(i % 2 ? A : A2, { glow: 1.2, rough: 0.15, opacity: 0.85 }), new THREE.OctahedronGeometry(1), M4(x, y + h / 2, z, r * 3, 0, 0, 0.9, h / 2, 0.9)); add(mat(A2, { glow: 2.0 }), new THREE.TorusGeometry(1.4, 0.06, 6, 32), M4(x, y + h * 0.7, z, 0, Math.PI / 2 + 0.3)); break; }
      case 'royal': case 'bureau': { const h = 6 + r * 5; add(mat('#b8b0a4', { rough: 0.8 }), new THREE.CylinderGeometry(1.1, 1.2, h, 12), M4(x, y + h / 2, z)); add(mat(A), new THREE.ConeGeometry(1.4, 2.4, 12), M4(x, y + h + 1.2, z)); add(mat('#6a6a6a', { metal: 0.6 }), new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), M4(x, y + h + 3.0, z)); add(mat(A2), box(0.9, 0.5, 0.03), M4(x + 0.45, y + h + 3.4, z)); break; }
      case 'clock': { const h = 9 + r * 4; add(mat('#c8bca8', { rough: 0.7 }), box(2.4, h, 2.4), M4(x, y + h / 2, z)); add(mat('#ffffff', { map: clockTex(), glow: 0.8, glowHex: '#fff4d8' }), new THREE.CircleGeometry(0.9, 24), M4(x, y + h - 1.5, z + 1.22)); add(mat('#5a5a8a'), new THREE.ConeGeometry(1.9, 3, 4), M4(x, y + h + 1.5, z, Math.PI / 4)); break; }
      case 'harbor': { if (i % 4 === 0) { const h = 9; add(mat('#f4f0e8'), new THREE.CylinderGeometry(0.9, 1.3, h, 14), M4(x, y + h / 2, z)); for (let yy = 1; yy < h; yy += 2.4) add(mat(A), new THREE.CylinderGeometry(1.25 - yy * 0.04, 1.28 - yy * 0.04, 0.9, 14), M4(x, y + yy, z)); add(mat('#ffe8a0', { glow: 3.0 }), new THREE.CylinderGeometry(0.6, 0.6, 0.8, 10), M4(x, y + h + 0.4, z)); } else { const h = 5 + r * 4; add(mat('#6a4a2a'), new THREE.CylinderGeometry(0.1, 0.12, h, 6), M4(x, y + h / 2, z)); add(mat('#6a4a2a'), new THREE.CylinderGeometry(0.06, 0.06, 2.6, 5), M4(x, y + h * 0.75, z, 0, 0, Math.PI / 2)); add(mat('#f4ecd8', { rough: 0.9 }), box(2.2, h * 0.45, 0.04), M4(x, y + h * 0.5, z + 0.1)); } break; }
      case 'mine': { const h = 6 + r * 3; const wood = mat('#5a4028', { rough: 0.95 }); add(wood, box(0.3, h, 0.3), M4(x - 1, y + h / 2, z, 0, 0, 0.18)); add(wood, box(0.3, h, 0.3), M4(x + 1, y + h / 2, z, 0, 0, -0.18)); add(wood, box(2.8, 0.3, 0.4), M4(x, y + h - 0.5, z)); add(mat('#3a3430'), new THREE.CylinderGeometry(0.6, 0.6, 0.25, 12), M4(x, y + h, z, 0, Math.PI / 2)); add(mat('#2a2420', { rough: 1 }), new THREE.ConeGeometry(2.4, 2.2, 10), M4(x + 3, y + 1.1, z + 1)); break; }
      case 'desert': { if (i % 3 === 0) { const h = 7; add(mat('#e8d0a8'), new THREE.CylinderGeometry(0.45, 0.55, h, 10), M4(x, y + h / 2, z)); add(mat(A2), new THREE.SphereGeometry(0.6, 12, 8), M4(x, y + h + 0.3, z)); } else { add(mat('#e8d0a8'), box(4, 3, 4), M4(x, y + 1.5, z)); add(mat(i % 2 ? A : A2), new THREE.SphereGeometry(1.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M4(x, y + 3, z)); } break; }
      case 'forge': { if (i === 4) { add(mat('#3a2a24', { rough: 1 }), new THREE.ConeGeometry(8, 9, 16), M4(x, y + 4.5, z - 4)); add(mat(A, { glow: 3.0 }), new THREE.TorusGeometry(1.6, 0.3, 6, 20), M4(x, y + 8.6, z - 4, 0, Math.PI / 2)); out.smokes.push(new THREE.Vector3(x, y + 9, z - 4)); } else { const h = 5 + r * 4; add(mat('#4a3a34'), new THREE.CylinderGeometry(0.5, 0.7, h, 10), M4(x, y + h / 2, z)); add(mat(A, { glow: 2.6 }), new THREE.CylinderGeometry(0.52, 0.52, 0.3, 10), M4(x, y + h - 0.4, z)); if (i % 3 === 0) out.smokes.push(new THREE.Vector3(x, y + h + 0.2, z)); } break; }
      case 'frost': { const h = 5 + r * 7; add(mat(A, { glow: 0.5, rough: 0.1, opacity: 0.85 }), new THREE.ConeGeometry(1 + r, h, 6), M4(x, y + h / 2, z, r * 2)); break; }
      case 'casino': { const h = 7 + r * 8, w = 2.4; add(mat('#2a1a2a', { metal: 0.5 }), box(w, h, w), M4(x, y + h / 2, z)); for (let yy = 1; yy < h; yy += 1.1) add(mat([A, A2, '#4ad8ff'][Math.floor(yy) % 3], { glow: 2.4 }), box(w + 0.04, 0.1, w + 0.04), M4(x, y + yy, z)); add(mat(A2, { glow: 3.0 }), new THREE.SphereGeometry(0.5, 12, 8), M4(x, y + h + 0.6, z)); break; }
      case 'academy': { const h = 6 + r * 3; add(mat('#d8d0c0'), new THREE.CylinderGeometry(1.4, 1.5, h, 14), M4(x, y + h / 2, z)); add(mat('#8a9aa8', { metal: 0.6, rough: 0.3 }), new THREE.SphereGeometry(1.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M4(x, y + h, z)); add(mat(A, { glow: 1.6 }), box(0.3, 1.2, 0.05), M4(x, y + h + 0.6, z + 1.2, 0, -0.5)); break; }
      case 'sky': { const h = 4 + r * 5; add(mat('#8a7a6a', { rough: 1 }), new THREE.ConeGeometry(2.2, 3, 8), M4(x, y + h, z, 0, Math.PI)); add(mat('#7ab05a'), new THREE.CylinderGeometry(2.2, 2.2, 0.3, 8), M4(x, y + h + 1.6, z)); break; }
      case 'dark': { const h = 6 + r * 8; add(mat('#1e1824', { metal: 0.3 }), new THREE.ConeGeometry(0.9 + r * 0.6, h, 6), M4(x, y + h / 2, z, r)); add(mat(A, { glow: 2.4 }), new THREE.OctahedronGeometry(0.4), M4(x, y + h * 0.5, z + 0.9)); break; }
      case 'ruins': { const h = 2 + r * 4; add(mat('#9a948a', { rough: 0.95 }), new THREE.CylinderGeometry(1, 1.1, h, 10), M4(x, y + h / 2, z)); add(mat('#9a948a', { rough: 0.95 }), box(0.8, 0.5, 0.8), M4(x + 1.6, y + 0.25, z + 0.8, r * 3)); add(mat('#5a7a44'), new THREE.SphereGeometry(0.8, 8, 6), M4(x - 0.5, y + h, z + 0.6)); break; }
      default: { const h = 3 + r * 2; add(mat('#c8b890'), box(1.6, h, 1.6), M4(x, y + h / 2, z)); add(mat(A), new THREE.ConeGeometry(1.4, 1.4, 4), M4(x, y + h + 0.7, z, Math.PI / 4)); }
    }
  }

  /* ---------- フィールドの小さな飾り ---------- */
  fieldItem(x, y, z, r) {
    const add = this.add, A = this.A, A2 = this.A2; const k = this.key;
    const decal = (hex, s, glow, ry) => add(mat(hex, { glow: glow || 0, opacity: 0.85, rough: 0.9 }), new THREE.CircleGeometry(s, 16), M4(x, y + 0.03, z, ry || 0, -Math.PI / 2));
    switch (k) {
      case 'machine': for (let i = 0; i < 3; i++) add(mat(A2, { glow: 1.8 }), box(1.2, 0.02, 0.05), M4(x + (i - 1) * 0.25, y + 0.03, z, i * 1.05)); add(mat('#6a7078', { metal: 0.7 }), new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5), M4(x + 0.4, y + 0.4, z)); add(mat(A, { glow: 2.4 }), new THREE.SphereGeometry(0.06, 6, 5), M4(x + 0.4, y + 0.82, z)); break;
      case 'arcane': add(mat('#ffffff', { glow: 1.4, glowHex: A, map: runeTex(), opacity: 0.8 }), new THREE.CircleGeometry(0.6, 20), M4(x, y + 0.03, z, r * 6, -Math.PI / 2)); add(mat(A2, { glow: 1.6, rough: 0.2 }), new THREE.OctahedronGeometry(0.12), M4(x, y + 0.7, z, r * 3, 0, 0, 0.8, 1.6, 0.8)); break;
      case 'forge': for (let i = 0; i < 3; i++) add(mat(A, { glow: 2.8 }), box(0.7 + r * 0.5, 0.02, 0.05), M4(x, y + 0.03, z + (i - 1) * 0.12, r * 3 + i * 0.6)); add(mat('#e8e0d0', { rough: 0.8 }), box(0.06, 0.06, 0.6), M4(x + 0.3, y + 0.04, z + 0.2, 0.4)); break;
      case 'dark': add(mat(A, { glow: 1.8, rough: 0.2 }), new THREE.OctahedronGeometry(0.16), M4(x, y + 0.25, z, r * 3, 0, 0.3, 0.7, 1.8, 0.7)); add(mat('#1e1824'), new THREE.ConeGeometry(0.1, 0.6, 5), M4(x + 0.25, y + 0.3, z - 0.1)); decal('#4a2a5a', 0.5, 0, r); break;
      case 'frost': add(mat(A, { glow: 0.5, rough: 0.15, opacity: 0.85 }), new THREE.OctahedronGeometry(0.18), M4(x, y + 0.22, z, r * 3, 0, 0, 0.7, 1.7, 0.7)); add(mat(A, { glow: 0.5, rough: 0.15, opacity: 0.85 }), new THREE.OctahedronGeometry(0.11), M4(x + 0.2, y + 0.12, z + 0.1, r, 0, 0.4, 0.7, 1.5, 0.7)); break;
      case 'desert': add(mat('#ece4d4', { rough: 0.8 }), box(0.7, 0.05, 0.07), M4(x, y + 0.04, z, r * 3)); for (let i = 0; i < 4; i++) add(mat('#ece4d4', { rough: 0.8 }), new THREE.TorusGeometry(0.16, 0.025, 4, 10, Math.PI), M4(x - 0.24 + i * 0.16, y + 0.04, z, r * 3, 0, 0)); break;
      case 'clock': add(mat('#b0a898', { rough: 0.9 }), new THREE.ConeGeometry(0.18, 0.35, 8), M4(x, y + 0.18, z, 0, Math.PI)); add(mat('#b0a898', { rough: 0.9 }), new THREE.ConeGeometry(0.18, 0.35, 8), M4(x, y + 0.52, z)); add(mat(A, { glow: 1.2 }), new THREE.SphereGeometry(0.05, 6, 5), M4(x, y + 0.36, z)); break;
      case 'harbor': add(mat('#f4e8d8'), new THREE.SphereGeometry(0.09, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M4(x, y, z)); add(mat('#8a6a42', { rough: 0.95 }), box(0.9, 0.08, 0.12), M4(x + 0.2, y + 0.04, z + 0.2, r * 3)); break;
      case 'mine': add(mat('#4a4440', { rough: 0.9 }), new THREE.DodecahedronGeometry(0.22), M4(x, y + 0.12, z, r * 5)); add(mat(A, { glow: 1.6 }), new THREE.OctahedronGeometry(0.05), M4(x + 0.12, y + 0.25, z)); break;
      case 'bureau': add(mat('#6a4a2a'), box(0.08, 0.8, 0.08), M4(x, y + 0.4, z)); add(mat(A), box(0.3, 0.4, 0.02), M4(x + 0.16, y + 0.62, z)); break;
      case 'sky': add(mat(A, { glow: 1.6 }), new THREE.OctahedronGeometry(0.1), M4(x, y + 0.6, z, r * 3)); break;
      default: { const cols = ['#ffd24a', '#ff8ab0', '#ffffff', '#9fd4ff']; for (let i = 0; i < 5; i++) add(mat(cols[(i + Math.floor(r * 4)) % 4], { rough: 0.8 }), new THREE.SphereGeometry(0.05, 6, 4), M4(x + (hash(i, 1) - 0.5) * 0.6, y + 0.08, z + (hash(i, 2) - 0.5) * 0.6)); add(mat('#4a8a3a', { rough: 0.9 }), new THREE.ConeGeometry(0.2, 0.15, 6), M4(x, y + 0.05, z)); }
    }
  }
}

/* ---------- v7.0 近未来・機械・娯楽の町の建物（BuildingBuilder3D の木組みの家の代わり）
   足元（2D 版の建物のマス・入口の位置）は同じ。ガラスと金属の壁・階ごとの窓の帯（夜に灯る）・平らな屋根の光る縁・屋上の機械・アンテナ・自動ドア・名札 */
const MODERN = {
  tech: { body: '#22303e', metal: 0.6, rough: 0.25, win: '#9fe8ff', trim: '#46e0ff', trim2: '#ff4a8a', sign: { bg: '#06121c', panel: '#0c2234', fg: '#bff4ff' } },
  machine: { body: '#5e636c', metal: 0.4, rough: 0.55, win: '#ffd8a0', trim: '#ffb040', trim2: '#4ad8ff', sign: { bg: '#1a1c20', panel: '#2a2e34', fg: '#ffd8a0' } },
  casino: { body: '#3a1a34', metal: 0.3, rough: 0.4, win: '#ffe0f0', trim: '#ff4ab8', trim2: '#ffd24a', sign: { bg: '#1a0a18', panel: '#2a1028', fg: '#ffd24a' } }
};
export function modernStyle(key) { return MODERN[key] ? key : null; }
export function buildModernBuilding(b, key, textTexture) {
  const S = MODERN[key]; const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] }; out.group.name = 'building_modern_' + (b.id || b.name);
  const bt = new Batch(); const add = (m, g, mx) => bt.add(m, g, mx);
  const xl = b.x + 0.12, xr = b.x + b.w - 0.12, zb = b.y + 0.15, zf = b.y + b.h - 0.62; const W = xr - xl, D = zf - zb, cx = (xl + xr) / 2, cz = (zb + zf) / 2;
  const floors = b.w >= 9 || b.h >= 6 ? 3 : 2; const sh = 1.3; const H = 0.25 + floors * sh;   // 3階まで（木組みの家と同じくらいの高さ。道や人を隠しすぎない）
  const body = mat(S.body, { metal: S.metal, rough: S.rough });
  add(body, box(W, H, D), M4(cx, H / 2, cz));
  // 窓の帯（夜に灯る：userData.window）
  const winM = mat('#203040', { glow: 0.35, glowHex: S.win, rough: 0.15, metal: 0.3 }); winM.userData.keepGlow = false; winM.userData.window = true;
  const doorX = b.doorAbs ? b.doorAbs.x + 0.5 : b.x + (b.doorX || 2) + 0.5;
  for (let f = 0; f < floors; f++) {
    const y = 0.25 + f * sh + sh * 0.5;
    if (f === 0) { const lw = doorX - 0.6 - xl - 0.2, rw = xr - (doorX + 0.6) - 0.2; if (lw > 0.3) add(winM, new THREE.PlaneGeometry(lw, sh * 0.62), M4(xl + 0.1 + lw / 2, y, zf + 0.012)); if (rw > 0.3) add(winM, new THREE.PlaneGeometry(rw, sh * 0.62), M4(doorX + 0.6 + 0.1 + rw / 2, y, zf + 0.012)); }
    else add(winM, new THREE.PlaneGeometry(W * 0.9, sh * 0.5), M4(cx, y, zf + 0.012));
    for (const sx of [-1, 1]) add(winM, new THREE.PlaneGeometry(D * 0.86, sh * 0.5), M4(sx < 0 ? xl - 0.012 : xr + 0.012, y, cz, sx * Math.PI / 2));
    add(mat(S.trim, { glow: 1.6 }), box(W + 0.04, 0.05, 0.05), M4(cx, 0.25 + (f + 1) * sh - 0.05, zf + 0.02));   // 階の境の光る線
  }
  // 屋根：平らな縁・光る縁・屋上の機械・アンテナ
  add(mat('#3a4048', { metal: 0.5, rough: 0.5 }), box(W + 0.16, 0.16, D + 0.16), M4(cx, H + 0.08, cz));
  const rim = mat(S.trim, { glow: 2.2 }); add(rim, box(W + 0.2, 0.06, 0.06), M4(cx, H + 0.18, zf + 0.08)); add(rim, box(W + 0.2, 0.06, 0.06), M4(cx, H + 0.18, zb - 0.08)); add(rim, box(0.06, 0.06, D + 0.2), M4(xl - 0.08, H + 0.18, cz)); add(rim, box(0.06, 0.06, D + 0.2), M4(xr + 0.08, H + 0.18, cz));
  add(mat('#6a7078', { metal: 0.6, rough: 0.4 }), box(Math.min(1.4, W * 0.3), 0.5, Math.min(1.0, D * 0.4)), M4(cx - W * 0.2, H + 0.41, cz));
  if (key === 'machine') { add(mat('#4a4e56', { metal: 0.5 }), new THREE.CylinderGeometry(0.22, 0.28, 1.6, 10), M4(xr - 0.5, H + 0.95, zb + 0.5)); out.smokes.push(new THREE.Vector3(xr - 0.5, H + 1.8, zb + 0.5)); }
  else if (key === 'casino') add(mat(S.trim2, { glow: 2.6 }), new THREE.SphereGeometry(0.35, 14, 10), M4(cx + W * 0.25, H + 0.6, cz));
  else { add(mat('#8a9098', { metal: 0.8 }), new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), M4(cx + W * 0.28, H + 0.96, cz)); add(mat('#ff3a3a', { glow: 3.0 }), new THREE.SphereGeometry(0.09, 8, 6), M4(cx + W * 0.28, H + 1.8, cz)); add(mat('#ffffff', { glow: 1.4, map: chartTex((b.x + b.y) % 6) }), new THREE.PlaneGeometry(Math.min(2.2, W * 0.6), Math.min(1.2, W * 0.33)), M4(cx, H - sh * 0.45, zf + 0.03)); }
  // 入口：自動ドア（光るガラス）・枠・ひさし
  add(mat('#1a1e24', { metal: 0.7, rough: 0.3 }), box(1.25, 1.45, 0.08), M4(doorX, 0.25 + 0.72, zf + 0.03));
  add(mat('#dff8ff', { glow: 0.9, glowHex: S.win, rough: 0.1, opacity: 0.8 }), new THREE.PlaneGeometry(1.0, 1.25), M4(doorX, 0.25 + 0.66, zf + 0.075));
  add(mat('#2a2e34', { metal: 0.6 }), box(1.8, 0.08, 0.6), M4(doorX, 0.25 + 1.6, zf + 0.3)); add(mat(S.trim2, { glow: 2.0 }), box(1.8, 0.03, 0.03), M4(doorX, 0.25 + 1.56, zf + 0.6));
  add(mat('#7a8088', { rough: 0.6 }), box(1.6, 0.12, 0.5), M4(doorX, 0.06, zf + 0.28));
  bt.build(out.group);
  // 名札（扉の上・暗い地に明るい文字）
  if (textTexture) { const nameTex = textTexture(b.name || '', S.sign); const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshStandardMaterial({ map: nameTex, emissive: new THREE.Color('#ffffff'), emissiveMap: nameTex, emissiveIntensity: 0.6, roughness: 0.6 })); plate.material.userData.keepGlow = true; plate.position.set(doorX, 0.25 + 1.95, zf + 0.62); plate.castShadow = false; out.group.add(plate); }
  out.lights.push({ pos: new THREE.Vector3(doorX, 1.9, zf + 0.6), color: new THREE.Color(S.trim).getHex(), power: 1.0 });
  return out;
}

/* ---------- v7.1 村の作り込み（ポヨ村の専用3D：TerrainBuilder3D の上に足す）
   ・建物の前：扉の両わきの鉢植え・角の樽と木箱・玄関マット
   ・道ばた：小さな花の群れ・道の縁石（踏んでも通れる低い物だけ）
   ・風車（buildings の type 'windmill'：白い塔・とんがり屋根・回る羽根）
   ・池のアヒル（ゆっくり泳ぐ）・市場の吊り提灯（夜に灯る）・橋のたもとの灯り・畑の案山子 */
export function buildVillageDecor(map, ctx) {
  const put = ctx.put, hAt = ctx.heightAt || (() => 0), M = ctx.mats; const b = new Batch(); const add = (m, g, mx) => b.add(m, g, mx);
  const W = map.w, H = map.h; const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '_out' : map.tile(x, y);
  const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !window.Tiles.isSolid(map.tile(x, y));
  const out = { animated: [], lamps: [], stats: { planters: 0, flowers: 0, ducks: 0, lanterns: 0 } };
  const pot = mat('#9a5a3a', { rough: 0.9 }), soil = mat('#4a3020', { rough: 1 }), leaf = mat('#4a8a3a', { rough: 0.9 });
  const petals = ['#ff8ab0', '#ffd24a', '#ffffff', '#c08aff', '#ff6a5a', '#8ac8ff'].map((c) => mat(c, { rough: 0.8 }));
  const flowerTuft = (x, z, n, seed) => { const y = hAt(x, z); for (let i = 0; i < n; i++) { const a = hash(i, seed, 3) * 6.28, r = 0.08 + hash(i, seed, 5) * 0.22; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; add(leaf, new THREE.ConeGeometry(0.035, 0.16, 4), M4(px, y + 0.08, pz)); add(petals[Math.floor(hash(i, seed, 7) * petals.length)], new THREE.SphereGeometry(0.045, 6, 4), M4(px, y + 0.18, pz)); } };
  // 建物の前
  for (const bd of map.buildings) {
    if (bd.type === 'windmill') continue;
    const zf = bd.y + bd.h - 0.62; const dx = bd.doorAbs.x + 0.5;
    if (bd.type === 'watchtower') { buildWatchtower(bd, add, ctx, out); continue; }
    for (const sx of [-0.85, 0.85]) { const px = dx + sx, pz = zf + 0.24; add(pot, new THREE.CylinderGeometry(0.17, 0.12, 0.3, 10), M4(px, 0.15, pz)); add(soil, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 10), M4(px, 0.3, pz)); flowerTuft(px, pz - 0.0, 5, Math.round(px * 7 + pz)); out.stats.planters++; }
    put('barrel', M4(bd.x + 0.4, 0, zf + 0.22, hash(bd.x, bd.y) * 6), bd.x + 0.4, zf); put('crate', M4(bd.x + bd.w - 0.45, 0, zf + 0.22, hash(bd.y, bd.x) * 0.6, 0, 0, 0.8), bd.x + bd.w - 0.45, zf);
    add(mat('#8a4a3a', { rough: 1 }), box(0.9, 0.02, 0.5), M4(dx, 0.012, bd.doorAbs.y + 1.2));   // 玄関マット（扉の前の1マス）
  }
  // 道ばたの花・縁石
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const t = T(x, y); if (t !== 'grass' && t !== 'grass2') continue; if (!walk(x, y) || map.warpAt(x, y) || map.eventAt(x, y) || map.npcAt(x, y)) continue;
    const nearRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ddx, ddy]) => /road|path_stone/.test(T(x + ddx, y + ddy)));
    if (nearRoad && hash(x, y, 41) < 0.32) { flowerTuft(x + 0.5 + (hash(x, y, 2) - 0.5) * 0.5, y + 0.5 + (hash(x, y, 4) - 0.5) * 0.5, 6, x * 31 + y); out.stats.flowers++; }
    else if (hash(x, y, 43) < 0.05) { flowerTuft(x + hash(x, y, 6), y + hash(x, y, 8), 4, x * 17 + y * 3); out.stats.flowers++; }
    if (nearRoad && hash(x, y, 47) < 0.12) add(mat('#a8a49a', { rough: 0.95 }), new THREE.DodecahedronGeometry(0.09), M4(x + 0.5 + (hash(x, y, 9) - 0.5) * 0.7, hAt(x + 0.5, y + 0.5) + 0.03, y + 0.5 + (hash(x, y, 10) - 0.5) * 0.7, hash(x, y, 11) * 6, 0, 0, 1.4, 0.6, 1.1));
  }
  // 風車
  for (const bd of map.buildings) {
    if (bd.type !== 'windmill') continue;
    const cx = bd.x + bd.w / 2, cz = bd.y + bd.h / 2 - 0.2; const hgt = 4.6;
    add(mat('#efe6d2', { rough: 0.85 }), new THREE.CylinderGeometry(bd.w * 0.3, bd.w * 0.42, hgt, 16), M4(cx, hgt / 2, cz));
    add(mat('#a8483a', { rough: 0.8 }), new THREE.ConeGeometry(bd.w * 0.36, 1.6, 16), M4(cx, hgt + 0.8, cz));
    add(mat('#6a4a2a', { rough: 0.9 }), box(0.7, 1.2, 0.1), M4(cx, 0.6, cz + bd.w * 0.41)); add(mat('#3a5a8a', { glow: 0.3, glowHex: '#ffd890' }), box(0.4, 0.5, 0.06), M4(cx, 2.7, cz + bd.w * 0.36));
    add(mat('#e8e0cc', { rough: 0.85 }), box(bd.w * 0.9, 0.12, bd.w * 0.9), M4(cx, 0.06, cz));
    const hub = new THREE.Group(); hub.position.set(cx, hgt - 0.3, cz + bd.w * 0.42 + 0.15); hub.name = 'windmill_sails';
    const hb = new Batch(); const wood = mat('#6a4a2a', { rough: 0.9 }), cloth = mat('#f4ecd8', { rough: 0.95 });
    hb.add(wood, new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10), M4(0, 0, 0, 0, Math.PI / 2));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; hb.add(wood, box(0.1, 2.6, 0.08), M4(Math.sin(a) * 1.3, Math.cos(a) * 1.3, 0, 0, 0, -a)); hb.add(cloth, box(0.55, 2.0, 0.03), M4(Math.sin(a) * 1.45 + Math.cos(a) * 0.3, Math.cos(a) * 1.45 - Math.sin(a) * 0.3, 0.02, 0, 0, -a)); }
    hb.build(hub); ctx.group.add(hub); out.animated.push({ kind: 'spin', obj: hub, speed: 0.6 });
  }
  // 池のアヒル（水のマスが6つ以上かたまっている所）
  const ponds = []; const seen = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (T(x, y) !== 'water' || seen[x + ',' + y]) continue; const q = [[x, y]]; seen[x + ',' + y] = 1; const cells = []; while (q.length) { const [a, c] = q.pop(); cells.push([a, c]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (a + dx) + ',' + (c + dy); if (!seen[k] && T(a + dx, c + dy) === 'water') { seen[k] = 1; q.push([a + dx, c + dy]); } } } ponds.push(cells); }
  ponds.forEach((cells, pi) => { if (cells.length < 6) return; const n = Math.min(3, Math.floor(cells.length / 8) + 1); for (let i = 0; i < n; i++) { const c = cells[Math.floor(hash(pi, i, 3) * cells.length)]; const d = new THREE.Group(); d.name = 'duck'; const db = new Batch(); db.add(mat('#ffffff', { rough: 0.8 }), new THREE.SphereGeometry(0.14, 10, 8), M4(0, 0, 0, 0, 0, 0, 1, 0.7, 1.4)); db.add(mat(i % 2 ? '#2a6a3a' : '#ffffff', { rough: 0.8 }), new THREE.SphereGeometry(0.08, 8, 6), M4(0, 0.13, 0.15)); db.add(mat('#ffa020', { rough: 0.6 }), new THREE.ConeGeometry(0.03, 0.09, 6), M4(0, 0.12, 0.25, 0, Math.PI / 2)); db.build(d); d.position.set(c[0] + 0.5, -0.14, c[1] + 0.5); ctx.group.add(d); out.animated.push({ kind: 'duck', obj: d, cx: c[0] + 0.5, cz: c[1] + 0.5, r: 0.35 + hash(i, pi) * 0.5, ph: hash(pi, i, 9) * 6, cells }); out.stats.ducks++; } });
  // 市場の吊り提灯：舗装（path_stone）の上の街灯どうしを糸でつなぐ（同じ行・3〜9マス）
  const lamps = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (T(x, y) === 'lamp' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T(x + dx, y + dy) === 'path_stone')) lamps.push([x, y]);
  const lantern = mat('#ffb050', { glow: 1.6 }), cord = mat('#3a2a1a');
  for (const [x, y] of lamps) { const o = lamps.find(([x2, y2]) => y2 === y && x2 > x + 2 && x2 - x <= 9); if (!o) continue; const x0 = x + 0.5, x1 = o[0] + 0.5, z = y + 0.5, n = Math.round((x1 - x0) * 2); for (let i = 0; i <= n; i++) { const t = i / n; const px = x0 + (x1 - x0) * t, py = 2.3 - Math.sin(t * Math.PI) * 0.45; add(cord, box(0.5, 0.012, 0.012), M4(px, py, z)); if (i > 0 && i < n) { add(i % 3 === 0 ? mat('#ff6a6a', { glow: 1.6 }) : lantern, new THREE.SphereGeometry(0.07, 8, 6), M4(px, py - 0.1, z, 0, 0, 0, 1, 1.3, 1)); out.stats.lanterns++; } } out.lamps.push({ pos: new THREE.Vector3((x0 + x1) / 2, 2.0, z), color: 0xffb060, power: 0.8, dist: 6 }); }
  // 橋のたもとの灯り
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (T(x, y) !== 'bridge') continue; for (const dx of [-1, 1]) { if (T(x + dx, y) === 'bridge' || !/road|path/.test(T(x + dx, y))) continue; if (T(x, y - 1) === 'bridge' && T(x, y + 1) !== 'bridge') { const px = x + 0.5 + dx * 0.45, pz = y + 0.95; add(mat('#3a2a1a', { metal: 0.3 }), new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6), M4(px, 0.65, pz)); add(mat('#ffd890', { glow: 1.8 }), box(0.16, 0.2, 0.16), M4(px, 1.35, pz)); out.lamps.push({ pos: new THREE.Vector3(px, 1.4, pz), color: 0xffc070, power: 0.7, dist: 5 }); } } }
  // 畑の案山子：作物（crops）に囲まれた立て札
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (T(x, y) !== 'sign' || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T(x + dx, y + dy) === 'crops')) continue; const cx = x + 0.5, cz = y + 0.5; const wood = mat('#6a4a2a'); add(wood, box(0.08, 1.6, 0.08), M4(cx, 0.8, cz)); add(wood, box(1.1, 0.07, 0.07), M4(cx, 1.25, cz)); add(mat('#c8584a', { rough: 1 }), box(0.5, 0.55, 0.22), M4(cx, 1.15, cz)); add(mat('#e8d8a0', { rough: 1 }), new THREE.SphereGeometry(0.17, 10, 8), M4(cx, 1.62, cz)); add(mat('#c8a050', { rough: 1 }), new THREE.ConeGeometry(0.3, 0.22, 12), M4(cx, 1.78, cz)); }
  const g = new THREE.Group(); g.name = 'village_decor71'; b.build(g, { castShadow: true }); ctx.group.add(g);
  return out;
}

// v7.1 見張り台（石の塔・3段の窓・木の見張り台と屋根・旗・入口と名札）。足元は 2D 版の建物のマス
function buildWatchtower(bd, add, ctx, out) {
  const cx = bd.x + bd.w / 2, zf = bd.y + bd.h - 0.62, zb = bd.y + 0.3; const cz = (zf + zb) / 2; const tw = Math.min(bd.w - 1.2, 4.2), td = Math.min(zf - zb, 4.2);
  const stone = mat('#a8a296', { rough: 0.95 }), dark = mat('#7a746a', { rough: 0.95 }), wood = mat('#6a4a2a', { rough: 0.9 }), roof = mat('#7a3a2a', { rough: 0.8 });
  const H1 = 6.2; add(stone, box(tw, H1, td), M4(cx, H1 / 2, zf - td / 2));
  for (let y = 0.6; y < H1; y += 0.55) add(dark, box(tw + 0.04, 0.05, td + 0.04), M4(cx, y, zf - td / 2));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(dark, box(0.35, H1 + 0.1, 0.35), M4(cx + sx * tw / 2, H1 / 2, zf - td / 2 + sz * td / 2));
  for (let k = 0; k < 3; k++) { const y = 1.9 + k * 1.6; const win = mat('#2a3a5a', { glow: 0.5, glowHex: '#ffd890' }); win.userData.keepGlow = false; win.userData.window = true; add(win, box(0.5, 0.7, 0.06), M4(cx + (k === 0 ? 1.0 : 0), y, zf + 0.01)); add(wood, box(0.62, 0.08, 0.12), M4(cx + (k === 0 ? 1.0 : 0), y - 0.39, zf + 0.04)); }
  const dx = bd.doorAbs.x + 0.5; add(wood, box(0.9, 1.5, 0.1), M4(dx, 0.75, zf + 0.02)); add(dark, box(1.15, 0.2, 0.2), M4(dx, 1.6, zf + 0.06)); add(mat('#ffd890', { glow: 1.6 }), box(0.14, 0.2, 0.14), M4(dx + 0.7, 1.9, zf + 0.12));
  out.lamps.push({ pos: new THREE.Vector3(dx + 0.7, 1.9, zf + 0.5), color: 0xffc070, power: 0.8, dist: 5 });
  const py = H1; add(wood, box(tw + 1.0, 0.18, td + 1.0), M4(cx, py + 0.09, zf - td / 2));
  for (const s of [-1, 1]) { add(wood, box(tw + 1.0, 0.08, 0.08), M4(cx, py + 0.85, zf - td / 2 + s * (td / 2 + 0.5))); add(wood, box(0.08, 0.08, td + 1.0), M4(cx + s * (tw / 2 + 0.5), py + 0.85, zf - td / 2)); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(wood, box(0.14, 2.1, 0.14), M4(cx + sx * (tw / 2 + 0.42), py + 1.05, zf - td / 2 + sz * (td / 2 + 0.42)));
  add(roof, new THREE.ConeGeometry(Math.max(tw, td) * 0.95, 1.7, 4), M4(cx, py + 2.95, zf - td / 2, Math.PI / 4));
  add(wood, new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), M4(cx, py + 4.4, zf - td / 2)); add(mat('#c8584a', { rough: 1 }), box(0.7, 0.42, 0.03), M4(cx + 0.36, py + 4.9, zf - td / 2));
  add(mat('#ffd890', { glow: 1.4 }), new THREE.SphereGeometry(0.16, 10, 8), M4(cx, py + 1.6, zf - td / 2));
  out.lamps.push({ pos: new THREE.Vector3(cx, py + 1.6, zf - td / 2), color: 0xffc070, power: 1.0, dist: 9 });
  // 名札
  try { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const gx = c.getContext('2d'); if (gx) { gx.fillStyle = '#3a2210'; gx.fillRect(0, 0, 512, 128); gx.fillStyle = '#f0e2c0'; gx.fillRect(10, 10, 492, 108); gx.fillStyle = '#2a1a0a'; gx.font = 'bold 58px sans-serif'; gx.textAlign = 'center'; gx.textBaseline = 'middle'; gx.fillText(bd.name || '', 256, 66); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 })); plate.position.set(dx, 2.3, zf + 0.08); ctx.group.add(plate); } catch (e) { /* 名札なし */ }
}

/* ---------- v7.2 汎用の町の塔（新しい地区の見張りの塔・灯台・時計塔など。建物の種類 watchtower）：ポヨ村の見張り台と同じ形 */
export function buildTower3D(b) {
  const out = { group: new THREE.Group(), lights: [], smokes: [], props: [], lamps: [] }; out.group.name = 'tower72_' + b.id;
  const bt = new Batch(); const add = (m, g, mx) => bt.add(m, g, mx);
  const bd = Object.assign({ doorAbs: { x: b.x + (b.doorX || 0), y: b.y + b.h - 1 } }, b);
  buildWatchtower(bd, add, { group: out.group }, out);
  bt.build(out.group, { castShadow: true });
  return out;
}

/* ---------- v7.1 エレベーターの塔（トレディア：地上から空の区画へ。空の区画：地上へ）
   ・地上：金属の台座・高いガラスの筒（光の帯）・てっぺんの空の区画の底（浮島の裏側と光の輪）
   ・空の区画：台座と短い筒（下へ続く）・扉の上の名札 */
export function buildElevatorTower(b, map, textTexture) {
  const out = { group: new THREE.Group(), lights: [], smokes: [], props: [] }; out.group.name = 'elevator_' + b.id;
  const bt = new Batch(); const add = (m, g, mx) => bt.add(m, g, mx);
  const x0 = b.x + 0.1, x1 = b.x + b.w - 0.1, z0 = b.y + 0.15, z1 = b.y + b.h - 0.62; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const sky = map.kind === 'town' && /sky/.test(map.id);
  const metal = mat('#3a4048', { metal: 0.7, rough: 0.35 }), neon = mat('#46e0ff', { glow: 2.4 }), glass = mat('#bff4ff', { glow: 0.25, glowHex: '#9fe8ff', rough: 0.05, opacity: 0.35 });
  add(metal, box(x1 - x0, 0.5, z1 - z0), M4(cx, 0.25, cz)); add(neon, box(x1 - x0 + 0.04, 0.05, z1 - z0 + 0.04), M4(cx, 0.48, cz));
  const R = Math.min(x1 - x0, z1 - z0) * 0.48 + 0.2; const tall = sky ? 4.5 : 30;
  add(glass, new THREE.CylinderGeometry(R, R, tall, 28, 1, true), M4(cx, 0.5 + tall / 2, cz));
  for (let y = 1.5; y < tall; y += sky ? 1.2 : 2.4) add(neon, new THREE.TorusGeometry(R + 0.02, 0.03, 6, 32), M4(cx, 0.5 + y, cz, 0, Math.PI / 2));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; add(metal, box(0.12, tall, 0.12), M4(cx + Math.cos(a) * (R + 0.05), 0.5 + tall / 2, cz + Math.sin(a) * (R + 0.05))); }
  if (!sky) {   // てっぺん：空の区画の底（浮島の裏側）
    const top = 0.5 + tall; add(mat('#8a8070', { rough: 1 }), new THREE.ConeGeometry(9, 6, 10), M4(cx, top - 1.5, cz, 0, Math.PI)); add(mat('#d8dce0', { metal: 0.3, rough: 0.6 }), new THREE.CylinderGeometry(9.5, 9.2, 1.2, 24), M4(cx, top + 1.0, cz));
    add(neon, new THREE.TorusGeometry(9.5, 0.12, 6, 48), M4(cx, top + 0.45, cz, 0, Math.PI / 2));
    for (let i = 0; i < 5; i++) { const a = i * 1.26, r = 5.5; const hgt = 2 + (i % 3) * 1.5; add(mat('#22303e', { metal: 0.6, rough: 0.25 }), box(2, hgt, 2), M4(cx + Math.cos(a) * r, top + 1.6 + hgt / 2, cz + Math.sin(a) * r)); add(mat('#9fe8ff', { glow: 1.4 }), box(2.02, 0.1, 2.02), M4(cx + Math.cos(a) * r, top + 2.2, cz + Math.sin(a) * r)); }
  } else {      // 空の区画：下へ続く筒（雲の下へ）
    add(glass, new THREE.CylinderGeometry(R, R, 14, 28, 1, true), M4(cx, -7, cz));
  }
  const dx = b.doorAbs ? b.doorAbs.x + 0.5 : cx; add(mat('#dff8ff', { glow: 1.0, glowHex: '#9fe8ff', opacity: 0.85 }), new THREE.PlaneGeometry(0.95, 1.4), M4(dx, 1.2, z1 + 0.04));
  bt.build(out.group);
  if (textTexture) { const tx = textTexture(b.name || 'エレベーター', { bg: '#06121c', panel: '#0c2234', fg: '#bff4ff' }); const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ map: tx, emissive: new THREE.Color('#ffffff'), emissiveMap: tx, emissiveIntensity: 0.6 })); plate.material.userData.keepGlow = true; plate.position.set(dx, 2.3, z1 + 0.3); out.group.add(plate); }
  out.lights.push({ pos: new THREE.Vector3(dx, 1.8, z1 + 0.6), color: 0x46e0ff, power: 1.0 });
  return out;
}
