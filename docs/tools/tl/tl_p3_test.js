// Phase 3（P1）の確かめ：戦略プロファイル（確定の基準と仮設定の区別）・エントリーの条件の確認・判断の過程の採点（結果で正誤を決めない）
//   node docs/tools/tl/tl_p3_test.js [リポジトリ]
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
const CONFIG = require(R + '/js/config.js'); globalThis.CONFIG = CONFIG;
const SE = require(R + '/js/signals.js'); globalThis.SignalEngine = SE; globalThis.Indicators = require(R + '/js/indicators.js'); const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC;
globalThis.Scenarios = require(R + '/js/scenarios.js'); const SPF = require(R + '/js/strategy.js'); globalThis.StrategyProfiles = SPF; const PE = require(R + '/js/practice.js'); globalThis.PracticeEngine = PE;
try { require(R + '/js/data/practice-seeds.js'); } catch (e) { }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };

console.log('--- 戦略プロファイル ---');
const M = SPF.PROFILES.mochipoyo.params, G = SPF.PROFILES.general.params;
ok(!M.htfTFs.provisional && !M.entryTFs.provisional && !M.slRequired.provisional && !M.rrMin.provisional && !M.emaAlone.provisional && !M.rciTouchAlone.provisional, 'mochipoyo：共有された基準（時間足・損切り必須・RR の目安・EMA だけ/RCI 到達だけで入らない）は確定の印');
ok(M.requireRci.provisional && M.requireDiv.provisional && M.minEvidence.provisional && M.maxRiskPercent.provisional && M.slBufferPips.provisional && M.htfConflict.provisional && M.chaseAtr.provisional, 'mochipoyo：反転の必須・ダイバの必須・根拠の数・リスク%の上限・損切りの余裕・上位足の食い違い・飛び乗りの距離は「推奨仮設定」');
ok(/公式の機械売買ルールではない/.test(SPF.PROFILES.mochipoyo.note) && /推奨仮設定/.test(SPF.PROFILES.mochipoyo.name), 'プロファイルの名前・説明に「推奨仮設定」「公式の機械売買ルールではない」と書く');
ok(M.htfTFs.value.join() === '1d,4h' && M.entryTFs.value.join() === '15m,5m' && M.rrMin.value === 1.5 && M.rrMax.value === 3, '既知の値だけを初期値に（上位足 日足・4H、エントリー足 15分・5分、RR 1.5〜3）');
ok(!G.requireRci.value && G.evidence.value.indexOf('breakout') >= 0 && G.evidence.value.indexOf('rangeEdge') >= 0 && /押しつけない/.test(SPF.PROFILES.general.note), 'general：RCI の反転を必須にしない・ブレイクやレンジの端も根拠として認める（別のモード）');
let v = SPF.values('mochipoyo', { minEvidence: 3, requireDiv: true, maxRiskPercent: 'x' }); ok(v.minEvidence === 3 && v.requireDiv === true && v.maxRiskPercent === 2, '変更可能：上書きを反映（型の違う値は無視）');
const ds = SPF.describe('mochipoyo', { minEvidence: 3 }); ok(ds.find((x) => x.key === 'minEvidence').changed && ds.filter((x) => x.provisional).length >= 8, '設定の一覧に「仮設定」「変更した」の印');

console.log('--- エントリーの条件の確認（見えている事実だけ） ---');
const prof = SPF.values('mochipoyo');
function snap(o) { o = o || {}; return { htf: { '1d': Object.assign({ dir: 'up', insufficient: false }, o.d1), '4h': Object.assign({ dir: 'up', insufficient: false }, o.h4) },
  entry: Object.assign({ emaOrder: 'up', dow: 'up', rci: SE.rciState([-93, -78, -65], 2), divs: [], distEmaAtr: 0.3, inRange: false, rangePos: 0.5, breakout: null, trendDir: 'up', nearEma: true, swing: { high: 150.5, low: 149.6 }, close: 150, atr: 0.1 }, o.entry) }; }
