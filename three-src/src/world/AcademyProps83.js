/* =========================================================
   AcademyProps83（v8.3）：ボラティリティア学院の部屋の教材と、大図書館の吹き抜け（3D の見た目だけ）
   ・依頼（2026-11-08）「学院：確率の教材・チャート机・大図書館の吹き抜けがない」
   ・統計の教室（第二教室）・講義室：黒板に確率の板書（正規分布の山・度数の柱・さいころ・期待値の式）。第二教室の北の壁にゴルトンボード（玉が釘で左右に分かれ、下で山の形に積もる）、
     机の上にさいころとコイン
   ・実習室（量子物理研究室・古代文明研究室）と第二教室の教卓：チャート机（机の上の画面にローソク足と移動平均。シミュレーションの絵）
   ・大図書館：北と東西の壁を 2 階ぶんに高くし、2 階の回廊（床・手すり・持ち送り）と上の書架、真ん中の閲覧席の上にシャンデリアと天窓の光の筋
   ・当たり判定・人・出来事・調べる所は変えない（形を足すだけ。床の上に柱を立てない）。実機の GPU では未確認（作業環境のヘッドレス Chromium の画像でだけ確認）
   ========================================================= */
import * as THREE from 'three';
import { plain, Merge } from '../environment/EnvKit3D.js';

const M = (hex, o) => { o = o || {}; return plain(hex, { std: { roughness: o.r !== undefined ? o.r : 0.8, metalness: o.m || 0 }, emissive: o.glow ? (o.gc || hex) : undefined, ei: o.glow || undefined, keepGlow: !!o.glow, noCutout: true }); };
const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; };
const TEX = {};
function canvasTex(key, w, h, draw) { if (TEX[key]) return TEX[key]; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[key] = t; return t; }
const texMat = (t, o) => new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 0.9, metalness: 0 }, o || {}));

