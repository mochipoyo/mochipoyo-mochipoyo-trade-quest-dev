// Phase 2（P1）の確かめ：RCI の状態・±70 到達・4 種類のダイバージェンス（形成中／確定／期限切れ）・未来を使わない・時間足の集約・履歴不足・旧 API との一致
//   node docs/tools/tl/tl_p2_test.js [リポジトリ]
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
const CONFIG = require(R + '/js/config.js'); globalThis.CONFIG = CONFIG;
const SE = require(R + '/js/signals.js'); globalThis.SignalEngine = SE;
const IND = require(R + '/js/indicators.js'); globalThis.Indicators = IND;
const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC;
const Scenarios = require(R + '/js/scenarios.js'); globalThis.Scenarios = Scenarios; require(R + '/js/data/scenarios-extra.js'); require(R + '/js/data/scenario-seeds.js');
const TE = require(R + '/js/trading.js'); globalThis.TradeEval = TE;
const PE = require(R + '/js/practice.js'); globalThis.PracticeEngine = PE;
require(R + '/js/data/market-seeds.js'); const Market = require(R + '/js/rpg/market.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-9);

console.log('--- 指標の値（既知の列） ---');
const closes = [10, 11, 12, 11, 13, 14, 13, 15, 16, 15, 17, 18, 17, 19, 20, 19, 21, 22, 21, 23];
const e3 = IND.ema(closes, 3); ok(e3[1] === null && near(e3[2], 11) && near(e3[3], 11 * 0.5 + 11 * 0.5) && near(e3[4], 13 * 0.5 + e3[3] * 0.5), 'EMA(3)：最初は単純平均、その後は 2/(期間+1) の重み');
const e20 = IND.ema(Array.from({ length: 60 }, (_, i) => 100 + i), 20); ok(e20[18] === null && near(e20[19], 109.5) && near(e20[59], 149.5, 1e-6), 'EMA(20)：直線の値動きでは「20本の平均」から一定の遅れ（期間 20・30・40 は config の値 ' + CONFIG.ema.periods.join('/') + '）');
const r9 = IND.rci(Array.from({ length: 12 }, (_, i) => 100 + i), 9); ok(r9[7] === null && near(r9[8], 100) && near(r9[11], 100), 'RCI(9)：上がり続けると +100');
const r9d = IND.rci(Array.from({ length: 12 }, (_, i) => 100 - i), 9); ok(near(r9d[8], -100), 'RCI(9)：下がり続けると −100（期間 ' + CONFIG.rci.period + '）');
const mc = IND.macd(Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3)), CONFIG.macd.fast, CONFIG.macd.slow, CONFIG.macd.signal);
const ef = IND.ema(Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3)), 6), es = IND.ema(Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 3)), 13);
ok(mc.line[11] === null && near(mc.line[30], ef[30] - es[30]) && mc.signal[14] === null && mc.signal[15] !== null && near(mc.hist[30], mc.line[30] - mc.signal[30]), 'MACD(6,13,4)：ライン＝EMA6−EMA13、シグナル＝ラインの EMA4、ヒストグラム＝差');