let ch = SPF.evaluateEntry(snap(), 'buy', prof); ok(ch.met && ch.count === 4 && ch.evidence.find((x) => x.key === 'rci').ok, '上位足・EMA・ダウ・RCI の反転がそろう買い：条件成立（根拠 4）');
ch = SPF.evaluateEntry(snap({ entry: { rci: SE.rciState([40, 55, 66, 72], 3) } }), 'sell', prof); ok(!ch.met && ch.warnings.some((w) => /届いただけ/.test(w)), 'RCI +70 到達だけで売る：条件不成立（「届いただけ」の注意）');
ch = SPF.evaluateEntry(snap({ d1: { dir: 'range' }, h4: { dir: 'range' }, entry: { dow: 'range', rci: SE.rciState([10, 12, 15], 2) } }), 'buy', prof); ok(!ch.met && ch.count === 1 && ch.missing.some((m) => /EMA の並びだけ/.test(m)) && ch.missing.some((m) => /RCI/.test(m)), 'EMA の並びだけ：条件不成立（「EMA の並びだけでは入らない」）');
ch = SPF.evaluateEntry(snap({ d1: { dir: 'down' }, h4: { dir: 'down' } }), 'buy', prof); ok(!ch.met && ch.blockers.some((b) => b.code === 'htf_against'), '上位足が下向きでの買い：mochipoyo では妨げ（仮設定：block）');
const gen = SPF.values('general'); const chg = SPF.evaluateEntry(snap({ d1: { dir: 'down' }, h4: { dir: 'down' } }), 'buy', gen); ok(chg.met && chg.warnings.some((w) => /上位足/.test(w)), '同じ場面でも general では注意だけ（いろいろな手法を不必要に否定しない）');
ch = SPF.evaluateEntry(snap({ d1: { dir: 'up' }, h4: { dir: 'down' } }), 'buy', prof); ok(!ch.met && ch.blockers.some((b) => b.code === 'htf_against' || b.code === 'htf_conflict'), '日足と4時間足が食い違う：条件不成立');
ch = SPF.evaluateEntry(snap({ entry: { distEmaAtr: 3.1 } }), 'buy', prof); ok(!ch.met && ch.blockers.some((b) => b.code === 'chase'), 'EMA20 から ATR の 3.1 倍離れた所の買い：飛び乗りで条件不成立');
ch = SPF.evaluateEntry(snap({ entry: { inRange: true, rangePos: 0.5 } }), 'buy', prof); ok(!ch.met && ch.blockers.some((b) => b.code === 'range_middle'), 'レンジの中ほど：条件不成立');
ch = SPF.evaluateEntry(snap(), 'buy', SPF.values('mochipoyo', { requireDiv: true })); ok(!ch.met && ch.missing.some((m) => /ダイバージェンス/.test(m)), 'ダイバを必須に変えると（仮設定の変更）、ダイバのない場面は不成立');
ch = SPF.evaluateEntry(snap({ d1: { insufficient: true, dir: null } }), 'buy', prof); ok(ch.met && /履歴不足/.test(ch.evidence.find((x) => x.key === 'htf').detail), '日足が履歴不足：4時間足だけで上位足を見る（不足と表示）');
ch = SPF.evaluateEntry(snap({ entry: { rci: SE.rciState([-93, -78, -65, -80], 3) } }), 'buy', prof); ok(!ch.met && !ch.evidence.find((x) => x.key === 'rci').ok, 'RCI が再逆行中：反転の根拠に数えない');
const rng = snap({ d1: { dir: 'range' }, h4: { dir: 'range' }, entry: { emaOrder: 'mixed', dow: 'range', rci: SE.rciState([0, 5, 3], 2), inRange: true, rangePos: 0.5, trendDir: null } });
ok(!SPF.evaluateEntry(rng, 'buy', prof).met && !SPF.evaluateEntry(rng, 'sell', prof).met, 'ルールに当てはまらない相場：買いも売りも不成立（向きを強制しない）');

console.log('--- 判断の過程の採点（結果は別の欄） ---');
const good = snap(); const chGood = SPF.evaluateEntry(good, 'buy', prof); const allClaims = { htf: true, ema: true, dow: true, rci: true, div: false };
const order = (sl, tp, entry) => TC.validateOrder({ side: 'buy', entry: entry || 150, sl, tp, requireSL: true, requireTP: true });
const sz = (rp, rpips) => TC.sizePosition({ capital: 1000000, riskPercent: rp, riskPips: rpips });
const losing = SPF.grade({ profile: prof, facts: good, answers: { '1d': 'up', '4h': 'up' }, viewedHtf: true, claims: allClaims, claimCheck: chGood, outcomeKind: 'trade',
  entry: { side: 'buy', check: chGood, order: order(149.55, 150.9), sizing: sz(1, 45), riskPercent: 1, swing: good.entry.swing, pip: 0.01 }, metAt: [{ label: '開始' }], settle: { ok: true, reason: 'sl', netPips: -45.3, grossPips: -45, costPips: 0.3, riskR: -1.01, maePips: -45, mfePips: 8 }, context: {} });
