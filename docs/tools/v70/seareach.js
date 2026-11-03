// 海の拾い物：その地方へ船で着く海路の辺（SEA_ROUTES の to.edge）の水から、遠洋航海船で届くか（アルカディアは帆船の出発点から）
const load = require('../rpgload.js'); const { w } = load(); w.State.newGame('t', 'warrior'); const S = w.SeaTreasure;
const R = Array.isArray(w.SEA_ROUTES) ? w.SEA_ROUTES : Object.values(w.SEA_ROUTES); let bad = 0;
for (const id of [...new Set(S.LIST.map((t) => t.map))]) {
  const m = new w.GameMap(w.MAP_DEFS[id]); const veh = id === 'world' ? 'sailboat' : 'galleon'; const starts = [];
  if (id === 'world') { const h = w.Vehicle.findWaterNear(m, w.VEHICLES.sailboat.home.x, w.VEHICLES.sailboat.home.y, 'sailboat'); starts.push([h.x, h.y]); }
  R.filter((r) => r.to && r.to.map === id && [].concat(r.vehicle).some((v) => v !== 'airship')).forEach((r) => { const e = r.to.edge; for (let i = 0; i < (e === 'north' || e === 'south' ? m.w : m.h); i++) { const x = e === 'west' ? 0 : e === 'east' ? m.w - 1 : i, y = e === 'north' ? 0 : e === 'south' ? m.h - 1 : i; if (w.Vehicle.terrainOk(veh, m, x, y)) starts.push([x, y]); } });
  const seen = new Set(starts.map((s) => s.join(','))); const q = starts.slice(); while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !w.Vehicle.terrainOk(veh, m, nx, ny)) continue; seen.add(k); q.push([nx, ny]); } }
  const res = S.LIST.filter((t) => t.map === id).map((t) => { const okk = seen.has(t.x + ',' + t.y); if (!okk) bad++; return t.id + ':' + (okk ? 'OK' : 'NG'); });
  console.log(id, '着く場所', starts.length, res.join(' '));
}
console.log('結果：届かない拾い物 ' + bad);
