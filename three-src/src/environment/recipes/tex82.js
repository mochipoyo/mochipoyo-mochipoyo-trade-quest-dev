/* =========================================================
   tex82（v8.2）：屋内の壁・床・敷物の模様（キャンバスに手続きで描く。写真・市販素材なし。参考画像は見ただけで使っていない）
   ・wallTex(kind, c1, c2, opt)・floorTex(kind, c1, c2)・rugTex(kind, c1, c2)：アプリに 1 つ（同じ引数は使い回す）
   ・画像 1 枚＝壁は横 2 マス・高さ 2.5、床は 2×2 マス（interior82.js の UV）
   ========================================================= */
import * as THREE from 'three';
import { canvasTex, texMat, shade } from './geo.js';
import { rng } from '../EnvKit3D.js';
import { settsHeight } from '../ProcPBR.js';

const S = 256;
const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
function noise(g, base, n, amp, r, sz) { g.fillStyle = base; g.fillRect(0, 0, S, S); for (let i = 0; i < n; i++) { const k = 1 - amp / 2 + r() * amp; g.fillStyle = shade(base, k); g.globalAlpha = 0.25 + r() * 0.35; const s = (sz || 6) * (0.4 + r()); g.fillRect(r() * S, r() * S, s, s); } g.globalAlpha = 1; }
function boards(g, c1, c2, n, vertical, r, o) {
  o = o || {}; const w = S / n;
  for (let i = 0; i < n; i++) {
    const col = o.mixed && r() < 0.35 ? mix(c1, '#f0dcb0', 0.35) : shade(i % 2 ? c1 : mix(c1, c2, 0.25), 0.9 + r() * 0.2);
    g.fillStyle = col; if (vertical) g.fillRect(i * w, 0, w, S); else g.fillRect(0, i * w, S, w);
    // 木目
    g.strokeStyle = shade(col, 0.82); g.globalAlpha = 0.5; g.lineWidth = 1;
    for (let k = 0; k < 4; k++) { g.beginPath(); const off = r() * w; if (vertical) { g.moveTo(i * w + off, 0); g.bezierCurveTo(i * w + off + 3, S * 0.3, i * w + off - 3, S * 0.7, i * w + off, S); } else { g.moveTo(0, i * w + off); g.bezierCurveTo(S * 0.3, i * w + off + 3, S * 0.7, i * w + off - 3, S, i * w + off); } g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = c2; if (vertical) g.fillRect(i * w, 0, o.gap || 2, S); else g.fillRect(0, i * w, S, o.gap || 2);
    // 継ぎ目（板の端）
    if (o.joints !== false) { const j = r() * S; g.fillStyle = c2; if (vertical) g.fillRect(i * w, j, w, 2); else g.fillRect(j, i * w, 2, w); }
    if (o.nails) { g.fillStyle = '#2a2420'; for (const yy of [8, S - 8]) { if (vertical) { g.fillRect(i * w + 4, yy, 2, 2); g.fillRect(i * w + w - 6, yy, 2, 2); } else { g.fillRect(yy, i * w + 4, 2, 2); g.fillRect(yy, i * w + w - 6, 2, 2); } } }
  }
}
function blocks(g, c1, c2, bw, bh, r, o) {
  o = o || {}; g.fillStyle = c2; g.fillRect(0, 0, S, S);
  for (let y = 0, row = 0; y < S; y += bh, row++) for (let x = -((row % 2) * bw) / 2; x < S; x += bw) {
    const k = 1 - (o.vari || 0.16) / 2 + r() * (o.vari || 0.16); let col = shade(c1, k); if (o.soot) col = mix(col, '#1a1410', o.soot * (1 - y / S) * (0.6 + r() * 0.4));
    g.fillStyle = col; const m = o.mortar || 2; if (o.round) { g.beginPath(); g.ellipse(x + bw / 2, y + bh / 2, bw / 2 - m, bh / 2 - m, 0, 0, Math.PI * 2); g.fill(); } else g.fillRect(x + m, y + m, bw - m * 2, bh - m * 2);
    if (o.speck) for (let i = 0; i < 6; i++) { g.fillStyle = shade(col, 0.75); g.fillRect(x + r() * bw, y + r() * bh, 2, 2); }
  }
}
function tiles(g, c1, c2, n, r, o) {
  o = o || {}; const w = S / n; g.fillStyle = o.grout || shade(c2, 0.8); g.fillRect(0, 0, S, S);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const alt = o.checker ? (i + j) % 2 : 0; let col = alt ? c2 : c1; col = shade(col, 0.94 + r() * 0.12); g.fillStyle = col; const m = o.gap === undefined ? 1.5 : o.gap; g.fillRect(i * w + m, j * w + m, w - m * 2, w - m * 2);
    if (o.star && (i + j) % 2 === 0) { g.fillStyle = c2; g.beginPath(); const cx = i * w + w / 2, cy = j * w + w / 2; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const rr = k % 2 ? w * 0.16 : w * 0.36; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.fill(); } }
}
function herring(g, c1, c2, r) {   // 寄せ木（山形）：列ごとに斜めの板が逆を向く
  const s = 16, Wc = 32; const img = g.createImageData(S, S); const A = new THREE.Color(c1), Bc = new THREE.Color(c2); const tone = {};
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const c = Math.floor(x / Wc), lx = x % Wc; const t = c % 2 ? (y + lx) : (y - lx + Wc); const k = Math.floor(t / s); const key = c + ':' + k;
    if (tone[key] === undefined) tone[key] = 0.82 + r() * 0.3; let f = tone[key]; const edge = (t % s) < 1.6 || lx < 1 || lx > Wc - 1.5;
    const grain = 0.94 + 0.06 * Math.sin((c % 2 ? x - y : x + y) * 0.9 + k);
    const cc = edge ? Bc : A; const m = edge ? 1 : f * grain; const i = (y * S + x) * 4; img.data[i] = Math.min(255, cc.r * 255 * m); img.data[i + 1] = Math.min(255, cc.g * 255 * m); img.data[i + 2] = Math.min(255, cc.b * 255 * m); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
function damask(g, c1, c2) {
  g.fillStyle = c1; g.fillRect(0, 0, S, S); g.fillStyle = c2; g.globalAlpha = 0.55;
  for (const [cx, cy] of [[64, 64], [192, 192], [192, 64 - 128], [64, 192 + 0]]) {
    for (const [ox, oy] of [[0, 0], [128, 128], [-128, 128], [128, -128]]) { const x = cx + ox, y = cy + oy; g.beginPath(); g.ellipse(x, y, 18, 34, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x - 22, y + 6, 10, 18, -0.6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x + 22, y + 6, 10, 18, 0.6, 0, Math.PI * 2); g.fill(); g.fillRect(x - 2, y - 52, 4, 104); }
  }
  g.globalAlpha = 1; g.fillStyle = shade(c1, 0.8); for (let x = 0; x < S; x += 64) g.fillRect(x, 0, 1, S);
}
function stripes(g, c1, c2, n) { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * S / n, 0, S / n, S); } }
function veins(g, c1, c2, r) { g.fillStyle = c1; g.fillRect(0, 0, S, S); g.strokeStyle = c2; for (let i = 0; i < 9; i++) { g.globalAlpha = 0.25 + r() * 0.35; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); let x = r() * S, y = 0; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 60; y += S / 8; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = 1; }
function stains(g, c, r, n, a) { for (let i = 0; i < n; i++) { const x = r() * S, w = 10 + r() * 30, h = 40 + r() * 160; const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, c); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = grd; g.fillRect(x, 0, w, h); } g.globalAlpha = 1; }
function weave(g, c1, c2, r) { g.fillStyle = c1; g.fillRect(0, 0, S, S); g.globalAlpha = 0.25; g.fillStyle = c2; for (let i = 0; i < S; i += 4) { g.fillRect(i, 0, 1, S); g.fillRect(0, i, S, 1); } g.globalAlpha = 1; noise(g, 'rgba(0,0,0,0)', 0, 0, r); }
function panels(g, c1, c2, nx, ny, r, o) {
  o = o || {}; g.fillStyle = c2; g.fillRect(0, 0, S, S); const w = S / nx, h = S / ny;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { g.fillStyle = shade(c1, 0.95 + r() * 0.08); g.fillRect(i * w + 3, j * h + 3, w - 6, h - 6);
    if (o.raised) { g.fillStyle = shade(c1, 1.12); g.fillRect(i * w + 10, j * h + 10, w - 20, 3); g.fillRect(i * w + 10, j * h + 10, 3, h - 20); g.fillStyle = shade(c1, 0.75); g.fillRect(i * w + 10, j * h + h - 13, w - 20, 3); g.fillRect(i * w + w - 13, j * h + 10, 3, h - 20); }
    if (o.rivets) { g.fillStyle = shade(c2, 0.7); for (const [px, py] of [[8, 8], [w - 10, 8], [8, h - 10], [w - 10, h - 10]]) g.fillRect(i * w + px, j * h + py, 3, 3); }
    if (o.rust && r() < 0.4) { g.globalAlpha = 0.35; g.fillStyle = '#8a4a24'; g.fillRect(i * w + r() * w * 0.6, j * h + r() * h * 0.6, 20 + r() * 30, 14 + r() * 30); g.globalAlpha = 1; } }
}

