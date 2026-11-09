// Phase 0：変更前のトレードロジックで、指示書の指摘が実際に起きるかを確かめる（再現の記録。直したあとは tl_p1_test.js などが正しい動きを確かめる）
//   node docs/tools/tl/baseline_probe.js [リポジトリ]  … DOM を使わない（js/config.js・indicators.js・scenarios.js・trading.js・rpg/market.js）
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
global.window = undefined;
const CONFIG = require(R + '/js/config.js'); globalThis.CONFIG = CONFIG;
const Indicators = require(R + '/js/indicators.js'); globalThis.Indicators = Indicators;
const Scenarios = require(R + '/js/scenarios.js'); globalThis.Scenarios = Scenarios;
try { require(R + '/js/data/scenarios-extra.js'); } catch (e) { }
try { require(R + '/js/data/scenario-seeds.js'); } catch (e) { }
const TE = require(R + '/js/trading.js');
const Market = require(R + '/js/rpg/market.js');
const out = []; const P = (k, v) => { out.push([k, v]); console.log(k + '：' + (typeof v === 'string' ? v : JSON.stringify(v))); };
const scn = Scenarios.build('clear_up', 0); const st = scn.states[scn.def.focusTF]; const pip = CONFIG.market.pip; const e = st.close;
const base = { analysis: {}, swing: null, reason: 'align', riskPercent: 1, hintLevel: 0 };
// 1) 買いで損切りをエントリーより上（逆側）に置く
const ev1 = TE.evaluateFull(scn, Object.assign({}, base, { action: 'buy', sl: e + 30 * pip, tp: e + 60 * pip }));
const s1 = ev1.trade ? TE.simulate(scn, ev1.trade, 96) : null;
P('1 買い・損切りが上（逆側）：注文が成立するか', !!ev1.trade);
P('1 その結果', s1 ? { outcome: s1.outcome, pips: Math.round(s1.pips * 10) / 10, bars: s1.bars } : null);
const st1 = TE.emptyStats(); const acc1 = { capital: 1000000 }; const ap1 = s1 ? TE.applyResult(st1, acc1, ev1, s1) : null;
P('1 成績・資金に反映されるか（pnl・取引回数）', ap1 ? { pnl: ap1.pnl, trades: st1.trades } : null);
// 2) 買いで利確をエントリーより下に置く
const ev2 = TE.evaluateFull(scn, Object.assign({}, base, { action: 'buy', sl: e - 30 * pip, tp: e - 10 * pip }));
const s2 = ev2.trade ? TE.simulate(scn, ev2.trade, 96) : null;
P('2 買い・利確が下（逆側）：成立するか／結果', { trade: !!ev2.trade, outcome: s2 && s2.outcome, pips: s2 && Math.round(s2.pips * 10) / 10 });
// 3) 最小ロットの強制
P('3 lotFor(資金1万円, 0.5%, 損切り200pips)', TE.lotFor(10000, 0.5, 200) + ' 万通貨（許容損失 50円。0.01万通貨×200pips×100円 ＝ ' + (0.01 * 200 * 100) + '円）');
P('3 lotFor(NaN, 1, 30)', String(TE.lotFor(NaN, 1, 30)));
P('3 lotFor(1000000, -1, 30)', String(TE.lotFor(1000000, -1, 30)));
// 4) 損切りが NaN（数値でない）のとき
const ev4 = TE.evaluateFull(scn, Object.assign({}, base, { action: 'buy', sl: NaN, tp: e + 60 * pip }));
const s4 = ev4.trade ? TE.simulate(scn, ev4.trade, 96) : null;
P('4 損切り NaN：成立するか／含み損の最大（worstPips）', { trade: !!ev4.trade, sl: ev4.trade && String(ev4.trade.sl), outcome: s4 && s4.outcome, worstPips: s4 ? s4.worstPips : null });
// 5) 同じ足で損切り・利確の両方に届く（OHLC だけ）：損切り扱い（ambiguous は付く）
const fut = st.future; let amb = null;
for (let i = 0; i < 40 && !amb; i++) { const c = fut[i]; const mid = (c.h + c.l) / 2; const t = { action: 'buy', entry: mid, sl: c.l + 0.0001, tp: c.h - 0.0001, riskPips: (mid - c.l) / pip };
  const fake = { def: scn.def, states: { [scn.def.focusTF]: { future: [c] } } }; const r = TE.simulate(fake, t, 1); if (r.ambiguous) amb = { outcome: r.outcome, ambiguous: r.ambiguous }; }
