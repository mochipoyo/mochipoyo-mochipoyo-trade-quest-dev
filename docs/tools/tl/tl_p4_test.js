// Phase 4 の確かめ：問題の型（12 カテゴリー）とシード（学習用と未知の問題を分ける・答えの漏れがない）・レベルの割り当て
//   node docs/tools/tl/tl_p4_test.js [リポジトリ]
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
globalThis.CONFIG = require(R + '/js/config.js'); globalThis.SignalEngine = require(R + '/js/signals.js'); globalThis.Indicators = require(R + '/js/indicators.js'); globalThis.TradeCore = require(R + '/js/tradecore.js');
globalThis.Scenarios = require(R + '/js/scenarios.js'); globalThis.StrategyProfiles = require(R + '/js/strategy.js'); const PE = require(R + '/js/practice.js'); const S = require(R + '/js/data/practice-seeds.js');
const fs = require('fs'); let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const cats = PE.CATEGORIES.map((c) => c.id);
ok(cats.length === 12 && ['early', 'ema_no_rci', 'rci_touch', 'rci_rereversal', 'regdiv_vs_htf', 'hidden_aligned', 'reg_vs_hidden', 'unconfirmed_pivot', 'stale_div', 'wide_stop', 'spike', 'similar'].every((k) => cats.indexOf(k) >= 0), '問題の型 12 カテゴリー（指示書の 1〜12）');
ok(cats.every((k) => (S.learn[k] || []).length >= 10 && (S.exam[k] || []).length >= 10), 'どの型も学習用・未知の問題のシードが 10 以上');
const L = new Set([].concat(...cats.map((k) => S.learn[k]))), X = new Set([].concat(...cats.map((k) => S.exam[k])));
ok([...L].every((s) => s < 1000000) && [...X].every((s) => s > 1000000) && [...L].every((s) => !X.has(s)), '学習用（' + L.size + '）と未知の問題（' + X.size + '）のシードは別の範囲で重ならない（学習で見たチャートは未知の問題に出ない）');
let same = 0, tot = 0, bad = [];
cats.forEach((k) => { ['learn', 'exam'].forEach((set) => { S[set][k].slice(0, 4).forEach((sd) => { const g = PE.generate(sd); const sn = PE.snapshot(g, g.S); sn.pip0 = g.pip; tot++; if (PE.classify(sn).indexOf(k) >= 0) same++; else bad.push(k + ':' + sd); }); }); });
ok(same === tot, '保存したシードは、いまの判定でも同じ型になる（' + same + '/' + tot + '）' + (bad.length ? ' ' + bad.join(',') : ''));
const ui = fs.readFileSync(R + '/js/ui/practiceui.js', 'utf8'); const lv = eval('(' + ui.match(/PUI\.LEVELS = (\[[\s\S]*?\]);/)[1] + ')');
ok(lv.length === 8 && lv[7].set === 'exam' && lv[7].series === 30 && lv.slice(0, 7).every((x) => x.set === 'learn'), 'Lv1〜Lv7 は学習用、Lv8 は未知の問題の 30 問の連続演習');
ok(cats.every((k) => lv.slice(0, 7).some((x) => x.cats.indexOf(k) >= 0)), '12 カテゴリーはどれも Lv1〜Lv7 のどこかで出る');
ok(!/cat\.title|catName/.test(ui.slice(ui.indexOf('PUI.play = '), ui.indexOf('PUI.review = '))), '問題の画面（PUI.play）では型の名前を表示しない（振り返り PUI.review だけで出す）');
// 同じ seed なら同じチャート・違う seed なら違うチャート（丸暗記させない変種）
const a = PE.generate(S.learn.early[0]), b = PE.generate(S.learn.early[1]); ok(a.base[a.S].c !== b.base[b.S].c && JSON.stringify(PE.generate(S.learn.early[0]).base.slice(-3)) === JSON.stringify(a.base.slice(-3)), '同じ型でもシードごとに値動きが違う（同じシードなら同じ）');
const famCount = {}; cats.forEach((k) => S.learn[k].forEach((sd) => { const f = PE.generate(sd).fam; famCount[k + ':' + f] = 1; })); const perCat = cats.map((k) => Object.keys(famCount).filter((x) => x.indexOf(k + ':') === 0).length);
ok(perCat.filter((n) => n >= 2).length >= 9, '多くの型は、いくつかの違う形（相場の作り方）から出る：' + cats.map((k, i) => k + ' ' + perCat[i]).join('・'));
console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exitCode = fail ? 1 : 0;
