// v8.1 古いセーブ（前の版で作ったもの。save81_make.js）を今の版で読む：node save81_test.js <古いセーブの json> [2d]
// ・読み込むと、いる場所が新しい地図の歩けるマス（建物・壁・人・水の上でない）になり、そこから出口（外への出口か建物の扉か階段）へ歩いて行ける
// ・フラグ・クエスト・持ち物は変わらない。作り直しの版（remakeVer）が今の版になる
const load = require('../v78/load78.js'); const fs = require('fs');
const two = process.argv[3] === '2d'; const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const W = w.World, S = w.State;
w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0;
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const saves = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const s of saves) {
  const d0 = JSON.parse(JSON.stringify(s.data)); S.newGame('t', 'warrior'); S.data = JSON.parse(JSON.stringify(s.data)); W.start(); W.encounter = () => { };
  const m = W.map, p = W.player; const d = S.data;
  const free = m.passable(p.x, p.y, d) && !/^bld/.test(m.tile(p.x, p.y)) && !w.Tiles.isWater(m.tile(p.x, p.y));
  // 出口まで歩けるか（人は通れない扱い）
  const exits = new Set((m.warps || []).map((q) => q.x + ',' + q.y)); const seen = new Set([p.x + ',' + p.y]); const q = [[p.x, p.y]]; let reach = exits.has(p.x + ',' + p.y);
  while (q.length && !reach) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; seen.add(k); if (exits.has(k)) { reach = true; break; } if (m.passable(X, Y, d) && !m.npcAt(X, Y)) q.push([X, Y]); } }
  const keep = JSON.stringify(d0.flags) === JSON.stringify(d.flags) && JSON.stringify(d0.quests) === JSON.stringify(d.quests) && JSON.stringify(d0.inventory) === JSON.stringify(d.inventory);
  const rv = w.MapRemake.maps[m.id] ? d.remakeVer[m.id] === w.MapRemake.maps[m.id].version : true;
  ok(free && reach && keep && rv, s.label + '：' + d0.pos.map + ' ' + d0.pos.x + ',' + d0.pos.y + ' → ' + m.id + ' ' + p.x + ',' + p.y + '（' + m.tile(p.x, p.y) + (reach ? '・出口へ歩ける' : '・出口へ行けない') + (keep ? '' : '・フラグ等が変わった') + '）');
}
console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
