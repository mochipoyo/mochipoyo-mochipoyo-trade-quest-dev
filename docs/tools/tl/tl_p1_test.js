// Phase 1（P0）の確かめ：注文の検証・ロット・決済・R と DD の区別・旧セーブ（DOM なし：node docs/tools/tl/tl_p1_test.js [リポジトリ]）
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
const CONFIG = require(R + '/js/config.js'); globalThis.CONFIG = CONFIG;
globalThis.Indicators = require(R + '/js/indicators.js'); try { globalThis.SignalEngine = require(R + '/js/signals.js'); } catch (e) { }
const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC;
const Scenarios = require(R + '/js/scenarios.js'); globalThis.Scenarios = Scenarios; require(R + '/js/data/scenarios-extra.js'); require(R + '/js/data/scenario-seeds.js');
const TE = require(R + '/js/trading.js'); globalThis.TradeEval = TE;
require(R + '/js/data/market-seeds.js'); const Market = require(R + '/js/rpg/market.js'); globalThis.Market = Market;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-9);
const codes = (v) => v.errors.map((e) => e.code).join(',');
const pip = 0.01, E0 = 150;

console.log('--- 注文の検証（TradeCore.validateOrder） ---');
let v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0 - 0.3, tp: E0 + 0.6 }); ok(v.ok && near(v.riskPips, 30, 1e-6) && near(v.rewardPips, 60, 1e-6) && near(v.rr, 2, 1e-9), '買いの正常な注文：損切り30pips・利確60pips・RR 1:2');
v = TC.validateOrder({ side: 'sell', entry: E0, sl: E0 + 0.3, tp: E0 - 0.45 }); ok(v.ok && near(v.rr, 1.5, 1e-9), '売りの正常な注文：RR 1:1.5');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0 + 0.3, tp: E0 + 0.6 }); ok(!v.ok && codes(v) === 'sl_wrong_side' && /下に置く/.test(v.errors[0].msg), '買いで損切りが上：注文できない（' + v.errors[0].msg + '）');
v = TC.validateOrder({ side: 'sell', entry: E0, sl: E0 - 0.3, tp: E0 - 0.6 }); ok(!v.ok && codes(v) === 'sl_wrong_side', '売りで損切りが下：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0 - 0.3, tp: E0 - 0.1 }); ok(!v.ok && codes(v) === 'tp_wrong_side', '買いで利確が下：注文できない');
v = TC.validateOrder({ side: 'sell', entry: E0, sl: E0 + 0.3, tp: E0 + 0.1 }); ok(!v.ok && codes(v) === 'tp_wrong_side', '売りで利確が上：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0, tp: E0 + 0.5 }); ok(!v.ok && codes(v) === 'sl_equal', '損切りがエントリーと同じ（幅0）：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0 - 0.3, tp: E0 }); ok(!v.ok && codes(v) === 'tp_equal', '利確がエントリーと同じ：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: null, tp: E0 + 0.5 }); ok(!v.ok && codes(v) === 'sl_missing', '損切りなし（必須の設定）：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: null, tp: E0 + 0.5, requireSL: false }); ok(v.ok && v.noStop && v.warnings.some((w) => w.code === 'no_sl') && v.riskPips === null, '損切りなし（学習用に許す設定）：成立するが「損切りなし」の印と警告');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0 - 0.3, tp: null }); ok(v.ok && v.noTarget && v.rr === null, '利確なし（任意の設定）：成立・RR は計算しない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0 - 0.3, tp: null, requireTP: true }); ok(!v.ok && codes(v) === 'tp_missing', '利確が必須の設定で利確なし：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: NaN, tp: E0 + 0.5 }); ok(!v.ok && codes(v) === 'sl_nan', '損切りが NaN：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: 'abc', tp: Infinity }); ok(!v.ok && codes(v) === 'sl_nan,tp_nan', '損切りが文字・利確が無限大：注文できない（' + codes(v) + '）');
v = TC.validateOrder({ side: 'buy', entry: NaN, sl: 149, tp: 151 }); ok(!v.ok && /entry/.test(codes(v)), 'エントリー価格が NaN：注文できない');
v = TC.validateOrder({ side: 'hold', entry: E0, sl: 149, tp: 151 }); ok(!v.ok && /side/.test(codes(v)), '向きが不正：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: 1.5, tp: E0 + 1 }); ok(!v.ok && codes(v) === 'sl_abnormal', '桁の違う損切り（1.5）：異常値として注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: -1, tp: 151 }); ok(!v.ok && codes(v) === 'sl_nonpositive', '損切りが負の価格：注文できない');
v = TC.validateOrder({ side: 'buy', entry: E0, sl: E0 - 0.008, tp: E0 + 0.5, spreadPips: 0.6 }); ok(v.ok && v.warnings.some((w) => w.code === 'sl_too_close'), '損切りがスプレッドの2倍より近い：警告');

