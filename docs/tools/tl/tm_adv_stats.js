// 上級の対戦（TradeDuel90）の相手の強さを、多くの問題で数える（想定で決めない）：node docs/tools/tl/tm_adv_stats.js [問題の数]
//   出力：docs/trading-learning/logs/tm_adv_stats.json（流派ごとの取引率・勝率・期待値R・判断の点、リスクR対戦・規律対戦の勝ち・引き分け・負けの表）
const path = require('path'); const fs = require('fs'); const R = path.resolve(__dirname, '../../..');
globalThis.CONFIG = require(R + '/js/config.js'); globalThis.SignalEngine = require(R + '/js/signals.js'); globalThis.Indicators = require(R + '/js/indicators.js'); globalThis.TradeCore = require(R + '/js/tradecore.js');
globalThis.Scenarios = require(R + '/js/scenarios.js'); globalThis.StrategyProfiles = require(R + '/js/strategy.js'); globalThis.PracticeEngine = require(R + '/js/practice.js'); const S = require(R + '/js/data/practice-seeds.js'); const D9 = require(R + '/js/rpg/tradeduel90.js');
const N = +process.argv[2] || 120; const styles = Object.keys(D9.STYLES);
// 問題：保存した型のシード（学習用・未知）から半分、型を決めていない乱数のシードから半分（型の偏りを減らす）
const pool = [...new Set([].concat(...Object.values(S.learn), ...Object.values(S.exam)))]; const picks = [];
for (let i = 0; i < N / 2; i++) picks.push({ seed: pool[(i * 37) % pool.length], set: 'pool' }); for (let i = 0; i < N / 2; i++) picks.push({ seed: 2000001 + i * 13, set: 'random' });
const t0 = Date.now(); const res = {}; styles.forEach((s) => { res[s] = []; });
const SKILL = +(process.env.SKILL || 1);   // 1＝読み違いなし（戦略そのものの強さ）。トレードマスターの段階の腕前は 0.35〜0.86
picks.forEach((pk) => { styles.forEach((s) => { const r = D9.npcRun({ seed: pk.seed, set: 'learn' }, s, { skill: SKILL, seed: 12345 }); res[s].push({ riskR: r.riskR, process: r.process, kind: r.kind }); }); });
const summary = {}; styles.forEach((s) => { const L = res[s]; const tr = L.filter((x) => x.kind === 'trade'); const st = globalThis.TradeCore.stats(tr.map((x) => ({ kind: 'trade', riskR: x.riskR })));
  summary[s] = { problems: L.length, tradeRate: +(tr.length / L.length * 100).toFixed(1), winRate: st.winRate, expectancyR: st.expectancyR, avgProcess: +(L.reduce((a, x) => a + x.process, 0) / L.length).toFixed(1), skips: L.filter((x) => x.kind === 'skip').length, timeouts: L.filter((x) => x.kind === 'timeout').length }; });
const h2h = {}; ['riskR', 'discipline'].forEach((rule) => { h2h[rule] = {}; styles.forEach((a) => { h2h[rule][a] = {}; styles.forEach((b) => { if (a === b) return; let w = 0, d = 0, l = 0; for (let i = 0; i < picks.length; i++) { const j = D9.judge(rule, res[a][i], res[b][i]); if (j > 0) w++; else if (j < 0) l++; else d++; } h2h[rule][a][b] = { w, d, l }; }); }); });
const extremes = []; ['riskR', 'discipline'].forEach((rule) => styles.forEach((a) => styles.forEach((b) => { if (a === b) return; const x = h2h[rule][a][b]; const dec = x.w + x.l; if (dec >= 10 && (x.w / dec > 0.8)) extremes.push(rule + ':' + a + '>' + b + ' ' + x.w + '-' + x.l); })));
const out = { generated: new Date().toISOString(), problems: N, skill: SKILL, ms: Date.now() - t0, note: '架空の相場での統計。少ない問題数では結果がぶれる。実際の売買の成績を表すものではない', summary, h2h, extremes };
fs.writeFileSync(R + '/docs/trading-learning/logs/tm_adv_stats' + (SKILL === 1 ? '' : '_skill' + SKILL) + '.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(summary)); console.log('extremes', JSON.stringify(extremes)); console.log('ms', out.ms);
