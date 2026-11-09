#!/bin/bash
# トレード学習（v9.0）の確かめ一式：bash regress_tl.sh <ログ>（動かす前に作業用の場所へ写してから動かす）
L=${1:?log}; : > $L; R=/home/claude/envwork
cd $R && for c in "tl_p1_test.js" "tl_p2_test.js" "tl_p3_test.js" "tl_p4_test.js" "tl_p5_test.js" "tl_save_test.js" "tl_save_test.js 2d" "tl_ui_test.js" "tl_ui_test.js 2d"; do echo "=== tl/$c" >> $L; timeout 1200 node docs/tools/tl/$c 2>&1 | grep -E "結果|NG |FAIL" | tail -4 >> $L; done
bash $R/docs/tools/tl/tradetests.sh $L.trade >/dev/null 2>&1; cat $L.trade >> $L
cd $R/docs/tools && for c in "v88/ui88_test.js" "v88/ui88_test.js 2d" "v88/chart88_test.js" "v88/chart88_test.js 2d" "v88/tm88_test.js" "v83/tm83_duel_logic.js" "v83/academy83_test.js"; do echo "=== $c" >> $L; timeout 900 node $c 2>&1 | grep -E "結果|NG |FAIL|すべて|合格|OK:|errors" | tail -3 >> $L; done
cd /home/claude/work && for t in $R/docs/tools/v88/updated-tests/ftmenu; do echo "=== $t" >> $L; RPG_DIR=$R/ timeout 900 node $t.js 2>&1 | grep -E "結果|errors|ERRORS|CRASH|fails|NG " | tail -4 >> $L; done
echo "=== v88/updated-tests/layout_menu_test.js" >> $L; RPG_DIR=$R/ timeout 600 node $R/docs/tools/v88/updated-tests/layout_menu_test.js 2>&1 | tail -2 >> $L
echo done >> $L