console.log('--- ロット（TradeCore.sizePosition） ---');
let s = TC.sizePosition({ capital: 1000000, riskPercent: 1, riskPips: 30 }); ok(s.ok && near(s.lots, 3.33, 1e-9) && s.actualRisk <= s.riskAmount + 1e-9 && near(s.riskAmount, 10000), '100万円・1%・30pips → 3.33ロット（切り下げ。実際の損失 ' + s.actualRisk + '円 ≤ 許容 10,000円）');
s = TC.sizePosition({ capital: 10000, riskPercent: 0.5, riskPips: 200 }); ok(!s.ok && s.errors[0].code === 'below_min_lot' && s.lots === 0 && near(s.minLotRisk, 200) && /最小ロット/.test(s.errors[0].msg), '1万円・0.5%・200pips：最小ロットでも許容を超えるので注文できない（' + s.errors[0].msg.slice(0, 40) + '…）');
s = TC.sizePosition({ capital: 0, riskPercent: 1, riskPips: 30 }); ok(!s.ok && s.errors[0].code === 'capital_zero' && s.lots === 0, '口座残高 0：注文できない');
s = TC.sizePosition({ capital: NaN, riskPercent: 1, riskPips: 30 }); ok(!s.ok && s.lots === 0 && !isNaN(s.lots), '資金 NaN：ロット 0（NaN にならない）');
s = TC.sizePosition({ capital: 1000000, riskPercent: -1, riskPips: 30 }); ok(!s.ok && s.errors[0].code === 'risk_nonpositive', 'リスク −1%：注文できない');
s = TC.sizePosition({ capital: 1000000, riskPercent: 1, riskPips: 0 }); ok(!s.ok && s.errors.some((e) => e.code === 'riskpips_nonpositive'), '損切り幅 0：注文できない（0 で割らない）');
s = TC.sizePosition({ capital: 1e12, riskPercent: 100, riskPips: 1 }); ok(s.ok && s.lots === 500 && s.warnings.some((w) => w.code === 'max_lot'), '巨大な資金：最大ロットで止める');
ok(TE.lotFor(1000000, 1, 30) === 3.33 && TE.lotFor(10000, 0.5, 200) === 0 && TE.lotFor(NaN, 1, 30) === 0 && TE.lotFor(1000000, -1, 30) === 0, '旧 API TradeEval.lotFor：許容を超える最小ロットの強制をしない（0 を返す）・NaN を返さない');
ok(near(TC.breakevenWinRate(2), 1 / 3, 1e-12) && TC.breakevenWinRate(0) === null && TC.breakevenWinRate(NaN) === null, '損益分岐の勝率：RR 2 → 33.3%');

