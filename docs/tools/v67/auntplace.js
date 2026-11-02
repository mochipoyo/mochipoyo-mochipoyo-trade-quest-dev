// v6.7 物知りおばさんの置き場所を探す：町ごとに、広い場所（周り5×5が通れる）・出入口/NPC/宝箱/イベント/調べる場所から離れた・広場（なければ中心）に近いマス
const load = require('../rpgload.js'); const { w } = load(); w.State.newGame('t', 'warrior');
const MD = w.MAP_DEFS, T = w.Tiles; const SKIP = { aruna_ruins: 1 };
const out = {};
for (const id of Object.keys(MD)) { let m; try { m = w.World.getMap(id); } catch (e) { continue; } if (m.kind !== 'town' || SKIP[id]) continue;
  const solid = (x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || T.isSolid(m.tiles[y][x]) || /water|shallow|door|warp|counter|bld/.test(m.tiles[y][x]);
  const warps = (MD[id].warps || []).concat(m.warps || []); const bl = (m.buildings || []).map(b => b.doorAbs).filter(Boolean);
  const pz = MD[id].plaza || { x: Math.floor(m.w / 2), y: Math.floor(m.h / 2) };
  let best = null;
  for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
    let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2 && ok; dx++) if (solid(x + dx, y + dy)) ok = false; if (!ok) continue;
    if ((m.npcs || []).some(n => Math.max(Math.abs(n.x - x), Math.abs(n.y - y)) <= 3)) continue;
    if (warps.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) <= 4)) continue;
    if (bl.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) <= 3)) continue;
    if ((m.chests || []).some(c => Math.abs(c.x - x) + Math.abs(c.y - y) <= 2)) continue;
    if ((m.events || []).some(e => Math.abs(e.x - x) + Math.abs(e.y - y) <= 2)) continue;
    let sp = false; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (w.Search && w.Search.at(m, x + dx, y + dy)) sp = true; if (sp) continue;
    if ((w.QUIZ_MONSTERS || []).some(q => q.map === id && Math.abs(q.x - x) + Math.abs(q.y - y) <= 3)) continue;
    const d = Math.abs(x - pz.x) + Math.abs(y - pz.y) + (MD[id].plaza ? 0 : 0); if (!best || d < best.d) best = { x, y, d };
  }
  out[id] = best ? [best.x, best.y] : null; console.log(id, MD[id].name, best ? best.x + ',' + best.y + ' d' + best.d : 'NONE', m.w + 'x' + m.h);
}
require('fs').writeFileSync(__dirname + '/auntplace.json', JSON.stringify(out));