console.log('--- RCI の状態（仮設定：最小の戻り ' + SE.RCI_RULES.minTurn.value + '・確認 ' + SE.RCI_RULES.confirmBars.value + '本・有効 ' + SE.RCI_RULES.maxAgeBars.value + '本） ---');
let st = SE.rciState([-93, -78, -65, -80], 3); ok(st.signal === null && st.state === 're_reversed_down' && st.reversal && st.reversal.status === 're_reversed' && st.legacy === 'oversold', '−93→−78→−65→−80：上向きに反転したが、いまは下へ再逆行。新しい上向きの反転ではない（旧 rciState は「売られすぎ圏」）');
st = SE.rciState([-93, -78, -65], 2); ok(st.signal === 'up' && st.state === 'turning_up' && st.reversal.confirmedAt === 1 && st.reversal.ageBars === 1 && st.legacy === 'oversold_reversal', '−93→−78→−65：上向きの反転を確認（1本目で確認・経過1本）');
st = SE.rciState([-93, -78, -65, -68], 3); ok(st.signal === null && st.state === 'turn_up_stalled' && st.delta < 0, '−93→−78→−65→−68：反転のあと下向き（再逆行の手前）。いまは反転のシグナルにしない');
st = SE.rciState([-95, -88, -80, -74], 3); ok(st.signal === 'up' && st.zone === 'oversold' && st.value < -70, '−95→−88→−80→−74：まだ −70 より下でも反転を確認できる（±70 の再通過だけを条件にしない）');
st = SE.rciState([40, 55, 66, 72], 3); ok(st.signal === null && st.zone === 'overbought' && st.state === 'overbought', '+72 に届いただけ：水準（買われすぎ圏）だけで、売りの合図にはしない');
st = SE.rciState([50, 62, 74, 88, 95], 4); ok(st.signal === null && st.state === 'overbought', '+70 を越えて上がり続けている：反転なし');
const old = [-90, -75, -60, -50, -40, -30, -20, -10, 0, 10, 20]; st = SE.rciState(old, 10); ok(st.signal === null && /turn_up_old|neutral/.test(st.state) && st.legacy === 'neutral', '反転から時間がたった（' + (st.reversal ? st.reversal.ageBars + '本' : '範囲外') + '）：古いシグナル（いまの反転としない）');
console.log('--- ダイバージェンス 4 種類（合成した山谷） ---');
const mk = (n, f) => Array.from({ length: n }, (_, i) => f(i));
function div(type) {
  const macd = mk(80, () => 0); const pivs = [];
  if (type === 'regular_bull') { pivs.push({ index: 10, price: 100, type: 'low', confirmedAt: 14 }, { index: 20, price: 99, type: 'low', confirmedAt: 24 }); macd[10] = -0.5; macd[20] = -0.3; }
  if (type === 'hidden_bull') { pivs.push({ index: 10, price: 100, type: 'low', confirmedAt: 14 }, { index: 20, price: 101, type: 'low', confirmedAt: 24 }); macd[10] = -0.3; macd[20] = -0.5; }
  if (type === 'regular_bear') { pivs.push({ index: 10, price: 110, type: 'high', confirmedAt: 14 }, { index: 20, price: 111, type: 'high', confirmedAt: 24 }); macd[10] = 0.5; macd[20] = 0.3; }
  if (type === 'hidden_bear') { pivs.push({ index: 10, price: 111, type: 'high', confirmedAt: 14 }, { index: 20, price: 110, type: 'high', confirmedAt: 24 }); macd[10] = 0.3; macd[20] = 0.5; }
  return { macd, pivs };
}
['regular_bull', 'hidden_bull', 'regular_bear', 'hidden_bear'].forEach((t) => {
  const { macd, pivs } = div(t); const r = SE.divergence({ pivots: pivs, macd, asOf: 26 }); const s = r.signals[0];
  ok(r.signals.length === 1 && s.type === t && s.status === 'confirmed' && s.confirmedAtBar === 24 && s.ageBars === 2 && s.pivotIndices.join() === '10,20' && /→/.test(s.evidence), t + '：別のシグナルとして返す（確定・確定した足 24・経過 2本・根拠「' + s.evidence + '」）');
  const r2 = SE.divergence({ pivots: pivs, macd, asOf: 60 }); ok(r2.signals[0].status === 'expired' && r2.signals[0].ageBars === 36 && !Object.values(r2.flags).some(Boolean), t + '：36本たつと期限切れ（仮設定 ' + SE.DIV_RULES.maxAgeBars.value + '本）。有効の印は付けない');
  const r3 = SE.divergence({ pivots: pivs, macd, asOf: 22 }); ok(r3.signals.length === 0, t + '：2つ目の山谷が確定する前（asOf 22 < 24）はシグナルにしない');
  const r4 = SE.divergence({ pivots: [pivs[0]], forming: [Object.assign({}, pivs[1], { confirmed: false })], macd, asOf: 22 }); ok(r4.signals.length === 0 && r4.forming.length === 1 && r4.forming[0].status === 'forming' && r4.forming[0].type === t, t + '：未確定の山谷との組み合わせは「形成中」（数えない）');
});
ok(/転換の候補/.test(SE.DIV_MEANING.regular_bull) && /継続の候補/.test(SE.DIV_MEANING.hidden_bull) && /必ず/.test(SE.DIV_MEANING.hidden_bull), '通常は転換の「候補」、ヒドゥンは継続の「候補」（必ず成功するサインとはしない）');
{ const { macd, pivs } = div('regular_bull'); const fut = macd.slice(); for (let k = 25; k < fut.length; k++) fut[k] = -5; const a = SE.divergence({ pivots: pivs, macd, asOf: 24 }), b = SE.divergence({ pivots: pivs, macd: fut, asOf: 24 });
  ok(JSON.stringify(a.signals) === JSON.stringify(b.signals) && a.signals.length === 1, '判断の時点（asOf 24）より後の MACD の値を変えても、その時点の判定は同じ');
  const piv2 = pivs.map((p) => Object.assign({}, p, { confirmedAt: p.index + 1 })); const fut2 = macd.slice(); fut2[22] = -0.9; const c = SE.divergence({ pivots: piv2, macd: fut2, asOf: 21 }); ok(c.signals.length === 1 && c.signals[0].macd[1] === -0.3, 'MACD の山谷を探す範囲は、ピボットが確定した足（と判断の時点）を越えない（確定 21 の時点では 22 本目の値を使わない）'); }