console.log('--- 決済（TradeCore.settleBars：OHLC） ---');
const bar = (o, h, l, c) => ({ o, h, l, c });
const flat = (n) => Array.from({ length: n }, () => bar(150, 150.02, 149.98, 150));
let b1 = flat(3).concat([bar(150, 150.7, 149.95, 150.6)]);
let r = TC.settleBars(b1, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0, entrySlipPips: 0, stopSlipPips: 0 });
ok(r.ok && r.reason === 'tp' && near(r.netPips, 60, 1e-6) && near(r.riskR, 2, 1e-9) && r.exitIndex === 3, '買い・利確：+60pips・+2R');
let b2 = flat(2).concat([bar(150, 150.05, 149.6, 149.65)]);
r = TC.settleBars(b2, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0, entrySlipPips: 0, stopSlipPips: 0 });
ok(r.reason === 'sl' && near(r.netPips, -30, 1e-6) && near(r.riskR, -1, 1e-9) && near(r.maePips, -30, 1e-6), '買い・損切り：−30pips・−1R・MAE −30（損切りの先は数えない）');
r = TC.settleBars(b2.map((x) => ({ o: 300 - x.o, h: 300 - x.l, l: 300 - x.h, c: 300 - x.c })), 0, { side: 'sell', entry: 150, sl: 150.3, tp: 149.4 }, { spreadPips: 0, entrySlipPips: 0, stopSlipPips: 0 });
ok(r.reason === 'sl' && near(r.riskR, -1, 1e-9), '売り・損切り：−1R');
let b3 = flat(1).concat([bar(149.5, 149.55, 149.4, 149.45)]);   // 窓：始値が損切りより下
r = TC.settleBars(b3, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0, entrySlipPips: 0, stopSlipPips: 0.3 });
ok(r.reason === 'sl' && r.gap && near(r.exitPrice, 149.5, 1e-9) && near(r.netPips, -50, 1e-6) && r.riskR < -1, '窓で損切りを飛び越える：始値で約定（−50pips・' + r.riskR + 'R。損切り価格より不利）');
let b4 = flat(1).concat([bar(150, 150.7, 149.6, 150.1)]);   // 同じ足で両方
r = TC.settleBars(b4, 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0, entrySlipPips: 0, stopSlipPips: 0 });
ok(r.reason === 'sl' && r.ambiguous && /順序が分からない/.test(r.assumption) && near(r.mfePips, 60, 1e-6), '同じ足で損切り・利確の両方：先後不明（ambiguous）。損切りが先と仮定');
r = TC.settleBars(flat(20), 0, { side: 'buy', entry: 150, sl: 149.7, tp: 150.6 }, { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3, maxBars: 5 });
ok(r.reason === 'time' && r.exitIndex === 5 && near(r.entryPrice, 150.004, 1e-9) && near(r.costPips, r.grossPips - r.netPips, 1e-6) && r.netPips < r.grossPips, '時間切れ（5本）：スプレッド・スリッページ込みの約定（' + r.entryPrice.toFixed(3) + '）。コスト ' + r.costPips + 'pips');
r = TC.settleBars(flat(5), 0, { side: 'buy', entry: 150, sl: 150.2, tp: 150.6 }); ok(!r.ok && r.reason === 'invalid', '決済の関数も、損切りが逆側の注文を受け付けない');
r = TC.settleBars(flat(5), 0, { side: 'buy', entry: 150, sl: 149.7, tp: 149.9 }); ok(!r.ok && r.reason === 'invalid', '決済の関数も、利確が逆側の注文を受け付けない');

console.log('--- R 倍数と ATR 倍数・MAE と口座の最大DD ---');
const ms = Market.build('mk_trend_up_d2_v0', 12345);
const m1 = Market.settle(ms, { bar: Market.LIVE0, tick: 3, side: 'long' });
ok('riskR' in m1 && 'atrMultiple' in m1 && m1.r === m1.atrMultiple, 'Market.settle：r（旧・損益÷ATR）はそのまま。atrMultiple（同じ値）・riskR を足した');
ok(near(m1.riskR, Math.round(m1.pnl / m1.initialRisk * 100) / 100, 1e-9) && near(m1.initialRiskPips, (m1.entry.price - m1.sl) / ms.pip, 1e-6), 'riskR＝損益÷初期リスク（エントリー〜損切り ' + m1.initialRiskPips.toFixed(1) + 'pips）');
const m2 = Market.settle(ms, { bar: Market.LIVE0, tick: 3, side: 'long' }, { slAtr: 1.5, tpAtr: 2.7 });
ok(Math.abs(m2.riskR - m2.atrMultiple) > 0.05 && near(m2.riskR, Math.round(m2.atrMultiple / 1.5 * 100) / 100, 0.011), '損切り＝ATR×1.5 のとき riskR（' + m2.riskR + '）と atrMultiple（' + m2.atrMultiple + '）は別の値');
ok(isFinite(m1.maePips) && m1.maePips <= 0 && isFinite(m1.mfePips) && m1.mfePips >= 0, 'Market.settle：MAE/MFE（pips）');
const dd = TC.maxDrawdown([100, 110, 99, 105, 88, 120, 119]); ok(near(dd.amount, 22) && near(dd.pct, 20) && dd.peakIndex === 1 && dd.troughIndex === 4, '口座の最大DD：110→88 で 22（20%）');
const td = TC.tradeDrawdown(1000000, 333, -25, 10); ok(td.amount === 8325 && near(td.pct, 0.83, 0.005), '1回の取引中の口座DD：MAE −25pips × 333円/pip ＝ 8,325円（0.83%）。MAE（pips）とは別の値');

