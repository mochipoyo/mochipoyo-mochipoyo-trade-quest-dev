// v6.7 町の人の会話（3種類の別の会話）と、生活・健康の豆知識おばさん
const load = require('./rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World, CH = w.Chatter;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const said = []; w.Win.message = function (lines, o) { said.push({ name: o && o.name, lines: [].concat(lines) }); return Promise.resolve(); };
w.Win.choice = function () { return Promise.resolve(0); };
async function talk(n) { said.length = 0; World.busy = false; World.talk(n); for (let i = 0; i < 50 && World.busy; i++) await new Promise(r => setTimeout(r, 2)); return said.map(s => (s.name || '') + ':' + s.lines.join('/')); }
(async () => {
  State.newGame('t', 'warrior'); const d = State.data; World.start && World.start();
  ok(!!CH && !!w.CHATTER67, 'Chatter と CHATTER67 が読み込まれている');
  // 1. ふつうの町人：いつもの会話 → 地域 → その人 → 相場 → いつもの会話
  World.enterMap('poyo_village', 24, 30, 'up'); const m = World.map;
  const mob = m.npcs.find(n => CH.isMob(n)); ok(!!mob, 'ポヨ村に対象の町人がいる（' + (mob && mob.id) + '）');
  const t1 = await talk(mob), t2 = await talk(mob), t3 = await talk(mob), t4 = await talk(mob), t5 = await talk(mob);
  const reg = w.CHATTER67.region.arcadia.map(x => x.join('/')), role = w.CHATTER67.role[CH.roleOf(mob)].map(x => x.join('/').replace(/\{place\}/g, 'ポヨ村')), tips = w.CHATTER67.tips.map(x => x.join('/'));
  ok(t1.length > 0 && JSON.stringify(t1) === JSON.stringify(t5), '1回目と5回目は いつもの会話');
  ok(t2.length === 1 && reg.includes(t2[0].split(':').slice(1).join(':')), '2回目：地域の話（' + t2[0] + '）');
  ok(t3.length === 1 && role.includes(t3[0].split(':').slice(1).join(':')), '3回目：その人の話（' + t3[0] + '）');
  ok(t4.length === 1 && tips.includes(t4[0].split(':').slice(1).join(':')), '4回目：相場の小話（' + t4[0] + '）');
  ok(t2[0].split(':')[0] === t1[0].split(':')[0], '話す人の名前は いつもの会話と同じ（' + t2[0].split(':')[0] + '）');
  ok(Array.isArray(d.chat[m.id + ':' + mob.id]), 'セーブの d.chat に記録される');
  // 同じマップの別の町人には別の文
  const mobs = m.npcs.filter(n => CH.isMob(n)); if (mobs.length > 1) { const a = CH.lines(mobs[0], m, 0).join('/'), b = CH.lines(mobs[1], m, 0).join('/'); ok(a !== b, '同じマップの町人どうしは別の地域の話'); }
  // 2. 何かが起きる会話（重要な会話）はいままでどおり、そのあと いつもの会話 → 別の会話
  const fake = { id: 'test_giver', x: 1, y: 1, sprite: 'villager_m', talk: async function (c) { if (!c.flag('t67_got')) { await c.say('村人', ['これをあげよう。']); c.give('herb', 1); c.setFlag('t67_got', true); return; } await c.say('村人', ['薬草は役に立ったかい？']); } };
  m.npcs.push(fake); const herb0 = d.inventory.herb || 0;
  const g1 = await talk(fake), g2 = await talk(fake), g3 = await talk(fake);
  ok(g1[0] === '村人:これをあげよう。' && (d.inventory.herb || 0) === herb0 + 1, '重要な会話（アイテムをくれる）は1回目にそのまま起きる');
  ok(g2[0] === '村人:薬草は役に立ったかい？', 'その次は いつもの会話');
  ok(g3.length === 1 && g3[0] !== g2[0] && g3[0].startsWith('村人:'), 'そのあと別の会話（' + g3[0] + '）');
  ok((d.inventory.herb || 0) === herb0 + 1, '下見ではアイテムが増えない');
  // 3. 店の人・仲間・師匠などは対象外
  const MD = w.MAP_DEFS; let svc = 0, comp = 0, bad = [];
  for (const id of Object.keys(MD)) { let mm; try { mm = World.getMap(id); } catch (e) { continue; } (mm.npcs || []).forEach(n => { if (!n.talk) return; const src = String(n.talk); if (/c\.(shop|inn|church|tavern|dojo|guild|bank)\(/.test(src)) { svc++; if (CH.isMob(n)) bad.push(id + ':' + n.id); } if (w.COMPANIONS[n.id]) { comp++; if (CH.isMob(n)) bad.push(id + ':' + n.id); } }); }
  ok(bad.length === 0 && svc > 20 && comp > 5, '店・宿・酒場など（' + svc + '）と仲間（' + comp + '）は対象外' + (bad.length ? ' NG:' + bad.slice(0, 5) : ''));
  // 4. 下見はゲームの状態を変えない（全マップの対象の NPC）
  const before = JSON.stringify(Object.assign({}, d, { chat: null })); let n = 0, acts = 0;
  for (const id of Object.keys(MD)) { let mm; try { mm = World.getMap(id); } catch (e) { continue; } for (const nn of mm.npcs || []) { if (!CH.isMob(nn)) continue; n++; const r = await CH.preview(nn, w.Events.ctx(nn)); if (!r) acts++; } }
  ok(JSON.stringify(Object.assign({}, d, { chat: null })) === before, '下見（' + n + '人・うち重要な会話 ' + acts + '）で状態が変わらない');
  ok(n >= 250, '対象の町人が' + n + '人（250人以上）');
  // 5. 豆知識おばさん：24の町・置き場所・会話
  const A = w.CHATTER67.aunts; const ids = Object.keys(A); ok(ids.length === 24, 'おばさん24人（' + ids.length + '）');
  let place = [], talkNG = [];
  for (const id of ids) { const mm = World.getMap(id); const a = A[id]; const nn = mm.npcs.find(x => x.id === 'aunt67_' + id);
    if (!nn) { place.push(id + ':なし'); continue; }
    const T = w.Tiles; const solid = (x, y) => T.isSolid(mm.tiles[y][x]); const R = id === 'erased_village' ? 1 : 2; let open = true; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (solid(a.x + dx, a.y + dy)) open = false;
    const others = mm.npcs.filter(x => x !== nn && Math.abs(x.x - a.x) + Math.abs(x.y - a.y) <= 1);
    const warps = (MD[id].warps || []).filter(p => Math.abs(p.x - a.x) + Math.abs(p.y - a.y) <= 2);
    const chest = (mm.chests || []).some(c => c.x === a.x && c.y === a.y); const ev = mm.eventAt(a.x, a.y); const sp = w.Search && w.Search.at(mm, a.x, a.y);
    if (!open || others.length || warps.length || chest || ev || sp) place.push(id + (open ? '' : ':狭い') + (others.length ? ':NPC' : '') + (warps.length ? ':出入口' : '') + (chest ? ':宝箱' : '') + (ev ? ':イベント' : '') + (sp ? ':調べる' : ''));
    World.enterMap(id, a.x, a.y + 1, 'up'); const n2 = World.map.npcs.find(x => x.id === 'aunt67_' + id); const s1 = await talk(n2), s2 = await talk(n2);
    if (!(s1.length && s1[0].startsWith(a.name + ':あら、旅の人かい') && s2.length && s2[0] !== s1[0])) talkNG.push(id);
  }
  ok(place.length === 0, 'おばさんの置き場所：周りが空いていて、NPC・出入口・宝箱・イベント・調べる場所と重ならない' + (place.length ? ' NG:' + place.join(',') : ''));
  ok(talkNG.length === 0, 'おばさんと話すと、自己紹介と豆知識 → 次は別の豆知識' + (talkNG.length ? ' NG:' + talkNG : ''));
  const tipIds = new Set(); ids.forEach(id => A[id].tips.forEach(t => tipIds.add(t))); ok([...tipIds].every(t => w.CHATTER67.auntTips[t]) && ids.every(id => A[id].tips.length >= 7), 'おばさんの豆知識は7つ以上・すべて文がある（使う豆知識 ' + tipIds.size + '種類）');
  // 6. 古いセーブ（d.chat がない）でも動く
  delete d.chat; World.enterMap('poyo_village', 24, 30, 'up'); const mob2 = World.map.npcs.find(n => CH.isMob(n)); const o1 = await talk(mob2); ok(o1.length > 0 && !!d.chat, 'd.chat のない古いセーブでも話せる（記録を作る）');
  const raw = JSON.stringify(d); const re = State.migrate(JSON.parse(raw)); ok(re && re.chat && JSON.stringify(re.chat) === JSON.stringify(d.chat), 'セーブして読み直しても d.chat が残る');
  ok(errors.length === 0, 'エラーなし' + (errors.length ? ' ' + errors[0] : ''));
  console.log(`\nchatter67test: ${pass} OK / ${fail} NG`); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('EXC', e && e.stack); process.exit(1); });