const bad = snap({ d1: { dir: 'down' }, h4: { dir: 'down' }, entry: { distEmaAtr: 3.2, rci: SE.rciState([10, 30, 50], 2) } }); const chBad = SPF.evaluateEntry(bad, 'buy', prof);
const lucky = SPF.grade({ profile: prof, facts: bad, answers: { '1d': 'up', '4h': 'up' }, viewedHtf: false, claims: { htf: true, ema: true, dow: true, rci: true, div: true }, claimCheck: chBad, outcomeKind: 'trade',
  entry: { side: 'buy', check: chBad, order: order(149.8, 150.2), sizing: sz(5, 20), riskPercent: 5, swing: bad.entry.swing, pip: 0.01 }, metAt: [], settle: { ok: true, reason: 'tp', netPips: 60, grossPips: 60.5, costPips: 0.5, riskR: 3, maePips: -2, mfePips: 60 }, context: {} });
ok(losing.process > lucky.process + 30, '根拠どおりで損切りになった取引（' + losing.process + '点）は、根拠の薄い利確の取引（' + lucky.process + '点）より判断の点が高い');
ok(losing.result.riskR === -1.01 && lucky.result.riskR === 3 && /判断の点には入れていない/.test(losing.result.note), '結果（R・pips・MAE/MFE）は別の欄。判断の点には入れない');
ok(lucky.violations.indexOf('飛び乗りエントリー') >= 0 && lucky.violations.indexOf('上位足に逆らったエントリー') >= 0 && lucky.violations.indexOf('ロット過大（許容損失の上限超え）') >= 0 && losing.compliant && !lucky.compliant, '規律の違反を記録（飛び乗り・上位足に逆らう・ロット過大）。根拠どおりの取引は「遵守」');
ok(lucky.items.find((x) => x.name === '上位足のチャートを確認').got === 0, '上位足のチャートを開かずに判断：環境認識の項目で分ける');
const waitNo = SPF.grade({ profile: prof, facts: rng, answers: { '1d': 'range', '4h': 'range' }, viewedHtf: true, outcomeKind: 'skip', metAt: [] });
const skipMet = SPF.grade({ profile: prof, facts: good, answers: { '1d': 'up', '4h': 'up' }, viewedHtf: true, outcomeKind: 'skip', metAt: [{ label: '3本目（買い）' }] });
const toNo = SPF.grade({ profile: prof, facts: rng, answers: { '1d': 'range', '4h': 'range' }, viewedHtf: true, outcomeKind: 'timeout', metAt: [] });
const toMet = SPF.grade({ profile: prof, facts: good, answers: { '1d': 'up', '4h': 'up' }, viewedHtf: true, outcomeKind: 'timeout', metAt: [{ label: '5本目（買い）' }] });
const trig = (g) => g.items.find((x) => x.cat === 'trigger');
ok(trig(waitNo).got === 20 && /正しい判断/.test(trig(waitNo).note), '条件がそろわないまま見送り：トリガーの点は満点（「待つ」「見送る」も正答）');
ok(trig(skipMet).got === 14 && /誤りではない/.test(trig(skipMet).note), '条件がそろった足があったのに見送り：誤りとはしない（14/20・別の合理的な判断として説明）');
ok(trig(toNo).got === 16 && trig(toMet).got === 8 && /時間切れ/.test(trig(toNo).name), '無判断の時間切れは、自分で決めた見送りと区別（16・8 点）');
ok(waitNo.process === 100 && !waitNo.result, '根拠がそろわない相場で、環境を正しく読み、待って見送った：100点（取引なし）');
const rev = SPF.grade({ profile: prof, facts: good, answers: { '1d': 'up', '4h': 'up' }, viewedHtf: true, claims: allClaims, claimCheck: chGood, outcomeKind: 'trade', entry: { side: 'buy', check: chGood, order: order(149.55, 150.9), sizing: sz(2, 45), riskPercent: 2, swing: good.entry.swing, pip: 0.01 }, metAt: [{}], settle: losing.result && { ok: true, reason: 'tp', netPips: 90, riskR: 2 }, context: { prevLoss: true, prevRiskPercent: 1 } });
ok(rev.violations.indexOf('負けの直後のロット増加') >= 0 && rev.items.find((x) => x.cat === 'discipline').got === 12, '負けの直後にリスクを 1%→2% に増やす：規律の減点（取り返そうとする行動）');
const wrongClaims = SPF.grade({ profile: prof, facts: good, answers: { '1d': 'up', '4h': 'up' }, viewedHtf: true, claims: { htf: true, ema: true, dow: true, rci: true, div: true }, claimCheck: chGood, outcomeKind: 'skip', metAt: [{}] });
ok(wrongClaims.items.find((x) => x.cat === 'setup').got === 16 && /ない/.test(wrongClaims.items.find((x) => x.cat === 'setup').note), 'ないダイバージェンスを「ある」と選ぶ：セットアップの減点（根拠の矛盾）');