// 確率の板書（黒板）
function probBoard() {
  return canvasTex('prob83', 1024, 320, (g, W, H) => {
    g.fillStyle = '#21372a'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(240,240,230,0.9)'; g.fillStyle = 'rgba(240,240,230,0.92)'; g.lineWidth = 3; g.font = 'bold 26px sans-serif';
    // 正規分布の山と度数の柱
    const x0 = 40, y0 = 260, w = 330; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke();
    const bars = [2, 5, 11, 18, 22, 18, 11, 5, 2]; bars.forEach((b, i) => { g.strokeRect(x0 + 12 + i * 34, y0 - b * 8, 28, b * 8); });
    g.beginPath(); for (let i = 0; i <= 60; i++) { const t = (i / 60) * 6 - 3; const y = Math.exp(-t * t / 2); const px = x0 + 12 + (i / 60) * 306, py = y0 - y * 185; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.strokeStyle = 'rgba(255,214,120,0.95)'; g.stroke();
    g.fillText('平均 μ', x0 + 140, y0 + 34); g.font = '22px sans-serif'; g.fillText('−1σ', x0 + 88, y0 + 34); g.fillText('+1σ', x0 + 222, y0 + 34);
    // さいころ・コイン
    const die = (x, y, n) => { g.strokeStyle = 'rgba(240,240,230,0.92)'; g.strokeRect(x, y, 52, 52); const P = { 1: [[26, 26]], 2: [[14, 14], [38, 38]], 3: [[12, 12], [26, 26], [40, 40]], 4: [[14, 14], [38, 14], [14, 38], [38, 38]], 5: [[12, 12], [40, 12], [26, 26], [12, 40], [40, 40]], 6: [[14, 10], [38, 10], [14, 26], [38, 26], [14, 42], [38, 42]] }[n]; P.forEach(([a, b]) => { g.beginPath(); g.arc(x + a, y + b, 5, 0, Math.PI * 2); g.fill(); }); };
    [1, 2, 3, 4, 5, 6].forEach((n, i) => die(420 + i * 62, 24, n)); g.font = 'bold 26px sans-serif'; g.fillText('どの目も 1/6', 420, 110);
    g.beginPath(); g.arc(808, 50, 28, 0, Math.PI * 2); g.stroke(); g.fillText('表', 795, 60); g.beginPath(); g.arc(878, 50, 28, 0, Math.PI * 2); g.stroke(); g.fillText('裏', 865, 60); g.fillText('1/2', 925, 60);
    // 式
    g.font = 'bold 28px sans-serif'; g.fillText('確率 P(A) ＝ A が起きる数 ÷ 全部の数', 420, 168);
    g.fillText('期待値 ＝ 勝率×平均の利益 − 負率×平均の損失', 420, 214);
    g.fillStyle = 'rgba(255,214,120,0.95)'; g.fillText('1回の勝ち負けより、何回もくり返したときの形', 420, 262);
  });
}
// ローソク足の画面（シミュレーション）
function chartScreen(seed) {
  return canvasTex('chart83_' + seed, 256, 160, (g, W, H) => {
    g.fillStyle = '#16234a'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,0.12)'; for (let y = 20; y < H; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    let a = seed * 9301 + 49297; const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
    let p = 80; const pts = []; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const o = p; p += (r() - 0.42 + Math.sin(i / 3 + seed) * 0.35) * 16; const c = p; const hi = Math.max(o, c) + 4 + r() * 8, lo = Math.min(o, c) - 4 - r() * 8; pts.push(c); const x = 10 + i * 17.5;
      g.strokeStyle = g.fillStyle = c >= o ? '#5ce0a0' : '#ff5a60'; g.beginPath(); g.moveTo(x + 6, H - hi); g.lineTo(x + 6, H - lo); g.stroke(); g.fillRect(x, H - Math.max(o, c), 12, Math.max(3, Math.abs(c - o))); }
    g.strokeStyle = '#ffd24a'; g.lineWidth = 3; g.beginPath(); pts.forEach((v, i) => { const s = pts.slice(Math.max(0, i - 3), i + 1); const m = s.reduce((x, y) => x + y, 0) / s.length; const x = 16 + i * 17.5; if (i) g.lineTo(x, H - m); else g.moveTo(x, H - m); }); g.stroke();
    g.fillStyle = 'rgba(232,193,90,0.9)'; g.font = '12px sans-serif'; g.fillText('シミュレーション POYO/MOCHI', 6, 14);
  });
}
// ゴルトンボード
function galtonTex() {
  return canvasTex('galton83', 256, 384, (g, W, H) => {
    g.fillStyle = '#7a5434'; g.fillRect(0, 0, W, H); g.fillStyle = '#efe6d2'; g.fillRect(14, 14, W - 28, H - 28);
    g.fillStyle = '#3a2a1a'; for (let row = 0; row < 9; row++) for (let i = 0; i <= row; i++) { const x = W / 2 + (i - row / 2) * 22, y = 40 + row * 20; g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); }
    const bins = [1, 3, 7, 12, 15, 12, 7, 3, 1]; g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; for (let i = 0; i <= 9; i++) { const x = W / 2 + (i - 4.5) * 22; g.beginPath(); g.moveTo(x, 236); g.lineTo(x, H - 18); g.stroke(); }
    g.fillStyle = '#c03828'; bins.forEach((n, i) => { const x = W / 2 + (i - 4) * 22; for (let k = 0; k < n; k++) { g.beginPath(); g.arc(x, H - 26 - k * 8.4, 3.8, 0, Math.PI * 2); g.fill(); } });
    g.fillStyle = '#3a2a1a'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText('ゴルトンボード', W / 2, 30);
  });
}
// 本の背表紙
function booksTex() {
  return canvasTex('books83', 256, 128, (g, W, H) => {
    g.fillStyle = '#3a2416'; g.fillRect(0, 0, W, H); let a = 7; const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; const C = ['#7a2a2a', '#2a4a7a', '#2a6a4a', '#8a6a2a', '#5a2a6a', '#3a3a3a', '#a85a2a'];
    for (const y0 of [6, 68]) { let x = 4; while (x < W - 6) { const w = 6 + r() * 9, h = 44 + r() * 14; g.fillStyle = C[Math.floor(r() * C.length)]; g.fillRect(x, y0 + 58 - h, w, h); g.fillStyle = 'rgba(232,193,90,0.6)'; g.fillRect(x + 1, y0 + 58 - h + 6, w - 2, 2); x += w + 1; } g.fillStyle = '#5a3a24'; g.fillRect(0, y0 + 58, W, 4); }
  });
}

const ROOMS = { vol_classroom2: 'class', vol_lecture: 'lecture', vol_quantum: 'lab', vol_ancient: 'lab', vol_library: 'library' };
export function isAcademyProps83(map) { return !!(map && ROOMS[map.id]); }

