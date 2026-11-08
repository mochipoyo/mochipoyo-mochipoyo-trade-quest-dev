// v8.3 トレードマスターの勝負の決まりの確かめ（jsdom・チャートの画面は結果だけを返す代わりの物）：node tm83_duel_logic.js [2d]
// ・勝ち負けの判定（pips の差 0.1 未満は引き分け・見送りは 0pips）・賞金（段階ごと・3本勝負は 2.5 倍）・賞金を出したあと 400 歩は出ない・3本勝負は 2本先取で終わる・記録（勝ち・負け・引き分け）
const load = require('../v78/load78.js'); const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; if (A.errors.length) { console.log('読み込みの失敗', A.errors); process.exit(1); }
const TM = w.TradeMaster83, S = w.State; const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
w.Win.message = async () => { }; w.Win.toast = () => { };
S.newGame('t', 'warrior'); const d = S.data; d.gold = 0; d.steps = 1000; w.World.start();
const m = w.World.getMap('kalion_city'); const npc = m.npcs.find((n) => n.tradeMaster83); ok(!!npc, 'カリオンにトレードマスターがいる ' + (npc && npc.name));
const R = (side, pips) => side === 'skip' ? { outcome: 'skip', side: 'skip' } : { outcome: pips > 0.15 ? 'profit' : pips < -0.15 ? 'loss' : 'flat', side, pips, exit: { reason: pips > 0 ? 'tp' : 'sl' } };
let plan = []; let opened = 0;
w.ChartBattleUI.open = async (o) => { opened++; const p = plan.shift(); if (!o.rival) ng.push('相手がない'); return { mode: o.mode, side: p[0].side, result: p[0], rival: { name: o.rival.name, side: p[1].side, result: p[1] }, scenarioId: o.scenario.id }; };
(async () => {
  ok(TM.judge(R('long', 5), R('short', -3)) === 1 && TM.judge(R('skip'), R('long', -2)) === 1 && TM.judge(R('long', 1.0), R('long', 1.05)) === 0 && TM.judge(R('skip'), R('skip')) === 0 && TM.judge(R('short', -1), R('skip')) === -1, '判定：pips が多いほうが勝ち・見送りは 0・差 0.1 未満は引き分け');
  const tier = npc.tradeMaster83.tier; const p1 = TM.prize(tier, 1), p3 = TM.prize(tier, 3); ok(p3 === Math.round(p1 * 2.5), '賞金：段階 ' + tier + ' の 1本勝負 ' + p1 + 'G・3本勝負 ' + p3 + 'G');
  // 1本勝負：勝ち → 賞金
  plan = [[R('long', 12.3), R('short', -8)]]; let r = await TM.duel(npc, 1, TM.coolLeft(d, npc.id) <= 0);
  ok(r.win && d.gold === p1 && d.tm83.wins === 1 && d.tm83.paid[npc.id] === 1000, '1本勝負で勝つ → 賞金 ' + d.gold + 'G・記録 勝ち ' + d.tm83.wins);
  ok(TM.coolLeft(d, npc.id) === TM.COOL_STEPS, '受け取った直後：賞金が戻るまで ' + TM.coolLeft(d, npc.id) + ' 歩');
  // 続けて勝っても賞金なし
  plan = [[R('short', 20), R('skip')]]; r = await TM.duel(npc, 1, TM.coolLeft(d, npc.id) <= 0); ok(r.win && r.gold === 0 && d.gold === p1, 'すぐもう一度勝っても賞金は出ない（' + d.gold + 'G）');
  d.steps += TM.COOL_STEPS; ok(TM.coolLeft(d, npc.id) === 0, TM.COOL_STEPS + ' 歩あるくと賞金が戻る');
  // 負け・引き分け → 賞金なし
  plan = [[R('long', -10), R('short', 4)]]; r = await TM.duel(npc, 1, true); ok(r.lose && d.gold === p1 && d.tm83.losses === 1, '負け：賞金なし・記録 負け ' + d.tm83.losses);
  plan = [[R('skip'), R('skip')]]; r = await TM.duel(npc, 1, true); ok(!r.win && !r.lose && d.gold === p1 && d.tm83.draws === 1, '引き分け（両方見送り）：賞金なし・記録 引き分け ' + d.tm83.draws);
  // 3本勝負：2本先取で終わる
  opened = 0; plan = [[R('long', 5), R('skip')], [R('short', 8), R('long', -2)], [R('long', 1), R('long', 2)]]; r = await TM.duel(npc, 3, true);
  ok(r.win && opened === 2 && d.gold === p1 + p3, '3本勝負：2本先取で 2 戦で終わる（チャート ' + opened + ' 回）→ 賞金 ' + p3 + 'G（合計 ' + d.gold + 'G）');
  d.steps += TM.COOL_STEPS; opened = 0; plan = [[R('long', 5), R('skip')], [R('short', -8), R('long', 2)], [R('long', -1), R('long', 2)]]; r = await TM.duel(npc, 3, true);
  ok(r.lose && opened === 3 && d.gold === p1 + p3, '3本勝負：1勝2敗 → 負け（3 戦）・賞金なし');
  ok(TM.ensure(d).recent.length >= 5, '使ったシナリオを覚える（同じ相場が続かない）：' + TM.ensure(d).recent.length);
  // セーブ：古いセーブ（tm83 なし）でも読める
  const old = JSON.parse(JSON.stringify(d)); delete old.tm83; S.data = old; ok(TM.coolLeft(S.data, npc.id) === 0 && !!TM.ensure(S.data), '古いセーブ（記録なし）でも動く');
  console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
})();
