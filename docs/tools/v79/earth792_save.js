// v7.9.2 前の版（e78.3）の地球のセーブ → いまの配置（e78.4：ポヨ村・リヴェル城・港町マリナのあいだを広げた）／2D 版（jsdom）
// 前の版のスナップショット（OLD783、既定 /home/claude/envsnap_t92/。e78.3 の配置）でセーブを作り、いまの版で読む
const load = require('../v78/load78.js'); const fs = require('fs');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const OLD = process.env.OLD783 || '/home/claude/envsnap_t92/';
if (!fs.existsSync(OLD + 'js/data/earth78-layout.js') || !/VERSION: 'e78\.3'/.test(fs.readFileSync(OLD + 'js/data/earth78-layout.js', 'utf8'))) { console.log('（e78.3 のスナップショットがないので飛ばした）'); console.log('結果：すべて OK'); process.exit(0); }
const cheb = (m, x, y) => { let b = 1e9; (m.def.locations || []).forEach((l) => { b = Math.min(b, Math.max(Math.abs(l.x - x), Math.abs(l.y - y))); }); return b; };
const near = (w, m, x, y) => { for (let r = 1; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (m.passable(X, Y, w.State.data) && !m.warpAt(X, Y) && !w.Tiles.isWater(m.tiles[Y][X])) return { x: X, y: Y }; } return null; };
// 前の版で作る
const V1 = load({ dir: OLD }); const w1 = V1.w; w1.State.newGame('t', 'warrior'); const g = w1.State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => g.flags[f] = true); g.flags.s3121_prologue_phase = 'done'; w1.World.start();
const m1 = w1.World.getMap('world'); const L1 = (id) => m1.def.locations.find((l) => l.id === id);
const p1 = near(w1, m1, L1('poyo_village').x, L1('poyo_village').y); g.pos = { map: 'world', x: p1.x, y: p1.y, dir: 'down' };
const home1 = w1.VEHICLES.sailboat.home; g.vehicles.sailboat.x = home1.x; g.vehicles.sailboat.y = home1.y; g.vehicles.sailboat.port = { map: 'world', x: home1.x, y: home1.y };
const pd = near(w1, m1, L1('oblivion_cave').x, L1('oblivion_cave').y); g.dungeonEntry = { map: 'world', x: pd.x, y: pd.y }; g.carriage = { owned: true, on: true };
const txt = JSON.stringify(g);
ok(g.remakeVer.world === 'e78.3' && cheb(m1, home1.x, home1.y) <= 2, 'e78.3 の地球のセーブを作った（ポヨ村の前・帆船はマリナの入口のすぐそばの母港 ' + home1.x + ',' + home1.y + '［印から ' + cheb(m1, home1.x, home1.y) + '］・忘却の洞窟の入口の記録・馬車に乗っている）');
// いまの版
const A = load(); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start(); w.State.data = JSON.parse(txt); w.World.start(); const u = w.State.data;
const m2 = w.World.getMap('world'); const L2 = (id) => m2.def.locations.find((l) => l.id === id);
ok(u.remakeVer.world === w.Earth78.VERSION && w.Earth78.VERSION === 'e78.4' && (u.e78up || []).indexOf('world:e78.3') >= 0, '→ 印は e78.4 ' + JSON.stringify({ w: u.remakeVer.world, up: u.e78up }));
const poyo = L2('poyo_village'); ok(u.pos.map === 'world' && Math.abs(u.pos.x - poyo.x) + Math.abs(u.pos.y - poyo.y) <= 5 && m2.passable(u.pos.x, u.pos.y, u), '→ 主人公はポヨ村（広げた配置の場所）のそば（5 マス以内）の歩けるマス ' + JSON.stringify({ pos: u.pos, poyo: [poyo.x, poyo.y] }));
w.World.enterMap('world', u.pos.x, u.pos.y, 'down', { raw: true });
const sb = u.vehicles.sailboat; const mar = L2('harbor'); ok(sb.map === 'world' && w.Vehicle.terrainOk('sailboat', m2, sb.x, sb.y) && cheb(m2, sb.x, sb.y) >= 3 && Math.abs(sb.x - mar.x) + Math.abs(sb.y - mar.y) <= 10 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = sb.x + dx, Y = sb.y + dy; return !w.Tiles.isWater(m2.tiles[Y][X]) && m2.passable(X, Y, u) && !m2.warpAt(X, Y); }), '→ 帆船は港町マリナ（広げた配置）のそばの海で、入口から 3 マス以上・となりの陸から乗れる ' + JSON.stringify({ sb: [sb.x, sb.y], marina: [mar.x, mar.y] }));
const ob = L2('oblivion_cave'); const de = u.dungeonEntry; ok(de && de.map === 'world' && Math.abs(de.x - ob.x) + Math.abs(de.y - ob.y) <= 5, '→ 入口の記録は忘却の洞窟（広げた配置）のそば ' + JSON.stringify({ de, ob: [ob.x, ob.y] }));
ok(w.Carriage.riding(), '→ 馬車はそのまま');
const p7 = JSON.stringify(u.pos); w.World.start(); ok(JSON.stringify(w.State.data.pos) === p7, '→ もう一度読んでも動かない');
// 2D 版で読む
const B = load({ join: false, earth: false }); const w2 = B.w; w2.State.newGame('t', 'warrior'); w2.World.start(); w2.State.data = JSON.parse(txt); w2.World.start(); const u2 = w2.State.data;
const m3 = w2.World.getMap('world'); const poyo3 = m3.def.locations.find((l) => l.id === 'poyo_village');
ok(u2.pos.map === 'world' && Math.abs(u2.pos.x - poyo3.x) + Math.abs(u2.pos.y - poyo3.y) <= 6 && m3.passable(u2.pos.x, u2.pos.y, u2), '→ 2D 版で読むと、旧座標のポヨ村のそば ' + JSON.stringify({ pos: u2.pos, poyo: [poyo3.x, poyo3.y] }));
const sb3 = u2.vehicles.sailboat; ok(sb3.map === 'world' && w2.Vehicle.terrainOk('sailboat', m3, sb3.x, sb3.y) && Math.abs(sb3.x - 19) + Math.abs(sb3.y - 72) <= 6, '→ 2D 版：帆船は旧座標の港町マリナの西の海 ' + JSON.stringify([sb3.x, sb3.y]));
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