console.log('--- 未来を使わない（先頭 N 本の結果は、N＋1 本以降を足しても変わらない） ---');
const g = PE.generate(424242); const S = g.S; let same = 0, tot = 0;
for (let k = 0; k < 6; k++) { const n = S - k * 3 * 7; const a = JSON.stringify(stripSnap(PE.snapshot(g, n, '15m'))); const cut = Object.assign({}, g, { base: g.base.slice(0, n + 1) }); const b = JSON.stringify(stripSnap(PE.snapshot(cut, n, '15m'))); tot++; if (a === b) same++; }
function stripSnap(s) { return s; }
ok(same === tot, '判断の時点の事実（上位足・RCI・ダイバ・確定ピボット）：未来の足を渡しても同じ（' + same + '/' + tot + '）');
const bars15 = SE.confirmed(SE.aggregate(g.base, 15, S)); let pivSame = true;
for (let n = 200; n < bars15.length; n += 37) { const p1 = SE.pivots(bars15, 4, n).confirmed, p2 = SE.pivots(bars15.slice(0, n + 1), 4).confirmed; if (JSON.stringify(p1) !== JSON.stringify(p2)) pivSame = false; }
ok(pivSame, '確定ピボット：asOf の時点の一覧は、後ろの足を足しても同じ（未確定のピボットが後で確定するのは別扱い）');
const macdFull = IND.macd(bars15.map((b) => b.c), 6, 13, 4).line; let divSame = true;
for (let n = 300; n < bars15.length; n += 41) { const pv = SE.pivots(bars15, 4, n); const a = SE.divergence({ pivots: pv.confirmed, macd: macdFull, asOf: n }); const cut = bars15.slice(0, n + 1); const pv2 = SE.pivots(cut, 4); const b = SE.divergence({ pivots: pv2.confirmed, macd: IND.macd(cut.map((x) => x.c), 6, 13, 4).line, asOf: n }); if (JSON.stringify(a.signals) !== JSON.stringify(b.signals)) divSame = false; }
ok(divSame, 'ダイバージェンス：全部の足の MACD を渡しても、asOf までの足だけで計算した結果と同じ');

