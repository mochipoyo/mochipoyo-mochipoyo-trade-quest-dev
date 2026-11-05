// 陸の多角形をラスタに（スキャンライン。多角形ごとに経度を巻き戻して東西の継ぎ目をまたいでも正しく塗る）
const P = require('./proj.js');
function rings(geom) { const out = []; const add = (poly) => poly.forEach((r) => out.push(r)); if (geom.type === 'Polygon') add(geom.coordinates); else if (geom.type === 'MultiPolygon') geom.coordinates.forEach(add); return out; }
function fillRings(buf, rs, val) {   // 偶奇規則（穴も正しく）。sub-sample 中心で判定
  const edges = [];
  rs.forEach((ring) => { let px = null; const pts = ring.map(([lon, lat]) => { let x = P.xOf(lon); if (px !== null) { while (x - px > P.W / 2) x -= P.W; while (px - x > P.W / 2) x += P.W; } px = x; return [x, P.yOf(Math.max(-85, Math.min(85, lat)))]; });
    for (let i = 0; i < pts.length - 1; i++) edges.push([pts[i], pts[i + 1]]); });
  const cnt = new Uint8Array(P.W * P.H);
  for (let y = 0; y < P.H; y++) { const yc = y + 0.5; const xs = [];
    for (const [a, b] of edges) { if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) { xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.ceil(xs[i] - 0.5), x1 = Math.floor(xs[i + 1] - 0.5); for (let x = x0; x <= x1; x++) { const xx = ((x % P.W) + P.W) % P.W; cnt[y * P.W + xx] ^= 1; } }
  }
  for (let i = 0; i < cnt.length; i++) if (cnt[i]) buf[i] = val;
}
module.exports = { rings, fillRings };
