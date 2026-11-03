// v7.1 ポヨ村の作り込み（2D・jsdom）：広げた東の地区・新しい部屋・2階3階の行き来・旧座標が変わっていないこと・すべての扉や人に歩いて行けること
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const LOG = []; w.Win.message = (l) => { [].concat(l).forEach((x) => LOG.push(x)); return Promise.resolve(); }; w.Win.choice = () => Promise.resolve(1); w.Win.toast = () => {}; World.encounter = function () {};
State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start();
const R = w.REMAKE71 && w.REMAKE71.poyo; ok(R && R.w === 76 && R.oldW === 48, 'ポヨ村の幅 48 → 76（東へ28マス）');
const m = new w.GameMap(w.MAP_DEFS.poyo_village);
// 旧い48列の中身：道を延ばした2本（8〜9・30〜31行目の38〜47列）以外は同じ（現在の定義の左48列と、東の地区を足す前の定義を比べる）
const base = require('child_process').execFileSync('node', ['-e', "const load=require('./rpgload.js');const A=load();A.w.State.newGame('t','warrior');const m=new A.w.GameMap(A.w.MAP_DEFS.poyo_village);process.stdout.write(JSON.stringify({t:m.tiles,n:m.npcs.map(n=>[n.id,n.x,n.y]),e:m.events.map(e=>[e.type,e.x,e.y]),wp:m.warps.map(x=>[x.x,x.y,x.to,x.tx,x.ty]),b:m.buildings.map(b=>[b.id,b.x,b.y,b.w,b.h])}))"], { cwd: require('path').join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: process.env.BASE_DIR || '/home/claude/base71/' }), maxBuffer: 1 << 28 }).toString();
const B = JSON.parse(base); const diffs = [];
for (let y = 0; y < B.t.length; y++) for (let x = 0; x < B.t[0].length; x++) if (B.t[y][x] !== m.tiles[y][x] && !([8, 9, 30, 31].includes(y) && x >= 38)) diffs.push(x + ',' + y + ':' + B.t[y][x] + '>' + m.tiles[y][x]);
ok(diffs.length === 0, '旧い48列の地形は、東へ延ばした2本の道のほかは同じ ' + diffs.slice(0, 5).join(' '));
ok(B.n.every(([id, x, y]) => m.npcs.some((n) => n.id === id && n.x === x && n.y === y)), '既存の人 ' + B.n.length + '人は同じ場所');
ok(B.e.every(([t, x, y]) => m.events.some((e) => e.type === t && e.x === x && e.y === y)) && B.wp.every(([x, y, to, tx, ty]) => m.warps.some((q) => q.x === x && q.y === y && q.to === to && q.tx === tx && q.ty === ty)) && B.b.every(([id, x, y, ww, hh]) => m.buildings.some((b) => b.id === id && b.x === x && b.y === y && b.w === ww && b.h === hh)), '既存の出来事・出入口・建物は同じ場所');
// 歩いて行けるか（村の出口から）
const walk = (mm, x, y) => x >= 0 && y >= 0 && x < mm.w && y < mm.h && !w.Tiles.isSolid(mm.tiles[y][x]);
const reach = (mm, sx, sy) => { const s = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (s.has(k) || !walk(mm, nx, ny) || (mm.npcAt(nx, ny))) continue; s.add(k); q.push([nx, ny]); } } return s; };
const S = reach(m, 20, 37); const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S.has((x + dx) + ',' + (y + dy)));
const bad = [];
m.buildings.forEach((b) => { if (!S.has(b.doorAbs.x + ',' + (b.doorAbs.y + 1))) bad.push('建物 ' + b.id); });
m.npcs.filter((n) => n.v71 || /^poyo_/.test(n.id)).forEach((n) => { if (!near(n.x, n.y)) bad.push('人 ' + n.id); });
m.events.forEach((e) => { if (!near(e.x, e.y)) bad.push('出来事 ' + e.x + ',' + e.y); }); m.chests.forEach((c) => { if (!near(c.x, c.y)) bad.push('宝箱 ' + c.id); });
ok(!bad.length, '村の出口から、すべての建物の入口・人・出来事・宝箱へ歩いて行ける ' + bad.join(','));
// 新しい部屋：行の幅・知らない文字がない・出入口の行き先・戻り先が歩けるマス
const ids = R.interiors; const badR = [];
ids.forEach((id) => { const def = w.MAP_DEFS[id]; if (!def) { badR.push(id + ' なし'); return; } const W0 = def.rows[0].length; def.rows.forEach((r, y) => { if (r.length !== W0) badR.push(id + ' 幅' + y); for (const ch of r) if (!w.Tiles.byChar[ch]) badR.push(id + ' 文字' + ch); }); const mm = new w.GameMap(def);
  mm.warps.forEach((wp) => { const to = new w.GameMap(w.MAP_DEFS[wp.to]); if (!walk(to, wp.tx, wp.ty) || to.warpAt(wp.tx, wp.ty)) badR.push(id + '→' + wp.to + ' の着く場所 ' + wp.tx + ',' + wp.ty); if (!walk(mm, wp.x, wp.y)) badR.push(id + ' 出入口が歩けない ' + wp.x + ',' + wp.y); const back = to.warps.some((q) => q.to === id); if (!back) badR.push(id + '→' + wp.to + ' に戻りがない'); });
  const s2 = reach(mm, mm.warps[0].x, mm.warps[0].y); mm.warps.forEach((wp) => { if (!s2.has(wp.x + ',' + wp.y)) badR.push(id + ' 出入口 ' + wp.x + ',' + wp.y + ' へ行けない'); }); mm.npcs.forEach((n) => { if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => s2.has((n.x + dx) + ',' + (n.y + dy)))) badR.push(id + ' 人 ' + n.id); }); mm.events.forEach((e) => { if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => s2.has((e.x + dx) + ',' + (e.y + dy)))) badR.push(id + ' 出来事'); }); });
