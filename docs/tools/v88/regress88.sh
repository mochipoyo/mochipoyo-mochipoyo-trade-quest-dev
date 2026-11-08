#!/bin/bash
# v8.8 回帰テスト一式：bash regress88.sh <ログ>（作業用フォルダ /home/claude/work のテストは RPG_DIR で、このリポジトリを読む）
L=${1:-/home/claude/envwork/docs/ux88/logs/regress.log}; : > $L
R=/home/claude/envwork
cd /home/claude/work && for t in maptest navtest harbortest ch17test ch67test ch1012test $R/docs/tools/v88/updated-tests/ftmenu; do echo "=== $t" >> $L; RPG_DIR=$R/ timeout 900 node $t.js 2>&1 | grep -E "結果|errors|ERRORS|CRASH|fails|NG " | tail -4 >> $L; done
cd $R/docs/tools && for c in "v88/ui88_test.js" "v88/ui88_test.js 2d" "v87/rewards87_test.js" "v87/rewards87_test.js 2d" "v87/effects87_test.js" "v86/airship86_test.js" "v86/airship86_test.js 2d" "v79/carriage79_test.js" "v83/academy83_test.js" "v83/tm83_duel_logic.js" "v88/chart88_test.js" "v88/chart88_test.js 2d" $EXTRA; do echo "=== $c" >> $L; timeout 900 node $c 2>&1 | grep -E "結果|NG |FAIL|すべて|合格|OK:|errors" | tail -3 >> $L; done
echo "=== v88/updated-tests/layout_menu_test.js" >> $L; RPG_DIR=$R/ timeout 600 node $R/docs/tools/v88/updated-tests/layout_menu_test.js 2>&1 | tail -2 >> $L
echo done >> $L