export function buildAcademyProps83(map, ms) {
  const kind = map && ROOMS[map.id]; if (!kind) return null;
  const W = map.w, H = map.h; const T = (x, z) => (x < 0 || z < 0 || x >= W || z >= H) ? 'wall' : map.tile(x, z);
  const g = new THREE.Group(); g.name = 'academy83_' + map.id; const mg = new Merge(); const add = (m, gg) => mg.add(m, gg); const stats = {};
  const wood = M('#6a4426'), brass = M('#c8a050', { r: 0.35, m: 0.8 }), dark = M('#1a1a22', { r: 0.5 }), ivory = M('#f0e8d8', { r: 0.6 });
  const planeAt = (mat, w, h, x, y, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(x, y, z); p.rotation.y = ry || 0; p.geometry.userData.own = true; g.add(p); return p; };
  // 黒板の並び（行ごとの '}' の連なり）→ 確率の板書
  if (kind === 'class' || kind === 'lecture') {
    const bm = texMat(probBoard(), { roughness: 0.95 }); let n = 0;
    for (let z = 0; z < H; z++) { let x = 0; while (x < W) { if (T(x, z) !== 'blackboard') { x++; continue; } let x1 = x; while (T(x1 + 1, z) === 'blackboard') x1++; const len = x1 - x + 1;
      const facing = T(x, z + 1) !== 'wall' && !window.Tiles.isSolid(T(x, z + 1)) ? 1 : -1; const zf = z + 0.5 - facing * 0.3 + facing * 0.062;
      if (len >= 3) { planeAt(bm, len - 0.12, 0.8, x + len / 2, 1.35, zf, facing > 0 ? 0 : Math.PI); n++; }
      x = x1 + 1; } }
    stats.probBoards = n;
  }
  if (kind === 'class') {
    // ゴルトンボード：北の壁（棚と黒板のあいだ）。床には置かない
    const gm = texMat(galtonTex(), { roughness: 0.85 }); const gx = 3.0; planeAt(gm, 1.0, 1.5, gx, 1.45, 1.035, 0); add(wood, box(1.08, 0.06, 0.08, gx, 0.68, 1.06)); stats.galton = 1;
    // 机の上のさいころ・コイン
    const dieM = M('#f4f2ec', { r: 0.4 }), pip = M('#202020'), coinM = M('#d8b050', { r: 0.3, m: 0.8 }); let nd = 0;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { if (T(x, z) !== 'table' || ((x * 7 + z * 3) % 4)) continue; const cx = x + 0.5, cz = z + 0.5; add(dieM, box(0.11, 0.11, 0.11, cx - 0.12, 0.84, cz)); add(pip, box(0.03, 0.005, 0.03, cx - 0.12, 0.896, cz)); add(coinM, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16).translate(cx + 0.14, 0.79, cz + 0.05)); nd++; }
    stats.dice = nd;
  }
  // チャート机：実習室の机・カウンター、第二教室の教卓の上に画面（ローソク足）
  if (kind === 'lab' || kind === 'class') {
    let n = 0; const used = new Set();
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const t = T(x, z); if (t !== 'table' && t !== 'counter') continue; if (kind === 'lab' && t === 'counter' && (x % 3)) continue; if (kind === 'class' && t !== 'counter') continue; if (used.has(x + ',' + z)) continue; used.add(x + ',' + z);
      const cx = x + 0.5, cz = z + 0.5; const back = !window.Tiles.isSolid(T(x, z + 1)) ? -1 : 1;   // 画面は人の立つ側に向ける
      const sm = new THREE.MeshBasicMaterial({ map: chartScreen(n + map.id.length), toneMapped: false });   // 画面は光る（照明に左右されない）
      // 画面（上から見るカメラでも見えるように、後ろへ傾ける）：枠と画面を 1 つの組にして回す
      const mon = new THREE.Group(); mon.position.set(cx, 1.08, cz + back * 0.12); mon.rotation.order = 'YXZ'; mon.rotation.y = back > 0 ? Math.PI : 0; mon.rotation.x = -0.55; g.add(mon);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.48, 0.04), dark); fr.geometry.userData.own = true; mon.add(fr);
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.42), sm); sc.geometry.userData.own = true; sc.position.z = 0.022; mon.add(sc);
      add(dark, box(0.06, 0.22, 0.06, cx, 0.88, cz + back * 0.16)); add(dark, box(0.4, 0.02, 0.14, cx, 0.78, cz - back * 0.12));
      n++; if (n >= 8) break;
    }
    stats.chartDesks = n;
  }
  // 大図書館の吹き抜け
  if (kind === 'library') {
    const WH = 2.6, TOP = 5.2; const wallM = M('#5a3e28', { r: 0.85 }); const floorM = M('#6a4a30', { r: 0.8 }); const rail = M('#c8a050', { r: 0.35, m: 0.7 }); const bm = texMat(booksTex(), { roughness: 0.9 });
    const x0 = 1, x1 = W - 1, z0 = 1, zS = Math.max(4, Math.min(H - 4, 7));   // 東西の回廊は北の半分まで（手前は低いまま＝主人公が見える）
    // 高くした壁（北・東・西）
    add(wallM, box(x1 - x0, TOP - WH, 0.25, (x0 + x1) / 2, (WH + TOP) / 2, z0 - 0.12)); add(wallM, box(0.25, TOP - WH, zS - z0, x0 - 0.12, (WH + TOP) / 2, (z0 + zS) / 2)); add(wallM, box(0.25, TOP - WH, zS - z0, x1 + 0.12, (WH + TOP) / 2, (z0 + zS) / 2));
    // 2 階の回廊の床（北：奥行き 1.0・東西：0.8）と持ち送り
    add(floorM, box(x1 - x0, 0.14, 1.0, (x0 + x1) / 2, WH + 0.1, z0 + 0.5)); add(floorM, box(0.8, 0.14, zS - z0 - 1, x0 + 0.4, WH + 0.1, (z0 + 1 + zS) / 2)); add(floorM, box(0.8, 0.14, zS - z0 - 1, x1 - 0.4, WH + 0.1, (z0 + 1 + zS) / 2));
    for (let x = x0 + 1; x < x1; x += 2) add(wood, box(0.12, 0.4, 0.5, x, WH - 0.15, z0 + 0.3));
    // 手すり（柱と上の横木）
    const railAt = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az); const n = Math.max(2, Math.round(L / 0.5)); for (let i = 0; i <= n; i++) { const t = i / n; add(rail, box(0.04, 0.8, 0.04, ax + (bx - ax) * t, WH + 0.57, az + (bz - az) * t)); } const along = Math.abs(bx - ax) > Math.abs(bz - az); add(rail, box(along ? L : 0.07, 0.06, along ? 0.07 : L, (ax + bx) / 2, WH + 0.98, (az + bz) / 2)); };
    railAt(x0 + 0.8, z0 + 1.0, x1 - 0.8, z0 + 1.0); railAt(x0 + 0.8, z0 + 1.0, x0 + 0.8, zS); railAt(x1 - 0.8, z0 + 1.0, x1 - 0.8, zS);
    // 上の書架（北の壁ぞい・東西の壁ぞい）
    const shelfRow = (ax, az, len, alongX) => { for (let i = 0; i < len; i += 1.0) { const w = Math.min(1.0, len - i); const cx = alongX ? ax + i + w / 2 : ax, cz = alongX ? az : az + i + w / 2; add(wood, box(alongX ? w : 0.36, 1.75, alongX ? 0.36 : w, cx, WH + 1.05, cz)); const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, 1.6), bm); p.geometry.userData.own = true; p.position.set(alongX ? cx : cx + 0.185, WH + 1.05, alongX ? cz + 0.185 : cz); p.rotation.y = alongX ? 0 : Math.PI / 2; if (!alongX && ax > W / 2) { p.position.x = cx - 0.185; p.rotation.y = -Math.PI / 2; } g.add(p); } };
    shelfRow(x0 + 0.2, z0 + 0.2, x1 - x0 - 0.4, true); shelfRow(x0 + 0.2, z0 + 1.0, zS - z0 - 1.2, false); shelfRow(x1 - 0.2, z0 + 1.0, zS - z0 - 1.2, false);
    // シャンデリア（閲覧席の上）と天窓の光の筋
    let rx0 = W, rx1 = 0, rz0 = H, rz1 = 0; for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (T(x, z) === 'carpet') { rx0 = Math.min(rx0, x); rx1 = Math.max(rx1, x); rz0 = Math.min(rz0, z); rz1 = Math.max(rz1, z); }
    const ccx = rx1 >= rx0 ? (rx0 + rx1 + 1) / 2 : W / 2, ccz = rz1 >= rz0 ? (rz0 + rz1 + 1) / 2 : H / 2;
    const ring = new THREE.TorusGeometry(1.3, 0.05, 8, 40); ring.rotateX(Math.PI / 2); ring.translate(ccx, 3.9, ccz); add(rail, ring); add(rail, box(0.03, 1.4, 0.03, ccx, 4.6, ccz));
    const glow = M('#ffe6b0', { glow: 2.0 }); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(glow, new THREE.SphereGeometry(0.09, 10, 8).translate(ccx + Math.cos(a) * 1.3, 4.02, ccz + Math.sin(a) * 1.3)); }
    const beamM = new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    for (const [ox, oz] of [[-1.6, -0.6], [0, 0.3], [1.6, -0.6]]) { const c = new THREE.CylinderGeometry(0.35, 0.9, TOP + 0.5, 16, 1, true); c.userData.own = true; const m = new THREE.Mesh(c, beamM); m.position.set(ccx + ox, (TOP + 0.5) / 2, ccz + oz); m.renderOrder = 3; g.add(m); }
    if (ms && ms.lampSpots) ms.lampSpots.push({ pos: new THREE.Vector3(ccx, 3.8, ccz), color: 0xffe0a8, power: 1.2, dist: 9 });
    stats.atrium = { top: TOP, gallery: 3, chandelier: [+ccx.toFixed(1), +ccz.toFixed(1)] };
  }
  mg.build(g); g.userData.stats = stats; return g;
}
