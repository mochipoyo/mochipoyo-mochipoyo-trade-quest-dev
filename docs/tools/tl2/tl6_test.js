// Phase 6 の確かめ：コストの定義（gross・net・cost）・推定損失とストレス・上位足の真理値表・PF（円／R）・DD（金額／割合）・記録の上限と archive・二重発注
// DOM なし：node docs/tools/tl2/tl6_test.js [リポジトリ]
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
const CONFIG = require(R + '/js/config.js'); globalThis.CONFIG = CONFIG;
globalThis.Indicators = require(R + '/js/indicators.js'); globalThis.SignalEngine = require(R + '/js/signals.js');
const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC;
const Scenarios = require(R + '/js/scenarios.js'); globalThis.Scenarios = Scenarios;
const SP = require(R + '/js/strategy.js'); globalThis.StrategyProfiles = SP;
const PE = require(R + '/js/practice.js'); globalThis.PracticeEngine = PE;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e);
const pip = TC.spec().pip, pv = TC.spec().pipValue;
const bar = (o, h, l, c) => ({ o, h, l, c });
const flat = (n, p) => Array.from({ length: n }, () => bar(p || 150, p || 150, p || 150, p || 150));
const sumCost = (r) => r.costs.spreadEntryPips + r.costs.spreadExitPips + r.costs.entrySlipPips + r.costs.exitSlipPips;

