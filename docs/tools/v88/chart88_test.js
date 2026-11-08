// v8.8 Phase 2 チャートバトルの確かめ（jsdom。実機・実ブラウザではない）：node chart88_test.js [2d]
//  2-A 時間制限なし（StepSim）・通常（20〜30秒）・試験／必殺技（今までどおり）  2-B 十字線・モード表示  2-C 結果の 3 区分・過程の評価・成績  2-D 簡易の相場の試練
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, Market, TradeUI, TradeEval, Combat } = w; const CB = w.ChartBattleUI; const Input = E.Input;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const top = () => doc.getElementById('ui').lastElementChild; const click = (n) => n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  const U = w.Ultimates; const scen = () => U.newScenario({ cats: null, diff: [1, 2], avoid: [] });
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み'));

  console.log('-- 2-A StepSim（時間制限なし）');
  let s = scen(); let sim = new Market.StepSim(s, {}).start(0); const p0 = JSON.stringify(sim.pos);
  sim.update(10 * 60 * 1000); T(sim.state === 'deciding' && JSON.stringify(sim.pos) === p0 && sim.timeLeft(1e9) === Infinity, '再生しなければ 10 分たっても足が進まず、時間切れの見送りもない');
  sim.stepBar(); T(sim.pos.bar === s.bars.length && false || (sim.pos.tick === Market.SUB - 1 && sim.pos.bar === JSON.parse(p0).bar), '［次の足へ］：形成中の足を確定させる');
  const b1 = sim.pos.bar; sim.stepBar(); T(sim.pos.bar === b1 + 1 && sim.pos.tick === Market.SUB - 1, '［次の足へ］をもう一度：次の足を 1 本確定まで');
  T(sim.visibleBars(true).length === sim.pos.bar + 1, '見えている足は今の位置まで（未来の足を含まない）');
  sim.play(true, 1000); sim.update(1000 + 1600 * 3); T(sim.pos.bar >= b1 + 3, '［再生］で時間とともに進む（1 本 1.6 秒）');
  sim.play(false, 9000); const pp = JSON.stringify(sim.pos); sim.update(60000); T(JSON.stringify(sim.pos) === pp, '［停止］で止まる');
  for (let k = 0; k < 200; k++) sim.stepBar(); T(sim.atEnd && sim.pos.bar === sim.maxBar && sim.maxBar <= s.bars.length - 14, '進める上限（決済に 12 本残す）で止まる：' + sim.maxBar);
  const pos = { bar: sim.pos.bar, tick: sim.pos.tick }; sim.decide('long', 70000); const ref = Market.settle(s, { bar: pos.bar, tick: pos.tick, side: 'long' });
  T(sim.decision.pos.bar === pos.bar && sim.decision.pos.tick === pos.tick && JSON.stringify(sim.result) === JSON.stringify(ref), '判断は見えている位置のまま。決済は Market.settle と同じ');
  T(sim.decide('short', 70001) === false, '判断は 1 回だけ');
  let t = 70000; while (sim.state === 'running' && t < 200000) { t += 100; sim.update(t); } T(sim.state === 'settled', '判断のあと、決済まで時間で進む');
  // 既存の Sim は今までどおり
  const s2 = scen(); const old = new Market.Sim(s2, { decideMs: 12000, barMs: 850 }).start(0); old.update(12001); T(old.state === 'done' && old.decision.auto && old.decision.side === 'skip', '既存の Market.Sim：時間切れは見送り（変えていない）');

  console.log('-- 2-A/2-B 画面（CB.open）');
  d.settings.ultTime = 12; d.settings.chartTime = 25;
  let pr = CB.open({ mode: 'practice', timeMode: 'unlimited', title: '練習', scenario: scen(), quitable: true }); await frames(3); let N = top();
  T(N.classList.contains('chart-battle') && /初心者練習（時間制限なし）/.test(N.querySelector('.cb-mode').textContent), 'モードの表示：初心者練習（時間制限なし）');
  T(!!N.querySelector('[data-step]') && !!N.querySelector('[data-play]'), '［次の足へ］［再生］のボタン');
  T(/時間切れなし/.test(N.querySelector('.cb-cmdnote').textContent) && /見送り＝入らない/.test(N.querySelector('.cb-cmdnote').textContent), '見送りの意味と、時間切れがないことを表示');
  T(N.querySelectorAll('.cb-ind').length === 5, '練習：指標の表示を切り替えるボタン（RCI・MACD・上位足・高値安値・印）');
  const sb0 = CB.ctl.sim.pos.bar; click(N.querySelector('[data-step]')); click(N.querySelector('[data-step]')); await frames(2); T(CB.ctl.sim.pos.bar === sb0 + 1, '画面の［次の足へ］で足が進む');
  await sleep(1200); T(CB.ctl.sim.state === 'deciding', '止めている間は判断の時計が切れない');
  click(N.querySelector('.cb-ind[data-ind="rci"]')); T(N.querySelector('.cb-ind[data-ind="rci"]').classList.contains('on'), 'RCI の表示を ON');
  CB.ctl.decide('long'); let tt = 0; while (!CB.ctl.state().result && tt < 300) { await sleep(30); tt++; }
  N = top(); const resT = N.querySelector('.cb-result').textContent;
  T(/① 判断/.test(resT) && /② 損益/.test(resT) && /③ 判断の過程の評価/.test(resT), '結果は「① 判断／② 損益／③ 判断の過程の評価」に分けて出す');
  T(/足を \d+ 回進めた/.test(resT), '時間制限なしの練習：何回足を進めたかを出す');
  T(/判断した時点とその後を並べる/.test(N.querySelector('.cb-review').textContent), '振り返りのボタンを目立たせる');
  CB.ctl.next(); const r1 = await pr; T(r1 && r1.unlimited === true && r1.timeMode === 'unlimited' && r1.mode === 'practice', '結果に unlimited・timeMode を入れる（記録で区別できる）'); clean();
  pr = CB.open({ mode: 'practice', timeMode: 'normal', title: '通常', scenario: scen() }); await frames(2); T(CB.ctl.sim.decideMs === 25000 && /通常バトル（25秒）/.test(top().querySelector('.cb-mode').textContent), '通常：設定の判断時間（25秒）'); CB.ctl.decide('skip'); tt = 0; while (!CB.ctl.state().result && tt < 300) { await sleep(30); tt++; } CB.ctl.next(); await pr; clean();
  pr = CB.open({ mode: 'exam', title: '試験', scenario: scen() }); await frames(2); N = top(); T(CB.ctl.sim.decideMs === 12000 && !(CB.ctl.sim instanceof Market.StepSim) && !N.querySelector('[data-step]'), '試験（timeMode なし）：今までどおり必殺技の判断時間（12秒）・足送りなし');
  T(!N.querySelector('.cb-ind') && /試験では/.test(N.querySelector('.cb-indnote').textContent), '試験：指標の切り替えはできない（その旨を表示）'); CB.ctl.quit(); await pr; clean();
  pr = CB.open({ mode: 'battle', title: '必殺技', scenario: scen() }); await frames(2); T(CB.ctl.sim.decideMs === 12000, '必殺技（timeMode なし）：今までどおり'); CB.ctl.decide('skip'); tt = 0; while (!CB.ctl.state().result && tt < 300) { await sleep(30); tt++; } CB.ctl.next(); await pr; clean();
  // 十字線
  pr = CB.open({ mode: 'practice', timeMode: 'unlimited', title: '十字線', scenario: scen() }); await frames(3); N = top(); const cv = N.querySelector('.cb-canvas');
  cv.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 })); await frames(1); const xb = N.querySelector('.cb-xbox');
  T(!xb.classList.contains('hidden') && /始 .*高 /.test(xb.textContent) && /EMA20\/30\/40/.test(xb.textContent), '十字線：その足の始値・高値・安値・終値と EMA を表示');
  T(/本前の足|いまの足/.test(xb.textContent), '十字線：何本前の足かを表示（未来の足は選べない）');
  cv.dispatchEvent(new w.MouseEvent('mouseleave', { bubbles: true })); T(xb.classList.contains('hidden'), 'マウスが外れたら消える'); CB.ctl.quit(); await pr; clean();

  console.log('-- 2-C 過程の評価');
  const P = CB.processText;
  T(/時間切れの見送り/.test(P({ side: 'skip', auto: true }, null, { bias: 'long' })), '見送り：時間切れ');
  T(/適切な見送り/.test(P({ side: 'skip', auto: false }, null, { bias: 'none' })), '見送り：根拠がそろわない場面＝適切');
  T(/根拠があった場面での見送り/.test(P({ side: 'skip', auto: false }, null, { bias: 'short' })), '見送り：根拠があった場面');
  T(/負けても適切な判断/.test(P({ side: 'long' }, { outcome: 'loss' }, { bias: 'long' })), '負けても根拠に沿った判断は「適切」');
  T(/勝っても見直したい判断/.test(P({ side: 'short' }, { outcome: 'profit' }, { bias: 'long' })), '勝っても根拠と逆なら「見直したい」');
  const html = Menu.tradeRecordHtml(); T(/トレード成績・振り返り/.test(html) && /続けて学習した日/.test(html) && /戦闘中の相場の試練（簡易）/.test(html), '成績の画面：苦手分野・チャートバトル・簡易の試練・続けて学習した日');

  console.log('-- 2-D 簡易の相場の試練');
  const stats0 = JSON.stringify(d.trade.stats); const topics0 = JSON.stringify(d.trade.topics || {});
  let q = TradeUI.quick(['clear_up'], { title: 'テストの試練', scenarioId: 'clear_up' }); await frames(2); N = top();
  T(N.classList.contains('quick-trial') && N.querySelectorAll('.qt-r').length === 4 && /簡易モード/.test(N.textContent), '簡易モード：買い・売り・見送り＋理由 4 択');
  T(N.querySelector('.qt-reason').classList.contains('hidden'), '行動を選ぶまで理由は出さない');
  const tr = TradeUI.quickCtl.truth; TradeUI.quickCtl.act(tr.action); await frames(1); T(!N.querySelector('.qt-reason').classList.contains('hidden'), '行動を選ぶと理由の 4 択');
  TradeUI.quickCtl.reason(tr.reason); await frames(1); T(/○ 場面の読みどおり/.test(N.querySelector('.qt-result').textContent) && /損益で採点しません/.test(N.querySelector('.qt-result').textContent), '判定と「損益で採点しない」説明');
  TradeUI.quickCtl.next(); let r = await q; T(r.quick && r.score === 100 && r.actionOk && r.reasonOk, '行動・理由とも合えば 100 点');
  q = TradeUI.quick(['clear_up'], { scenarioId: 'clear_up' }); await frames(2); const wrong = tr.action === 'buy' ? 'sell' : 'buy'; TradeUI.quickCtl.act(wrong); const wr = TradeUI.quickCtl.reasons().find((k) => k !== tr.reason); TradeUI.quickCtl.reason(wr); TradeUI.quickCtl.next(); r = await q;
  T(r.score === 0 && !r.actionOk, '行動も理由も違えば 0 点（答えていない項目を正解にしない）');
  T(JSON.stringify(d.trade.stats) === stats0 && JSON.stringify(d.trade.topics || {}) === topics0, '詳細モードの成績（stats・分野別）は変えない');
  T(d.trade.quick && d.trade.quick.plays === 2 && d.trade.quick.actionOk === 1, '簡易の記録は d.trade.quick に別に残す');
  const b = Combat.create(['slime'], State.partyActors(), {}); const ev = Combat.applyTrialResult(b, 0, 100); T(b.enemies[0].exposed === 3, '100 点 → 既存の「60 点以上」の効果（敵の防御が崩れる）');
  const b2 = Combat.create(['slime'], State.partyActors(), {}); Combat.applyTrialResult(b2, 0, 30); T(!b2.enemies[0].exposed, '理由だけ合う（30 点）→ 60 点未満の扱い');
  // 戦闘からの呼び分け（TradeUI.quick と TradeUI.trial を差し替えて、どちらが呼ばれるか）
  const calls = []; const qk = TradeUI.quick, trl = TradeUI.trial; TradeUI.quick = async () => { calls.push('quick'); return { score: 100 }; }; TradeUI.trial = async () => { calls.push('detail'); return { score: 100 }; };
  const scene = { anims: [], gone: {}, view: null }; const play = async (boss, setting) => { d.settings.battleTrial = setting; const bb = Combat.create(['slime'], State.partyActors(), { boss: boss }); try { await w.BattleUI.playEvents(bb, [{ type: 'trial', idx: 0 }], scene); } catch (e) { calls.push('err:' + e.message.slice(0, 60)); } clean(); };
  const msgs0 = Win.message; Win.message = async () => { };
  await play(false, 'quick'); await play(true, 'quick'); await play(false, 'detail'); await play(false, undefined);
  Win.message = msgs0; TradeUI.quick = qk; TradeUI.trial = trl;
  // （試練のあとの演出の再生は、簡単な scene の差し替えでは途中で止まるので、ここでは「どちらの試練が呼ばれたか」だけを見る）
  const routed = calls.filter((c) => !/^err:/.test(c));
  T(JSON.stringify(routed) === JSON.stringify(['quick', 'detail', 'detail', 'detail']), '通常戦闘＋簡易＝簡易／ボス戦＝詳細／設定が詳細・未設定（前からのセーブ）＝詳細：' + JSON.stringify(routed));
  console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng) + '　ページのエラー ' + A.errors.length);
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
