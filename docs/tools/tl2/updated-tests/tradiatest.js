// v9.1 で更新した写し（元：作業用フォルダの tradiatest.js）。変えたのは「建物の中から出ると入口の前に戻る」の確かめ 1 か所だけ（理由は docs/trade-advanced/PHASE0_AUDIT.md）
// v6.4 Phase D：相場都市トレディア（施設・トレーダー12人・トレードバトル・レバレッジ取引ゲーム・保存）の jsdom テスト
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w, errors } = load(); const fs = require('fs');
const { execFileSync } = require('child_process');
const doc = w.document; const E = w.Engine, Input = E.Input, State = w.State, World = w.World, Win = w.Win;
w.MochiQuest.boot();
const sleep = ms => new Promise(r => setTimeout(r, ms)); const frames = async n => { for (let i = 0; i < n; i++) await sleep(17); };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const clean = () => { doc.querySelectorAll('#ui > *').forEach(n => n.remove()); E.scenes = E.scenes.filter(sc => !sc.overlay); };
const M = w.MAP_DEFS, TR = w.TRADERS, IDS = w.TRADER_IDS, TB = w.TradeBattle, LV = w.Leverage, UI = w.TradiaUI, S = w.Scenarios, I = w.ITEMS;
const OLD = process.env.MAIN_DIR || '/home/claude/snap63/';
(async () => {
  await frames(5); clean(); State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant';
  // ① 施設14・地図
  const town = M.tradia; const bt = town.buildings.map(b => b.name);
  const fac = ['トレード闘技場', 'レバレッジ取引所', '投資家ギルド', '相場研究所', '証券市場', '銀行', '酒場', '高級武器店', '防具店', '道具屋', '宿屋', '住宅街', '富豪の屋敷'];
  ok(fac.every(f => bt.some(n => n.indexOf(f) >= 0)) && town.npcs.some(n => n.id === 'td_galva') && town.npcs.filter(n => /bankrupt/.test(n.id)).length === 3, '施設14：建物13（' + town.buildings.length + '棟）＋破産者の集まる裏通り（南西の路地。ガルバと3人）');
  // v9.1 更新：v8.1 の町の作り直し（js/rpg/remake81.js・js/data/remake81-tradia.js）で建物の位置が変わり、屋内の出口の行き先（旧座標）は
  //   その場で MapRemake.pos が「その建物の新しい扉の前」へ置き換える。地図のデータ（MAP_DEFS）どうしを比べる元の確かめは、作り直す前の座標どうしを比べていた。
  //   いまの動き（ゲームで実際に使う、作り直したあとの地図の扉と、出口の着く所）を比べる
  { const tm = World.getMap('tradia'); const pairs = [];
    (tm.warps || []).filter(q => q.to && /^tradia_/.test(q.to) && q.to !== 'tradia_sky').forEach(door => { const I = World.getMap(door.to); (I.warps || []).filter(x => x.to === 'tradia').forEach(b => { const p = w.MapRemake ? w.MapRemake.pos('tradia', b.tx, b.ty, 'down') : { x: b.tx, y: b.ty }; pairs.push(Math.abs(p.x - door.x) + Math.abs(p.y - door.y)); }); });
    ok(pairs.length >= 20 && pairs.every(dd => dd <= 1), '建物の中から出ると、その建物の入口の前に戻る（作り直したあとの地図で ' + pairs.length + ' 個の出口すべてが扉の隣）'); }
  ok(town.buildings.filter(b => b.interior).every(b => { const gm = new w.GameMap(M[b.interior]); const q = w.MapRemake ? w.MapRemake.pos(b.interior, b.entry.x, b.entry.y) : b.entry; return gm.passable(q.x, q.y, d); }), '建物に入ったときの位置は、中の通れるマス');   // v7.6 広げた屋内：入る位置は enterMap が新座標に直す
  // v6.8 トレディアはマクディア地方へ移した（入口 (60,80)）。カリオン徴収連邦の入口はない
  const wk = M.world_magicka; const loc = wk.locations.find(L => L.id === 'tradia'); ok(!!loc && loc.x === 60 && loc.y === 80 && wk.warps.some(x => x.to === 'tradia' && x.x === 60 && x.y === 80) && !M.world_kalion.locations.some(L => L.id === 'tradia') && !M.world_kalion.warps.some(x => x.to === 'tradia'), 'ワールド（マクディア地方）の (60,80) に入口（カリオン徴収連邦からは外した）');
  { const gm = new w.GameMap(wk); const k = wk.locations.find(L => L.id === 'magicka_city'); const seen = new Set([k.x + ',' + k.y]); const qq = [[k.x, k.y]]; let found = false;
    while (qq.length) { const [x, y] = qq.shift(); if (x === 60 && y === 80) { found = true; break; } for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; const key = nx + ',' + ny; if (seen.has(key) || nx < 0 || ny < 0 || nx >= gm.w || ny >= gm.h) continue; if (!(nx === 60 && ny === 80) && !gm.passable(nx, ny, d)) continue; seen.add(key); qq.push([nx, ny]); } }
    ok(found, '魔導都マクディアからトレディアの入口まで歩いて行ける（幅優先探索）'); }
  ok(town.warps.filter(x => x.to !== 'tradia_sky').every(x => x.to === 'world_magicka' && x.tx === 60 && x.ty === 81), '町の外へ出るとワールド（マクディア地方）の入口の下に出る（v7.1 空の区画へのエレベーターは除く）');
  // ② トレーダー12人
  ok(IDS.length === 12 && IDS.every(id => TR[id] && TR[id].name && TR[id].bio && TR[id].past && TR[id].strategy && TR[id].lines.length && TR[id].win.length && TR[id].lose.length && TR[id].reward && TR[id].reward.title && TR[id].tier >= 1 && TR[id].pool.length >= 5), 'トレーダー12人：名前・経歴・戦略・会話・勝ち負けの台詞・★・報酬・場面5つ以上');
  ok(new Set(IDS.map(id => TR[id].sprite)).size === 12 && IDS.every(id => w.Chars.has(TR[id].sprite)), '全員が別の見た目（専用の色の歩行キャラ12種）');
  ok(IDS.every(id => TR[id].pool.every(sid => S.get(sid))), '勝負の場面はすべて既存の学習シナリオ');
  const npcMaps = {}; Object.keys(M).forEach(mid => (M[mid].npcs || []).forEach(n => { if (/^td_/.test(n.id)) npcMaps[n.id] = mid; }));
  ok(IDS.every(id => npcMaps['td_' + id]), '12人全員が町のどこかに立っている（' + IDS.map(id => npcMaps['td_' + id]).filter((v, i, a) => a.indexOf(v) === i).length + 'か所）');
  ok(IDS.every(id => TR[id].pool.length && Object.keys(TB.STRATEGY).indexOf(id) >= 0), '全員に独自の判断ロジック（TradeBattle.STRATEGY）');
  // ③ 限定装備・クエスト
  const LIM = w.TRADIA_LIMITED; const oldIds = JSON.parse(execFileSync('node', ['-e', `const load=require('./rpgload.js'); const {w}=load(); process.stdout.write(JSON.stringify(Object.keys(w.ITEMS)))`], { cwd: '/home/claude/work', env: Object.assign({}, process.env, { RPG_DIR: OLD }) }).toString());
  ok(LIM.length === 13 && LIM.every(id => I[id] && oldIds.indexOf(id) < 0) && new Set(LIM).size === 13, '限定装備13（IDは v6.3 と重複なし）');
  const shopItems = new Set(); Object.values(M).forEach(m => ((m.shop && m.shop.stock) || []).forEach(x => shopItems.add(x)));
  ok(LIM.every(id => !shopItems.has(id) && I[id].price === 0), '限定装備は店で売っていない（非売品）');
  ok(IDS.every(id => LIM.indexOf(TR[id].reward.item) >= 0) && I[w.QUESTS.tradia_margin.reward.item], '12人の報酬は限定装備、取引所の講習の報酬も限定装備');
  // ④ NPC は将来の足を見ない：将来の足をでたらめに変えても、判断は1ビットも変わらない
  { let same = 0, total = 0; const Ssc = w.Scenarios;
    for (const id of IDS) for (const sid of TR[id].pool.slice(0, 3)) { const scn = Ssc.build(sid, 1); const a = JSON.stringify(TB.decide(id, scn));
      const fake = Object.assign({}, scn, { future: scn.future.map(c => ({ o: c.o + 3, h: c.h + 5, l: c.l - 5, c: c.c - 3, t: c.t })), states: JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(scn.states).map(([k, v]) => [k, { future: [] }])))) });
      const b = JSON.stringify(TB.decide(id, fake)); total++; if (a === b) same++; }
    ok(same === total, 'NPC は判断の時点までの足だけを見る（将来の足を書き換えても ' + same + '/' + total + ' 件すべて同じ判断）'); }
  // ⑤ 採点：判断の質＋結果＋規律。過剰なリスクは40点まで
  { const scn = S.build('clear_up', 0); const good = TB.decide('zeno', scn); const j = TB.judge(scn, good);
    const big = Object.assign({}, good, { riskPercent: 5 }); const jb = TB.judge(scn, big);
    ok(j.sc.total === j.sc.judgment + j.sc.outcome + j.sc.discipline && j.sc.judgment <= 60 && j.sc.outcome <= 25 && j.sc.discipline <= 15, '合計＝判断（60）＋結果（25）＋規律（15）');
    ok(jb.sc.overRisk && jb.sc.total <= 40 && jb.sim.pips === j.sim.pips, '同じ取引でもリスク5%は「過剰なリスク」で40点まで（' + j.sc.total + '→' + jb.sc.total + '点）');
    const nosl = Object.assign({}, good, { sl: null }); const jn = TB.judge(scn, nosl); ok(jn.sc.overRisk && jn.sc.total <= 40, '損切りなしも40点まで');
    ok(TB.rows(j).length === 11 && TB.ITEMS.length === 11, '比べる項目は11（上位足・高値安値・EMA・RCI・MACD・タイミング・損切り・RR・許容損失率・最終損益・最大ドローダウン）'); }
  // ⑥ 挑戦の条件
  ok(UI.unlocked('ren') && !UI.unlocked('seil') && !UI.unlocked('zeno'), '最初はセイル（5人に勝つ）とゼノ（9人＋セイル）に挑めない');
  // ⑦ トレードバトル（試練の画面はテスト用に「ゼノと同じ判断をする」プレイヤーに置き換え）
  const realTrial = w.TradeUI.trial; let trialCalls = 0;
  w.TradeUI.trial = async function (ids, opts) { trialCalls++; const scn = S.build(ids[0], opts.seedOffset); const dcs = TB.decide('zeno', scn); const ev = w.TradeEval.evaluateFull(scn, dcs); return { score: ev.score, actionOk: ev.actionOk, ev: ev, scenarioId: ids[0] }; };
  const drive = async (p) => { let done = false, v; p.then(x => { done = true; v = x; }); for (let i = 0; i < 400 && !done; i++) { const t = doc.getElementById('ui').lastElementChild; if (t && (t.classList.contains('rw-msg') || t.classList.contains('rw-panel'))) { const b = t.querySelector('.rw-panel-close'); if (b) b.click(); else Input.press('ok'); } await frames(2); } return v; };
  const before = { gold: d.gold, exp: d.hero.exp, lv: d.hero.level };
  // ガルバ（損切りなし・5%）にゼノの判断で挑む → 勝つ
  let P = UI.prepare('galva', () => 0.1); let r = await drive(UI.battle('galva', P));
  ok(r && r.verdict === 'win' && r.npc.sc.capped === true || (r && r.verdict === 'win' && r.npc.sc.total <= 40), 'ガルバ（損切りなし・リスク5%）は40点までの上限がかかり、こちらが勝つ（' + (r && r.player.sc.total) + '対' + (r && r.npc.sc.total) + '）');
  ok(State.hasItem('td_stoploss_pledge') && d.tradia.titles.indexOf('損切りを誓う者') >= 0 && d.gold === before.gold + 600 && d.counters.tradia_wins === 1, '初めての勝ち：限定装備・称号・600G・勝った人数1');
  const inv1 = d.inventory.td_stoploss_pledge; const g1 = d.gold; r = await drive(UI.battle('galva', UI.prepare('galva', () => 0.1)));
  ok(r.verdict === 'win' && d.inventory.td_stoploss_pledge === inv1 && d.gold === g1 + 60 && d.tradia.wins.galva === 2, '2回目の勝ち：装備は増えず、ゴールドは1割（60G）');
  // 試練を途中でやめたら記録しない
  w.TradeUI.trial = async () => null; const wins0 = JSON.stringify(d.tradia.wins); r = await drive(UI.battle('ren', UI.prepare('ren', () => 0.1))); ok(r === null && JSON.stringify(d.tradia.wins) === wins0, '試練を途中でやめたら、勝負は記録しない');
  // 12人全員に勝つ（記録の処理を直接使う）→ セイル・ゼノの解放とクエストの達成
  w.TradeUI.trial = realTrial;
  const fakeJ = t => ({ ev: { score: 90, items: [], violations: [], actionOk: true, trade: null }, sim: null, sc: { total: t, judgment: 54, outcome: 15, discipline: 15 } });
  ['ren', 'kai', 'leo', 'mira'].forEach(id => UI.record(id, 'win', fakeJ(80), fakeJ(40), { scenarioId: 'x', seedOffset: 0 }));
  ok(UI.beaten().length === 5 && UI.unlocked('seil') && !UI.unlocked('zeno'), '5人に勝つとセイルに挑める（ゼノはまだ）');
  ['jin', 'dow', 'emma', 'lisia'].forEach(id => UI.record(id, 'win', fakeJ(80), fakeJ(40), { scenarioId: 'x', seedOffset: 0 }));
  ok(UI.beaten().length === 9 && !UI.unlocked('zeno'), '9人に勝ってもセイルに勝つまでゼノは出てこない');
  ['seil', 'max'].forEach(id => UI.record(id, 'win', fakeJ(80), fakeJ(40), { scenarioId: 'x', seedOffset: 0 })); ok(UI.unlocked('zeno') && UI.rank() === 'A', 'セイルに勝つとゼノに挑める・闘技場ランク A');
  w.Events.questStart('tradia_twelve'); UI.record('zeno', 'win', fakeJ(80), fakeJ(40), { scenarioId: 'x', seedOffset: 0 }); await drive(w.Events.checkCounterQuests());
  ok(UI.rank() === 'S' && d.quests.tradia_twelve && d.quests.tradia_twelve.state === 'done' && IDS.every(id => State.hasItem(TR[id].reward.item)) && d.tradia.titles.length === 12, '12人に勝つ：ランク S・クエスト「トレディアの十二人」達成・限定装備12・称号12');
  // ⑧ レバレッジ：値動きの再現性と、将来の足を見せないこと
  ok(LV.TYPES.length === 9 && LV.TYPES.every(t => JSON.stringify(LV.market(t.id, 4242).bars) === JSON.stringify(LV.market(t.id, 4242).bars)), '相場の種類9（上昇・下降・レンジ・急騰・急落・ダマシ・高ボラ・低ボラ・ギャップ）、同じシードなら同じ値動き');
  ok(JSON.stringify(LV.market('up', 1).bars) !== JSON.stringify(LV.market('up', 2).bars) && LV.market('gap', 7).gap && LV.scenarioId('gap', 7) === 'LV-gap-7' && LV.parseScenarioId('LV-gap-7').seed === 7, 'シードが違えば違う値動き。シナリオIDは LV-種類-シード');
  { const s = LV.newSession('up', 99); ok(LV.visibleBars(s).length === LV.RULES.histBars && LV.visibleBars(s)[LV.RULES.histBars - 1] === s.market.bars[s.idx], '始めた時点で見えるのは過去の足だけ（' + LV.visibleBars(s).length + '本）'); LV.step(s); ok(LV.visibleBars(s).length === LV.RULES.histBars + 1, '1本進めると1本だけ増える'); }
  // ⑨ 計算：必要証拠金・損益の式・ロスカットまでの距離
  d.tradia.lev = null; const acct = LV.account(); ok(acct.balance === 100000 && acct.epoch === 1, '最初の仮想資金 100,000TG');
  { const s = LV.newSession('range', 5); const a1 = LV.preview(s, { side: 'buy', leverage: 10, notional: 500000 }), a2 = LV.preview(s, { side: 'buy', leverage: 888, notional: 500000 });
    ok(Math.abs(a1.margin - 50000) < 1e-6 && Math.abs(a2.margin - 500000 / 888) < 1e-6, '必要証拠金＝想定元本÷レバレッジ（10倍 50,000TG・888倍 ' + Math.round(a2.margin) + 'TG）');
    const b888 = LV.preview(s, { side: 'buy', leverage: 888, notional: 85000000 }); ok(b888.ok && b888.losscutPips < 20 && b888.warns.some(x => /888倍/.test(x) && /pips/.test(x)), '888倍で残高いっぱい：約' + b888.losscutPips.toFixed(1) + 'pipsの逆行でロスカット、と注文画面に出る');
    ok(!LV.preview(s, { side: 'buy', leverage: 889, notional: 10000 }).ok && !LV.preview(s, { side: 'buy', leverage: 0, notional: 10000 }).ok && LV.preview(s, { side: 'buy', leverage: 1, notional: 10000 }).ok, 'レバレッジは1〜888倍だけ');
    ok(!LV.preview(s, { side: 'buy', leverage: 1, notional: 200000 }).ok, '必要証拠金が残高を超える注文は出せない');
    ok(!LV.preview(s, { side: 'buy', leverage: 10, notional: 100000, sl: LV.price(s) + 0.1 }).ok && !LV.preview(s, { side: 'sell', leverage: 10, notional: 100000, tp: LV.price(s) + 0.1 }).ok, '損切り・利確が逆側なら注文できない'); }
  // 損益の式（買い・売り）：手数料・保有コストを除いた部分が「想定元本×（決済−約定）÷約定」
  for (const side of ['buy', 'sell']) { d.tradia.lev = null; const s = LV.newSession('up', 11); LV.place(s, { side, leverage: 10, notional: 300000 }); const pos = s.pos; for (let i = 0; i < 3; i++) LV.step(s); const t = LV.closeNow(s);
    const gross = side === 'buy' ? 300000 * (t.exit - pos.entry) / pos.entry : 300000 * (pos.entry - t.exit) / pos.entry;
    ok(Math.abs(t.gross - Math.round(gross)) <= 1 && t.pnl === LV.account().balance - 100000 && Math.abs(t.pnl - Math.round(gross - t.costs)) <= 2, (side === 'buy' ? '買い' : '売り') + 'の損益＝想定元本×' + (side === 'buy' ? '（決済−約定）' : '（約定−決済）') + '÷約定 − 手数料・保有コスト（' + t.pnl + 'TG）');
    ok(side === 'buy' ? pos.entry > s.market.bars[s.market.start].c : pos.entry < s.market.bars[s.market.start].c, (side === 'buy' ? '買いは高く' : '売りは安く') + '約定（スプレッド・すべり）'); }
  // 利確・損切り・ロスカット・ギャップ・破産
  const runTo = (s, pred, max) => { let ev = null; for (let i = 0; i < (max || 64) && !s.ended; i++) { ev = LV.step(s); if (pred(ev)) return ev; } return ev; };
  { d.tradia.lev = null; const s = LV.newSession('up', 11); const p0 = LV.price(s); LV.place(s, { side: 'buy', leverage: 10, notional: 300000, tp: +(p0 + 0.15).toFixed(3), sl: +(p0 - 0.6).toFixed(3) }); const ev = runTo(s, e => e.trade); ok(ev && ev.trade && (ev.trade.reason === 'tp' ? ev.trade.exit === s.lastTrade.tp : true) && ['tp', 'sl', 'time'].indexOf(ev.trade.reason) >= 0, '利確・損切りの注文で自動的に決済（' + (ev && ev.trade && ev.trade.reason) + '）'); }
  { d.tradia.lev = null; let found = null; for (let seed = 1; seed < 60 && !found; seed++) { LV.account().balance = 100000; const s = LV.newSession('crash', seed); LV.place(s, { side: 'buy', leverage: 500, notional: 30000000 }); const ev = runTo(s, e => e.trade); if (ev && ev.trade && /losscut/.test(ev.trade.reason)) found = { s, t: ev.trade }; }
    ok(!!found, '急落で500倍の買い（損切りなし）→ 強制ロスカット');
    if (found) { const t = found.t; const lvl = (t.balanceBefore + t.gross - t.costs) / (t.notional / t.leverage) * 100; ok(t.reason === 'losscut_gap' || lvl <= LV.RULES.losscutLevel + 3, 'ロスカットは証拠金維持率 ' + LV.RULES.losscutLevel + '% 付近で発動（決済時の維持率 約' + Math.round(lvl) + '%）'); } }
  { d.tradia.lev = null; const mk = LV.market('gap', 7); const s = LV.newSession('gap', 7); const g = mk.gap; const side = g.size < 0 ? 'buy' : 'sell';
    while (s.idx < g.bar - 2) LV.step(s); const p0 = LV.price(s); const sl = side === 'buy' ? +(p0 - 0.2).toFixed(3) : +(p0 + 0.2).toFixed(3); LV.place(s, { side, leverage: 5, notional: 200000, sl });
    const ev = runTo(s, e => e.trade, 5); const t = ev && ev.trade; ok(t && t.reason === 'sl_gap' && (side === 'buy' ? t.exit < sl : t.exit > sl), '価格が飛ぶと、損切りの価格（' + sl + '）より不利な ' + (t && t.exit) + ' で決済（想定の損失を超える）');
    ok(t && Math.abs(t.pnl) > 200000 * 0.2 / p0 * 1.5, '損失（' + (t && t.pnl) + 'TG）は損切りの幅で計算した額（約' + Math.round(200000 * 0.2 / p0) + 'TG）より大きい'); }
  { d.tradia.lev = null; const mk = LV.market('gap', 7); const s = LV.newSession('gap', 7); const g = mk.gap; const side = g.size < 0 ? 'buy' : 'sell'; while (s.idx < g.bar - 1) LV.step(s);
    LV.place(s, { side, leverage: 888, notional: 85000000 }); const ev = runTo(s, e => e.trade, 3); const t = ev && ev.trade; const a = LV.account();
    ok(t && t.bankrupt && a.balance === 0 && a.bankrupt === 1 && s.ended && s.endReason === 'bankrupt', 'ギャップで残高を超える損失 → 残高0で止めて破産（負債なし）');
    ok(LV.canRegrant() && LV.regrant().balance === 100000 && LV.account().epoch === 2 && LV.account().grants === 2 && LV.account().bankrupt === 1, '破産したら学習用の資金を受け取り直せる（破産の回数は残る）'); }
  // 成績：5回未満は「算出不可」
  { const a = LV.account(); const st = LV.stats(a.history.slice(-1)); ok(st.winRate === null && st.pf === null && st.expectancy === null && LV.fmtStat(st.winRate, 'pct') === '算出不可', '取引が5回未満なら勝率・期待値・PFは「算出不可」');
    d.tradia.lev = null; for (let k = 0; k < 6; k++) { const s = LV.newSession('range', 300 + k); LV.place(s, { side: k % 2 ? 'sell' : 'buy', leverage: 5, notional: 100000 }); LV.step(s); LV.step(s); LV.closeNow(s); }
    const st2 = LV.stats(LV.account().history); ok(st2.trades === 6 && st2.winRate !== null && st2.expectancy !== null && st2.maxDD !== null && LV.account().history.every(t => /^LV-range-\d+$/.test(t.scenarioId)), '6回取引すると指標を計算・履歴にシナリオID'); }
  // 高レバレッジに得点がない：講習のカウンターはリスク2%以内で損切りありの取引だけ
  ok(!/888|レバレッジが高い/.test(JSON.stringify(w.QUESTS.tradia_margin.reward)) && JSON.stringify(TR).indexOf('leverage') < 0, '報酬・評価にレバレッジの大きさは使っていない');
  // ⑩ 取引の画面（DOM）：注文→1本進める→決済→終了
  { clean(); d.tradia.lev = null; const s = LV.newSession('up', 123); const p = UI.levScreen(s); await frames(3); const sc = UI._screen; const node = sc.node;
    ok(/有効証拠金/.test(node.querySelector('#lv-acct').textContent) && /余剰証拠金/.test(node.textContent) && /証拠金維持率/.test(node.textContent), '口座：残高・有効証拠金・使用証拠金・余剰証拠金・含み損益・維持率');
    node.querySelector('#lv-lev').value = '888'; node.querySelector('#lv-lev').dispatchEvent(new w.Event('input')); node.querySelector('#lv-not').value = '50000000'; node.querySelector('#lv-not').dispatchEvent(new w.Event('input')); await frames(1);
    ok(/ロスカットの価格/.test(node.querySelector('#lv-pv').textContent) && /888倍/.test(node.querySelector('#lv-pv').textContent), '888倍にすると、ロスカットまでの距離と警告が出る');
    node.querySelector('#lv-lev').value = '10'; node.querySelector('#lv-lev').dispatchEvent(new w.Event('input')); node.querySelector('#lv-not').value = '200000'; node.querySelector('#lv-not').dispatchEvent(new w.Event('input'));
    node.querySelector('[data-fill="sl"]').click(); node.querySelector('[data-fill="tp"]').click(); await frames(1);
    node.querySelector('[data-cmd="order"]').click(); await frames(2); ok(!!s.pos && s.pos.leverage === 10 && s.pos.sl !== null && s.pos.tp !== null, '画面から注文（10倍・損切り・利確つき）');
    node.querySelector('[data-cmd="step"]').click(); await frames(3); ok(s.idx === s.market.start + 1 || !!s.lastTrade, '「1本進める」で1本だけ進む');
    if (s.pos) { node.querySelector('[data-cmd="close"]').click(); for (let i = 0; i < 20; i++) { const t = doc.getElementById('ui').lastElementChild; if (t && t.classList.contains('lev-reflect')) { ok(/取引の振り返り/.test(t.textContent) && /コスト/.test(t.textContent), '決済すると振り返り（コストの内訳つき）'); t.querySelector('.rw-panel-close').click(); break; } await frames(2); } }
    node.querySelector('[data-cmd="end"]').click(); for (let i = 0; i < 30; i++) { const t = doc.getElementById('ui').lastElementChild; if (t && t.classList.contains('lev-end')) { ok(/取引の結果/.test(t.textContent) && /算出不可/.test(t.textContent), '終えると結果（5回未満の指標は算出不可）'); t.querySelector('.rw-panel-close').click(); } if (!doc.querySelector('.lev-panel')) break; await frames(2); }
    ok(!doc.querySelector('.lev-panel') && E.scenes.every(x => !x.overlay), '取引の画面を閉じるとモーダルが残らない'); }
  ok(LV.account().history.some(t => t.scenarioId === 'LV-up-123'), '画面で行った取引も履歴に残る');
  // ⑪ セーブ・ロード、旧セーブ
  { const raw = JSON.stringify(d); const m = State.migrate(JSON.parse(raw)); ok(m.tradia.wins.zeno === 1 && m.tradia.lev.history.length === d.tradia.lev.history.length && m.tradia.titles.length === 12, 'セーブとロードでトレディアの記録が残る');
    const old = JSON.parse(raw); delete old.tradia; const m2 = State.migrate(old); ok(m2.tradia && typeof m2.tradia.wins === 'object' && Array.isArray(m2.tradia.titles), '旧セーブ（tradia なし）でも空の記録で始まる'); }
  ok(!errors.length, 'エラーなし ' + JSON.stringify(errors));
  console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); console.log('ERRORS:', fail ? '[' + fail + ' NG]' : '[]'); process.exit(0);
})().catch(e => { console.log('EXC', e.stack); process.exit(1); });
