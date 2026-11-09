#!/bin/bash
# v9.1 の回帰テスト一式（既知の NG を「仕様の証拠つきで更新した版」に置き換えて動かす）：bash docs/tools/tl2/regress_v91.sh <ログ> [リポジトリ]
#  ・v8.8 の regress88.sh が ftmenu・layout_menu を更新版に置き換えているのと同じ考え方。元のテストは消さずに残す（元のまま動かすときは regress_tl.sh・tradetests.sh）
#  ・置き換え：tl/tl_ui_test → tl2/updated-tests/tl_ui_test（表示名の変更）、作業用の tradiatest・learntest・ult/dojo_test → tl2/updated-tests の同じ名前（理由：docs/trade-advanced/PHASE0_AUDIT.md）
#  ・動かしている途中にファイルを書き換えるなら、snapshot_regress.sh で写しを作ってから動かす
L=${1:?log}; R=${2:-$(cd "$(dirname "$0")/../../.." && pwd)}; : > $L
[ -f "$R/index.html" ] && [ -f "$R/js/practice.js" ] || { echo "リポジトリではない：$R"; exit 1; }
echo "版 $(cd $R && git rev-parse --short HEAD 2>/dev/null)" >> $L
bash $R/docs/tools/v89/regress89.sh $L.89 >/dev/null 2>&1; echo "##### v8.9 一式" >> $L; cat $L.89 >> $L
echo "##### v9.0 の tl（tl_ui は更新版）" >> $L
cd $R && for c in "tl/tl_p1_test.js" "tl/tl_p2_test.js" "tl/tl_p3_test.js" "tl/tl_p4_test.js" "tl/tl_p5_test.js" "tl/tl_save_test.js" "tl/tl_save_test.js 2d" "tl2/updated-tests/tl_ui_test.js" "tl2/updated-tests/tl_ui_test.js 2d"; do echo "=== $c" >> $L; timeout 1200 node docs/tools/$c 2>&1 | grep -E "^結果|  NG |FAIL" | tail -4 >> $L; done
echo "##### トレード関係（作業用のテスト。tradiatest・learntest・dojo_test は更新版）" >> $L
cd /home/claude/work && for t in tradetest ult/market_test ult/ult_logic_test ult/quiz_test savecompat64 tradeeq; do echo "=== $t" >> $L; RPG_DIR=$R/ timeout 1200 node $t.js 2>&1 | grep -E "結果|errors|ERRORS|CRASH|fails|NG |pass|fail" | tail -4 >> $L; done
for t in tradiatest learntest dojo_test; do echo "=== tl2/updated-tests/$t" >> $L; RPG_DIR=$R/ timeout 1200 node $R/docs/tools/tl2/updated-tests/$t.js 2>&1 | grep -E "結果|errors|ERRORS|CRASH|fails|NG |ALL" | tail -4 >> $L; done
echo "##### v9.1 の新しいテスト" >> $L
cd $R && for c in tl6_test.js tl7_test.js "tl7_ui_test.js" "tl7_ui_test.js 2d" tl8_test.js tl9_test.js "tl9_ui_test.js" "tl9_ui_test.js 2d"; do echo "=== tl2/$c" >> $L; timeout 1800 node docs/tools/tl2/$c 2>&1 | grep -E "^結果|  NG |FAIL" | tail -6 >> $L; done
git -C $R checkout -- docs/ux88/logs/tm88_fairness.json 2>/dev/null
echo done >> $L
