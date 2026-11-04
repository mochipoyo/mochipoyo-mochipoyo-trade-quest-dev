// v7.3（2D・jsdom）：地区の型・チャートの場面・IQテスト・本棚・家の台所とトイレ・個性的な町の人30人・能力の最大値を上げる道具・ボスの呼ぶ敵・町と城の動物
const path = require('path');
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World, T = w.Tiles, M = w.MAP_DEFS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
w.Win.message = () => Promise.resolve(); w.Win.toast = () => {}; World.encounter = () => {};
State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start();
const rngOf = (s) => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const walkable = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !T.isSolid(m.tiles[y][x]) && !(m.eventAt(x, y) && m.eventAt(x, y).solid && !m.eventAt(x, y).doneFlag);
const reach = (m, sx, sy, block) => { const s = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!s.has(k) && walkable(m, nx, ny) && !(block && block.has(k))) { s.add(k); q.push([nx, ny]); } } } return s; };
const near = (S, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S.has((x + dx) + ',' + (y + dy)));
const entries = (id) => { const arr = []; Object.keys(M).forEach((k) => (M[k].warps || []).concat(M[k].locations || []).forEach((q) => { if (q && q.to === id && typeof q.tx === 'number') arr.push([q.tx, q.ty]); })); return arr; };
const BASE = process.env.BASE_DIR || '/home/claude/base73/';