P('5 TradeEval.simulate 同じ足で両方', amb);
// 6) Market.settle の r（損益÷ATR）と、初期リスクに対する R（riskR）
const ms = Market.build('mk_trend_up_d2_v0', 12345); const r6 = Market.settle(ms, { bar: Market.LIVE0, tick: 3, side: 'long' });
const initRisk = Math.abs(r6.entry.price - r6.sl); P('6 Market.settle（既定 slAtr=1.0）', { r: r6.r, pnlOverInitialRisk: Math.round(r6.pnl / initRisk * 100) / 100, hasRiskR: 'riskR' in r6, hasAtrMultiple: 'atrMultiple' in r6 });
const r6b = Market.settle(ms, { bar: Market.LIVE0, tick: 3, side: 'long' }, { slAtr: 1.5, tpAtr: 2.7 }); const ir2 = Math.abs(r6b.entry.price - r6b.sl);
P('6 Market.settle（slAtr=1.5）：r と 損益÷初期リスク', { r: r6b.r, pnlOverInitialRisk: Math.round(r6b.pnl / ir2 * 100) / 100 });
// 7) RCI の反転：-93 → -78 → -65 → -80 の今を「上向きに反転」とするか（Indicators.analyze の rciState。値の列から終値を作る代わりに、同じ判定式を写して確かめる）
function legacyRciState(rci, hot) { const n = rci.length - 1; let mn = Infinity, mx = -Infinity; for (let k = Math.max(0, n - 8); k <= n; k++) { if (rci[k] < mn) mn = rci[k]; if (rci[k] > mx) mx = rci[k]; } const now = rci[n];
  if (mn <= -hot && now > mn + 10 && now < hot) return 'oversold_reversal'; if (mx >= hot && now < mx - 10 && now > -hot) return 'overbought_reversal'; if (now >= hot) return 'overbought'; if (now <= -hot) return 'oversold'; return 'neutral'; }
P('7 RCI -93→-78→-65→-80（変更前の判定式）', legacyRciState([-93, -78, -65, -80], 70));
// 8) 上位足の設問と採点：4時間足がレンジのとき、日足で採点する場面の数
let fb = 0, tot = 0, ids = [];
Scenarios.ids().forEach((id) => { const s = Scenarios.build(id, 0); const t = TE.truth(s); tot++; const h4 = s.states['4h']; const d4 = (h4.emaOrder === 'up' || h4.emaOrder === 'down') ? h4.emaOrder : (h4.dow.trend === 'up' || h4.dow.trend === 'down') ? h4.dow.trend : 'range'; if (d4 === 'range' && t.htf !== 'range') { fb++; ids.push(id); } });
P('8 設問「上位足（4時間足）の方向は？」なのに日足で採点する場面', fb + '/' + tot + ' ' + ids.join(','));
P('8 設問の文', TE.ANALYSIS[0].title);
// 9) MACD ダイバージェンスの選び方がシナリオ ID に依存
P('9 truth.macd の優先順（regular で始まる ID なら通常を先に）', 'TradeEval.truth の order は def.id.indexOf("regular")===0 で決まる（js/trading.js）');
// 10) トレードバトルの「最大ドローダウン」
const TBsrc = require('fs').readFileSync(R + '/js/rpg/tradebattle.js', 'utf8');
P('10 トレードバトルの表の項目名', /'最大ドローダウン'/.test(TBsrc) ? '「最大ドローダウン」（計算は maeOf＝取引中の最大逆行幅 pips）' : '変更済み');
require('fs').writeFileSync(path.join(__dirname, '../../trading-learning/logs/baseline_probe.json'), JSON.stringify(out, null, 1));
