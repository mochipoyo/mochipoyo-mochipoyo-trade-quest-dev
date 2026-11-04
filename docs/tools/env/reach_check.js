// v7.6 環境リデザイン：論理のタイルを書き換えたマップで、行ける所が減っていないか（前後のスナップショットで比べる）
//   使い方：RPG_DIR=<リポジトリ>/ node reach_check.js <前.json> <後.json>
//   ・入口（ワープのマス）から歩いて行けるマス（4方向）を数える。NPC・宝箱・イベントは「となりのマスに立てる」か、ワープ・階段は「そのマスに立てる」か
//   ・前に行けた所・話せた人・開けられた宝箱に、後でも行けること（行けるマスの数は、新しく柱・木にしたマスの分だけ減ってよい）
const fs = require('fs');
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w } = load(); const TL = w.Tiles;
const [fa, fb] = process.argv.slice(2); const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const solidCh = (ch) => { const t = TL.byChar[ch]; return !t || TL.isSolid(t); };
function reach(m) {
  const H = m.rows.length, W = (m.rows[0] || '').length; const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !solidCh(m.rows[y][x]);
  const busy = new Set(m.npcs.map((n) => n[1] + ',' + n[2])); m.events.filter((e) => e[3]).forEach((e) => busy.add(e[1] + ',' + e[2]));
  const seen = new Set(); const q = [];
  for (const wp of m.warps) if (ok(wp[0], wp[1])) { const k = wp[0] + ',' + wp[1]; if (!seen.has(k)) { seen.add(k); q.push([wp[0], wp[1]]); } }
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !ok(nx, ny) || busy.has(k)) continue; seen.add(k); q.push([nx, ny]); } }
  const adj = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
  return { tiles: seen.size, npcs: m.npcs.filter((n) => adj(n[1], n[2])).map((n) => n[0]), chests: m.chests.filter((c) => adj(c[1], c[2])).map((c) => c[0]), events: m.events.filter((e) => adj(e[1], e[2])).map((e) => e.join(':')), warps: m.warps.filter((q) => seen.has(q[0] + ',' + q[1])).map((q) => q.join(':')) };
}
let ng = 0;
for (const id of Object.keys(B.maps)) {
  const a = A.maps[id], b = B.maps[id]; if (!a || a.rowsHash === b.rowsHash) continue;
  const ra = reach(a), rb = reach(b); const lost = {};
  for (const k of ['npcs', 'chests', 'events', 'warps']) { const s = new Set(rb[k]); const l = ra[k].filter((v) => !s.has(v)); if (l.length) lost[k] = l; }
  const bad = Object.keys(lost).length > 0; if (bad) ng++;
  console.log((bad ? 'NG  ' : 'OK  ') + id + `：行けるマス ${ra.tiles} → ${rb.tiles}・話せる人 ${ra.npcs.length} → ${rb.npcs.length}・宝箱 ${ra.chests.length} → ${rb.chests.length}・イベント ${ra.events.length} → ${rb.events.length}・ワープ ${ra.warps.length} → ${rb.warps.length}` + (bad ? ' 行けなくなった：' + JSON.stringify(lost) : ''));
}
console.log('結果：' + (ng ? ng + ' NG' : 'すべて OK')); process.exit(ng ? 1 : 0);
