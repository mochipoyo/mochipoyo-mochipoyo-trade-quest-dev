// Phase 5 の確かめ：上級の対戦（リスクR対戦・規律対戦）・相手の戦略は判断の時点の足だけ・pips 対戦と賞金の決まりは変えない・成績の統計
//   node docs/tools/tl/tl_p5_test.js [リポジトリ]
const path = require('path'); const fs = require('fs'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
globalThis.CONFIG = require(R + '/js/config.js'); globalThis.SignalEngine = require(R + '/js/signals.js'); globalThis.Indicators = require(R + '/js/indicators.js'); const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC;
globalThis.Scenarios = require(R + '/js/scenarios.js'); globalThis.StrategyProfiles = require(R + '/js/strategy.js'); const PE = require(R + '/js/practice.js'); globalThis.PracticeEngine = PE; const S = require(R + '/js/data/practice-seeds.js'); const D9 = require(R + '/js/rpg/tradeduel90.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const styles = Object.keys(D9.STYLES); ok(['trend', 'contra', 'break', 'momentum', 'all'].every((s) => styles.indexOf(s) >= 0), '流派ごとの戦略（トレードマスターの 5 流派：順張り・逆張り・ブレイク・勢い・万能）');
// 相手の判断は判断の時点の足だけ：同じ asOf の事実なら、未来の足を消しても同じ判断
const sd = S.learn.similar[2]; const g = PE.generate(sd); let same = 0, n = 0;
for (let k = 0; k < 8; k++) { const asOf = g.S + k * 3; const full = PE.snapshot(g, asOf, '15m'); const cut = PE.snapshot(Object.assign({}, g, { base: g.base.slice(0, asOf + 1) }), asOf, '15m'); full.pip0 = cut.pip0 = g.pip;
  styles.forEach((s) => { n++; if (JSON.stringify(D9.STYLES[s](full, globalThis.StrategyProfiles.values('mochipoyo'))) === JSON.stringify(D9.STYLES[s](cut, globalThis.StrategyProfiles.values('mochipoyo')))) same++; }); }
ok(same === n, '相手の判断：未来の足を渡しても渡さなくても同じ（' + same + '/' + n + '）');
const a = D9.npcRun({ seed: sd, set: 'learn' }, 'all'), b = D9.npcRun({ seed: sd, set: 'learn' }, 'all'); ok(JSON.stringify(a.record.riskR) === JSON.stringify(b.record.riskR) && a.process === b.process, '同じ問題・同じ相手なら同じ結果（腕前の読み違いも問題と相手のシードで決まる）');
ok(['trade', 'skip'].indexOf(a.kind) >= 0 && typeof a.riskR === 'number' && a.process >= 0 && a.process <= 100, '相手の結果：取引か見送り・R（見送りは 0R）・判断の点');
ok(D9.judge('riskR', { riskR: 1.2 }, { riskR: 1.0 }) === 1 && D9.judge('riskR', { riskR: null }, { riskR: -1 }) === 1 && D9.judge('riskR', { riskR: 0.05 }, { riskR: 0 }) === 0, 'リスクR対戦：R の差 0.1 以上で勝ち（見送りは 0R・差が小さければ引き分け）');
ok(D9.judge('discipline', { process: 80 }, { process: 90 }) === -1 && D9.judge('discipline', { process: 88 }, { process: 90 }) === 0, '規律対戦：判断の点の差 3 点以上で勝ち負け');
const src = fs.readFileSync(R + '/js/rpg/tradeduel90.js', 'utf8'); ok(!/d\.gold|gold\s*=|prize/.test(src.replace(/賞金/g, '')), '上級の対戦は賞金を出さない（記録だけ。pips 対戦の賞金とは別の決まり）');
const tm = fs.readFileSync(R + '/js/rpg/trademaster83.js', 'utf8'); ok(/COOL_STEPS: 400/.test(tm) && /var PRIZE = \[0, 60, 150, 320, 600, 1000\]/.test(tm) && /TM\.judge = function \(me, op\) \{ var a = pipsOf\(me\), b = pipsOf\(op\); return a - b >= 0\.1/.test(tm), 'pips 対戦の勝敗・賞金・400歩の決まりは今までどおり');
ok(/TradeDuel90/.test(tm), 'トレードマスターの会話から上級の対戦を選べる');
const st = fs.existsSync(R + '/docs/trading-learning/logs/tm_adv_stats.json') ? JSON.parse(fs.readFileSync(R + '/docs/trading-learning/logs/tm_adv_stats.json', 'utf8')) : null;
ok(st && st.problems >= 100 && styles.every((s) => st.summary[s] && isFinite(st.summary[s].avgProcess)), '相手の強さは多くの問題で数えた記録がある（' + (st ? st.problems : 0) + '問×' + styles.length + '流派。docs/trading-learning/logs/tm_adv_stats.json）');
console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exitCode = fail ? 1 : 0;
