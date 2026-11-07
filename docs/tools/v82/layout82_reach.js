// v8.2 間取りの作り直しの、行ける所の確かめ（Layout82 とは別に、前の行と今の行をゲームの GameMap で比べる）：node docs/tools/v82/layout82_reach.js [2d]
// 部屋ごとに、出入口（ワープ）から歩いて行ける所を前と今で求めて、
//  1) 前に話せた人は今も話せる（となりのマスか、カウンター越し）  2) 前に行けた宝箱・出来事・ワープは今も行ける
//  3) 前に行けなかった宝箱・出来事・人に、今は行ける（新しい抜け道）がない
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; if (A.errors.length) { console.log('読み込みの失敗', A.errors); process.exit(1); }
const S = w.State; S.newGame('t', 'warrior'); const d = S.data; w.World.start();
const L = w.Layout82; const ids = Object.keys(L.maps).sort(); const ng = []; let n = 0; const cnt = { checks: 0, both: 0, neither: 0, people: 0 };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function study(def, rows) {
  const m = new w.GameMap(Object.assign({}, def, { rows: rows, id: def.id })); const W = m.w, H = m.h;
  const pass = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m.passable(x, y, d) && !m.npcAt(x, y);
  const seen = new Set(); const q = []; (m.warps || []).forEach((p) => { if (p) { const k = p.x + ',' + p.y; if (!seen.has(k)) { seen.add(k); q.push([p.x, p.y]); } } });
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of D4) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || !pass(X, Y) || m.warpAt(X, Y)) continue; seen.add(k); q.push([X, Y]); } }
  const near = (x, y) => D4.some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy))) || seen.has(x + ',' + y);
  const over = (x, y) => D4.some(([dx, dy]) => { const t = m.tile(x + dx, y + dy); return /counter/.test(t || '') && seen.has((x + 2 * dx) + ',' + (y + 2 * dy)); });
  const out = {};
  (def.npcs || []).forEach((p) => { if (p && p.id) out['人 ' + p.id] = near(p.x, p.y) || over(p.x, p.y); });
  (def.chests || []).forEach((p) => { if (p) out['宝箱 ' + (p.id || p.x + ',' + p.y)] = near(p.x, p.y); });
  (def.events || []).forEach((p) => { if (p) out['出来事 ' + p.x + ',' + p.y + ' ' + (p.type || '')] = near(p.x, p.y); });
  (def.warps || []).forEach((p) => { if (p) out['ワープ ' + p.x + ',' + p.y + '→' + p.to] = true; });
  return { out, reach: seen.size };
}
for (const id of ids) {
  const def = w.MAP_DEFS[id]; const l = def._l82; if (!l) continue; n++;
  let a, b; try { a = study(def, l.old); b = study(def, def.rows); } catch (e) { ng.push(id + '：確かめられない ' + e.message); continue; }
  Object.keys(a.out).forEach((k) => { cnt.checks++; if (/^人/.test(k)) cnt.people++; if (a.out[k] && b.out[k]) cnt.both++; if (!a.out[k] && !b.out[k]) cnt.neither++; if (a.out[k] && !b.out[k]) ng.push(id + '：前は行けた／話せた ' + k + ' に、今は行けない'); if (!a.out[k] && b.out[k]) ng.push(id + '：前は行けなかった ' + k + ' に、今は行ける（新しい抜け道）'); });
}
console.log('作り直した部屋', n, '確かめ', cnt.checks, '（人', cnt.people + '）', '前も今も行ける', cnt.both, '前も今も行けない', cnt.neither, 'NG', ng.length); ng.slice(0, 80).forEach((s) => console.log('NG  ' + s)); process.exit(ng.length ? 1 : 0);
