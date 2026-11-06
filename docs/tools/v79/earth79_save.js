// v7.9 前の版（e78.2）の地球のセーブ → いまの配置（e78.3：グラニア・リシア砂漠を広げた）／2D 版（jsdom）
// 前の版のスナップショット（OLD782、既定 /home/claude/envsnap_t89/。e78.2 の配置）でセーブを作り、いまの版で読む
const load = require('../v78/load78.js'); const fs = require('fs');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const OLD = process.env.OLD782 || '/home/claude/envsnap_t89/';
if (!fs.existsSync(OLD + 'js/data/earth78-layout.js') || !/VERSION: 'e78\.2'/.test(fs.readFileSync(OLD + 'js/data/earth78-layout.js', 'utf8'))) { console.log('（e78.2 のスナップショットがないので飛ばした）'); console.log('結果：すべて OK'); process.exit(0); }
const V2 = load({ dir: OLD }); const w1 = V2.w; w1.State.newGame('t', 'warrior'); const g = w1.State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'yorn_letter_done'].forEach((f) => g.flags[f] = true); w1.World.start();
const mg = w1.World.getMap('world_grania'); const ver1 = mg.def.locations.find((l) => l.id === 'verum_town');
const near = (w, m, x, y) => { for (let r = 1; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (m.passable(X, Y, w.State.data) && !m.warpAt(X, Y) && !w.Tiles.isWater(m.tiles[Y][X])) return { x: X, y: Y }; } return null; };
const p1 = near(w1, mg, ver1.x, ver1.y); g.pos = { map: 'world_grania', x: p1.x, y: p1.y, dir: 'down' };
const pier1 = w1.Harbors.spot(w1.Harbors.HARBORS.grania_west_pier, 'sailboat'); g.vehicles.sailboat = { owned: true, map: 'world_grania', x: pier1.x, y: pier1.y, port: { map: 'world_grania', x: pier1.x, y: pier1.y } };
const md = w1.World.getMap('world_desert'); const sn1 = md.def.locations.find((l) => l.id === 'storm_north'); const pd = near(w1, md, sn1.x, sn1.y); g.dungeonEntry = { map: 'world_desert', x: pd.x, y: pd.y };
const txt = JSON.stringify(g); ok(g.remakeVer.world_grania === 'e78.2' && g.remakeVer.world_desert === 'e78.2', 'e78.2 の地球のセーブを作った（ヴェルムの前・帆船は灰の浜の桟橋・砂嵐の回廊の北口の入口の記録）');
// いまの版
const A = load(); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start(); w.State.data = JSON.parse(txt); w.World.start(); const u = w.State.data;
const m2 = w.World.getMap('world_grania'); const ver2 = m2.def.locations.find((l) => l.id === 'verum_town'); const dsr = w.World.getMap('world_desert'); const sn2 = dsr.def.locations.find((l) => l.id === 'storm_north');
ok(u.remakeVer.world_grania === w.Earth78.VERSION && u.remakeVer.world_desert === w.Earth78.VERSION && u.remakeVer.world === w.Earth78.VERSION, '→ 印は e78.3 ' + JSON.stringify({ g: u.remakeVer.world_grania, d: u.remakeVer.world_desert, up: u.e78up }));
ok(u.pos.map === 'world_grania' && Math.abs(u.pos.x - ver2.x) + Math.abs(u.pos.y - ver2.y) <= 5 && m2.passable(u.pos.x, u.pos.y, u), '→ 主人公はヴェルム（広げた配置の場所）のそば（5 マス以内）の歩けるマス ' + JSON.stringify({ pos: u.pos, verum: [ver2.x, ver2.y] }));
const pier2 = w.Harbors.HARBORS.grania_west_pier.moor; const sb = u.vehicles.sailboat; ok(sb.map === 'world_grania' && w.Tiles.isWater(m2.tiles[sb.y][sb.x]) && Math.abs(sb.x - pier2.x) + Math.abs(sb.y - pier2.y) <= 8, '→ 帆船は灰の浜の桟橋（広げた配置）のそばの海 ' + JSON.stringify({ sb: [sb.x, sb.y], pier: [pier2.x, pier2.y] }));
const de = u.dungeonEntry; ok(de && de.map === 'world_desert' && Math.abs(de.x - sn2.x) + Math.abs(de.y - sn2.y) <= 5, '→ 入口の記録は砂嵐の回廊の北口（広げた配置）のそば ' + JSON.stringify({ de, sn: [sn2.x, sn2.y] }));
const p7 = JSON.stringify(u.pos); w.World.start(); ok(JSON.stringify(w.State.data.pos) === p7, '→ もう一度読んでも動かない');
// 2D 版で読む
const B = load({ join: false }); const w2 = B.w; w2.State.newGame('t', 'warrior'); w2.World.start(); w2.State.data = JSON.parse(txt); w2.World.start(); const u2 = w2.State.data;
const m3 = w2.World.getMap('world_grania'); const ver3 = m3.def.locations.find((l) => l.id === 'verum_town');
ok(u2.pos.map === 'world_grania' && Math.abs(u2.pos.x - ver3.x) + Math.abs(u2.pos.y - ver3.y) <= 6 && m3.passable(u2.pos.x, u2.pos.y, u2), '→ 2D 版で読むと、旧座標のヴェルムのそば ' + JSON.stringify({ pos: u2.pos, verum: [ver3.x, ver3.y] }));
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