console.log('--- 6.1 コスト：gross（中値→中値）・net（約定どうし）・cost＝gross−net ---');
// 利確（指値）：入口のスプレッド半分＋入口の滑り＋出口のスプレッド半分
let b = [bar(150, 150, 150, 150), bar(150, 150.7, 149.9, 150.6)];
let r = TC.settleBars(b, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3 });
ok(r.ok && r.reason === 'tp' && near(r.entryPrice, 150 + 0.004, 1e-9) && near(r.exitPrice, 150.6, 1e-9), '買いの利確：約定 150.004（中値＋0.3＋入口の滑り0.1）・利確は 150.600 ちょうど（指値の仮定）');
ok(near(r.netPips, 59.6, 1e-9) && near(r.grossPips, 60.3, 1e-9) && near(r.costPips, 0.7, 1e-9), 'net 59.6・gross 60.3（中値 150.000 → 出口の中値 150.603）・cost 0.7（' + r.netPips + '／' + r.grossPips + '／' + r.costPips + '）');
ok(near(sumCost(r), r.costPips, 1e-9) && r.costs.exitSlipPips === 0, 'cost の内訳（入口0.3＋出口0.3＋入口の滑り0.1＋出口の滑り0）の合計が cost と一致');
ok(near(r.riskPips, 30.4, 1e-9) && near(r.riskR, r2(59.6 / 30.4)) && near(r.plannedRR, r2(59.6 / 30.4)), 'riskR＝net ÷ 初期リスク（約定 150.004 → 損切り 149.700 ＝30.4pips）・計画の RR も約定価格から');
function r2(v) { return Math.round(v * 100) / 100; }
// 損切り（逆指値）：決済の滑り 0.3
b = [bar(150, 150, 150, 150), bar(150, 150.1, 149.6, 149.65)];
r = TC.settleBars(b, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3 });
ok(r.reason === 'sl' && near(r.exitPrice, 149.697, 1e-9) && near(r.netPips, -30.7, 1e-9) && near(r.grossPips, -29.7, 1e-9) && near(r.costPips, 1.0, 1e-9), '買いの損切り：約定 149.697・net −30.7・gross −29.7（出口の中値 149.703）・cost 1.0');
ok(near(sumCost(r), r.costPips, 1e-9) && near(r.riskR, r2(-30.7 / 30.4)), '損切りの R は −1R より少し大きい損失（' + r.riskR + 'R：決済の滑りの分）');
// 売り
b = [bar(150, 150, 150, 150), bar(150, 150.1, 149.35, 149.4)];
r = TC.settleBars(b, 0, { side: 'sell', entry: 150, sl: 150.3, tp: 149.4 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3 });
ok(r.reason === 'tp' && near(r.entryPrice, 149.996, 1e-9) && near(r.netPips, 59.6, 1e-9) && near(r.costPips, 0.7, 1e-9) && near(sumCost(r), r.costPips, 1e-9), '売りの利確：約定 149.996・net 59.6・cost 0.7（買いと対称）');
// 入口と出口でスプレッドが違う
b = [bar(150, 150, 150, 150), bar(150, 150.7, 149.9, 150.6)];
r = TC.settleBars(b, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadEntryPips: 0.6, spreadExitPips: 2.0, entrySlipPips: 0, exitSlipPips: 0 });
ok(near(r.costs.spreadEntryPips, 0.3) && near(r.costs.spreadExitPips, 1.0) && near(r.costPips, 1.3, 1e-9) && near(sumCost(r), r.costPips, 1e-9), '入口 0.6・出口 2.0 のスプレッド：cost 1.3（0.3＋1.0）');
// コスト 0
r = TC.settleBars(b, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0, entrySlipPips: 0, stopSlipPips: 0 });
ok(near(r.grossPips, r.netPips) && r.costPips === 0 && near(r.riskR, 2), 'コスト 0：gross＝net・cost 0・+2R');
// 窓：始値で損切りを越えた（決済の滑りは足さず、越えた分は gapSlippagePips）
b = [bar(150, 150, 150, 150), bar(149.5, 149.6, 149.4, 149.45)];
r = TC.settleBars(b, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3 });
ok(r.reason === 'sl' && r.gap && near(r.exitPrice, 149.497, 1e-9) && near(r.gapSlippagePips, 20.3, 1e-9) && r.costs.exitSlipPips === 0, '窓：始値 149.500（売値 149.497）で約定・損切りを越えた分 20.3pips・決済の滑りは足さない');
ok(near(r.costPips, 0.7, 1e-9) && near(sumCost(r), r.costPips, 1e-9) && near(-r.netPips, r.riskPips + r.gapSlippagePips, 1e-6), '窓のときも cost は 0.7（二重に数えない）。損失＝初期リスク＋越えた分（' + (-r.netPips) + '＝' + r.riskPips + '＋' + r.gapSlippagePips + '）');
// 同じ足で両方
b = [bar(150, 150, 150, 150), bar(150, 150.7, 149.6, 150)];
r = TC.settleBars(b, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3 });
ok(r.ambiguous && r.reason === 'sl' && r.ifTpFirst && near(r.ifTpFirst.netPips, 59.6, 1e-9) && /順序が分からない/.test(r.assumption), '同じ足で損切りと利確：損切りが先と仮定・利確が先なら +59.6pips（' + r.ifTpFirst.riskR + 'R）も返す');
// 時間切れ（成行）
r = TC.settleBars(flat(10), 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3, maxBars: 4 });
ok(r.reason === 'time' && r.exitIndex === 4 && near(r.netPips, -1.0, 1e-9) && r.grossPips === 0 && near(r.costPips, 1.0, 1e-9), '時間切れ：4本で成行の決済・gross 0・net −1.0（cost 1.0）');
// 手数料（円）は pips に入れず別
r = TC.settleBars([bar(150, 150, 150, 150), bar(150, 150.7, 149.9, 150.6)], 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3, lots: 0.5, commissionPerLotYen: 100 });
ok(r.pnlYen === Math.round(59.6 * pv * 0.5) && r.commissionYen === 100 && r.pnlYenAfterCommission === r.pnlYen - 100 && near(r.netPips, 59.6, 1e-9), '手数料 1ロット片道100円・0.5ロット：往復100円を円の損益から別に引く（pips・R は変えない）');
// ATR の倍数
r = TC.settleBars([bar(150, 150, 150, 150), bar(150, 150.7, 149.9, 150.6)], 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { atr: 0.2 });
ok(near(r.atrMultiple, r2(r.netPips * pip / 0.2)), 'ATR の倍数（実現損益 ÷ エントリーの時点の ATR）は R と別の値：' + r.atrMultiple);
// 入力の守り
ok(!TC.settleBars(flat(3), 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: -1 }).ok, 'スプレッドが負：決済しない（invalid）');
ok(!TC.settleBars(flat(3), 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { entrySlipPips: NaN }).ok, '滑りが NaN：決済しない');
ok(!TC.settleBars(flat(3), 5, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }).ok, '約定の足の番号が範囲外：決済しない');
ok(!TC.settleBars([], 0, { side: 'buy', entry: 150, sl: 149.7 }).ok, '足がない：決済しない');
let v = TC.validateOrder({ side: 'buy', entry: 150, sl: 149.7005, tp: 150.6 }); ok(!v.ok && v.errors.some((e) => e.code === 'sl_tick'), '損切りが価格の刻み（0.001）に合わない：注文できない（' + TC.errorText(v) + '）');
let sz = TC.sizePosition({ capital: 1000000, riskPercent: 1, riskPips: 30.7 }); ok(sz.ok && near(sz.lots * 100 % (TC.spec().lotStep * 100), 0, 1e-6) && sz.actualRisk <= 10000 + 1e-6, 'ロットは刻みへ切り下げ（' + sz.lots + '・推定損失 ' + Math.round(sz.actualRisk) + '円 ≤ 許容 10,000円）');
sz = TC.sizePosition({ capital: 10000, riskPercent: 0.5, riskPips: 80 }); ok(!sz.ok && sz.errors[0].code === 'below_min_lot', '最小ロットでも許容を超える：注文できない（理由つき）');

