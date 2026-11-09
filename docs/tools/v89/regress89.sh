#!/bin/bash
# v8.9 回帰テスト一式：bash regress89.sh <ログ>（v8.8 の一式 regress88.sh ＋ v8.9 で触った処理の確かめ）
#   ※ 動かす前に、このファイルを作業用の場所へ写してから動かす（動かしている途中でファイルを書き換えると、bash が途中から読み違える）
L=${1:-/home/claude/envwork/docs/perf89/logs/regress89.log}; : > $L
R=/home/claude/envwork
bash $R/docs/tools/v88/regress88.sh $L.88 >/dev/null 2>&1
cat $L.88 >> $L
cd $R/docs/tools && for c in "v88/route88_test.js" "v88/route88_test.js 2d" "v88/tm88_test.js" "v89/logic89_test.js" "v89/logic89_test.js 2d" "v81/dow_open_test.js" "v81/dow_open_test.js 2d" "v79/earth79_check.js"; do echo "=== $c" >> $L; timeout 900 node $c 2>&1 | grep -E "結果|NG |FAIL|すべて|合格|OK:|errors" | tail -3 >> $L; done
echo "=== v89/smooth89_test.mjs" >> $L; (cd $R/docs/tools/v89 && timeout 120 node smooth89_test.mjs 2>&1 | tail -1) >> $L
cd /home/claude/work && for t in navsim ult/quiz_place_test; do echo "=== $t" >> $L; RPG_DIR=$R/ timeout 900 node $t.js 2>&1 | grep -E "結果|errors|ERRORS|CRASH|fails|NG |pass|fail" | tail -4 >> $L; done
echo done >> $L