console.log('--- 時間足の集約（5分足→15分足→4時間足→日足） ---');
const asOf = S - 7; const a15 = SE.aggregate(g.base, 15, asOf), a4h = SE.aggregate(g.base, 240, asOf), a1d = SE.aggregate(g.base, 1440, asOf);
ok(a15.every((b) => b.from % 3 === 0) && a4h.every((b) => b.from % 48 === 0) && a1d.every((b) => b.from % 288 === 0), '区切り：15分足は 5分足 3本、4時間足は 48本、日足は 288本ごと（仮想の 0:00 区切り）');
const ref15 = IND.aggregate(g.base.slice(0, Math.floor((asOf + 1) / 3) * 3), 3); ok(ref15.every((b, i) => b.o === a15[i].o && b.h === a15[i].h && b.l === a15[i].l && b.c === a15[i].c), '15分足の確定足は、旧来の集約（Indicators.aggregate）と同じ OHLC');
const okOhlc = (L) => L.every((b) => { let h = -Infinity, l = Infinity; for (let i = b.from; i <= b.to; i++) { h = Math.max(h, g.base[i].h); l = Math.min(l, g.base[i].l); } return h === b.h && l === b.l && g.base[b.from].o === b.o && g.base[b.to].c === b.c; });
ok(okOhlc(a4h) && okOhlc(a1d), '4時間足・日足：高値＝中の5分足の最高値、安値＝最安値、始値＝最初、終値＝最後');
ok(a4h[a4h.length - 1].partial === ((asOf + 1) % 48 !== 0) && a1d[a1d.length - 1].partial && a4h.slice(0, -1).every((b) => !b.partial), '形成中の足だけ partial（確定足と区別）');
const v4 = PE.view(g, '4h', asOf); ok(v4.forming && v4.candles.length === a4h.length - 1, '表示・事実の指標は確定足だけで計算（形成中の4時間足は別に描く）');
let gs = null; for (let sd = 1; sd < 400 && !gs; sd++) { const x = PE.generate(900000 + sd); if (x.days === 30) gs = x; }
const sn30 = PE.snapshot(gs, gs.S); ok(sn30.htf['1d'].insufficient && /履歴不足/.test(sn30.htf['1d'].msg) && !sn30.htf['4h'].insufficient, '30日分しかない相場：日足は「上位足の履歴不足」（EMA40 の履歴を作らない）・4時間足は判定できる');

console.log('--- 旧 API との一致・設問と採点の時間足 ---');
// 旧 Indicators.divergence（変更前の式）と、共通エンジンを使う今の Indicators.divergence の結果が同じ
function legacyDiv(pivots, macdLine) { const res = { regularBull: false, regularBear: false, hiddenBull: false, hiddenBear: false }; const lows = pivots.filter((p) => p.type === 'low' && p.confirmed), highs = pivots.filter((p) => p.type === 'high' && p.confirmed);
  const nearM = (idx, mode) => { let best = null; for (let k = Math.max(0, idx - 2); k <= Math.min(macdLine.length - 1, idx + 2); k++) { const v = macdLine[k]; if (v === null || v === undefined) continue; if (best === null || (mode === 'min' ? v < best : v > best)) best = v; } return best; };
  if (lows.length >= 2) { const a = lows[lows.length - 2], b = lows[lows.length - 1]; const ma = nearM(a.index, 'min'), mb = nearM(b.index, 'min'); if (ma !== null && mb !== null) { if (b.price < a.price && mb > ma) res.regularBull = true; if (b.price > a.price && mb < ma) res.hiddenBull = true; } }
  if (highs.length >= 2) { const c = highs[highs.length - 2], d = highs[highs.length - 1]; const mc2 = nearM(c.index, 'max'), md = nearM(d.index, 'max'); if (mc2 !== null && md !== null) { if (d.price > c.price && md < mc2) res.regularBear = true; if (d.price < c.price && md > mc2) res.hiddenBear = true; } }
  return res; }
let dsame = 0, dtot = 0, htfFix = 0, multi = 0, multiOk = 0;
Scenarios.ids().forEach((id) => { const n = ((globalThis.SCENARIO_SEEDS || {})[id] || []).length || 6; for (let o = 0; o < Math.min(n, 4); o++) { const s = Scenarios.build(id, o); Object.keys(s.states).forEach((tf) => { const f = s.states[tf]; const L = legacyDiv(f.pivots, f.macd.line); dtot++; if (['regularBull', 'regularBear', 'hiddenBull', 'hiddenBear'].every((k) => L[k] === f.div[k])) dsame++; });
  const t = TE.truth(s); if (t.htfBasis === '1d') htfFix++; if ((t.macdAll || []).length > 1) { multi++; const ev = TE.evaluateFull(s, { action: 'skip', analysis: { macd: t.macdAll[1] } }); if (ev.items.find((x) => /MACD/.test(x.name)).ok) multiOk++; } } });
