// v8.3 使い方：node vol83_migrate_test.js <vol83_dump.js の出力> [2d] [間引き]（v8.1 の r812_migrate_test.js と同じ確かめ。学院を広げた版 r81.2）
// r81.1 の座標で書かれたセーブ（前の版で立てたマス）を、今の版（r81.2）で読む → 着く所が歩けるマス（建物・水・出口でない）で、町の出口まで歩けるか
const load = require('../v78/load78.js');
const two = process.argv[3] === '2d'; const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const P = JSON.parse(require('fs').readFileSync(process.argv[2]));
let n = 0, ng = 0; const step = +(process.argv[4] || 1);
for (const id of Object.keys(P)) { let c = 0, bad = 0;
  for (let i = 0; i < P[id].length; i += step) { const [x, y] = P[id][i];
    w.State.newGame('t', 'warrior'); const d = w.State.data; d.remakeVer = {}; Object.keys(w.MapRemake.maps).forEach((k) => d.remakeVer[k] = w.MapRemake.maps[k].version); d.remakeVer[id] = 'r81.1'; d.pos = { map: id, x, y, dir: 'down' };
    w.MapRemake.migrate(d); w.World.maps = {}; const m = w.World.getMap(id); const p = d.pos; c++;
    const free = m.passable(p.x, p.y, d) && !/^bld/.test(m.tile(p.x, p.y)) && !w.Tiles.isWater(m.tile(p.x, p.y)) && !m.warpAt(p.x, p.y);
    const exits = new Set((m.warps || []).map((q) => q.x + ',' + q.y)); let reach = false; const seen = new Set([p.x + ',' + p.y]); const q = [[p.x, p.y]];
    while (q.length && !reach) { const [a, b] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = a + dx, Y = b + dy, k = X + ',' + Y; if (seen.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; seen.add(k); if (exits.has(k)) { reach = true; break; } if (m.passable(X, Y, d) && !m.npcAt(X, Y)) q.push([X, Y]); } }
    if (!free || !reach) { bad++; if (bad <= 4) console.log('  NG', id, x + ',' + y, '→', p.x + ',' + p.y, m.tile(p.x, p.y), free ? '' : '歩けない', reach ? '' : '出口へ行けない'); } }
  n += c; ng += bad; console.log((bad ? 'NG  ' : 'OK  ') + id + '：r81.1 の立てたマス ' + c + ' 件 → 着く所が歩けない／出口へ行けない ' + bad + ' 件'); }
console.log('結果：' + (ng ? 'NG ' + ng + '／' + n : 'すべて OK（' + n + ' 件）'));
