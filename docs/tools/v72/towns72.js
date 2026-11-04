// v7.2 町・城を広げる・2階3階（2D・jsdom）：元の町の地形・人・出来事が変わらない／新しい地区へ歩いて行ける／新しい部屋の形と出入口／2階・3階の行き来
const path = require('path');
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World, T = w.Tiles, M = w.MAP_DEFS, X = w.EXPAND72;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
w.Win.message = () => Promise.resolve(); w.Win.choice = () => Promise.resolve(0); w.Win.toast = () => {}; World.encounter = () => {};
State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start();
// 作る前の版（v7.1 3d7f129）の町・屋内
const BASE = process.env.BASE_DIR || '/home/claude/base72/';
const towns = Object.keys(X.towns);
const want = towns.concat(X.stairs.map((s) => s.from)).concat(['rivel_artisan']);
const B = JSON.parse(require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();A.w.State.newGame('t','warrior');const o={};${JSON.stringify(want)}.forEach(id=>{const d=A.w.MAP_DEFS[id];o[id]={rows:d.rows,warps:(d.warps||[]).map(q=>[q.x,q.y,q.to,q.tx,q.ty]),npcs:(d.npcs||[]).map(n=>[n.id,n.x,n.y]),events:(d.events||[]).map(e=>[e.type,e.x,e.y]),chests:(d.chests||[]).map(c=>[c.id,c.x,c.y]),buildings:(d.buildings||[]).map(b=>[b.id,b.x,b.y,b.w,b.h])};});process.stdout.write(JSON.stringify(o));`], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: BASE }), maxBuffer: 1 << 28 }).toString());
ok(towns.length === 24 && X.LIST.every((id) => X.towns[id]), '町 24 を広げた（東に新しい地区）：' + towns.length + '・広げられなかった町 ' + X.LIST.filter((id) => !X.towns[id]).join(','));
ok(towns.every((id) => X.towns[id].tower), 'どの町にも3階までの塔がある（新しい地区）');
// ① 元の町：地形・人・出来事・宝箱・建物は同じ（つなぐ所・リヴェルの城の前・リヴェルの東の出口だけ）
const allowed = (id) => { const t = X.towns[id]; const a = {}; [t.open, t.open + 1].forEach((y) => { a[(t.oldW - 1) + ',' + y] = 1; }); (t.carve || []).forEach((p) => { a[p[0] + ',' + p[1]] = 1; }); if (id === 'rivel_town') (X.rivelFront || []).forEach((p) => { a[p[0] + ',' + p[1]] = 1; }); return a; };
const diffs = [];
for (const id of towns) {
  const b = B[id], c = M[id], t = X.towns[id], al = allowed(id);
  for (let y = 0; y < b.rows.length; y++) for (let x = 0; x < b.rows[0].length; x++) if (b.rows[y][x] !== c.rows[y][x] && !al[x + ',' + y]) diffs.push(id + '@' + x + ',' + y);
  if (c.rows.length !== b.rows.length || c.rows[0].length !== t.w) diffs.push(id + ' 大きさ');
  b.npcs.forEach(([nid, x, y]) => { if (!c.npcs.some((n) => n.id === nid && n.x === x && n.y === y)) diffs.push(id + ' 人 ' + nid); });
  b.events.forEach(([ty, x, y]) => { if (!c.events.some((e) => e.type === ty && e.x === x && e.y === y)) diffs.push(id + ' 出来事 ' + x + ',' + y); });
  b.chests.forEach(([cid, x, y]) => { if (!c.chests.some((e) => e.id === cid && e.x === x && e.y === y)) diffs.push(id + ' 宝箱 ' + cid); });
  b.buildings.forEach(([bid, x, y, bw, bh]) => { if (!c.buildings.some((e) => e.id === bid && e.x === x && e.y === y)) diffs.push(id + ' 建物 ' + bid); });
  b.warps.forEach(([x, y, to, tx, ty]) => { if (id === 'rivel_artisan' && to === 'rivel_town') return; if (!c.warps.some((q) => q.to === to && q.tx === tx && q.ty === ty && (q.x === x && q.y === y || (id === 'rivel_town' && x === t.oldW - 1 && q.x === t.w - 1 && q.y === y)))) diffs.push(id + ' 出入口 ' + x + ',' + y + '→' + to); });
}
{ const t = X.towns.rivel_town; const a = M.rivel_artisan; B.rivel_artisan.warps.forEach(([x, y, to, tx, ty]) => { if (!a.warps.some((q) => q.x === x && q.y === y && q.to === to && (q.tx === tx || (to === 'rivel_town' && tx === t.oldW - 2 && q.tx === t.w - 2)) && q.ty === ty)) diffs.push('rivel_artisan 出入口 ' + x + ',' + y); }); }
ok(!diffs.length, '元の町の地形・人・出来事・宝箱・建物・出入口は同じ（変えたのは、つなぐ2マス・森を掘った道・リヴェルの城の前の堀と橋・リヴェルの東の出口の位置だけ）' + diffs.slice(0, 6).join(' '));
ok((X.rivelFront || []).length > 40 && M.rivel_town.rows[13][30] === 'b' && M.rivel_town.rows[13][20] === '~' && M.rivel_town.rows[16][31] === 'p', 'リヴェル：城の前に堀（13〜14行）と跳ね橋（30〜33列）、赤い絨毯の道');
// ② 歩いて行けるか（町の出口から。建物の扉の前・人・出来事・宝箱・出口）
// 物語で開く門（doneFlag のある通れない出来事）は開いた扱い（ここで確かめるのは地形と置き場所）
const walkable = (m, x, y, st) => x >= 0 && y >= 0 && x < m.w && y < m.h && !T.isSolid(m.tiles[y][x]) && !(m.eventAt(x, y) && m.eventAt(x, y).solid && !m.eventAt(x, y).doneFlag);
const reach = (m, sx, sy) => { const s = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!s.has(k) && walkable(m, nx, ny, d)) { s.add(k); q.push([nx, ny]); } } } return s; };
const near = (S, x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S.has((x + dx) + ',' + (y + dy)));
const badR = [];
for (const id of towns) {
  World.maps = {}; const m = World.getMap(id); const arr = []; Object.keys(M).forEach((k) => (M[k].warps || []).concat(M[k].locations || []).forEach((q) => { if (q && q.to === id && typeof q.tx === 'number') arr.push([q.tx, q.ty]); }));
  const S = new Set(); arr.forEach(([x, y]) => { if (walkable(m, x, y, d)) reach(m, x, y).forEach((k) => S.add(k)); });
  m.buildings.filter((b) => b.v72).forEach((b) => { if (!S.has(b.doorAbs.x + ',' + (b.doorAbs.y + 1))) badR.push(id + ' 扉 ' + b.id); });
  m.npcs.filter((n) => n.v72).forEach((n) => { if (!near(S, n.x, n.y)) badR.push(id + ' 人 ' + n.id); });
  m.events.filter((e) => e.v72).forEach((e) => { if (!near(S, e.x, e.y)) badR.push(id + ' 出来事 ' + e.x + ',' + e.y); });
  m.warps.forEach((q) => { const td = M[q.to]; if (!td || !(td.region || (td.kind || 'town') === 'town') || q.needFlag || q.hidden) return; if (!near(S, q.x, q.y)) badR.push(id + ' 出口 ' + q.x + ',' + q.y); });   // 町の外・ほかの町への出口（建物の扉は物語で開くものがあるので除く）
}
ok(!badR.length, '24の町：町の入口から、新しい地区の建物の扉・人・案内板、町の外への出口へ歩いて行ける ' + badR.slice(0, 6).join(' | '));
// ③ 新しい部屋（190）：形・知らない文字・出入口の行き先と戻り・中の物へ行ける
const badM = [];
for (const id of X.maps) {
  const def = M[id]; const W0 = def.rows[0].length; if (def.rows.some((r) => r.length !== W0)) badM.push(id + ' 幅'); def.rows.forEach((r) => r.split('').forEach((ch) => { if (!T.byChar[ch]) badM.push(id + ' 文字' + ch); }));
  const m = new w.GameMap(def); w.World.applyState(m);
  m.warps.forEach((q) => { const to = M[q.to]; if (!to) { badM.push(id + '→' + q.to + ' なし'); return; } const tm = World.getMap(q.to); if (!walkable(tm, q.tx, q.ty, d) || tm.warpAt(q.tx, q.ty)) badM.push(id + '→' + q.to + ' 着く所 ' + q.tx + ',' + q.ty); if (!tm.warps.some((r) => r.to === id && Math.abs(r.x - q.tx) + Math.abs(r.y - q.ty) <= 1) && !tm.buildings.some((b) => b.interior === id && Math.abs(b.doorAbs.x - q.tx) + Math.abs(b.doorAbs.y - q.ty) <= 1)) badM.push(id + '→' + q.to + ' 戻りがそばにない'); });
  const st = m.warps[0]; const s0 = [[st.x, st.y - 1], [st.x, st.y + 1], [st.x + 1, st.y], [st.x - 1, st.y]].find(([x, y]) => walkable(m, x, y, d)); if (!s0) { badM.push(id + ' 入口の前'); continue; }
  const S = reach(m, s0[0], s0[1]); m.warps.forEach((q) => { if (!near(S, q.x, q.y)) badM.push(id + ' 出入口へ行けない'); }); m.npcs.forEach((n) => { if (!near(S, n.x, n.y)) badM.push(id + ' 人 ' + n.id); }); m.events.forEach((e) => { if (!near(S, e.x, e.y)) badM.push(id + ' 出来事'); }); m.chests.forEach((c) => { if (!near(S, c.x, c.y)) badM.push(id + ' 宝箱 ' + c.id); });
}
ok(X.maps.length >= 230 && !badM.length, '新しい部屋 ' + X.maps.length + '：形・文字・出入口の行き先（歩けるマス・ワープでない）と戻り・中の人・出来事・宝箱へ行ける ' + badM.slice(0, 6).join(' | '));
// ④ 既存の屋内に足した階段（50）：部屋の中で行ける所が減らない・階段へ行ける
const badS = [];
X.stairs.forEach((s) => {
  const b = B[s.from]; const c = M[s.from]; let df = 0; for (let y = 0; y < b.rows.length; y++) for (let x = 0; x < b.rows[0].length; x++) if (b.rows[y][x] !== c.rows[y][x]) df++;
  if (df !== 1 || c.rows[s.y][s.x] !== '<') badS.push(s.from + ' 変えたマス ' + df);
  const m0 = new w.GameMap(Object.assign({}, c, { rows: b.rows, warps: c.warps.filter((q) => !q.v72) })); const m1 = new w.GameMap(c);
  const e0 = m0.warps[0]; const st = [[e0.x, e0.y - 1], [e0.x, e0.y + 1]].find(([x, y]) => walkable(m0, x, y, d)); if (!st) { badS.push(s.from + ' 入口'); return; }
  const S0 = reach(m0, st[0], st[1]), S1 = reach(m1, st[0], st[1]); const lost = [...S0].filter((k) => k !== s.x + ',' + s.y && !S1.has(k));
  if (lost.length || !S1.has(s.x + ',' + (s.y + 1))) badS.push(s.from + ' 行けなくなる所 ' + lost.length);
});
ok(X.stairs.length >= 45 && !badS.length, '既存の屋内・城に足した上り階段 ' + X.stairs.length + '：変えたのは1マスだけ・部屋の中で行ける所は減らない・階段のとなりへ行ける ' + badS.slice(0, 5).join(' | '));
ok(['rivel_castle_4f', 'rivel_castle_library', 'magicka_palace_3f', 'sentra_palace_west_3f'].every((id) => M[id] && X.stairs.some((s) => s.to === id)), '城：リヴェル城の屋上（4階）と王立図書室・魔導王宮3階・王宮西棟3階');
// ⑤ 実際に歩く
(async () => {
  const go = async (x, y) => { const p = World.player; p.x = x; p.y = y; p.px = x * 32; p.py = y * 32; World.busy = false; World.onStep(); for (let i = 0; i < 200 && World.busy; i++) await new Promise((r) => setTimeout(r, 15)); };
  const t = X.towns.rivel_town;
  World.enterMap('rivel_artisan', 2, 15, 'left'); const back = World.map.warps.find((q) => q.to === 'rivel_town'); World.doWarp(back); for (let i = 0; i < 100 && World.busy; i++) await new Promise((r) => setTimeout(r, 15));
  ok(World.map.id === 'rivel_town' && World.player.x === t.w - 2, '職人通りから城下町へ：新しい地区の東の端に着く（' + World.player.x + ',' + World.player.y + '）');
  await go(t.w - 1, World.player.y); ok(World.map.id === 'rivel_artisan', '新しい地区の東の端から、職人通りへ出られる');
  const tw = M.rivel_town.buildings.find((b) => b.id === 'x72_tower'); World.enterMap('rivel_town', tw.x + tw.doorX, tw.y + tw.h, 'up'); await go(tw.x + tw.doorX, tw.y + tw.h - 1);
  ok(World.map.id === 'rivel_town_x72_tower', '新しい地区の塔に入れる'); await go(10, 1); ok(World.map.id === 'rivel_town_x72_tower_2f', '1階 → 2階'); await go(1, 7); ok(World.map.id === 'rivel_town_x72_tower_3f', '2階 → 3階（てっぺん）');
  await go(1, 7); ok(World.map.id === 'rivel_town_x72_tower_2f', '3階 → 2階');
  const s = X.stairs.find((q) => q.from === 'rivel_inn'); World.enterMap('rivel_inn', s.x, s.y + 1, 'up'); await go(s.x, s.y); ok(World.map.id === 'rivel_inn_x72_2f', '宿屋の上り階段 → 2階（客室）'); const dn = World.map.warps[0]; await go(dn.x, dn.y); ok(World.map.id === 'rivel_inn' && World.player.x === s.x && World.player.y === s.y + 1, '2階の下り階段 → 宿屋の階段の前');
  const s2 = X.stairs.find((q) => q.from === 'rivel_castle_3f'); World.enterMap('rivel_castle_3f', s2.x, s2.y + 1, 'up'); await go(s2.x, s2.y); ok(World.map.id === 'rivel_castle_4f', 'リヴェル城 3階 → 屋上（物見台）');
  // 新しい人と話せる（全員・エラーなし）
  const said = []; const ctx = { say: async (n, l) => { said.push(n); }, msg: async () => {} }; const terr = []; let nt = 0;
  for (const id of towns.concat(X.maps)) for (const n of (M[id].npcs || []).filter((n) => n.v72 || X.maps.includes(id))) { try { await n.talk(ctx); nt++; } catch (e) { terr.push(n.id + ':' + e.message); } }
  ok(nt > 150 && !terr.length && said.length === nt, '新しい人 ' + nt + '人と話せる（エラーなし）' + terr.slice(0, 3).join(','));
  console.log('errors', errors.slice(0, 3)); ok(!errors.length, 'ページのエラーなし');
  console.log('結果：' + pass + ' OK / ' + fail + ' NG');
})();