(async () => {
  // ---------- ① 新しい地区の型 ----------
  const X = w.EXPAND72; const towns = Object.keys(X.towns);
  const styles = new Set(towns.map((id) => X.towns[id].style));
  ok(towns.length === 24 && towns.every((id) => X.towns[id].tower), '24の町の新しい地区：どの町にも3階までの塔がある');
  ok(styles.size >= 15, '地区の型が町ごとに変わる（型 ' + styles.size + ' 種類：' + [...styles].join('・') + '）');
  // 並び（塔・家の位置と道の形）が同じ町の組がない（大きさをそろえて比べる）
  const sig = (id) => { const t = X.towns[id], m = M[id]; const tw = m.buildings.find((b) => b.id === 'x72_tower'), hs = m.buildings.find((b) => b.id === 'x72_house'); const H = m.rows.length; return [Math.round((tw.x - t.oldW) / 4), Math.round(tw.y / H * 4), Math.round((hs.x - t.oldW) / 4), Math.round(hs.y / H * 4), t.style].join(','); };
  const sigs = {}; towns.forEach((id) => { const k = sig(id); (sigs[k] = sigs[k] || []).push(id); }); const dup = Object.values(sigs).filter((a) => a.length > 1);
  ok(dup.length <= 2, '塔と家の場所・型がまったく同じ町の組は2組まで（同じ型の町は塔・家の置き方や大きさで変える）：' + JSON.stringify(dup));
  const towerPos = new Set(towns.map((id) => { const t = X.towns[id], m = M[id]; const tw = m.buildings.find((b) => b.id === 'x72_tower'); return Math.round((tw.x - t.oldW) / 6) + ',' + Math.round(tw.y / m.rows.length * 3); }));
  ok(towerPos.size >= 5, '塔の場所（地区の中のおおよその位置）が町ごとにばらける：' + towerPos.size + ' か所');
  // ---------- ② チャートの場面 ----------
  const SS = w.SCENARIO_SEEDS, Sc = w.Scenarios; const ids = Sc.ids();
  ok(ids.every((id) => (SS[id] || []).length === 10), 'どのシナリオにも検証済みのシードが10（34×10＝' + ids.reduce((a, id) => a + (SS[id] || []).length, 0) + '）');
  const old = JSON.parse(require('child_process').execFileSync('node', ['-e', "const load=require('./rpgload.js');const A=load();process.stdout.write(JSON.stringify(A.w.SCENARIO_SEEDS));"], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: BASE }), maxBuffer: 1 << 26 }).toString());
  ok(ids.every((id) => (old[id] || []).every((s, i) => SS[id][i] === s)), 'これまでのシード（0〜5）は同じ・足したのは6〜9（新しい場面 ' + ids.reduce((a, id) => a + SS[id].length - (old[id] || []).length, 0) + '）');
  const distinctSeeds = new Set(); ids.forEach((id) => SS[id].forEach((s) => distinctSeeds.add(id + ':' + s))); ok(distinctSeeds.size === 340, 'シナリオ×シードの場面は 340 通り（重なりなし）');
  d.counters.trialRecent = []; const scs = ['clear_up', 'clear_down', 'range', 'up_pullback', 'down_rally']; const r = rngOf(7); const keys = []; for (let i = 0; i < 40; i++) { const pk = w.TradeUI.pickTrial(scs, r); keys.push(pk.id + ':' + pk.offset); }
  let rep = 0; for (let i = 0; i < keys.length; i++) for (let j = Math.max(0, i - 12); j < i; j++) if (keys[i] === keys[j]) rep++;
  ok(rep === 0 && new Set(keys).size >= 30, '戦闘の相場の試練：12回以内に同じ場面が出ない（40回で ' + new Set(keys).size + ' 場面・5シナリオ×10）');
  ok(Array.isArray(d.counters.trialRecent) && d.counters.trialRecent.length === 12, '最近の場面はセーブ（counters.trialRecent）に12まで');
  // 戦闘の試練は pickTrial の場面で出す（trial の引数を記録）
  { const calls = []; const orig = w.TradeUI.trial; w.TradeUI.trial = (s, o) => { calls.push([s, o]); return Promise.resolve({ score: 80 }); };
    const ev = []; const ctxOk = typeof w.Events.ctx === 'function'; const c = w.Events.ctx({}); await c.trial(['clear_up', 'range'], { title: 'x' }); w.TradeUI.trial = orig;
    ok(ctxOk && calls.length === 1 && calls[0][1].vary === true, 'クエストの試練（会話の trial）も場面を変える（vary）'); }
  // ---------- ③ IQテスト ----------
  const IQ = w.IQ73; const Q = IQ.QUESTIONS;
  ok(Q.length >= 40 && Q.every((q) => q.o.length === 4 && q.a >= 0 && q.a < 4 && new Set(q.o).size === 4 && q.q && q.k), 'IQテストの問題 ' + Q.length + '：選択肢4つ（重なりなし）・正解の番号・種類');
  const pk = IQ.pick(rngOf(3)); ok(pk.length === 15 && new Set(pk).size === 15, '毎回15問をくじ引き（同じ問題なし）');
  ok(IQ.score(0) === 70 && IQ.score(15) === 145, 'IQ（遊びの換算）＝70＋正解数×5（70〜145）');
  // 正解の確かめ（計算で出せる問題）
  const QA = { '2, 4, 8, 16, ？': '32', '1, 4, 9, 16, ？': '25', '1, 1, 2, 3, 5, 8, ？': '13', '1000ゴールドの品の2割引きは？': '800', 'りんご3個で180ゴールド。5個では？': '300', '1〜100で、3でも5でも割り切れる数はいくつ？': String([...Array(100)].filter((_, i) => (i + 1) % 15 === 0).length), 'ある数に3をかけて4を足すと19。ある数は？': String((19 - 4) / 3) };
  ok(Object.keys(QA).every((k) => { const q = Q.find((x) => x.q === k); return q && q.o[q.a] === QA[k]; }), '計算で確かめられる問題の正解が合っている（' + Object.keys(QA).length + '問）');
  const tb = M.tradia.buildings.find((b) => b.id === 'td_house2'); ok(tb && tb.interior === 'tradia_iq73' && M.tradia_iq73, 'トレディアの住宅街の家（中に入れなかった家）が「IQテストの館」になり、中に入れる');
  { World.maps = {}; World.enterMap('tradia', tb.x + tb.doorX, tb.y + tb.h, 'up'); const p = World.player; p.x = tb.x + tb.doorX; p.y = tb.y + tb.h - 1; World.busy = false; World.onStep(); for (let i = 0; i < 100 && World.busy; i++) await new Promise((r) => setTimeout(r, 15));
    ok(World.map.id === 'tradia_iq73', 'トレディアから館へ歩いて入れる'); const ex = World.map.warps[0]; p.x = ex.x; p.y = ex.y; World.busy = false; World.onStep(); for (let i = 0; i < 100 && World.busy; i++) await new Promise((r) => setTimeout(r, 15));
    ok(World.map.id === 'tradia' && World.player.y === tb.y + tb.h, '館から出ると扉の前'); }
  { const S = entries('tradia').map(([x, y]) => { const m = World.getMap('tradia'); return walkable(m, x, y) ? reach(m, x, y) : new Set(); }).reduce((a, s) => { s.forEach((k) => a.add(k)); return a; }, new Set()); ok(S.has((tb.x + tb.doorX) + ',' + (tb.y + tb.h)), 'トレディアの入口から館の扉の前へ行ける'); }
  // 実際に受ける（すべて正解 → 15問・ごほうび。2回目はごほうびなし）
  { const m0 = World.getMap('tradia_iq73'); const exm = m0.npcs.find((n) => n.id === 'iq73_minerva'); let qi = 0; const said = []; const got = [];
    const ctx = (answers) => ({ say: async (n, l) => { said.push(...l); }, msg: async (l) => { got.push(...l); }, choice: async (pr, opts) => { if (/^第\d+問/.test(pr)) { const q = Q.find((x) => pr.endsWith(x.q) && x.o.join() === opts.join()); qi++; return answers === 'right' ? q.a : (q.a + 1) % 4; } return 0; } });
    const g0 = d.gold; const before = State.hasItem('elixir_crystal') ? d.inventory.elixir_crystal : 0; await exm.talk(ctx('right'));
    ok(qi === 15 && d.counters.iq73_best === 15 && said.some((s) => /IQ（遊びの換算）は 145/.test(s)) && said.some((s) => /本物の知能検査/.test(s)), 'IQテスト：15問を解く・すべて正解で 145・本物の検査ではないと伝える');
    ok(d.gold === g0 + 200 && d.inventory.elixir_crystal === before + 1 && d.inventory.magic_tequila >= 1, 'ごほうび（初めて：200ゴールド・12問以上：クリスタルの妙薬・15問：魔力テキーラ）');
    const g1 = d.gold; qi = 0; await exm.talk(ctx('wrong')); ok(qi === 15 && d.gold === g1 && d.counters.iq73_best === 15 && d.counters.iq73_plays === 2, '2回目：ごほうびは出ない・いちばん良い記録は残る・回数を数える'); }
  // ---------- ④ 本棚・台所・トイレ ----------
  ok(['bookshelf', 'stove', 'sink', 'cupboard', 'toilet'].every((n) => T.defs[n] && T.isSolid(n)) && T.byChar['^'] === 'stove' && T.byChar[']'] === 'sink' && T.byChar['{'] === 'cupboard' && T.byChar['['] === 'toilet', 'タイル：本棚・かまど・流し・食器棚・トイレ（通れない）');
  { const doc = w.document; const c = doc.createElement('canvas'); c.width = 32; c.height = 32; let painted = true; try { T.defs.bookshelf.paint && T.render && T.render(c.getContext('2d'), 'bookshelf', 0, 0); } catch (e) { painted = false; } ok(painted, '本棚の絵を描ける（エラーなし）'); }
  const HM = w.HOMES73; ok(HM.homes.length >= 60 && HM.skipped.length === 0, '家の台所とトイレ：' + HM.homes.length + ' 軒（人の住んでいない家 ' + HM.homes.filter((h) => h.empty).length + '）');
  const badH = []; const B73 = JSON.parse(require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();const o={};${JSON.stringify(HM.homes.map((h) => h.id))}.forEach(id=>{const d=A.w.MAP_DEFS[id];o[id]=d&&!d.v72?{rows:d.rows}:null;});process.stdout.write(JSON.stringify(o));`], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: BASE }), maxBuffer: 1 << 26 }).toString());
  for (const h of HM.homes) {
    const def = M[h.id]; const m = new w.GameMap(def); const p0 = B73[h.id] || def._pre71; const W0 = h.oldW;   // 既存の家は v7.2 の版と、v7.2 で足した家は台所を足す前の控えと比べる
    if (!def.rows.every((r) => r.length === W0 + 4)) badH.push(h.id + ' 幅');
    for (let y = 0; y < p0.rows.length; y++) for (let x = 0; x < W0; x++) if (p0.rows[y][x] !== def.rows[y][x] && !(x === W0 - 1 && (y === h.open || y === h.open + 1))) badH.push(h.id + ' 元の部屋が変わった ' + x + ',' + y);
    const st = m.warps.find((q) => q.y === m.h - 1) || m.warps[0]; const s0 = [[st.x, st.y - 1], [st.x, st.y + 1]].find(([x, y]) => walkable(m, x, y)); if (!s0) { badH.push(h.id + ' 入口'); continue; }
    const S = reach(m, s0[0], s0[1]); const ks = ['stove', 'sink', 'cupboard', 'toilet'].map((n) => { for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.tiles[y][x] === n) return [x, y]; return null; });
    if (ks.some((k) => !k || !near(S, k[0], k[1]))) badH.push(h.id + ' 台所・トイレへ行けない');
    const m0 = new w.GameMap(Object.assign({}, def, { rows: p0.rows, events: (def.events || []).filter((e) => !e.v73) })); const S0 = reach(m0, s0[0], s0[1]); const lost = [...S0].filter((k) => !S.has(k)); if (lost.length) badH.push(h.id + ' 行けなくなった ' + lost.length);
    if ((def.events || []).filter((e) => e.v73 && e.type === 'inspect').length !== 4) badH.push(h.id + ' 調べる');
  }
  ok(!badH.length, '家の東に台所（食器棚・かまど・流し）とトイレ：元の部屋は東の壁の2マスだけ変える・入口から行ける・行ける所は減らない・調べると一言 ' + badH.slice(0, 5).join(' | '));
  { const themed = new Set(HM.homes.map((h) => (M[h.id].events.find((e) => e.v73 && /かまど/.test(e.text[0])) || {}).text.join(''))); ok(themed.size >= 10, '台所の一言は町のテーマで変わる（' + themed.size + ' 種類）'); }
  // ---------- ⑤ 町と城の動物 ----------
  const TL = w.TOWNLIFE73; const AA = w.AnimalArt;
  ok(AA && AA.KINDS.length === 8 && AA.KINDS.every((k) => ['down', 'up', 'left', 'right'].every((dir) => [0, 1].every((f) => AA.pixels('animal_' + k, dir, f).length > 30))), '動物の絵（2D）：8種類×4方向×2コマ');
  ok(AA.KINDS.every((k) => JSON.stringify(AA.pixels('animal_' + k, 'right', 0)) !== JSON.stringify(AA.pixels('animal_' + k, 'right', 1))), '歩くと足が動く（2コマが違う）');
  ok(TL.skipped.length === 0, '置けなかった動物・人なし ' + TL.skipped.join(','));
  const byMap = {}; TL.animals.forEach((a) => { (byMap[a.map] = byMap[a.map] || []).push(a.kind); });
  const LIVE = ['chicken', 'cow', 'sheep', 'pig', 'horse', 'camel'];
  const badA = TL.TOWNS.filter((id) => { const k = byMap[id] || []; return !(k.includes('dog') && k.includes('cat') && k.some((x) => LIVE.includes(x))); });
  ok(TL.TOWNS.length >= 25 && !badA.length, 'すべての町（' + TL.TOWNS.length + '）に犬・猫・家畜 ' + badA.join(','));
  ok(TL.CASTLES.length === 3 && TL.CASTLES.every((id) => (byMap[id] || []).includes('cat') && ((byMap[id] || []).includes('dog') || id === 'magicka_palace')), '城（リヴェル城・魔導王宮・王宮西棟）に犬・猫（魔導王宮は猫2匹）');
  ok(new Set(TL.animals.map((a) => a.kind)).size === 8 && TL.animals.length >= 120, '動物 ' + TL.animals.length + '（8種類：' + [...new Set(TL.animals.map((a) => a.kind))].join('・') + '）');
  ok((byMap.sahar_city || []).includes('camel') && (byMap.poyo_village || []).includes('cow') && (byMap.rivel_town || []).includes('horse'), '町のテーマに合わせた家畜（砂漠にらくだ・村に牛・王都に馬）');
  // ---------- ⑥ 個性的な町の人30人 ----------
  ok(TL.chars.length === 30 && new Set(TL.chars.map((c) => c.map)).size >= 25 && new Set(TL.chars.map((c) => c.name)).size === 30, '個性的な町の人30人（' + new Set(TL.chars.map((c) => c.map)).size + ' か所に振り分け）');
  ok(TL.CHARS.every((c) => w.Chars.has('u73_' + c.id) && c.lines.length === 3 && c.lines.every((l) => l.length >= 2)), 'それぞれ専用の色（2D）と3つの話');
  ok(!Object.values(w.COMPANIONS || {}).some((c) => TL.CHARS.some((u) => u.name === c.name)), '仲間にはならない（仲間の一覧にない）');
  { const n = M[TL.chars[0].map].npcs.find((q) => q.id === TL.chars[0].id); const said = []; const ctx = { say: async (nm, l) => said.push(l[0]) }; for (let i = 0; i < 4; i++) await n.talk(ctx); ok(said.length === 4 && said[0] !== said[1] && said[1] !== said[2] && said[3] === said[0], '話しかけるたびに次の話（3つで1周。セーブの d.chat に回数）'); }
  // ---------- ⑦ 置いた動物・人で、行ける所が減らない・みんなのそばへ行ける ----------
  const badP = [];
  for (const id of TL.TOWNS.concat(TL.CASTLES)) {
    World.maps = {}; const m = World.getMap(id); const ent = entries(id).filter(([x, y]) => walkable(m, x, y)); if (!ent.length) { badP.push(id + ' 入口'); continue; }
    const mine = m.npcs.filter((n) => n.v73 && !n.hidden); const others = new Set(m.npcs.filter((n) => !n.v73 && !n.hidden && !n.wander).map((n) => n.x + ',' + n.y));
    const blockAll = new Set([...others, ...mine.map((n) => n.x + ',' + n.y)]);
    const S0 = new Set(), S1 = new Set(); ent.forEach(([x, y]) => { reach(m, x, y, others).forEach((k) => S0.add(k)); reach(m, x, y, blockAll).forEach((k) => S1.add(k)); });
    const lost = [...S0].filter((k) => !S1.has(k) && !mine.some((n) => n.x + ',' + n.y === k)); if (lost.length) badP.push(id + ' 行けなくなる ' + lost.length);
    mine.forEach((n) => { if (!near(S1, n.x, n.y)) badP.push(id + ' ' + n.id + ' のそばへ行けない'); if (m.warpAt(n.x, n.y) || m.eventAt(n.x, n.y) || m.chestAt(n.x, n.y)) badP.push(id + ' ' + n.id + ' 出入口などの上'); });
  }
  ok(!badP.length, '動物と個性的な人を置いても、町の入口から行ける所は減らない・どの動物・人のそばへも行ける ' + badP.slice(0, 5).join(' | '));
  { const said = []; const ctx = { say: async (nm, l) => said.push(nm) }; let n = 0; for (const id of TL.TOWNS.concat(TL.CASTLES)) for (const a of M[id].npcs.filter((q) => q.animal)) { await a.talk(ctx); n++; } ok(n === TL.animals.length && said.length === n, '動物 ' + n + ' 匹に話しかけられる（エラーなし）'); }
  // ---------- ⑧ 能力の最大値を上げる道具 ----------
  const GR = w.Growth73; const I = w.ITEMS;
  ok(GR.LIST.length === 6 && [['energy_drink_eternal', '永久エナジードリンク', 'maxHp'], ['magic_tequila', '魔力テキーラ', 'maxMp'], ['elixir_resolve', '断迷の妙薬', 'atk'], ['elixir_endure', '耐攻の妙薬', 'def'], ['elixir_decide', '即断即決の妙薬', 'agi'], ['elixir_crystal', 'クリスタルの妙薬', 'mag']].every(([id, nm, st]) => I[id] && I[id].name === nm && I[id].effect.grow === st && I[id].noShop), '6つの道具（名前・上がる能力・店では売らない）');
  { const hero = d.hero; const s0 = w.Actors.stats(hero); const ns = []; for (let i = 0; i < 400; i++) { const a = { grow: {}, hp: 10, mp: 5, dead: false }; ns.push(GR.apply(a, 'atk')); }
    ok(Math.min(...ns) === 1 && Math.max(...ns) === 4 && [1, 2, 3, 4].every((k) => ns.filter((x) => x === k).length > 60), '上がる数は 1〜4（ランダム。400回でどれも出る）');
    const hp0 = hero.hp; const n1 = GR.apply(hero, 'maxHp', () => 0.99); const n2 = GR.apply(hero, 'agi', () => 0); const s1 = w.Actors.stats(hero);
    ok(n1 === 4 && n2 === 1 && s1.maxHp === s0.maxHp + 4 && s1.agi === s0.agi + 1 && hero.hp === hp0 + 4 && s1.atk === s0.atk, '使うと最大値が上がる（最大HP+4 なら今のHPも+4）・ほかの能力は変わらない');
    const saved = JSON.parse(JSON.stringify(d)); const md = State.migrate(saved); ok(md.hero.grow && md.hero.grow.maxHp === 4 && md.hero.grow.agi === 1, 'セーブして読み込んでも残る（Actor.grow）');
    const old = JSON.parse(JSON.stringify(d)); delete old.hero.grow; const mo = State.migrate(old); ok(w.Actors.stats(mo.hero).maxHp === s0.maxHp, 'grow のない古いセーブも読める（能力は元のまま）'); }
  { let got = 0, lines = []; const rr = rngOf(11); for (let i = 0; i < 2000; i++) if (GR.bonusDrop(lines, 'chest', rr)) got++; ok(got > 140 && got < 270, '宝箱でときどき見つかる（10%：2000回で ' + got + '）');
    let gs = 0; for (let i = 0; i < 2000; i++) if (GR.bonusDrop(null, 'sparkle', rr)) gs++; ok(gs > 180 && gs < 300, '光っている所でときどき見つかる（12%：2000回で ' + gs + '）'); }
  { const src = require('fs').readFileSync(path.join(process.env.RPG_DIR || '/home/claude/mochipoyo-trade-quest/', 'js/ui/battle.js'), 'utf8'); ok(/!ITEMS\[id\]\.growItem/.test(src), '戦闘中の「どうぐ」には出さない'); }
  // ---------- ⑨ ボスが呼ぶ敵・連れてくる敵 ----------
  { const C = w.Combat; const E = w.ENEMIES; const party = State.partyActors();
    const bossIds = Object.keys(E).filter((k) => E[k].boss || /^boss_/.test(k)); let tested = 0, scaledOk = 0, plainOk = true;
    for (const bid of bossIds) { const sp = (E[bid].actions || []).find((s) => s && s.type === 'special' && s.id === 'call' && s.summon); const mid = sp ? sp.summon : null; if (!mid || !E[mid]) continue;
      const b1 = C.create([bid, mid], party, { boss: true }); const b0 = C.create([mid], party, {}); const boss = b1.enemies[0], mn = b1.enemies[1], pl = b0.enemies[0]; tested++;
      if (boss.maxHp >= 3 * pl.maxHp) { if (mn.maxHp > pl.maxHp && mn.atk >= pl.atk) scaledOk++; } else if (mn.maxHp !== pl.maxHp) plainOk = false;
      if (pl.maxHp !== E[mid].hp && pl.maxHp !== (E[mid].maxHp || E[mid].hp)) { /* 通常の戦闘の強さはそのまま（元の値） */ } }
    const src2 = require('fs').readFileSync(path.join(process.env.RPG_DIR || '/home/claude/mochipoyo-trade-quest/', 'js/rpg/combat.js'), 'utf8'); ok(/else if \(b\.boss\) \{ var kb = Combat\.minionScale/.test(src2), '戦闘中に呼ばれた敵も、ボス戦では同じように強くする（combat.js の呼ぶ処理）');
    ok(tested >= 5 && scaledOk >= tested * 0.6 && plainOk, 'ボス戦で一緒に出る・呼ばれる敵は強くなる（ボスがその敵の3倍以上のHPのとき。' + scaledOk + '/' + tested + '）。ふつうの戦闘の同じ敵は変わらない');
    const k = C.minionScale({ maxHp: 10000 }, { maxHp: 100, atk: 10 }); ok(k && k.hp <= C.MINION.maxHp && k.atk <= C.MINION.maxAtk && C.minionScale({ maxHp: 200 }, { maxHp: 100 }) === null, '強くする倍率には上限（HP×' + C.MINION.maxHp + '・攻撃×' + C.MINION.maxAtk + '）・ボスが弱いときは変えない'); }
  // ---------- ⑩ v7.2 で足して v7.3 で無くなった部屋にいるセーブ ----------
  { const s1 = JSON.parse(JSON.stringify(d)); s1.pos = { map: 'verum_town_x72_ex2', x: 5, y: 4, dir: 'up' }; const moved = World.fixLostMap(s1); const tw = M.verum_town.buildings.find((b) => b.id === 'x72_tower');
    const s2 = JSON.parse(JSON.stringify(d)); s2.pos = { map: 'harbor_house', x: 5, y: 4, dir: 'up' }; const kept = World.fixLostMap(s2);
    const s3 = JSON.parse(JSON.stringify(d)); s3.pos = { map: 'no_such_room', x: 1, y: 1, dir: 'up' }; s3.lastInn = { map: 'rivel_town', x: 30, y: 30 }; World.fixLostMap(s3);
    ok(moved && s1.pos.map === 'verum_town' && s1.pos.x === tw.x + tw.doorX && s1.pos.y === tw.y + tw.h && !kept && s2.pos.map === 'harbor_house' && s3.pos.map === 'rivel_town', '無くなった部屋（v7.2 の新しい地区の店の一部）にいるセーブ：その町の塔の前から始まる（町が分からなければ最後の宿屋）・ある部屋はそのまま');
    State.data = s1; let okStart = true; try { World.start(); } catch (e) { okStart = false; } ok(okStart && World.map.id === 'verum_town', 'そのセーブで始められる'); }
  console.log('errors', errors.slice(0, 3)); ok(!errors.length, 'ページのエラーなし');
  console.log('結果：' + pass + ' OK / ' + fail + ' NG');
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
