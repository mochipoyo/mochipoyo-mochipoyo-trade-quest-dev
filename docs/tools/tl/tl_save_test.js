// 旧セーブの互換（jsdom）：新しい項目がない古いセーブを読んでも壊れない・既存の値の意味を変えない・2D と 3D のセーブのキーを混ぜない
//   node docs/tools/tl/tl_save_test.js [2d]
const path = require('path'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const two = process.argv[2] === '2d'; const { w, errors } = load(two ? { earth: false, join: false } : {});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const S = w.State; const ls = w.localStorage;
console.log('== 読み込み：' + (two ? '2D 版' : '3D 版と同じ') + '　errors ' + errors.length);
// 2D 版の「既存のセーブ」に見立てたキー（中身は触らないことを確かめる）
const keep2d = JSON.stringify({ marker: 'do-not-touch' }); ls.setItem('mtq-rpg-v2-slot-3', keep2d);
const d0 = S.newGame('もち', 'warrior');
ok(d0.trade.stats.noStopTrades === 0, '新しいゲーム：trade.stats.noStopTrades＝0');
const hasPractice = !!w.PracticeEngine;
if (hasPractice) ok(d0.practice && Array.isArray(d0.practice.history) && d0.practice.capital > 0, '新しいゲーム：実践トレード道場の記録（practice）がある');
// 古いセーブ：v9.0 で足した項目を消し、ほかの値は入れておく
const old = JSON.parse(JSON.stringify(d0)); delete old.trade.stats.noStopTrades; delete old.practice; old.version = 3;
old.trade.stats.trades = 7; old.trade.stats.wins = 4; old.trade.capital = 987654; old.ultimate.stats.sumR = 1.23; old.ultimate.stats.trades = 5; old.gold = 4321;
const m = S.migrate(JSON.parse(JSON.stringify(old)));
ok(m.trade.stats.noStopTrades === 0 && m.trade.stats.trades === 7 && m.trade.stats.wins === 4 && m.trade.capital === 987654, '古いセーブ：noStopTrades を 0 で補い、取引回数・勝ち・資金はそのまま');
ok(m.ultimate.stats.sumR === 1.23 && m.ultimate.stats.trades === 5 && m.gold === 4321, '古いセーブ：必殺技の記録（sumR＝損益÷ATR の合計）・ゴールドはそのまま（意味を変えない）');
if (hasPractice) ok(m.practice && Array.isArray(m.practice.history) && m.practice.history.length === 0 && m.practice.capital === d0.practice.capital, '古いセーブ：実践トレード道場の記録を空の初期値で補う');
// 保存と読み込み
S.data = m; S.save(1); const raw = Object.keys(ls).filter((k) => /slot-1$/.test(k));
ok(raw.length === 1 && raw[0] === S.keyPrefix + '1', 'セーブのキー：' + JSON.stringify(raw) + '（State.keyPrefix の枠だけ。3D 版の mtq-3d-slot-* はビルドした 3D 版のページが決める：ブラウザの確かめ tl_browser.js で見る）');
const back = S.load(1); ok(back && back.trade.stats.noStopTrades === 0 && back.trade.capital === 987654, '保存したセーブを読み込める');
ok(ls.getItem('mtq-rpg-v2-slot-3') === keep2d, '2D 版の別のセーブの中身は変わらない');
ok(!errors.length, '読み込みのエラーなし ' + JSON.stringify(errors.slice(0, 3)));
console.log('結果: ' + pass + ' OK / ' + fail + ' NG');
process.exitCode = fail ? 1 : 0;
