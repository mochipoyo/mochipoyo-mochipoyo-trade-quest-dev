// v8.3 トレードマスターの置き場所の確かめ（jsdom）：node tm83_place.js [2d]
// ・対象の地図（町・城郭区画・城の 1 階・フィールド）を全部作り、置いた人数・位置が「通れるマスで、入口から歩いて行ける・まわり 8 マスが通れる・出入口から離れている」かを確かめる
// ・置いたあとも、入口から行ける所が減っていない（道をふさいでいない）ことを、置く前と後の歩ける範囲の広さで比べる
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; if (A.errors.length) { console.log('読み込みの失敗', A.errors); process.exit(1); }
const W = w.World, S = w.State, TM = w.TradeMaster83; S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; W.start();
const ids = TM.targets(); let total = 0, ng = []; const rows = [];
function reach(m, skipTm) { const seen = new Set(); const q = []; (m.warps || []).forEach((wp) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const x = wp.x + dx, y = wp.y + dy; if (x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !m.warpAt(x, y) && !seen.has(x + ',' + y)) { seen.add(x + ',' + y); q.push([x, y]); } }));
  const blocked = (x, y) => { const n = m.npcAt(x, y); return n && (skipTm ? !n.tradeMaster83 : true) && n.wander === 0; };
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; if (!m.passable(nx, ny, d) || m.warpAt(nx, ny) || blocked(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } } return seen; }
for (const id of ids) {
  W.maps = {}; let m; try { m = W.getMap(id); } catch (e) { ng.push(id + '：地図を作れない ' + e.message); continue; }
  const want = TM.countFor(m.def, id); const tms = m.npcs.filter((n) => n.tradeMaster83); total += tms.length;
  if (tms.length < want) ng.push(id + '：置けた人数 ' + tms.length + '／' + want);
  tms.forEach((n) => { n.hidden = true; }); const before = reach(m, true); tms.forEach((n) => { n.hidden = false; }); const after = reach(m, false);   // 置く前（トレードマスターを隠す）と後
  tms.forEach((n) => { const k = n.x + ',' + n.y; if (!before.has(k)) ng.push(id + '：' + n.id + ' 入口から行けない所 (' + k + ')');
    if (m.warps.some((q) => Math.abs(q.x - n.x) + Math.abs(q.y - n.y) <= 2)) ng.push(id + '：' + n.id + ' 出入口に近い');
    let open = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && m.passable(n.x + dx, n.y + dy, d)) open++; if (open < 8) ng.push(id + '：' + n.id + ' まわりが ' + open + '/8'); });
  const lost = [...before].filter((k) => !after.has(k) && !tms.some((n) => n.x + ',' + n.y === k)).length; if (lost) ng.push(id + '：置いたあと行けなくなったマス ' + lost);
  // 話しかけられる（となりの通れるマスがある）
  tms.forEach((n) => { if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => after.has((n.x + dx) + ',' + (n.y + dy)))) ng.push(id + '：' + n.id + ' 話しかけられない'); });
  rows.push(id + ' ' + tms.length + '/' + want + ' ' + tms.map((n) => n.name.replace('トレードマスター・', '') + '@' + n.x + ',' + n.y + '(T' + n.tradeMaster83.tier + ')').join(' '));
}
rows.forEach((r) => console.log(r));
console.log('地図', ids.length, '人数', total, 'NG', ng.length, 'TM.errors', JSON.stringify(TM.errors)); ng.forEach((s) => console.log('NG  ' + s));
