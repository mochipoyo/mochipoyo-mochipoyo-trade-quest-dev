// v6.7 クイズモンスター50体の置き場所を探す（ult/quiz_place_test.js と同じ条件＋周りが広い・既存のクイズモンスターやおばさんから離れる）
const load = require('../rpgload.js'); const { w } = load(); const W = w; W.State.newGame('t', 'warrior');
const d = W.State.data; W.Quiz.ensure(d); Object.keys(d.quizMon.mon).forEach(k => d.quizMon.mon[k].defeated = true);
function reach(m, block) { const seen = new Set(); const q = []; (m.warps || []).forEach(wp => { const k = wp.x + ',' + wp.y; if (!seen.has(k)) { seen.add(k); q.push([wp.x, wp.y]); } }); if (m.def.locations) m.def.locations.forEach(l => { const k = l.x + ',' + l.y; if (!seen.has(k)) { seen.add(k); q.push([l.x, l.y]); } });
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k)) continue; if (block && nx === block[0] && ny === block[1]) continue; if (!m.passable(nx, ny, d)) continue; seen.add(k); q.push([nx, ny]); } } return seen; }
const PLAN = JSON.parse(process.argv[2]);   // [[map, count], ...]
const taken = (W.QUIZ_MONSTERS || []).map(q => ({ map: q.map, x: q.x, y: q.y }));
const out = []; let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (const [mapId, count] of PLAN) {
  const m = W.World.getMap(mapId); const base = reach(m); const cands = [];
  const near = (arr, x, y, r) => (arr || []).some(a => Math.abs(a.x - x) <= r && Math.abs(a.y - y) <= r);
  const road = (x, y) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const t = m.tile(x + dx, y + dy); if (t === 'road' || t === 'bridge') return true; } return false; };
  for (const k of base) { const [x, y] = k.split(',').map(Number); if (x < 2 || y < 2 || x >= m.w - 2 || y >= m.h - 2) continue;
    let open = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!m.passable(x + dx, y + dy, d)) open = false; if (!open) continue;
    if (near(m.npcs, x, y, 2) || near(m.chests, x, y, 2) || near(m.warps, x, y, 3) || near(m.events, x, y, 2) || (m.def.locations && near(m.def.locations, x, y, 3))) continue;
    if ((W.SEARCH_POINTS || []).some(p => p.map === mapId && Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2)) continue;
    if (W.BossSymbol && W.BossSymbol.list(m).some(s => Math.abs(s.x - x) <= 3 && Math.abs(s.y - y) <= 3)) continue;
    if (W.TRADER_MASTERS && Object.values(W.TRADER_MASTERS).some(t => t.map === mapId && Math.abs(t.x - x) <= 2 && Math.abs(t.y - y) <= 2)) continue;
    if (taken.some(t => t.map === mapId && Math.abs(t.x - x) + Math.abs(t.y - y) < (m.kind === 'field' ? 14 : 7))) continue;
    if (/water|shallow|lava|ice_crack/.test(m.tile(x, y))) continue;
    cands.push({ x, y, road: m.kind === 'field' ? road(x, y) : true });
  }
  for (let i = 0; i < count; i++) {
    let pool = cands.filter(c => c.road && !taken.some(t => t.map === mapId && Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < (m.kind === 'field' ? 14 : 7))); if (!pool.length) pool = cands.filter(c => !taken.some(t => t.map === mapId && Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < (m.kind === 'field' ? 10 : 5)));
    // ふさいでも行けなくなる場所が出ないものだけ
    let pick = null; for (let tries = 0; tries < 60 && pool.length; tries++) { const c = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; const after = reach(m, [c.x, c.y]); let lost = 0; base.forEach(k => { if (k !== c.x + ',' + c.y && !after.has(k)) lost++; }); if (!lost) { pick = c; break; } }
    if (!pick) { console.log('NONE', mapId); continue; }
    taken.push({ map: mapId, x: pick.x, y: pick.y }); out.push({ map: mapId, x: pick.x, y: pick.y, tile: m.tile(pick.x, pick.y), name: m.def.name });
    console.log(mapId, m.def.name, pick.x + ',' + pick.y, m.tile(pick.x, pick.y), 'road=' + pick.road);
  }
}
require('fs').writeFileSync(__dirname + '/quizplace.json', JSON.stringify(out));
