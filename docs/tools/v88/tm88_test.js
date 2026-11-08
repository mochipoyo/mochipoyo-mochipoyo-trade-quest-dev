// v8.8 Phase 4 トレードマスターの確かめ（jsdom）：node tm88_test.js [2d]
//  相手の判断の時刻の独立（前倒ししない・未来の足を見ない）・比べる表・3本勝負のスコア・実績の表示・賞金と 400 歩の待ちは今までどおり
//  ＋ 変更で勝ち負けが偏らないか：同じ場面・同じプレイヤーの判断で、今までの決まりと新しい決まりの勝率を比べる（シミュレーション）
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Market } = w; const CB = w.ChartBattleUI; const TM = w.TradeMaster83; const U = w.Ultimates; const Input = E.Input;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const top = () => doc.getElementById('ui').lastElementChild;
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み'));
  const SUB = Market.SUB;
  console.log('-- 相手の判断の時刻');
  let s = U.newScenario({ diff: [1, 3], avoid: [] });
  let pr = CB.open({ mode: 'duel', title: '対戦', scenario: s, rival: { name: '相手', short: '相手', skill: 0.6, atFrac: 0.7, seed: 12345, independent: true } }); await frames(2);
  const rp = CB.rivalPos; CB.ctl.decide('long'); const myPos = JSON.parse(JSON.stringify(CB.ctl.sim.decision.pos));
  let tt = 0; while (!CB.ctl.state().result && tt < 400) { await sleep(30); tt++; } const rv = CB.ctl.rival();
  T(rp && rv.done && rv.pos.bar === rp.bar && rv.pos.tick === rp.tick, '相手は決めておいた時刻（' + rp.bar + '本目）で判断。プレイヤーが早く決めても（' + myPos.bar + '本目）前倒ししない');
  const exp = Market.assess(CB.barsAt(s, rp.bar, rp.tick)); T(JSON.stringify(rv.a.reasons) === JSON.stringify(exp.reasons) && rv.a.bias === exp.bias, '相手はその時刻までに見えている足だけで判断（同じ見立て）');
  const resNode = top(); CB.ctl.next(); const out = await pr; clean();
  const html = TM.duelHtml(out, '相手'); T(/入った時刻/.test(html) && /その時点の見立て/.test(html) && /入った価格/.test(html) && /あなた/.test(html), '結果の比べる表：判断・入った時刻・価格・その時点の見立て・結果');
  // 今までの決まり（independent なし）はそのまま
  s = U.newScenario({ diff: [1, 3], avoid: [] }); pr = CB.open({ mode: 'duel', title: '対戦', scenario: s, rival: { name: '相手', short: '相手', skill: 0.6, atFrac: 0.7, seed: 1 } }); await frames(2);
  CB.ctl.decide('short'); const mp2 = JSON.parse(JSON.stringify(CB.ctl.sim.decision.pos)); tt = 0; while (!CB.ctl.state().result && tt < 400) { await sleep(30); tt++; }
  T(CB.ctl.rival().pos.bar === mp2.bar && CB.ctl.rival().pos.tick === mp2.tick, 'independent を渡さない呼び出しは今までどおり（プレイヤーの判断の瞬間）'); CB.ctl.next(); await pr; clean();

  console.log('-- 3本勝負のスコア・実績・賞金');
  const npc = { id: 'tm_test_1', name: 'テストのトレードマスター', tradeMaster83: { tier: 2, short: 'テスト', styleName: '順張り', skill: 0.5, seed: 99, ind: ['ema'], tf: 15, diff: [1, 2], cats: null, word: '' } };
  const opened = []; const cbo = CB.open; let plan = [];
  CB.open = async (o) => { opened.push(o); const me = plan.shift(); return { side: 'long', result: me === 'w' ? { outcome: 'profit', pips: 10, entry: { price: 1 } } : { outcome: 'loss', pips: -10, entry: { price: 1 } }, rival: { result: { outcome: 'skip', pips: 0 } } }; };
  const msgs = []; const wm = Win.message; Win.message = async (l) => { msgs.push([].concat(l).join('／')); };
  const t = TM.ensure(d); d.steps = 1000; const g0 = d.gold;
  plan = ['w', 'l', 'w']; let r = await TM.duel(npc, 3, true);
  T(opened.length === 3 && /あなた <b>0<\/b> － <b>0<\/b>/.test(opened[0].badge) && /あなた <b>1<\/b> － <b>1<\/b>/.test(opened[2].badge) && /第3戦／2本先取/.test(opened[2].badge), '3本勝負：スコア（あなた ○ － ○ 相手・第○戦）を画面の上に出す');
  T(opened.every((o) => o.rival && o.rival.independent === true), '対戦では相手の判断の時刻を独立にする');
  T(r.win && r.gold === TM.prize(2, 3) && d.gold === g0 + TM.prize(2, 3), '賞金は今までどおり（3本勝負 ' + TM.prize(2, 3) + 'G）');
  T(r.achievements.some((x) => /はじめての勝利/.test(x)) && r.achievements.some((x) => /3本勝負ではじめての勝利/.test(x)) && msgs.some((m) => /トレードバトルの記録/.test(m)), '実績の表示（はじめての勝利・3本勝負の初勝利）');
  plan = ['w']; r = await TM.duel(npc, 1, TM.coolLeft(d, npc.id) <= 0); T(r.win && r.gold === 0 && TM.coolLeft(d, npc.id) > 0, '400 歩の待ちの間は賞金なし（今までどおり）');
  T(r.achievements.some((x) => /2連勝/.test(x)) && !r.achievements.some((x) => /はじめての勝利/.test(x)), '連勝の表示（2連勝）・初勝利は 1 回だけ');
  plan = ['l']; r = await TM.duel(npc, 1, false); T(t.streak === 0 && t.bestStreak === 2, '負けたら連勝は 0 に・最高連勝は残る');
  CB.open = cbo; Win.message = wm;

  console.log('-- 勝率の偏り（シミュレーション：同じ場面・同じプレイヤーの判断で、今までの決まりと新しい決まりを比べる）');
  // 相手の判断は chartbattle.js の rivalDecide と同じ式（ここに写した）。プレイヤーは「判断の時間のうちランダムな時刻に、そのとき見えている足の見立てどおり（はっきりしなければ見送り）」
  function rivalSide(s, pos, R0) { const bars = CB.barsAt(s, pos.bar, pos.tick); let a; try { a = Market.assess(bars); } catch (e) { a = { bias: 'none', score: 0 }; } let h = ((s.seed >>> 0) ^ Math.imul((R0.seed >>> 0) || 7, 2654435761)) >>> 0; const rnd = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const sk = R0.skill; let side;
    if (a.bias === 'long' || a.bias === 'short') side = rnd() < sk ? a.bias : (rnd() < 0.5 ? (a.bias === 'long' ? 'short' : 'long') : 'skip'); else side = Math.abs(a.score || 0) >= 0.8 && rnd() < sk * 0.7 ? (a.score > 0 ? 'long' : 'short') : rnd() < 0.25 * (1 - sk) ? (rnd() < 0.5 ? 'long' : 'short') : 'skip';
    return side === 'skip' ? { outcome: 'skip', pips: 0 } : Market.settle(s, { bar: pos.bar, tick: pos.tick, side: side }); }
  const decideMs = 12000, barMs = Math.max(850, Math.round(decideMs / 16)); const posAt = (ms) => { const k = Math.floor(ms / (barMs / SUB)); return { bar: Market.LIVE0 + Math.floor(k / SUB), tick: k % SUB }; };
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const tally = { old: { w: 0, l: 0, d: 0 }, neu: { w: 0, l: 0, d: 0 } }; const N = 600;
  for (let i = 0; i < N; i++) {
    const sc = U.newScenario({ diff: [1, 5], avoid: [] }); const atFrac = 0.3 + rnd() * 0.5; const R0 = { skill: [0.35, 0.5, 0.62, 0.74, 0.86][i % 5], seed: (i * 977) >>> 0 };
    const tp = rnd() * decideMs; const pp = posAt(tp); const pa = Market.assess(CB.barsAt(sc, pp.bar, pp.tick)); const ps = pa.bias === 'long' || pa.bias === 'short' ? pa.bias : 'skip';
    const me = ps === 'skip' ? { outcome: 'skip', pips: 0 } : Market.settle(sc, { bar: pp.bar, tick: pp.tick, side: ps });
    const rOld = rivalSide(sc, tp < atFrac * decideMs ? pp : posAt(atFrac * decideMs), R0); const rNew = rivalSide(sc, posAt(atFrac * decideMs), R0);
    [['old', rOld], ['neu', rNew]].forEach(([k, op]) => { const j = TM.judge(me, op); tally[k][j > 0 ? 'w' : j < 0 ? 'l' : 'd']++; });
  }
  const pct = (x) => Math.round(x / N * 1000) / 10 + '%';
  console.log('  今までの決まり：プレイヤーの勝ち ' + pct(tally.old.w) + '・負け ' + pct(tally.old.l) + '・引き分け ' + pct(tally.old.d));
  console.log('  新しい決まり　：プレイヤーの勝ち ' + pct(tally.neu.w) + '・負け ' + pct(tally.neu.l) + '・引き分け ' + pct(tally.neu.d));
  const net = (t) => (t.w - t.l) / N; console.log('  勝ち−負け：' + Math.round(net(tally.old) * 1000) / 10 + 'pt → ' + Math.round(net(tally.neu) * 1000) / 10 + 'pt（引き分けが減り、勝ち・負けがともに増える）');
  T(Math.abs(net(tally.old) - net(tally.neu)) < 0.05, '勝ち−負けの差の変化は 5 ポイント未満（どちらかに大きく偏らない）');
  const share = (t) => t.w / Math.max(1, t.w + t.l); console.log('  勝負がついた中でのプレイヤーの勝ちの割合：' + Math.round(share(tally.old) * 1000) / 10 + '% → ' + Math.round(share(tally.neu) * 1000) / 10 + '%');
  T(Math.abs(share(tally.old) - share(tally.neu)) < 0.1, '勝負がついた中での勝ちの割合の変化は 10 ポイント未満');
  require('fs').writeFileSync(require('path').resolve(__dirname, '../../ux88/logs/tm88_fairness' + (two ? '_2d' : '') + '.json'), JSON.stringify({ N, tally }, null, 1));
  console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng.filter(Boolean)) + '　ページのエラー ' + A.errors.length);
  process.exit(ng.filter(Boolean).length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
