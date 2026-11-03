// 各フィールドの海（外周につながる最大の水の領域）で、まわり2マスがすべて水のマスを、互いに離して選ぶ（海の拾い物の場所の候補）
const load = require('../rpgload.js'); const { w } = load(); w.State.newGame('t', 'warrior');
const WET = { water: 1, shallow: 1, deep: 1 };
for (const id of Object.keys(w.MAP_DEFS).filter((k) => /^world/.test(k) || w.MAP_DEFS[k].region)) {
  const m = new w.GameMap(w.MAP_DEFS[id]); const seen = new Int32Array(m.w * m.h).fill(-1); const comps = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { if (seen[y * m.w + x] >= 0 || !WET[m.tiles[y][x]]) continue; const ci = comps.length; const q = [[x, y]]; seen[y * m.w + x] = ci; let n = 0, edge = false; const cells = [];
    while (q.length) { const [cx, cy] = q.pop(); n++; cells.push([cx, cy]); if (cx === 0 || cy === 0 || cx === m.w - 1 || cy === m.h - 1) edge = true; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[ny * m.w + nx] >= 0 || !WET[m.tiles[ny][nx]]) continue; seen[ny * m.w + nx] = ci; q.push([nx, ny]); } }
    comps.push({ n, edge, cells }); }
  comps.sort((a, b) => b.n - a.n); const big = comps[0]; if (!big || big.n < 150) { console.log(id, '海なし', big ? big.n : 0); continue; }
  const tcount = {}; big.cells.forEach(([x, y]) => { const t = m.tiles[y][x]; tcount[t] = (tcount[t] || 0) + 1; });
  const open = big.cells.filter(([x, y]) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = m.tile(x + dx, y + dy); if (!WET[t]) return false; } if (x < 6 || y < 6 || x >= m.w - 6 || y >= m.h - 6) return false; let near = 99; for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; if (!WET[m.tiles[yy][xx]]) near = Math.min(near, Math.max(Math.abs(dx), Math.abs(dy))); } if (near < 3 || near > 9) return false; return !m.warpAt(x, y) && !m.eventAt(x, y); });
  const pick = []; const want = ['water', 'deep'];
  // 浅め（帆船でも行ける water）を優先して、互いに 18 マス以上離す
  for (const pref of want) for (const c of open.filter(([x, y]) => m.tiles[y][x] === pref).sort((a, b) => ((a[0] * 7919 + a[1] * 104729) % 1000) - ((b[0] * 7919 + b[1] * 104729) % 1000))) { if (pick.length >= 5) break; if (pick.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) >= 24)) pick.push(c); }
  console.log(id, 'size', m.w + 'x' + m.h, 'sea', big.n, 'edge', big.edge, JSON.stringify(tcount), 'pick', JSON.stringify(pick.map(([x, y]) => [x, y, m.tiles[y][x]])));
}
