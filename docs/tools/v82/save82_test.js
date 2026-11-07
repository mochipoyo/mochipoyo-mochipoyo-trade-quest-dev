// v8.2 古いセーブの確かめ：前の版（改修前のスナップショット）でセーブを作り、今の版で読む：node save82_test.js <前の版のディレクトリ> [2d] [出力 json]
// ・場所：城下町（城の扉の前＝今は楼門）・城の中（1 階の出口のそば）・学院（本館の前・前の学院長室・講義室）・廃墟の街の屋内（今は瓦礫・崩れた床・棚になったマス）・
//   間取りを作り直した屋内（宿・酒場・民家・銀行：今は家具・間仕切りになったマス）・証券市場の中・アズール大洋（船に乗ったまま、円形ティックテープのそば）
// ・読み込むと：いる場所が今の地図の歩けるマス（家具・壁・人・水の上でない。船は海の上）、そこから出口へ歩いて行ける、フラグ・クエスト・持ち物は同じ、作り直しの版（remakeVer）が今の版
const load = require('../v78/load78.js'); const fs = require('fs'); const path = require('path');
const BEFORE = process.argv[2]; const two = process.argv.includes('2d'); const outFile = process.argv.find((a) => /\.json$/.test(a));
const opt = (dir) => Object.assign(two ? { earth: false, join: false } : {}, dir ? { dir: dir.replace(/\/?$/, '/') } : {});
const A = load(opt(BEFORE)), B = load(opt(null)); if (B.errors.length) { console.log('読み込みの失敗（スクリプトの誤り）', B.errors); process.exit(1); }
for (const X of [A, B]) { const w = X.w; w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0; }
const out = [];
// 前の版でセーブを作る
const wa = A.w, Wa = wa.World, Sa = wa.State;
const make = (label, setup) => { Sa.newGame('t', 'warrior'); const d = Sa.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.flags.v82_marker = label; Wa.start(); Wa.encounter = () => { };
  try { setup(d); } catch (e) { console.log('作れない', label, e.message); return; } if (Wa.map && Wa.player) d.pos = { map: Wa.map.id, x: Wa.player.x, y: Wa.player.y, dir: Wa.player.dir }; out.push({ label, data: JSON.parse(JSON.stringify(d)) }); };
const at = (id, x, y) => () => { Wa.enterMap(id, x, y, 'down', { raw: true }); };
const front = (town, bid) => () => { const m = Wa.getMap(town); const b = m.buildings.find((q) => q.id === bid); Wa.enterMap(town, b.doorFront.x, b.doorFront.y, 'down', { raw: true }); };
const nearWarp = (id, to) => () => { const m = Wa.getMap(id); const q = m.warps.find((z) => z.to === to); for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { if (m.passable(q.x + dx, q.y + dy, Sa.data) && !m.warpAt(q.x + dx, q.y + dy) && !m.npcAt(q.x + dx, q.y + dy)) { Wa.enterMap(id, q.x + dx, q.y + dy, 'down', { raw: true }); return; } } };
make('リヴェル城下町：城の扉の前（今は楼門）', front('rivel_town', 'castle')); make('セントラ王都：王宮の扉の前', front('sentra_capital', 'palace')); make('マクディア：魔導王宮の扉の前', front('magicka_city', 'palace'));
make('リヴェル城 1 階：出口のそば', nearWarp('rivel_castle', 'rivel_town')); make('セントラ王宮 1 階：出口のそば', nearWarp('sentra_palace_1', 'sentra_capital')); make('魔導王宮 1 階：出口のそば', nearWarp('magicka_palace', 'magicka_city'));
make('学院：本館の扉の前', front('volatilia', 'va_main')); make('学院長室（前は本館の中）：出口のそば', nearWarp('vol_dean', 'volatilia')); make('講義室：中', nearWarp('vol_lecture', 'volatilia'));
make('証券市場：中央', at('tradia_exchange', 12, 6));
// 間取りを作り直した屋内：前は歩けて、今は家具・壁になったマス（今の版の行と比べて選ぶ）
const DB = B.w.MAP_DEFS, DA = wa.MAP_DEFS; const TLb = B.w.Tiles;
const changed = (id, n) => { const ra = DA[id] && DA[id].rows, rb = DB[id] && DB[id].rows; const list = []; if (!Array.isArray(ra) || !Array.isArray(rb)) return list; const ma = Wa.getMap(id);
  for (let y = 1; y < rb.length - 1 && list.length < n; y++) for (let x = 1; x < rb[0].length - 1 && list.length < n; x++) { const nb = TLb.byChar[rb[y][x]]; if (!nb || !TLb.isSolid(nb)) continue; if (!ma.passable(x, y, Sa.data) || ma.npcAt(x, y) || ma.warpAt(x, y)) continue; list.push([x, y]); } return list; };