console.log('--- 6.2 推定損失・ストレス・発注と同じ計算 ---');
const S = require(R + '/js/data/practice-seeds.js'); const seeds = (globalThis.PRACTICE_SEEDS || S);
const pool = seeds.learn; const cats = Object.keys(pool); let tested = 0, same = 0, stressOk = 0, dup = 0;
for (const c of cats) { for (const sd of pool[c].slice(0, 2)) {
  const play = PE.start({ seed: sd, cat: c, set: 'learn' }, {}); PE.markStart(play); const sn = PE.snap(play); if (!sn.entry || sn.entry.insufficient) continue;
  const side = sn.entry.emaOrder === 'down' ? 'sell' : 'buy'; const sw = side === 'buy' ? sn.entry.swing.low : sn.entry.swing.high; if (sw === null) continue;
  const slv = +(side === 'buy' ? sw - 0.03 : sw + 0.03).toFixed(3); const mid = sn.entry.close; const risk = Math.abs(mid - slv); const tpv = +(side === 'buy' ? mid + 2 * risk : mid - 2 * risk).toFixed(3);
  play.phase = 'waiting'; const o = { side, sl: slv, tp: tpv, riskPercent: 1 }; const pvw = PE.preview(play, o, 1000000); if (!pvw.ok) continue; tested++;
  const en = PE.enter(play, o, 1000000); const st = play.settle;
  // 損切りで終わったときの損失（窓なし）＝推定損失（同じエンジンの計算）
  const lossAtSl = (pvw.validation.riskPips + TC.COSTS.entrySlipPips + TC.COSTS.stopSlipPips) * pvw.sizing.lots * pv; if (near(lossAtSl, pvw.estLoss, 1e-6) && near(st.entryPrice, pvw.entryPx + (side === 'buy' ? 1 : -1) * TC.COSTS.entrySlipPips * pip, 1e-9)) same++;
  if (pvw.stress.length === 2 && pvw.stress[0].loss > pvw.estLoss * 0.99 && pvw.stress[1].loss > pvw.stress[0].loss) stressOk++;
  const en2 = PE.enter(play, o, 1000000); if (!en2.ok && en2.duplicate) dup++;
} }
ok(tested >= 10 && same === tested, '発注の確認画面の推定損失・約定の予定と、決済の計算が同じ（' + same + '/' + tested + '問）');
ok(stressOk === tested, 'ストレスの例（損切りを ATR×1・×2 越える）を 2 つ出し、推定損失より大きい（' + stressOk + '/' + tested + '）');
ok(dup === tested, '同じ問題で 2 回発注しても受け付けない（二重発注の防止 ' + dup + '/' + tested + '）');
{ const play = PE.start({ seed: pool[cats[0]][0], cat: cats[0], set: 'learn' }, {}); play.phase = 'waiting'; const p0 = PE.preview(play, { side: 'buy', sl: 1, tp: 2, riskPercent: 1 }, 0); ok(!p0.ok && p0.errors.some((e) => /0円以下/.test(e)), '資金 0 円：注文できない（' + p0.errors.slice(-1)[0] + '）'); }

