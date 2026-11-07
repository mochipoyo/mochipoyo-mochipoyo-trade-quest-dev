#!/bin/bash
# v8.2 回帰（スナップショット /home/claude/envsnap_a82t2）
export RPG_DIR=/home/claude/envsnap_a82t2/
OUT=/tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/reg82t2
cd /home/claude/work
for t in maptest enemytest assettest tradeeq tradetest growthtest learntest playtest ch5test ch67test ch89test ch1012test ch1316test ch17test skill56 ch18test v57test v58test v59test v60test p1test p2test ptcheck potcheck ftmenu npctest navtest navsim harbortest entryaudit; do
  timeout 1500 node $t.js > $OUT/reg_$t.log 2>&1; echo "EXIT $?" >> $OUT/reg_$t.log
  echo "== $t: $(grep -E 'ERRORS|errors \[|fails' $OUT/reg_$t.log | tail -1 | cut -c1-200) $(tail -1 $OUT/reg_$t.log)" >> $OUT/summary.txt
done
cd /home/claude/envsnap_a82t2
for a in "" 2d; do
  timeout 1500 node docs/tools/v81/remake81_check.js $a > $OUT/remake81_$a.log 2>&1; echo "== remake81 $a: $(tail -2 $OUT/remake81_$a.log | tr '\n' ' ')" >> $OUT/summary.txt
  timeout 1500 node docs/tools/v81/pocket81_check.js $a > $OUT/pocket81_$a.log 2>&1; echo "== pocket81 $a: $(tail -2 $OUT/pocket81_$a.log | tr '\n' ' ')" >> $OUT/summary.txt
  timeout 1500 node docs/tools/v82/route82_test.js $a > $OUT/route82_$a.log 2>&1; echo "== route82 $a: $(grep '確かめ' $OUT/route82_$a.log | head -1)" >> $OUT/summary.txt
  timeout 2400 node docs/tools/v81/town81_test.js rivel_town,sentra_capital,magicka_city,volatilia,aruna_ruins,tradia $a > $OUT/town81_$a.log 2>&1; echo "== town81 $a: NG $(grep -c '^NG' $OUT/town81_$a.log)" >> $OUT/summary.txt
done
FLAGS=palace_open timeout 1500 node docs/tools/v82/route82_test.js walk > $OUT/route82_walk.log 2>&1; echo "== route82 walk: $(grep '歩く確かめ' $OUT/route82_walk.log)" >> $OUT/summary.txt
for a in "" 2d; do
  timeout 1500 node docs/tools/v82/save82_test.js /home/claude/envsnap_a82before $a > $OUT/save82_$a.log 2>&1; echo "== save82 $a: $(tail -1 $OUT/save82_$a.log)" >> $OUT/summary.txt
  timeout 1500 node docs/tools/v82/switch82_test.js $a > $OUT/switch82_$a.log 2>&1; echo "== switch82 $a: $(tail -1 $OUT/switch82_$a.log)" >> $OUT/summary.txt
  FLAGS=palace_open timeout 1500 node docs/tools/v82/route82_test.js $a > $OUT/route82_open_$a.log 2>&1; echo "== route82 palace_open $a: $(grep '確かめ' $OUT/route82_open_$a.log | head -1)" >> $OUT/summary.txt
done
timeout 600 node docs/tools/v82/layout82_check.js > $OUT/layout82_check.log 2>&1; echo "== layout82_check: $(tail -1 $OUT/layout82_check.log)" >> $OUT/summary.txt
echo DONE >> $OUT/summary.txt