console.log('--- 成績の統計（TradeCore.stats） ---');
const H = [{ kind: 'trade', riskR: 2, capitalAfter: 1020000, plannedRR: 2, compliant: true, evidence: ['rci'] }, { kind: 'trade', riskR: -1, capitalAfter: 1010000, plannedRR: 2, compliant: true, evidence: ['rci', 'div'] }, { kind: 'trade', riskR: -1, capitalAfter: 1000000, plannedRR: 1.5, compliant: false }, { kind: 'skip', compliant: true }, { kind: 'wait' }, { kind: 'timeout' }, { kind: 'invalid' }];
const st = TC.stats(H); ok(st.trades === 3 && near(st.winRate, 33.33) && near(st.expectancyR, 0) && near(st.profitFactor, 1) && st.maxLosingStreak === 2 && near(st.avgPlannedRR, 1.83) && st.small, '3取引：勝率33.33%・期待値0R・PF 1・2連敗・平均RR 1.83・サンプル不足の印');
ok(near(st.skipRate, 20) && st.waits === 1 && st.timeouts === 1 && st.invalidOrders === 1 && near(st.complianceRate, 75) && near(st.drawdown.amount, 20000), '見送り率20%（見送り1／取引3＋見送り1＋時間切れ1）・待つ1・時間切れ1・不正注文1（取引に数えない）・遵守率75%・最大DD 20,000円');
ok(st.byEvidence.rci.n === 2 && near(st.byEvidence.rci.avgR, 0.5) && st.byEvidence.div.n === 1, '根拠別の成績（RCI：2回・平均 +0.5R）');
const st0 = TC.stats([]); ok(st0.trades === 0 && st0.winRate === null && st0.expectancyR === null && st0.small, '記録なし：勝率・期待値は「―」（null）');