console.log('--- 6.3 上位足：逆行と食い違いを別に判定・履歴不足はレンジと別 ---');
const mk = (d1, h4) => ({ htf: { '1d': d1 === 'ins' ? { insufficient: true } : { insufficient: false, dir: d1 }, '4h': h4 === 'ins' ? { insufficient: true } : { insufficient: false, dir: h4 } }, entry: { emaOrder: 'up', dow: 'up', rci: { signal: 'up', state: 'turning_up', value: -50, zone: null }, divs: [], distEmaAtr: 0.5 } });
const T = [['up', 'up'], ['down', 'down'], ['up', 'down'], ['down', 'up'], ['range', 'up'], ['up', 'range'], ['ins', 'up'], ['up', 'ins'], ['ins', 'ins'], ['range', 'range']];
const expect = { // 買い（d=up）での htfOk・against・conflict（mode ごと）
  all_known: ['1,0,0', '0,1,0', '0,1,1', '0,1,1', '1,0,0', '1,0,0', '1,0,0', '1,0,0', '0,0,0', '0,0,0'],
  h4_priority: ['1,0,0', '0,1,0', '0,1,1', '1,1,1', '1,0,0', '1,0,0', '1,0,0', '1,0,0', '0,0,0', '0,0,0'],
  both_required: ['1,0,0', '0,1,0', '0,1,1', '0,1,1', '0,0,0', '0,0,0', '0,0,0', '0,0,0', '0,0,0', '0,0,0'] };
for (const mode of Object.keys(expect)) { const got = T.map(([a, c]) => { const ch = SP.evaluateEntry(mk(a, c), 'buy', Object.assign(SP.values('mochipoyo'), { htfMode: mode })); return [ch.evidence.find((x) => x.key === 'htf').ok ? 1 : 0, ch.htfAgainst ? 1 : 0, ch.htfConflict ? 1 : 0].join(','); });
  ok(got.join('|') === expect[mode].join('|'), '真理値表（' + mode + '）：' + T.map((t, i) => t.join('/') + '→' + got[i]).join(' ')); }
{ const prof = Object.assign(SP.values('mochipoyo'), { htfAgainst: 'warn', htfConflict: 'block' }); const ch = SP.evaluateEntry(mk('up', 'down'), 'buy', prof);
  ok(ch.blockers.some((x) => x.code === 'htf_conflict') && !ch.blockers.some((x) => x.code === 'htf_against') && ch.warnings.some((w) => /逆/.test(w)), '逆行は「注意だけ」・食い違いは「止める」の設定：食い違いの妨げが残る（v9.0 の else で抜けていた）'); }
{ const ch = SP.evaluateEntry(mk('ins', 'up'), 'buy', SP.values('mochipoyo')); ok(ch.warnings.some((w) => /日足：履歴不足のため判定不可（レンジとは別）/.test(w)) && ch.htfStates[0].state === 'insufficient', '日足が履歴不足：「判定不可」として出す（レンジとは別の状態）'); }
{ const ch = SP.evaluateEntry(mk('ins', 'up'), 'buy', Object.assign(SP.values('mochipoyo'), { htfMode: 'both_required' })); ok(!ch.met && ch.missing.some((m) => /判定不可/.test(m)), '両方必須の設定で日足が履歴不足：発注の条件にならない（判定不可）'); }
{ const ch = SP.evaluateEntry(mk('up', 'up'), 'buy', SP.values('mochipoyo')); const m = Object.assign({}, mk('up', 'up')); m.entry = Object.assign({}, m.entry, { rci: { signal: null, state: 'neutral', value: 0 } }); const ch2 = SP.evaluateEntry(m, 'buy', Object.assign(SP.values('mochipoyo'), { minEvidence: 5 }));
  ok(ch.met && ch2.missing.some((x) => /条件が \d 項目/.test(x) && /独立した証拠の数ではない/.test(x)), '「根拠の数」ではなく「条件の項目数」と表示（独立した証拠の数ではないと明記）'); }