ok(!badR.length, '新しい部屋 ' + ids.length + '：形・出入口・戻り・人・出来事 ' + badR.slice(0, 6).join(' | '));
// 既存の屋内の上り階段（1マスだけ変えた）
[['poyo_elder_house', 10, 1, 'poyo_elder_house_2f'], ['poyo_inn', 10, 7, 'poyo_inn_2f'], ['poyo_church', 10, 6, 'poyo_church_2f']].forEach(([id, x, y, to]) => { const mm = new w.GameMap(w.MAP_DEFS[id]); ok(mm.tiles[y][x] === 'stairs_up' && mm.warpAt(x, y) && mm.warpAt(x, y).to === to, id + '：(' + x + ',' + y + ') が上り階段 → ' + to); });
// 実際に歩く：村 → 見張り台 → 2階 → 3階 → 望遠鏡 → 戻る
(async () => {
  const step = async (mid, x, y) => { World.enterMap(mid, x, y, 'up'); const p = World.player; World.busy = false; World.onStep(); for (let i = 0; i < 100 && World.busy; i++) await new Promise((r) => setTimeout(r, 3)); };
  const go = async (x, y) => { const p = World.player; p.x = x; p.y = y; p.px = x * 32; p.py = y * 32; World.busy = false; World.onStep(); for (let i = 0; i < 200 && World.busy; i++) await new Promise((r) => setTimeout(r, 5)); await new Promise((r) => setTimeout(r, 20)); };
  World.enterMap('poyo_village', 66, 16, 'up'); await go(66, 15); ok(World.map.id === 'poyo_watch', '見張り台の扉 → 1階');
  await go(10, 1); ok(World.map.id === 'poyo_watch_2f', '1階の上り階段 → 2階'); await go(1, 7); ok(World.map.id === 'poyo_watch_3f', '2階の上り階段 → 3階');
  LOG.length = 0; World.busy = false; w.Events.run(World.map.eventAt(5, 4)); await new Promise((r) => setTimeout(r, 30)); ok(LOG.some((l) => /望遠鏡/.test(l)), '3階の望遠鏡を調べられる');
  World.enterMap('poyo_village', 52, 21, 'up'); const n = World.map.npcs.find((x) => x.id === 'poyo_east_merchant'); ok(!!n, '市場の露店の商人がいる');
  console.log('errors', errors.slice(0, 3)); console.log('結果：' + pass + ' OK / ' + fail + ' NG');
})();