const DRAW_WALL = {
  plaster: (g, a, b, r) => { noise(g, a, 900, 0.1, r, 8); },
  ashlar: (g, a, b, r) => blocks(g, a, b, 128, 64, r, { vari: 0.12, mortar: 2 }),
  ashlar_arch: (g, a, b, r) => blocks(g, a, b, 128, 48, r, { vari: 0.1, mortar: 2 }),
  rubble_timber: (g, a, b, r) => { noise(g, b, 600, 0.12, r, 8); },
  log: (g, a, b, r) => { for (let i = 0; i < 8; i++) { const y = i * 32; const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, shade(a, 0.7)); gr.addColorStop(0.45, shade(a, 1.12)); gr.addColorStop(1, shade(b, 0.7)); g.fillStyle = gr; g.fillRect(0, y, S, 32); } },
  whitewash: (g, a, b, r) => { noise(g, a, 700, 0.06, r, 10); },
  brick: (g, a, b, r, o) => blocks(g, a, shade(b, 1.4), 64, 24, r, { vari: 0.24, mortar: 2, soot: (o && o.soot) || 0 }),
  stone_panel: (g, a, b, r) => panels(g, a, b, 2, 3, r),
  marble: (g, a, b, r) => { veins(g, a, b, r); g.fillStyle = shade(a, 0.86); g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S); },
  driftwood: (g, a, b, r) => boards(g, a, b, 7, true, r, { gap: 3, nails: true, joints: false }),
  ruin_plaster: (g, a, b, r, o) => { noise(g, a, 900, 0.14, r, 10); for (let i = 0; i < 5; i++) { const x = r() * S, y = r() * S, w = 30 + r() * 60, h = 20 + r() * 50; g.fillStyle = (o && o.lath) || '#6a5a44'; g.fillRect(x, y, w, h); g.fillStyle = shade(a, 0.6); for (let k = 0; k < h; k += 7) g.fillRect(x, y + k, w, 2); } stains(g, 'rgba(60,50,40,0.9)', r, 7, 0.35); },
  walnut_panel: (g, a, b, r) => panels(g, a, b, 2, 2, r, { raised: true }),
  metal_panel: (g, a, b, r) => panels(g, a, b, 2, 2, r, { rivets: true }),
  laminate: (g, a, b, r) => { noise(g, a, 300, 0.04, r, 12); g.fillStyle = b; g.fillRect(0, 0, 2, S); g.fillRect(S / 2, 0, 1, S); },
  wallpaper: (g, a, b, r, o) => (o && o.pattern === 'stripe' ? stripes(g, a, b, 16) : damask(g, a, b)),
  stone_wood: (g, a, b, r) => panels(g, b, shade(b, 0.7), 2, 2, r, { raised: true }),
  glass_curve: (g, a, b, r) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b; for (let x = 0; x < S; x += 64) g.fillRect(x, 0, 3, S); },
  velvet: (g, a, b, r) => { for (let x = 0; x < S; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, shade(a, 0.7)); gr.addColorStop(0.5, shade(a, 1.15)); gr.addColorStop(1, shade(a, 0.7)); g.fillStyle = gr; g.fillRect(x, 0, 16, S); } },
  adobe: (g, a, b, r) => { noise(g, a, 900, 0.12, r, 14); },
  cloth_frame: (g, a, b, r) => { weave(g, a, b, r); },
  vplank: (g, a, b, r) => boards(g, a, b, 8, true, r, { gap: 2, joints: false }),
  tile_frost: (g, a, b, r) => tiles(g, a, mix(a, b, 0.4), 8, r, { grout: '#f4f6f8', gap: 1.5 }),
  basalt: (g, a, b, r) => blocks(g, a, b, 96, 56, r, { vari: 0.2, mortar: 3, speck: true }),
  earth: (g, a, b, r) => { noise(g, a, 1400, 0.22, r, 10); },
  canvas: (g, a, b, r) => { weave(g, a, b, r); g.fillStyle = shade(a, 0.8); g.fillRect(S / 2 - 2, 0, 4, S); },
  canvas_iron: (g, a, b, r) => { weave(g, a, b, r); g.fillStyle = '#3a3e40'; g.fillRect(0, 60, S, 10); g.fillRect(0, 186, S, 10); },
  plank: (g, a, b, r) => boards(g, a, b, 8, false, r, { gap: 2 }),
  plank_mixed: (g, a, b, r) => boards(g, a, b, 8, false, r, { gap: 2, mixed: true }),
  scorched: (g, a, b, r) => { boards(g, a, b, 8, false, r, { gap: 3 }); const gr = g.createLinearGradient(0, S, 0, 0); gr.addColorStop(0, 'rgba(20,14,10,0.1)'); gr.addColorStop(1, 'rgba(20,14,10,0.85)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); },
  pipes_patch: (g, a, b, r) => panels(g, a, b, 3, 2, r, { rivets: true, rust: true }),
  plywood: (g, a, b, r) => { panels(g, a, b, 1, 2, r); noise(g, 'rgba(0,0,0,0)', 0, 0, r); },
  coral_stone: (g, a, b, r) => { blocks(g, a, b, 96, 48, r, { vari: 0.08, mortar: 2 }); g.fillStyle = shade(b, 0.8); for (let i = 0; i < 160; i++) { g.globalAlpha = 0.4; g.beginPath(); g.arc(r() * S, r() * S, 1 + r() * 2, 0, 7); g.fill(); } g.globalAlpha = 1; }
};
const DRAW_FLOOR = {
  plank: (g, a, b, r) => boards(g, a, b, 6, false, r, { gap: 2 }),
  worn_plank: (g, a, b, r) => { boards(g, a, b, 5, false, r, { gap: 3 }); noise(g, 'rgba(0,0,0,0)', 0, 0, r); },
  wide_plank: (g, a, b, r) => boards(g, a, b, 4, false, r, { gap: 2, nails: true }),
  flag: (g, a, b, r) => blocks(g, a, b, 128, 96, r, { vari: 0.16, mortar: 3 }),
  earth: (g, a, b, r) => noise(g, a, 1600, 0.25, r, 8),
  terracotta: (g, a, b, r) => tiles(g, a, b, 4, r, { grout: '#d8c8a8', gap: 2 }),
  steel_plate: (g, a, b, r) => { panels(g, a, b, 2, 2, r, { rivets: true }); g.strokeStyle = shade(a, 1.2); g.globalAlpha = 0.3; for (let i = 0; i < S; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 12, 12); g.stroke(); } g.globalAlpha = 1; },
  big_tile: (g, a, b, r) => tiles(g, a, b, 2, r, { grout: shade(b, 0.8), gap: 2 }),
  marble_inlay: (g, a, b, r) => { veins(g, a, '#d8d0c0', r); g.strokeStyle = b; g.lineWidth = 6; g.strokeRect(16, 16, S - 32, S - 32); g.beginPath(); g.moveTo(S / 2, 16); g.lineTo(S - 16, S / 2); g.lineTo(S / 2, S - 16); g.lineTo(16, S / 2); g.closePath(); g.lineWidth = 3; g.stroke(); },
  driftwood: (g, a, b, r) => boards(g, a, b, 6, false, r, { gap: 4, nails: true }),
  broken_plank: (g, a, b, r) => { boards(g, a, b, 5, false, r, { gap: 4 }); stains(g, 'rgba(30,24,18,0.9)', r, 6, 0.3); },
  checker: (g, a, b, r) => tiles(g, a, b, 4, r, { checker: true, gap: 0.6 }),
  stone_tile: (g, a, b, r) => tiles(g, a, mix(a, b, 0.3), 4, r, { checker: true, grout: shade(b, 0.8) }),
  grate: (g, a, b, r) => { g.fillStyle = b; g.fillRect(0, 0, S, S); g.fillStyle = a; for (let i = 0; i < S; i += 16) { g.fillRect(i, 0, 10, S); } g.fillStyle = shade(b, 0.7); for (let j = 0; j < S; j += 64) g.fillRect(0, j, S, 4); },
  lino: (g, a, b, r) => tiles(g, a, b, 8, r, { checker: true, gap: 0.4, grout: b }),
  herringbone: (g, a, b, r) => herring(g, a, b, r),
  parquet: (g, a, b, r) => { g.fillStyle = b; g.fillRect(0, 0, S, S); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = (i + j) % 2; for (let k = 0; k < 4; k++) { g.fillStyle = shade(a, 0.88 + r() * 0.2); if (v) g.fillRect(i * 64 + 2, j * 64 + k * 16 + 1, 60, 14); else g.fillRect(i * 64 + k * 16 + 1, j * 64 + 2, 14, 60); } } },
  marble: (g, a, b, r) => { veins(g, a, b, r); g.fillStyle = shade(a, 0.9); g.fillRect(0, 0, S, 1); g.fillRect(0, 0, 1, S); g.fillRect(0, S / 2, S, 1); g.fillRect(S / 2, 0, 1, S); },
  carpet_pattern: (g, a, b, r) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); const cx = i * 64 + 32, cy = j * 64 + 32; g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.fill(); } g.fillStyle = '#d8b058'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 30, j * 64 + 30, 4, 4); },
  grooved: (g, a, b, r) => { blocks(g, a, b, 128, 128, r, { vari: 0.14, mortar: 2 }); g.fillStyle = shade(b, 0.6); g.fillRect(S / 2 - 4, 0, 8, S); },
  patched_plank: (g, a, b, r) => { boards(g, a, b, 6, false, r, { gap: 2 }); for (let i = 0; i < 4; i++) { g.fillStyle = shade(a, 1.2 + r() * 0.2); g.fillRect(r() * S, r() * S, 40, 20); } },
  mat: (g, a, b, r) => weave(g, a, b, r),
  pallet: (g, a, b, r) => { g.fillStyle = shade(b, 0.6); g.fillRect(0, 0, S, S); for (let i = 0; i < 8; i++) { g.fillStyle = shade(a, 0.9 + r() * 0.2); g.fillRect(0, i * 32 + 4, S, 22); } },
  plank_mixed: (g, a, b, r) => boards(g, a, b, 6, false, r, { gap: 2, mixed: true }),
  scorched_plank: (g, a, b, r) => { boards(g, a, b, 6, false, r, { gap: 3 }); stains(g, 'rgba(10,8,6,0.9)', r, 10, 0.4); },
  wet_concrete: (g, a, b, r) => { noise(g, a, 800, 0.12, r, 12); g.globalAlpha = 0.25; g.fillStyle = '#8ab8d8'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 30, 8 + r() * 10, 0, 0, 7); g.fill(); } g.globalAlpha = 1; },
  plywood: (g, a, b, r) => panels(g, a, b, 1, 2, r),
  teal_tile: (g, a, b, r) => tiles(g, a, b, 6, r, { checker: true, star: true, gap: 1 }),
  wet_stone: (g, a, b, r) => { blocks(g, a, b, 96, 64, r, { vari: 0.2, mortar: 3 }); g.globalAlpha = 0.3; g.fillStyle = '#2a4a3a'; for (let i = 0; i < 10; i++) g.fillRect(r() * S, r() * S, 30, 6); g.globalAlpha = 1; }
};
const DRAW_RUG = {
  persian: (g, a, b, r) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.strokeStyle = b; g.lineWidth = 10; g.strokeRect(14, 14, S - 28, S - 28); g.fillStyle = b; g.beginPath(); g.ellipse(S / 2, S / 2, 60, 40, 0, 0, 7); g.fill(); g.fillStyle = '#c8a050'; g.beginPath(); g.ellipse(S / 2, S / 2, 30, 18, 0, 0, 7); g.fill(); for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#c8a050' : shade(a, 1.3); g.fillRect(30 + i * 17, 30, 6, 6); g.fillRect(30 + i * 17, S - 36, 6, 6); } },
  runner: (g, a, b) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b; g.fillRect(0, 10, S, 8); g.fillRect(0, S - 18, S, 8); },
  bordered: (g, a, b) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.strokeStyle = b; g.lineWidth = 8; g.strokeRect(10, 10, S - 20, S - 20); g.lineWidth = 2; g.strokeRect(26, 26, S - 52, S - 52); },
  woven: (g, a, b) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(0, i * 16, S, 16); } },
  grass: (g, a, b, r) => weave(g, a, b, r),
  quilt: (g, a, b, r) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = [a, b, '#c8b890', '#7a5a4a'][(i * 3 + j) % 4]; g.fillRect(i * 64, j * 64, 64, 64); g.strokeStyle = '#3a3028'; g.setLineDash([4, 3]); g.strokeRect(i * 64 + 2, j * 64 + 2, 60, 60); } g.setLineDash([]); },
  torn: (g, a, b, r) => { g.fillStyle = a; g.fillRect(0, 0, S, S); stains(g, 'rgba(20,16,12,0.9)', r, 8, 0.4); },
  kilim: (g, a, b) => { g.fillStyle = a; g.fillRect(0, 0, S, S); for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? b : '#e8d8b0'; g.beginPath(); const y = 32 + k * 64; for (let x = 0; x <= S; x += 32) { g.lineTo(x, y + (x / 32 % 2 ? -14 : 14)); } g.lineTo(S, y + 20); g.lineTo(0, y + 20); g.fill(); } },
  wool: (g, a, b) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b; for (let i = 0; i < 8; i++) g.fillRect(0, i * 32 + 12, S, 6); },
  fur: (g, a, b, r) => { g.fillStyle = a; g.fillRect(0, 0, S, S); for (let i = 0; i < 1500; i++) { g.strokeStyle = shade(r() < 0.5 ? a : b, 0.85 + r() * 0.3); g.globalAlpha = 0.5; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 6); g.stroke(); } g.globalAlpha = 1; },
  patch: (g, a, b, r) => DRAW_RUG.quilt(g, a, b, r),
  mat: (g, a, b, r) => weave(g, a, b, r),
  plain: (g, a, b) => { g.fillStyle = a; g.fillRect(0, 0, S, S); g.strokeStyle = b; g.lineWidth = 4; g.strokeRect(6, 6, S - 12, S - 12); }
};
const PBRH = (k) => settsHeight(64, 32, k);
export function wallTex(kind, c1, c2, opt) {
  const d = DRAW_WALL[kind] || DRAW_WALL.plaster; const key = 'w82_' + kind + c1 + c2 + JSON.stringify(opt || {});
  const t = canvasTex(key, S, S, (g) => d(g, c1, c2, rng(key.length * 131 + c1.charCodeAt(1)), opt || {}));
  return texMat(key, t, { roughness: /marble|glass|laminate|metal/.test(kind) ? 0.45 : 0.88, metalness: /metal|pipes/.test(kind) ? 0.25 : 0 }, { height: PBRH(kind.length), depth: 2 });
}
export function floorTex(kind, c1, c2) {
  const d = DRAW_FLOOR[kind] || DRAW_FLOOR.plank; const key = 'f82_' + kind + c1 + c2;
  const t = canvasTex(key, S, S, (g) => d(g, c1, c2, rng(key.length * 977 + c2.charCodeAt(2))));
  return texMat(key, t, { roughness: /marble|checker|lino|tile/.test(kind) ? 0.4 : /wet/.test(kind) ? 0.3 : 0.8, metalness: /grate|steel/.test(kind) ? 0.35 : 0 }, { height: PBRH(kind.length + 3), depth: 2 });
}
export function rugTex(kind, c1, c2) {
  const d = DRAW_RUG[kind] || DRAW_RUG.plain; const key = 'r82_' + kind + c1 + c2;
  const t = canvasTex(key, S, S, (g) => d(g, c1, c2, rng(key.length * 53)));
  return texMat(key, t, { roughness: 0.97 });
}
export const WALL_KINDS = Object.keys(DRAW_WALL), FLOOR_KINDS = Object.keys(DRAW_FLOOR);
