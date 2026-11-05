// 仕上げ：南極の棚氷（南緯 77° より南は氷の陸）・船の通る海峡（2 マス幅で海に）・RLE で書き出す
const P = require('./proj.js'); const fs = require('fs');
const b = Buffer.from(fs.readFileSync('biome.bin')); const W = P.W, H = P.H; const C = (c) => c.charCodeAt(0);
for (let y = 0; y < H; y++) if (P.latOf(y + 0.5) < -77) for (let x = 0; x < W; x++) b[y * W + x] = C('I');
// 海峡：[[経度,緯度]...]（線に沿って半径 r マスを海に）
const STRAITS = {
  gibraltar: [[[-6.2, 35.95], [-5.2, 35.95]], 1.2], bosporus: [[[26.2, 40.1], [26.7, 40.4], [27.5, 40.6], [28.9, 41.0], [29.1, 41.2]], 1.0], suez: [[[32.3, 31.3], [32.5, 30.0], [32.6, 29.9]], 1.0],
  panama: [[[-79.9, 9.3], [-79.6, 9.0], [-79.5, 8.9]], 1.0], oresund: [[[12.6, 56.1], [12.8, 55.5], [12.6, 55.2]], 1.0], hormuz: [[[56.2, 26.5], [56.6, 26.0]], 1.0], bab: [[[43.3, 12.7], [43.5, 12.5]], 1.0],
  messina: [[[15.6, 38.3], [15.6, 37.9]], 0.8], kerch: [[[36.5, 45.4], [36.6, 45.1]], 0.8], bering: [[[-169.2, 66.4], [-168.6, 65.4]], 1.2], palk: [[[79.3, 9.4], [79.9, 9.8]], 0.8],
  english: [[[1.4, 51.0], [1.7, 50.8]], 1.0], dardanelles: [[[26.2, 40.1], [26.6, 40.4]], 1.0], belt: [[[10.9, 55.5], [11.0, 55.0]], 0.8], skagerrak: [[[10.5, 57.9], [11.5, 57.6]], 1.0],
  tsugaru: [[[140.6, 41.4], [141.2, 41.5]], 0.8], kanmon: [[[130.9, 34.0], [131.0, 33.9]], 0.8], sunda: [[[105.8, -5.9], [105.9, -6.2]], 0.8], malacca: [[[103.4, 1.3], [104.1, 1.2]], 1.0],
  magellan: [[[-69, -52.4], [-70.5, -53.2], [-71.5, -53.6]], 0.8], torres: [[[142.2, -10.4], [142.5, -10.0]], 0.8], hudsonS: [[[-70, 61.7], [-64.5, 60.8]], 1.0], gulfBoth: [], 
};
let carved = 0;
for (const k of Object.keys(STRAITS)) { const s = STRAITS[k]; if (!s.length) continue; const [pts, r] = s;
  for (let i = 0; i < pts.length - 1; i++) { const a = [P.xOf(pts[i][0]), P.yOf(pts[i][1])], c = [P.xOf(pts[i + 1][0]), P.yOf(pts[i + 1][1])]; while (c[0] - a[0] > W / 2) c[0] -= W; while (a[0] - c[0] > W / 2) c[0] += W; const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) * 2) + 1;
    for (let t = 0; t <= n; t++) { const px = a[0] + (c[0] - a[0]) * t / n, py = a[1] + (c[1] - a[1]) * t / n;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.hypot(dx, dy) > r + 0.3) continue; const x = ((Math.floor(px + dx) % W) + W) % W, y = Math.floor(py + dy); if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (b[i] !== C('W')) { b[i] = C('W'); carved++; } } } } }
fs.writeFileSync('biome2.bin', b); console.log('carved', carved);
// RLE：1 行ずつ「文字＋回数（36 進）」
const rows = []; for (let y = 0; y < H; y++) { let s = '', cur = b[y * W], n = 0; for (let x = 0; x <= W; x++) { const v = x < W ? b[y * W + x] : -1; if (v === cur) { n++; continue; } s += String.fromCharCode(cur) + (n > 1 ? n.toString(36) : '') + (n > 1 ? '.' : ''); cur = v; n = 1; } rows.push(s); }
const txt = JSON.stringify(rows); console.log('rle bytes', txt.length);
fs.writeFileSync('rows.json', txt);
