// v7.1 トレディアの空の区画（2D・jsdom）：エレベーターに乗る（確認・演出）→ 空の区画 → 建物・2階 → 地上へ戻る。既存の座標は変えない
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const LOG = []; const ANS = []; w.Win.message = (l) => { [].concat(l).forEach((x) => LOG.push(x)); return Promise.resolve(); }; w.Win.choice = (q) => { LOG.push('?' + q); return Promise.resolve(ANS.length ? ANS.shift() : 0); }; w.Win.toast = () => {}; w.Win.sleep = () => Promise.resolve(); World.encounter = function () {};
State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start();
const walk = (mm, x, y) => x >= 0 && y >= 0 && x < mm.w && y < mm.h && !w.Tiles.isSolid(mm.tiles[y][x]);
const reach = (mm, sx, sy) => { const s = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (s.has(k) || !walk(mm, nx, ny) || mm.npcAt(nx, ny)) continue; s.add(k); q.push([nx, ny]); } } return s; };
const t = new w.GameMap(w.MAP_DEFS.tradia); const el = t.buildings.find((b) => b.id === 'td_sky_elevator');
ok(el && t.warpAt(16, 35) && t.warpAt(16, 35).to === 'tradia_sky' && t.warpAt(16, 35).ride === 'up', 'トレディアの南西の広場にエレベーター（16,35 → 空の区画）');
const S0 = reach(t, 23, 38); ok(S0.has('16,36'), 'トレディアの出口からエレベーターの前へ歩いて行ける');
const sky = new w.GameMap(w.MAP_DEFS.tradia_sky); const S1 = reach(sky, 19, 19); const bad = [];
sky.buildings.forEach((b) => { if (!S1.has(b.doorAbs.x + ',' + (b.doorAbs.y + 1))) bad.push('建物 ' + b.id); }); sky.npcs.forEach((n) => { if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S1.has((n.x + dx) + ',' + (n.y + dy)))) bad.push('人 ' + n.id); }); sky.events.forEach((e) => { if (![[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S1.has((e.x + dx) + ',' + (e.y + dy)))) bad.push('出来事 ' + e.x + ',' + e.y); }); sky.chests.forEach((c) => { if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S1.has((c.x + dx) + ',' + (c.y + dy)))) bad.push('宝箱'); });
ok(!bad.length, '空の区画：着いた所から、建物・人・出来事・宝箱・展望デッキへ歩いて行ける ' + bad.join(','));
const R = w.REMAKE71.tradiaSky.maps; const badR = []; R.forEach((id) => { const def = w.MAP_DEFS[id]; const W0 = def.rows[0].length; def.rows.forEach((r, y) => { if (r.length !== W0) badR.push(id + ' 幅' + y); for (const ch of r) if (!w.Tiles.byChar[ch]) badR.push(id + ' 文字' + ch); }); const mm = new w.GameMap(def); mm.warps.forEach((wp) => { const to = new w.GameMap(w.MAP_DEFS[wp.to]); if (!walk(to, wp.tx, wp.ty) || to.warpAt(wp.tx, wp.ty)) badR.push(id + '→' + wp.to + ' 着く場所'); }); });
ok(!badR.length, '空の区画の5マップ：形・出入口の着く場所 ' + badR.join(' | '));
(async () => {
  const go = async (x, y) => { const p = World.player; p.x = x; p.y = y; p.px = x * 32; p.py = y * 32; World.busy = false; World.onStep(); for (let i = 0; i < 400 && World.busy; i++) await new Promise((r) => setTimeout(r, 5)); await new Promise((r) => setTimeout(r, 30)); };
  World.enterMap('tradia', 16, 36, 'up'); ANS.push(1); LOG.length = 0; await go(16, 35); ok(World.map.id === 'tradia' && LOG.some((l) => /エレベーターに乗って、空の区画へ/.test(l)), 'エレベーター：「やめる」を選ぶと乗らない');
  ANS.push(0); await go(16, 35); ok(World.map.id === 'tradia_sky' && World.player.x === 19 && World.player.y === 19, 'エレベーター：「乗る」→ 空の区画（19,19）に着く');
  await go(9, 8); ok(World.map.id === 'tradia_sky_exchange', 'スカイ取引所に入れる'); await go(5, 8); ok(World.map.id === 'tradia_sky', '取引所から出られる');
  await go(29, 8); await go(10, 1); ok(World.map.id === 'tradia_sky_lounge_2f', '展望ラウンジ → 2階'); await go(10, 1); await go(5, 8); ok(World.map.id === 'tradia_sky', 'ラウンジから戻れる');
  LOG.length = 0; World.busy = false; w.Events.run(World.map.eventAt(15, 25)); await new Promise((r) => setTimeout(r, 30)); ok(LOG.some((l) => /望遠鏡/.test(l)), '展望デッキの望遠鏡');
  ANS.push(0); await go(19, 18); ok(World.map.id === 'tradia' && World.player.x === 16 && World.player.y === 36, '空の区画のエレベーター → 地上のトレディア（16,36）');
  const n = new w.GameMap(w.MAP_DEFS.tradia_sky_boutique).npcs[0]; ok(n && n.id === 'sky_boutique_keeper', 'スカイ・ブティックの店主');
  console.log('errors', errors.slice(0, 3)); console.log('結果：' + pass + ' OK / ' + fail + ' NG');
})();
