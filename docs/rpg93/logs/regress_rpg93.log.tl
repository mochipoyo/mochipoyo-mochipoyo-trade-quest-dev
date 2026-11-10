=== tl/tl_p1_test.js
結果: 64 OK / 0 NG
=== tl/tl_p2_test.js
--- 未来を使わない（先頭 N 本の結果は、N＋1 本以降を足しても変わらない） ---
  OK  ダイバージェンス：全部の足の MACD を渡しても、asOf までの足だけで計算した結果と同じ
  OK  旧 Indicators.divergence と同じ結果（680/680 の時間足）。比べ方は共通エンジン（SignalEngine.divergence）
結果: 49 OK / 0 NG
=== tl/tl_p3_test.js
--- 判断の過程の採点（結果は別の欄） ---
  OK  結果（R・pips・MAE/MFE）は別の欄。判断の点には入れない
結果: 37 OK / 0 NG
=== tl/tl_p4_test.js
結果: 9 OK / 0 NG
=== tl/tl_p5_test.js
  OK  同じ問題・同じ相手なら同じ結果（腕前の読み違いも問題と相手のシードで決まる）
  OK  相手の結果：取引か見送り・R（見送りは 0R）・判断の点
結果: 10 OK / 0 NG
=== tl/tl_save_test.js
結果: 9 OK / 0 NG
=== tl/tl_save_test.js 2d
結果: 9 OK / 0 NG
=== tl/tl_ui_test.js
  NG  損切り（確定した安値の外側）・利確（RR 1:2）：予想最大損失・RR・損益分岐の勝率を出す
  OK  決済まで進む → G 振り返り（判断の過程の点と、結果は別の欄）
  OK  心理の結果は医療的な診断として扱わないと書く
結果: 38 OK / 1 NG
=== tl/tl_ui_test.js 2d
  NG  損切り（確定した安値の外側）・利確（RR 1:2）：予想最大損失・RR・損益分岐の勝率を出す
  OK  決済まで進む → G 振り返り（判断の過程の点と、結果は別の欄）
  OK  心理の結果は医療的な診断として扱わないと書く
結果: 38 OK / 1 NG