['ruins_post', 'a3_ruins_keeper', 'aruna_ruins_x72_hall', 'magicka_inn', 'magicka_tavern', 'frost_inn', 'sahar_city_x72_house', 'tradia_bank', 'harbor_tavern', 'node_city_x72_house'].forEach((id) => changed(id, 2).forEach((p) => make(id + '：今は家具・壁のマス ' + p.join(','), at(id, p[0], p[1]))));
if (!two) make('アズール大洋：船に乗ったまま（円形ティックテープのそば）', (d) => { const L = wa.EARTH78_LAYOUT, W76 = wa.World76; const gx = Math.floor(L.xOf(-145)), gy = Math.floor(L.yOf(5)) + 4; const id = W76.mapsIn(gx, gy, gx + 1, gy + 1)[0]; const o = W76.origin(id); d.vehicles = d.vehicles || {}; d.vehicles.galleon = Object.assign(d.vehicles.galleon || {}, { owned: true, map: id, x: gx - o.x, y: gy - o.y }); d.aboard = 'galleon'; Wa.enterMap(id, gx - o.x, gy - o.y, 'up', { raw: true }); });
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out));
// 今の版で読む
const w = B.w, W = w.World, S = w.State; const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
for (const s of out) {
  const d0 = JSON.parse(JSON.stringify(s.data)); S.newGame('t', 'warrior'); S.data = JSON.parse(JSON.stringify(s.data)); W.start(); W.encounter = () => { };
  const m = W.map, p = W.player; const d = S.data; const ship = !!d.aboard;
  const free = ship ? (w.Vehicle && w.Vehicle.terrainOk(d.aboard, m, p.x, p.y)) : (m.passable(p.x, p.y, d) && !/^bld/.test(m.tile(p.x, p.y)) && !w.Tiles.isWater(m.tile(p.x, p.y)) && !m.npcAt(p.x, p.y));
  const exits = new Set((m.warps || []).map((q) => q.x + ',' + q.y)); const seen = new Set([p.x + ',' + p.y]); const q = [[p.x, p.y]]; let reach = ship || exits.has(p.x + ',' + p.y);
  while (q.length && !reach) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; seen.add(k); if (exits.has(k)) { reach = true; break; } if (m.passable(X, Y, d) && !m.npcAt(X, Y)) q.push([X, Y]); } }
  const keep = JSON.stringify(d0.flags) === JSON.stringify(d.flags) && JSON.stringify(d0.quests) === JSON.stringify(d.quests) && JSON.stringify(d0.inventory) === JSON.stringify(d.inventory) && (d0.aboard || null) === (d.aboard || null);
  const rv = w.MapRemake.maps[m.id] ? d.remakeVer[m.id] === w.MapRemake.maps[m.id].version : true;
  // 二度目の読み込み（読み込んだ後に保存 → もう一度読む）：同じ安全な位置のまま（漂流しない）
  W.syncPos(); const again = JSON.parse(JSON.stringify(S.data)); S.newGame('t', 'warrior'); S.data = again; W.start(); W.encounter = () => { }; const same = W.map.id === m.id && W.player.x === p.x && W.player.y === p.y;
  if (!same) ng.push(s.label + '：二度目の読み込みで位置が変わった ' + W.map.id + ' ' + W.player.x + ',' + W.player.y);
  ok(free && reach && keep && rv && same, s.label + '：' + d0.pos.map + ' ' + d0.pos.x + ',' + d0.pos.y + ' → ' + m.id + ' ' + p.x + ',' + p.y + '（' + m.tile(p.x, p.y) + (ship ? '・船' : '') + (reach ? '・出口へ歩ける' : '・出口へ行けない') + (keep ? '' : '・フラグか持ち物が変わった') + (rv ? '' : '・版が古い') + (same ? '・二度目の読み込みも同じ' : '・二度目の読み込みで動いた') + '）');
}
console.log('古いセーブ', out.length, '件。結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
