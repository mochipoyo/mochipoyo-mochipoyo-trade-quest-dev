#!/bin/bash
# トレード関係のテスト（作業用 /home/claude/work のテストを RPG_DIR でこのリポジトリに向ける）
L=${1:?log}; : > $L; R=/home/claude/envwork
cd /home/claude/work && for t in tradetest tradiatest ult/market_test ult/ult_logic_test ult/dojo_test ult/quiz_test learntest savecompat64 tradeeq; do echo "=== $t" >> $L; RPG_DIR=$R/ timeout 1200 node $t.js > $L.tmp 2>&1; echo "exit $?" >> $L; grep -E "結果|errors|ERRORS|CRASH|fails|NG |pass|fail|OK" $L.tmp | tail -6 >> $L; done
rm -f $L.tmp; echo done >> $L
