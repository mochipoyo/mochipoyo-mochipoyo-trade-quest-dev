// v7.0 入ると出られない場所がないか（マップをまたいで）：各マップの「入ってくる位置」から歩いて（出入口をたどって）フィールドへ戻れるかを全マップで調べる
const load = require('../rpgload.js'); const { w } = load(); w.State.newGame('t', 'warrior');
const MD = Object.assign({}, w.MAP_DEFS); if (!MD.world && w.WORLD_DEF) MD.world = w.WORLD_DEF; const maps = {};
const gm = (id) => { if (maps[id] !== undefined) return maps[id]; try { maps[id] = new w.GameMap(MD[id]); } catch (e) { maps[id] = null; } return maps[id]; };
const walk = (m, x, y) => { if (!(x >= 0 && y >= 0 && x < m.w && y < m.h)) return false; const ev = m.eventAt(x, y); if (ev && ev.doneFlag) return true; return !w.Tiles.isSolid(m.tiles[y][x]) && !(w.Search && w.Search.solidAt(m, x, y)); };
const comp = {}; // map → 歩ける範囲ごとの出口
function reach(id, sx, sy) {
  const m = gm(id); if (!m) return null; const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]]; const out = []; let edge = false;
  while (q.length) { const [x, y] = q.shift(); const wp = m.warpAt(x, y); if (wp && MD[wp.to]) out.push(wp); if (x === 0 || y === 0 || x === m.w - 1 || y === m.h - 1) edge = true;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k)) continue; const wq = m.warpAt(nx, ny); if (!walk(m, nx, ny) && !(wq && wq.needFlag)) continue; seen.add(k); q.push([nx, ny]); } }
  const ee = w.EdgeExit && edge && w.EdgeExit.segments(m).length > 0; return { out, ee };
}
const memo = new Map();
function canField(id, x, y) {
  const start = id + ':' + x + ',' + y; const seen = new Set([start]); const q = [[id, x, y]];
  while (q.length) { const [mid, cx, cy] = q.shift(); if (MD[mid].region || /^world/.test(mid)) return true; const r = reach(mid, cx, cy); if (!r) continue; if (r.ee) return true;
    for (const wp of r.out) { const k = wp.to + ':' + wp.tx + ',' + wp.ty; if (seen.has(k)) continue; seen.add(k); q.push([wp.to, wp.tx, wp.ty]); } }
  return false;
}
const bad = [];
for (const [id, def] of Object.entries(MD)) { const m = gm(id); if (!m) continue; for (const wp of m.warps) { const t = MD[wp.to]; if (!t || t.region || /^world/.test(wp.to)) continue; if (!canField(wp.to, wp.tx, wp.ty)) bad.push(wp.to + ' (' + wp.tx + ',' + wp.ty + ')［' + id + ' から入る］→ フィールドへ戻れない'); } }
console.log([...new Set(bad)].join('\n') || 'なし'); console.log('件数', new Set(bad).size);