ok(dsame === dtot, '旧 Indicators.divergence と同じ結果（' + dsame + '/' + dtot + ' の時間足）。比べ方は共通エンジン（SignalEngine.divergence）');
ok(/4時間足/.test(TE.ANALYSIS[0].title) && /日足/.test(TE.ANALYSIS[0].title), '上位足の設問：採点の決まり（4時間足。はっきりしないときは日足）を設問に書く：「' + TE.ANALYSIS[0].title + '」');
ok(multi === multiOk, '高値側と安値側の両方にダイバージェンスがある場面（' + multi + '）：どちらを答えても正解（シナリオの名前で決めない）');
const tB = TE.truth(Scenarios.build('regular_bull', 6)); ok(tB.htfBasis === '1d' && tB.h4 === 'range' && /日足/.test(TE.explainTruth(Scenarios.build('regular_bull', 6), tB, {})), '4時間足がはっきりしない場面：答えは日足で決めたことを解説に書く（regular_bull・データ6）');
ok(!/def\.id/.test(TE.truth.toString().replace(/REASON_OF\[def\.id\]/g, '')), 'ダイバージェンス（ほか分析の答え）の選び方にシナリオ ID を使わない（理由の固定の正解 REASON_OF だけは基礎知識テストとして残す）');
{ const L = Market.list(); let same = 0, n = 0; for (let k = 0; k < L.length; k += 13) { const ms = Market.build(L[k].id, 1000 + k); for (const cut of [Market.LIVE0, Market.LIVE0 + 7]) { const vis = ms.bars.slice(0, cut); const a = Market.assess(vis); const keep = globalThis.SignalEngine; globalThis.SignalEngine = undefined; const b = Market.assess(vis); globalThis.SignalEngine = keep; n++; if (a.div.bull === b.div.bull && a.div.bear === b.div.bear && a.score === b.score && a.bias === b.bias && a.clarity === b.clarity) same++; } }
  ok(same === n, 'Market.assess：共通エンジンを通しても、見立て（div・score・bias・clarity）は以前と同じ（' + same + '/' + n + '）。必殺技の威力・試験の点は変わらない'); }
const asx = Market.assess(Market.build('mk_divergence_d3_v0', 777).bars.slice(0, Market.LIVE0)); ok(Array.isArray(asx.divSignals) && asx.rciInfo && typeof asx.rciInfo.state === 'string', 'Market.assess：共通エンジンの 4 種類のダイバ（divSignals）と RCI の状態（rciInfo）を参考として返す（必殺技の威力の式は変えない）');
const U = (globalThis.window = undefined, (() => { try { globalThis.Market = Market; require(R + '/js/data/ultimates.js'); return require(R + '/js/rpg/ultimates.js'); } catch (e) { return null; } })());
if (U) { const asD = { div: { bull: false, bear: false }, rciTurnUp: true, rciTurnDown: false, order: 0, dow: 0, upperDir: 0, slope40: 0, inRange: false, breakout: 0, chase: false, volRatio: 1, bias: 'none', clarity: 0 };
  ok(!U.reasonMatch('macdDiv', asD, 'long') && U.reasonMatch('rciTurn', asD, 'long'), '必殺技の理由：「MACD のダイバージェンス」は RCI の反転だけでは合わない。RCI の反転は別の理由として選ぶ');
  ok(globalThis.ULT_REASONS.filter((r) => !r.legacy).some((r) => r.key === 'macdDiv') && globalThis.ULT_REASONS.filter((r) => !r.legacy).some((r) => r.key === 'rciTurn') && !globalThis.ULT_REASONS.filter((r) => !r.legacy).some((r) => r.key === 'divergence'), '選択肢：「ダイバージェンス・RCI の反転」を 2 つに分けた（旧い記録の名前は残す）'); }

console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exitCode = fail ? 1 : 0;