console.log('--- 6.4 統計：PF（円／R）・DD（金額／割合を別に）・含み損込み・記録の範囲 ---');
let dd = TC.maxDrawdown([100, 50, 1000, 800]); ok(dd.amount === 200 && near(dd.amountPct, 20) && near(dd.pct, 50) && dd.pctAmount === 50 && dd.peakIndex === 2 && dd.pctPeakIndex === 0, '金額の最大（1000→800 の 200・20%）と割合の最大（100→50 の 50%・50）は別の区間');
dd = TC.maxDrawdown([100, 90, 120, 130]); ok(dd.amount === 10 && near(dd.pct, 10), '高値を更新したら下げはそこから測る（100→90 の 10、その後は更新）');
dd = TC.maxDrawdown([]); ok(dd.amount === 0 && dd.pct === 0, '記録 0 件：DD 0');
dd = TC.maxDrawdown([100]); ok(dd.amount === 0, '記録 1 件：DD 0');
const H = [{ kind: 'trade', riskR: 2, pnl: 2000, lots: 0.1, mae: -10, capitalAfter: 102000, grossR: 2.05, plannedRR: 2 }, { kind: 'trade', riskR: -1, pnl: -20000, lots: 1, mae: -20, capitalAfter: 82000, grossR: -0.97, plannedRR: 2 }, { kind: 'trade', riskR: 1, pnl: 1000, lots: 0.05, mae: -30, capitalAfter: 83000, grossR: 1.03, plannedRR: 1.5 }];
let st = TC.stats(H, { capital: 100000 });
ok(near(st.profitFactorR, 3) && near(st.profitFactorYen, 0.15), 'PF（R）＝3（2R＋1R ÷ 1R）・PF（円）＝0.15（3,000円 ÷ 20,000円）：損切りの幅が違うと大きく違う');
ok(st.expectancyR === 0.67 && near(st.expectancyGrossR, r2((2.05 - 0.97 + 1.03) / 3)) && st.avgPnlYen === Math.round((3000 - 20000) / 3), '期待値R（コスト込み 0.67・コスト抜き ' + st.expectancyGrossR + '）と 1回の損益（円 ' + st.avgPnlYen + '）を別々に');
ok(st.curve.join() === '100000,102000,82000,83000' && st.drawdown.amount === 20000 && near(st.drawdown.pct, r2(20000 / 102000 * 100)), '確定損益の資金曲線と DD（102,000→82,000）');
ok(st.curveIntra.length === 7 && st.drawdownIntra.amount >= st.drawdown.amount && st.curveIntra[3] === 102000 - 20 * pv * 1, '含み損込みの見積もり：各取引の MAE を入れる（' + st.drawdownIntra.amount + '円 ≥ 確定 ' + st.drawdown.amount + '円）');
st = TC.stats([], { capital: 100000 }); ok(st.trades === 0 && st.winRate === null && st.expectancyR === null && st.profitFactorYen === null && st.drawdown.amount === 0, '記録 0 件：率・期待値・PF は「―」（null）');
st = TC.stats([H[0]], { capital: 100000 }); ok(st.trades === 1 && st.small && st.pfRInfinite && st.pfYenInfinite, '記録 1 件（勝ち）：PF は ∞（負けなし）・少ないサンプルの印');
const H30 = Array.from({ length: 30 }, (_, i) => ({ kind: 'trade', riskR: i % 3 ? -1 : 2, pnl: i % 3 ? -1000 : 2000, capitalAfter: 0, t: i })); let cap = 100000; H30.forEach((x) => { cap += x.pnl; x.capitalAfter = cap; });
st = TC.stats(H30, { capital: 100000 }); ok(st.trades === 30 && !st.small && st.maxLosingStreak === 2 && near(st.profitFactorR, 1) && near(st.profitFactorYen, 1), '記録 30 件：サンプル不足の印が消える・PF 1・最大連敗 2');
// 同じ時刻の記録
st = TC.stats([{ kind: 'trade', riskR: 1, pnl: 100, capitalAfter: 100100, t: 5 }, { kind: 'trade', riskR: -1, pnl: -100, capitalAfter: 100000, t: 5 }], { capital: 100000 }); ok(st.curve.join() === '100000,100100,100000', '同じ時刻の記録も順番どおりに資金曲線へ入れる');
// 極端な値
st = TC.stats([{ kind: 'trade', riskR: -50, pnl: -999999, capitalAfter: 0 }, { kind: 'trade', riskR: NaN, pnl: NaN }, { kind: 'skip' }], { capital: 1000000 }); ok(st.trades === 1 && near(st.drawdown.pct, 100) && st.skips === 1, '極端な値（−50R・資金 0）と NaN の記録：NaN は数えず、DD は 100%');
// archive
let A = TC.archiveAdd(null, []); ok(A.count === 0 && A.lastCapital === null, 'archive の初期値');
A = TC.archiveAdd(A, H30.slice(0, 1)); ok(A.count === 1 && A.trades === 1 && A.sumR === 2 && A.pnlYen === 2000 && A.lastCapital === 102000, 'archive に 1 件まとめる');

