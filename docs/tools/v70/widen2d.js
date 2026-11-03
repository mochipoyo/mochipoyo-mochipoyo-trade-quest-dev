// v7.0 ダンジョンの広い道：広げたマスの数・新しい抜け道ができていないこと（広げる前と後で、各マスから行けるマスの集まりが同じ＋広げたマスだけ増える）
const load = require('../rpgload.js'); const { w, errors } = load(); w.State.newGame('t', 'warrior');
const show = process.argv.slice(2); let maps = 0, total = 0; const bad = []; const per = [];
const comp = (m) => { const id = new Int32Array(m.w * m.h).fill(-1); let c = 0; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { if (id[y * m.w + x] >= 0 || w.Tiles.isSolid(m.tiles[y][x])) continue; const q = [[x, y]]; id[y * m.w + x] = c; while (q.length) { const [a, b] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = a + dx, ny = b + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || id[ny * m.w + nx] >= 0 || w.Tiles.isSolid(m.tiles[ny][nx])) continue; id[ny * m.w + nx] = c; q.push([nx, ny]); } } c++; } return id; };
for (const [mid, def] of Object.entries(w.MAP_DEFS)) {
  if (def.kind !== 'dungeon') continue;
  w.MapWiden.enabled = false; const m0 = new w.GameMap(def); w.MapWiden.enabled = true; const m1 = new w.GameMap(def);
  const n = (m1.widened || []).length; if (!n) continue; maps++; total += n; per.push(mid + ':' + n);
  // つながり：元の床のマスの組で、つながっているかどうかが変わらない
  const c0 = comp(m0), c1 = comp(m1); const map01 = {};
  for (let i = 0; i < c0.length; i++) { if (c0[i] < 0) continue; const k = c0[i]; if (map01[k] === undefined) map01[k] = c1[i]; else if (map01[k] !== c1[i]) { bad.push(mid + ' 分かれた'); break; } }
  const vals = Object.values(map01); if (new Set(vals).size !== vals.length) bad.push(mid + ' 別々だった場所がつながった');
  (m1.widened || []).forEach(([x, y]) => { if (m1.warpAt(x, y) || m1.eventAt(x, y) || m1.chestAt(x, y) || x === 0 || y === 0 || x === m1.w - 1 || y === m1.h - 1) bad.push(mid + ' 広げてはいけないマス ' + x + ',' + y); });
  if (show.includes(mid)) { for (let y = 0; y < m1.h; y++) console.log(m1.tiles[y].map((t, x) => (m1.widened.some(([a, b]) => a === x && b === y) ? '+' : w.Tiles.isSolid(t) ? '#' : '.')).join('')); }
}
console.log('広げたダンジョン', maps, '広げたマス', total); console.log(per.join(' ')); console.log('NG', bad.length, bad.slice(0, 8), 'errors', errors.slice(0, 2));
