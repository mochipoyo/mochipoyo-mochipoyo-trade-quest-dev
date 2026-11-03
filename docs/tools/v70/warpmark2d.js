// v7.0 階段・ダンジョンの出入口の目印（WarpMark.list）を全マップで作り、種類を数える。指定したマップは中身を表示
const load = require('../rpgload.js'); const { w, errors } = load(); w.State.newGame('t', 'warrior');
const cnt = {}; let maps = 0, total = 0; const show = process.argv.slice(2); const bad = [];
for (const [id, def] of Object.entries(w.MAP_DEFS)) {
  if (def.region || /^world/.test(id)) continue; let m; try { m = new w.GameMap(def); } catch (e) { continue; }
  const L = w.WarpMark.list(m); if (L.length) maps++; total += L.length;
  L.forEach((o) => { const k = (def.kind || 'town') + ':' + o.kind + (o.stairs ? '(階段)' : ''); cnt[k] = (cnt[k] || 0) + 1; if (!o.label || !o.color) bad.push(id); });
  if (show.includes(id)) { console.log('==', id, def.name); L.forEach((o) => console.log('  ', o.x, o.y, o.label, '→', o.to, o.n > 1 ? '（' + o.n + 'マス）' : '')); }
  // dungeon の出入口は（隠しでなければ）すべて目印がある
  if (def.kind === 'dungeon') m.warps.forEach((wp) => { if (wp.hidden || wp.needFlag || !w.MAP_DEFS[wp.to]) return; if (!L.some((o) => o.tiles.some(([x, y]) => x === wp.x && y === wp.y))) bad.push(id + ' (' + wp.x + ',' + wp.y + ') に目印がない'); });
}
console.log(Object.entries(cnt).sort().map(([k, v]) => k + '=' + v).join('  '));
console.log('目印のあるマップ', maps, '目印', total, 'NG', bad.length, bad.slice(0, 5), 'errors', errors.slice(0, 3));
