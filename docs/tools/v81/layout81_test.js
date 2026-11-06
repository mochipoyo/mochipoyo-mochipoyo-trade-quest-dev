// v8.1 「元の間取り」との切り替え（jsdom）：node layout81_test.js [2d]
// ・元の間取り（?layout=off）では作り直しを使わない（前の大きさ・前の建物の位置）
// ・新しい間取りで作ったセーブ（作り直した町の中）を、元の間取りで読む → 歩けるマスにいて出口へ行ける。そのセーブをまた新しい間取りで読む → 歩けるマス
const load = require('../v78/load78.js'); const two = process.argv[2] === '2d';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const boot = (q) => { const A = load(Object.assign(two ? { earth: false, join: false } : {}, q ? { query: q } : {})); const w = A.w; w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0; return w; };
const check = (w, label) => { const W = w.World, m = W.map, p = W.player, d = w.State.data; const free = m.passable(p.x, p.y, d) && !/^bld/.test(m.tile(p.x, p.y));
  const exits = new Set((m.warps || []).map((q) => q.x + ',' + q.y)); const seen = new Set([p.x + ',' + p.y]); const q = [[p.x, p.y]]; let reach = false;
  while (q.length && !reach) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; seen.add(k); if (exits.has(k)) { reach = true; break; } if (m.passable(X, Y, d) && !m.npcAt(X, Y)) q.push([X, Y]); } }
  ok(free && reach, label + '：' + m.id + ' ' + m.w + '×' + m.h + ' の ' + p.x + ',' + p.y + '（' + m.tile(p.x, p.y) + (reach ? '・出口へ歩ける' : '・出口へ行けない') + '）'); };
const SPOTS = [['rivel_town', 35, 56], ['rivel_town', 60, 20], ['harbor_town', 38, 30], ['sahar_city', 30, 18], ['verum_town', 31, 20], ['volatilia', 29, 33], ['dow_village', 20, 20], ['rivel_castle', 16, 18]];
const off = boot('layout=off'); off.State.newGame('t', 'warrior'); ok(!off.MAP_DEFS.rivel_town.remake81 && !off.MAP_DEFS.harbor_town.remake81, '元の間取りでは作り直しを使わない（リヴェル ' + off.World.getMap('rivel_town').w + '×' + off.World.getMap('rivel_town').h + '・マリナ ' + off.World.getMap('harbor_town').w + '×' + off.World.getMap('harbor_town').h + '）');
const on = boot('');
for (const [id, x, y] of SPOTS) {
  on.State.newGame('t', 'warrior'); const d = on.State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; on.World.start(); on.World.enterMap(id, x, y, 'up', { raw: true });
  d.pos = { map: id, x: on.World.player.x, y: on.World.player.y, dir: 'up' }; const sv = JSON.stringify(d);
  off.State.newGame('t', 'warrior'); off.State.data = JSON.parse(sv); off.World.start(); check(off, '新しい間取りのセーブ（' + id + ' ' + x + ',' + y + '）を元の間取りで読む');
  const back = JSON.parse(JSON.stringify(off.State.data)); back.pos = { map: off.World.map.id, x: off.World.player.x, y: off.World.player.y, dir: 'up' };
  on.State.newGame('t', 'warrior'); on.State.data = back; on.World.start(); check(on, '　→ そのセーブを新しい間取りでまた読む');
}
console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
