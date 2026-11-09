// もちぽよ実践トレード道場：問題のシードを作る（node docs/tools/tl/make_practice_seeds.js）→ js/data/practice-seeds.js
//   ・学習用（learn）は 1 から、未知の問題（exam）は 1,000,001 から、別々の範囲を調べる（重ならない）
//   ・型（カテゴリー）は判断の開始の時点の状況（PracticeEngine.classify）だけで決める
//   ・「似た見た目でも結果が分かれる」（similar）だけは、問題の偏りをなくすため、決まった注文（確定した安値・高値の外側＋3pips・RR 1:2）の結果（利確・損切り・時間切れ）が
//     そろうように選ぶ（結果はプレイヤーに見せない。採点にも使わない）
const path = require('path'); const fs = require('fs'); const R = path.resolve(__dirname, '../../..');
globalThis.CONFIG = require(R + '/js/config.js'); globalThis.SignalEngine = require(R + '/js/signals.js'); globalThis.Indicators = require(R + '/js/indicators.js'); globalThis.TradeCore = require(R + '/js/tradecore.js');
globalThis.Scenarios = require(R + '/js/scenarios.js'); globalThis.StrategyProfiles = require(R + '/js/strategy.js'); const PE = require(R + '/js/practice.js'); const SE = globalThis.SignalEngine, TC = globalThis.TradeCore;
const QUOTA = { learn: 16, exam: 10 }; const MAX = 7000; const out = { v: 1, generated: new Date().toISOString().slice(0, 10), learn: {}, exam: {}, scanned: {}, note: '問題の型ごとのシード。型の名前は振り返りまで画面に出さない。learn と exam は別の範囲' };
function outcomeOf(g, sn) {
  const e = sn.entry; const side = PE.CATEGORIES && ['buy', 'sell'].find((s) => globalThis.StrategyProfiles.evaluateEntry(sn, s).met); if (!side) return null;
  const ref = side === 'buy' ? e.swing.low : e.swing.high; if (ref === null) return null; const sl = side === 'buy' ? ref - 0.03 : ref + 0.03; const risk = Math.abs(e.close - sl); const tp = side === 'buy' ? e.close + 2 * risk : e.close - 2 * risk;
  const bars = SE.confirmed(SE.aggregate(g.base, PE.tfMin(g.entryTF), g.base.length - 1)); const ei = bars.findIndex((b) => b.to === g.S); if (ei < 0) return null;
  const st = TC.settleBars(bars, ei, { side, entry: e.close, sl, tp }, { maxBars: PE.HOLD_MAX }); return st.ok ? st.reason : null;
}
for (const set of ['learn', 'exam']) {
  const base = set === 'learn' ? 1 : 1000001; const lists = {}; PE.CATEGORIES.forEach((c) => { lists[c.id] = []; }); const simBy = { tp: 0, sl: 0, time: 0, end: 0 };
  let n = 0; const t0 = Date.now();
  for (let k = 0; k < MAX; k++) {
    const seed = base + k; const g = PE.generate(seed); const sn = PE.snapshot(g, g.S); sn.pip0 = g.pip; const cats = PE.classify(sn); n++;
    cats.forEach((c) => { const L = lists[c]; if (L.length >= QUOTA[set]) return; if (c === 'similar') { const o = outcomeOf(g, sn); if (!o) return; const cap = Math.ceil(QUOTA[set] / 3); if ((simBy[o] || 0) >= cap) return; simBy[o] = (simBy[o] || 0) + 1; } L.push(seed); });
    if (PE.CATEGORIES.every((c) => lists[c.id].length >= QUOTA[set])) break;
  }
  out[set] = lists; out.scanned[set] = { from: base, count: n, ms: Date.now() - t0, similarOutcomes: simBy };
  console.log(set, n, JSON.stringify(Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, v.length]))), JSON.stringify(simBy));
}
const js = '/* もちぽよ実践トレード道場の問題のシード（docs/tools/tl/make_practice_seeds.js で作る。手で書き換えない）\n   ・learn：学習用（1〜）。exam：未知の問題（1000001〜）。範囲が重ならないので、学習で見たチャートは未知の問題に出ない\n   ・型の名前（キー）は振り返りまで画面に出さない */\n(function (root) { root.PRACTICE_SEEDS = ' + JSON.stringify(out) + '; if (typeof module !== \'undefined\' && module.exports) module.exports = root.PRACTICE_SEEDS; })(typeof window !== \'undefined\' ? window : globalThis);\n';
fs.writeFileSync(R + '/js/data/practice-seeds.js', js); console.log('wrote js/data/practice-seeds.js', js.length, 'bytes');