console.log('--- 詳細の試練（TradeEval）：不正注文・損切りなし・成績 ---');
const scn = Scenarios.build('clear_up', 0); const stF = scn.states[scn.def.focusTF]; const e = stF.close; const base = { analysis: {}, swing: null, reason: 'align', riskPercent: 1, hintLevel: 0 };
const evalOf = (o) => TE.evaluateFull(scn, Object.assign({}, base, o));
let ev = evalOf({ action: 'buy', sl: e + 30 * pip, tp: e + 60 * pip }); ok(ev.invalid && ev.trade === null && ev.score === 0 && /下に置く/.test(ev.summary), '買いで損切りが上：取引にしない（不正注文の解説だけ）');
let stats = TE.emptyStats(); let acc = { capital: 1000000 }; let ap = TE.applyResult(stats, acc, ev, null);
ok(ap.invalid && ap.pnl === 0 && stats.trades === 0 && stats.scoreCount === 0 && acc.capital === 1000000, '不正注文は成績・資金・取引回数に入れない');
ev = evalOf({ action: 'buy', sl: e - 30 * pip, tp: e - 10 * pip }); ok(ev.invalid && ev.invalidOrder.errors[0].code === 'tp_wrong_side', '買いで利確が下：取引にしない');
ev = evalOf({ action: 'sell', sl: e - 30 * pip, tp: e - 60 * pip }); ok(ev.invalid, '売りで損切りが下：取引にしない');
ev = evalOf({ action: 'buy', sl: NaN, tp: e + 60 * pip }); ok(ev.invalid && ev.invalidOrder.errors[0].code === 'sl_nan', '損切りが NaN：取引にしない');
ev = evalOf({ action: 'buy', sl: e, tp: e + 60 * pip }); ok(ev.invalid && ev.invalidOrder.errors[0].code === 'sl_equal', '損切りがエントリーと同じ：取引にしない');
ev = evalOf({ action: 'buy', sl: e - 30 * pip, tp: e + 60 * pip, riskPercent: NaN }); ok(ev.invalid && ev.invalidOrder.errors.some((x) => x.code === 'risk'), '許容損失%が NaN：取引にしない');
ev = evalOf({ action: 'buy', sl: null, tp: e + 60 * pip }); let sim = TE.simulate(scn, ev.trade, 96);
ok(!ev.invalid && ev.trade && ev.trade.noStop && ev.violations.indexOf('損切りなし') >= 0 && typeof sim.worstPips === 'number' && sim.worstPips <= 0, '損切りなし：学習用に受け付ける（違反・0点・含み損の最大 ' + Math.round(sim.worstPips) + 'pips を必ず記録）');
stats = TE.emptyStats(); acc = { capital: 1000000 }; ap = TE.applyResult(stats, acc, ev, sim); ok(stats.trades === 1 && stats.noStopTrades === 1 && isFinite(ap.pnl), '損切りなしの取引は「損切りなし」として別に数える（noStopTrades）');
const good = TE.suggestLevels(scn, 'buy'); ev = evalOf({ action: 'buy', sl: good.sl, tp: good.tp }); sim = TE.simulate(scn, ev.trade, 96);
ok(!ev.invalid && ['tp', 'sl', 'time'].indexOf(sim.outcome) >= 0 && isFinite(sim.mae) && isFinite(sim.mfe) && sim.mae <= 0 && sim.mfe >= 0 && (sim.outcome !== 'sl' || near(sim.riskR, -1, 1e-6)), '正しい注文：決済・MAE/MFE・R（損切りなら −1R）');
ok(sim.outcome !== 'sl' || sim.pips < 0, '損切りで終わった取引の損益はマイナス（逆側の損切りでプラスにならない）');
acc = { capital: 0 }; stats = TE.emptyStats(); ap = TE.applyResult(stats, acc, ev, sim); ok(ap.pnl === 0 && acc.capital === 0 && !isNaN(acc.capital), '資金 0：損益 0（NaN・マイナスにならない）');
sim = TE.simulate(scn, { action: 'buy', entry: e, sl: e + 0.3, tp: e + 0.6, riskPips: -30 }, 96); ok(sim.outcome === 'invalid' && sim.pips === 0, 'TradeEval.simulate だけでも、損切りが逆側の取引を受け付けない（invalid・0pips）');
sim = TE.simulate(scn, { action: 'sell', entry: e, sl: e + 0.3, tp: e + 0.1 }, 96); ok(sim.outcome === 'invalid', 'TradeEval.simulate：売りで利確が上 → invalid');
const fakeBar = { o: e, h: e + 0.7, l: e - 0.4, c: e }; const fake = { def: scn.def, states: { [scn.def.focusTF]: { future: [fakeBar] } } };
sim = TE.simulate(fake, { action: 'buy', entry: e, sl: e - 0.3, tp: e + 0.6, riskPips: 30 }, 1); ok(sim.outcome === 'sl' && sim.ambiguous && /順序が分からない/.test(sim.assumption) && near(sim.riskR, -1, 1e-9), 'TradeEval.simulate：同じ足で両方 → 先後不明の印・損切りが先と仮定');

console.log('--- トレードバトル：MAE と口座の最大DD ---');
globalThis.TradeEval = TE; const TB = (globalThis.window = undefined, require(R + '/js/rpg/tradebattle.js'), globalThis.TradeBattle);
const dz = TB.decide('zeno', scn); const jz = TB.judge(scn, dz);
ok(TB.ITEMS.length === 11 && TB.ITEMS[10] === 'MAE（最大逆行幅）' && TB.rows(jz).length === 11, '比べる表：11 項目。最後の項目は「MAE（最大逆行幅）」（以前は「最大ドローダウン」と書いていた）');
if (jz.ev.trade) ok(jz.sc.accountDD && isFinite(jz.sc.accountDD.pct) && jz.sc.accountDD.pct >= 0 && TB.ddText(jz).indexOf('%') > 0, '口座の最大DD（別の計算・資金に対する%）：' + TB.ddText(jz) + '／MAE ' + Math.round(jz.sc.mae) + 'pips');
const dg = TB.decide('galva', scn); const jg = TB.judge(scn, dg); ok(jg.ev.trade && jg.ev.trade.noStop && jg.sc.overRisk && jg.sc.total <= 40, 'ガルバ（損切りなし）：今までどおり取引になり、過剰なリスクで40点まで');

module.exports = { pass: () => pass, fail: () => fail };
if (require.main === module) { console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exitCode = fail ? 1 : 0; }