console.log('--- 実際の問題で通す（PracticeEngine） ---');
const seeds = globalThis.PRACTICE_SEEDS; ok(!!seeds && Object.keys(seeds.learn).length === 12, '問題の型 12 カテゴリーのシードがある');
if (seeds) { const sd = seeds.learn.similar[0]; const play = PE.start({ seed: sd, cat: 'similar', set: 'learn' }, { level: 6 }); PE.markStart(play, prof); play.viewed['1d'] = play.viewed['4h'] = true; play.answers = { '1d': 'up', '4h': 'up' };
  for (let i = 0; i < 3; i++) PE.advance(play, prof); PE.wait(play); PE.skip(play, { htf: true }); const gr = PE.grade(play, {}, prof); const rec = PE.record(play, gr, 1000000);
  ok(gr.kind === 'skip' && rec.kind === 'skip' && rec.riskR === null && rec.waits === 1 && rec.steps === 3 && typeof rec.process === 'number' && JSON.parse(JSON.stringify(rec)).seed === sd, '見送りで終えた問題：記録（取引なし・待つ 1・足送り 3 本）');
  const p2 = PE.start({ seed: sd, cat: 'similar', set: 'learn' }, { level: 6 }); PE.markStart(p2, prof); const sn = PE.snap(p2); const side = ['buy', 'sell'].find((s) => SPF.evaluateEntry(sn, s, prof).met) || 'buy';
  const ref = side === 'buy' ? sn.entry.swing.low : sn.entry.swing.high; const sl = side === 'buy' ? ref - 0.04 : ref + 0.04; const risk = Math.abs(sn.entry.close - sl); const tp = side === 'buy' ? sn.entry.close + 2 * risk : sn.entry.close - 2 * risk;
  const pvBad = PE.preview(p2, { side, sl: tp, tp: sl, riskPercent: 1 }, 1000000, prof); ok(!pvBad.ok && pvBad.errors.length >= 1, 'プレビュー：損切りと利確を逆に入れると発注できない（' + pvBad.errors[0] + '）');
  const pv = PE.preview(p2, { side, sl, tp, riskPercent: 1 }, 1000000, prof); ok(pv.ok && pv.maxLoss <= 10000 && pv.rr > 1.9 && pv.breakeven > 0.3, 'プレビュー：予想最大損失 ' + Math.round(pv.maxLoss) + '円（許容 10,000円以内）・RR 1:' + pv.rr.toFixed(2) + '・損益分岐の勝率 ' + (pv.breakeven * 100).toFixed(1) + '%');
  const en = PE.enter(p2, { side, sl, tp, riskPercent: 1 }, 1000000, { htf: true, rci: true }, prof); ok(en.ok && p2.phase === 'holding' && p2.settle.ok, '発注：保有中になり、決済は共通の決済（TradeCore.settleBars）');
  let guard = 0; while (p2.phase === 'holding' && guard++ < 500) PE.holdStep(p2); ok(p2.phase === 'closed' && p2.asOf === p2.entry.exitAsOf, '保有中の足送り：当初の損切り・利確のまま決済の足まで進む');
  const g2 = PE.grade(p2, {}, prof); const r2 = PE.record(p2, g2, 1000000); ok(g2.kind === 'trade' && isFinite(r2.riskR) && isFinite(r2.pnl) && r2.capitalAfter === 1000000 + r2.pnl && g2.result && g2.result.note, '取引の記録：riskR ' + r2.riskR + '・損益 ' + r2.pnl + '円・MAE ' + r2.mae + '・MFE ' + r2.mfe + '（判断 ' + g2.process + '点）');
  const st = TC.stats([rec, r2]); ok(st.trades === 1 && st.small && st.waits === 1 && st.skips === 1, '成績の統計：取引 1・見送り 1・待つ 1・サンプル不足の印'); }

console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exitCode = fail ? 1 : 0;
