// v8.2 間取りの切り替えとセーブの往復の確かめ（jsdom）：node docs/tools/v82/switch82_test.js [2d]
// 1) 保存→読み込み→保存→読み込みで立ち位置が動かない（新しい間取り。部屋・城郭区画・学院・町・廃墟）
// 2) 新しい間取りで保存 → 設定「元の間取り」（?layout=off）で読む：歩けるマス・出口へ行ける・フラグ／持ち物が同じ・版が元の間取りの版
// 3) そのまま元の間取りで保存 → 新しい間取りで読む：同じ確かめ
// 4) 書いた localStorage のキー（2D 版の保存キーを書き換えていないか）
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const base = two ? { earth: false, join: false } : {};
const LA = load(base), LB = load(Object.assign({ query: 'layout=off' }, base)); if (LA.errors.length || LB.errors.length) { console.log('読み込みの失敗（スクリプトの誤り）', LA.errors, LB.errors); process.exit(1); } const ON = LA.w, OFF = LB.w;
for (const w of [ON, OFF]) { w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0; }
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
console.log('新しい間取り：Layout82.off', ON.Layout82.off, '作り直した部屋', Object.keys(ON.Layout82.maps).length, '／元の間取り：Layout82.off', OFF.Layout82.off, '作り直した部屋', Object.keys(OFF.Layout82.maps).length, '戻す版の表', Object.keys(OFF.Layout82.backVer).length);
function fresh(w) { const S = w.State; S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.flags.v82_switch = 1; d.gold = 777; w.World.start(); w.World.encounter = () => { }; return d; }
function startWith(w, data) { const S = w.State; S.newGame('t', 'warrior'); S.data = S.migrate ? S.migrate(JSON.parse(JSON.stringify(data))) : JSON.parse(JSON.stringify(data)); w.World.start(); w.World.encounter = () => { }; w.World.syncPos(); return S.data; }
function check(w, d0, label) {
  const W = w.World, d = w.State.data, m = W.map, p = W.player;
  const free = m.passable(p.x, p.y, d) && !w.Tiles.isWater(m.tile(p.x, p.y)) && !m.npcAt(p.x, p.y) && !m.warpAt(p.x, p.y);
  const exits = new Set((m.warps || []).map((q) => q.x + ',' + q.y)); const seen = new Set([p.x + ',' + p.y]); const q = [[p.x, p.y]]; let reach = exits.has(p.x + ',' + p.y) || (m.kind === 'town' || m.kind === 'field');
  while (q.length && !reach) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; seen.add(k); if (exits.has(k)) { reach = true; break; } if (m.passable(X, Y, d) && !m.npcAt(X, Y)) q.push([X, Y]); } }
  const keep = JSON.stringify(d0.flags) === JSON.stringify(d.flags) && JSON.stringify(d0.inventory) === JSON.stringify(d.inventory) && d0.gold === d.gold && JSON.stringify(d0.quests) === JSON.stringify(d.quests) && d0.hero.level === d.hero.level;
  const r = w.MapRemake.maps[m.id]; const ver = r ? d.remakeVer[m.id] === r.version : d.remakeVer[m.id] === undefined;
  ok(free && reach && keep && ver && m.id === d0.pos.map, label + '：' + d0.pos.map + ' ' + d0.pos.x + ',' + d0.pos.y + ' → ' + m.id + ' ' + p.x + ',' + p.y + '（' + m.tile(p.x, p.y) + (free ? '' : '・歩けない') + (reach ? '' : '・出口へ行けない') + (keep ? '' : '・フラグか持ち物が変わった') + (ver ? '' : '・版 ' + d.remakeVer[m.id] + ' ≠ ' + (r && r.version)) + '）');
}
// 新しい間取りで、前は家具・壁で今は歩けるマス（元の間取りで読むと塞がっている所）を選ぶ
const D = ON.MAP_DEFS; const spots = [];
['magicka_inn', 'magicka_tavern', 'frost_inn', 'tradia_bank', 'harbor_tavern', 'sahar_city_x72_house', 'node_city_x72_house', 'ruins_post', 'a3_ruins_keeper', 'aruna_ruins_x72_hall', 'kalion_inn', 'dow_inn'].forEach((id) => {
  const L = D[id] && D[id]._l82; if (!L) { console.log('間取りを変えていない部屋', id); return; } const rows = D[id].rows, old = L.old; let n = 0;
  for (let y = 1; y < rows.length - 1 && n < 2; y++) for (let x = 1; x < rows[0].length - 1 && n < 2; x++) { const a = ON.Tiles.byChar[rows[y][x]], b = ON.Tiles.byChar[old[y][x]]; if (!a || ON.Tiles.isSolid(a) || !b || !ON.Tiles.isSolid(b)) continue; if ((D[id].npcs || []).some((q) => q.x === x && q.y === y) || (D[id].warps || []).some((q) => q.x === x && q.y === y)) continue; spots.push([id, x, y, '前は家具・壁']); n++; }
  for (let y = 1; y < rows.length - 1 && n < 3; y++) for (let x = 1; x < rows[0].length - 1 && n < 3; x++) { const a = ON.Tiles.byChar[rows[y][x]], b = ON.Tiles.byChar[old[y][x]]; if (!a || ON.Tiles.isSolid(a) || !b || ON.Tiles.isSolid(b)) continue; if ((D[id].npcs || []).some((q) => q.x === x && q.y === y) || (D[id].warps || []).some((q) => q.x === x && q.y === y)) continue; spots.push([id, x, y, '前も今も床']); n++; x = 99; y = 99; }
});
[['rivel_castle_approach', 32, 40], ['sentra_palace_approach', 30, 38], ['magicka_palace_approach', 28, 36], ['vol_main_hall', 14, 12], ['vol_upper_gallery', 10, 6], ['vol_great_hall', 13, 10]].forEach(([id, x, y]) => { if (D[id]) spots.push([id, x, y, 'v8.2 の新しい地図']); });
const out = [];
for (const [id, x, y, kind] of spots) {
  const label = id + ' ' + x + ',' + y + '（' + kind + '）';
  // 1) 新しい間取り：保存→読み込み→保存→読み込み
  fresh(ON); ON.World.busy = false; ON.World.enterMap(id, x, y, 'down', { raw: true }); const m0 = ON.World.map; if (!m0.passable(ON.World.player.x, ON.World.player.y, ON.State.data) || m0.npcAt(ON.World.player.x, ON.World.player.y)) { const p = ON.MapRemake.maps[id] && ON.MapRemake.maps[id].freeNear ? ON.MapRemake.maps[id].freeNear(x, y) : { x, y }; ON.World.enterMap(id, p.x, p.y, 'down', { raw: true }); }
  ON.World.syncPos(); ON.State.save(1); const s0 = JSON.parse(ON.localStorage.getItem(Object.keys(ON.localStorage).find((k) => /1$/.test(k) && ON.localStorage.getItem(k).indexOf('v82_switch') >= 0)));
  const a1 = startWith(ON, ON.State.load(1)); ON.State.save(1); const a2 = startWith(ON, ON.State.load(1)); ON.State.save(1); const a3 = startWith(ON, ON.State.load(1));
  ok(a1.pos.x === s0.pos.x && a1.pos.y === s0.pos.y && a3.pos.x === s0.pos.x && a3.pos.y === s0.pos.y && a3.pos.map === s0.pos.map, '保存と読み込みの 2 往復で動かない：' + label + ' → ' + [a1, a2, a3].map((d) => d.pos.map + ' ' + d.pos.x + ',' + d.pos.y).join(' / '));
  // 2) 元の間取りで読む
  const d1 = startWith(OFF, s0); check(OFF, s0, '新 → 元の間取り：' + label);
  OFF.State.save(1); const s1 = JSON.parse(JSON.stringify(OFF.State.data));
  // 3) 新しい間取りで読む
  startWith(ON, s1); check(ON, s1, '元 → 新しい間取り：' + label);
  out.push({ label, onPos: s0.pos, offPos: d1.pos });
}
// 4) localStorage のキー
const keys = (w) => Object.keys(w.localStorage).sort();
console.log('新しい間取りの窓で書いたキー', JSON.stringify(keys(ON)), '／元の間取りの窓', JSON.stringify(keys(OFF)));
ok(!keys(ON).concat(keys(OFF)).some((k) => /^mtq-layout$/.test(k)), '切り替えの印（mtq-layout）は、読み込みや保存では書かない（設定の画面で人が切り替えたときだけ）');
console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK') + '（' + spots.length + ' か所）'); process.exit(ng.length ? 1 : 0);