console.log('--- 6.4 記録の上限 300 件と archive（UI の pushHistory・旧セーブの移行） ---');
globalThis.Win = { esc: (s) => String(s) }; globalThis.State = { data: null }; globalThis.Chart = {}; globalThis.Engine = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) }; globalThis.document = { getElementById: () => null };
require(R + '/js/ui/practiceui.js'); const PUI = globalThis.PracticeUI;
const mkRec = (i, c) => ({ kind: 'trade', riskR: i % 2 ? 1 : -1, pnl: i % 2 ? 1000 : -500, capitalAfter: c, t: 1000 + i });
let d = { practice: { history: [] } }; let p = PUI.ensure(d); ok(p.historyWindowStartCapital === CONFIG.risk.capital && p.archive.count === 0, '記録 0 件の新しいセーブ：最初の資金＝初期資金・archive は空');
cap = 1000000; for (let i = 0; i < 301; i++) { const x = mkRec(i, 0); cap += x.pnl; x.capitalAfter = cap; PUI.pushHistory(p, x); }
ok(p.history.length === 300 && p.archive.count === 1 && p.archive.trades === 1 && p.historyWindowStartCapital === 999500 && p.history[0].t === 1001, '301 件目：最も古い 1 件を archive にまとめ、残り 300 件の最初の資金（999,500）を記録');
st = TC.stats(p.history, { capital: p.historyWindowStartCapital }); ok(st.curve[0] === 999500 && st.curve[1] === p.history[0].capitalAfter && st.curve[st.curve.length - 1] === cap, '残っている記録の資金曲線は、その範囲の最初の資金から始まる（作り話の過去は足さない）');
d = { practice: { history: Array.from({ length: 300 }, (_, i) => mkRec(i, 1000000 + i)) } }; p = PUI.ensure(d); ok(p.archive.unknownBefore === true && p.historyWindowStartCapital === 1000000 - (-500), '旧セーブ（上限いっぱいの 300 件・archive なし）：それより前は「不明」の印・最初の資金は最初の記録から逆算');
d = { practice: { history: [{ kind: 'skip', capitalAfter: 777000 }] } }; p = PUI.ensure(d); ok(p.historyWindowStartCapital === 777000 && !p.archive.unknownBefore, '旧セーブ（見送り 1 件）：最初の資金＝その記録の資金');
d = { practice: { history: [], archive: { count: 3, trades: 2, sumR: 1 }, historyWindowStartCapital: 500000 } }; p = PUI.ensure(d); ok(p.archive.count === 3 && p.historyWindowStartCapital === 500000, '新しいセーブの archive と最初の資金はそのまま残す');

console.log('--- 6.4 再現性：seed・checksum・版の記録 ---');
{ const play = PE.start({ seed: pool[cats[1]][0], cat: cats[1], set: 'learn' }, {}); PE.markStart(play); PE.skip(play, null); const gr = PE.grade(play, {}); const rec = PE.record(play, gr, 1000000);
  ok(rec.engineVersion === PE.ENGINE_VERSION && rec.scenarioVersion === 1 && /^[0-9a-f]{8}$/.test(rec.checksum) && rec.profileSnap && rec.profileSnap.minEvidence === 2 && rec.seed === play.seed, '記録に engineVersion・scenarioVersion・checksum・設定の写し・seed・時刻を残す');
  ok(PUI.replayable(rec).ok, '同じ版なら記録から相場を作り直せる（checksum が一致）');
  ok(!PUI.replayable(Object.assign({}, rec, { checksum: 'deadbeef' })).ok && /違う/.test(PUI.replayable(Object.assign({}, rec, { checksum: 'deadbeef' })).why), 'checksum が違えば「相場の作り方が記録の時と違う」として再現しない');
  const old = Object.assign({}, rec); delete old.checksum; delete old.engineVersion; ok(!PUI.replayable(old).ok && /旧形式/.test(PUI.replayable(old).why), 'v9.0 の記録（checksum なし）：「旧形式のため再現できない」');
  ok(PE.skip(play, null) === false, '決定した後に、もう一度「見送り」を受け付けない'); }

console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
