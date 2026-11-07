#!/bin/bash
# v8.2 回帰の残り（最終のスナップショット /home/claude/envsnap_a82t4）と、前の版との比べ
OUT=/tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/reg82t3
T3=/home/claude/envsnap_a82t4
cd /home/claude/work
for t in ch18test navsim entryaudit ch1316test; do RPG_DIR=$T3/ timeout 1500 node $t.js > $OUT/reg_$t.log 2>&1; echo "EXIT $?" >> $OUT/reg_$t.log; echo "== $t (t3): $(grep -E 'ERRORS|FAILS|RESULT' $OUT/reg_$t.log | tail -1 | cut -c1-160) $(tail -1 $OUT/reg_$t.log)" >> $OUT/summary.txt; done
for t in ch18test navsim entryaudit; do RPG_DIR=/home/claude/envsnap_a82before/ timeout 1500 node $t.js > $OUT/before_$t.log 2>&1; echo "EXIT $?" >> $OUT/before_$t.log; echo "== $t (before): $(grep -E 'ERRORS|FAILS|RESULT' $OUT/before_$t.log | tail -1 | cut -c1-160) $(tail -1 $OUT/before_$t.log)" >> $OUT/summary.txt; done
cd $T3
timeout 2400 node docs/tools/v81/town81_test.js rivel_town,sentra_capital,magicka_city,volatilia,aruna_ruins,tradia > $OUT/town81_earth.log 2>&1; echo "== town81 earth: NG $(grep -c '^NG' $OUT/town81_earth.log) OK $(grep -c '^OK' $OUT/town81_earth.log)" >> $OUT/summary.txt
for a in 2d; do
  timeout 1500 node docs/tools/v81/remake81_check.js $a > $OUT/remake81_$a.log 2>&1; echo "== remake81 $a: $(tail -1 $OUT/remake81_$a.log)" >> $OUT/summary.txt
  timeout 1500 node docs/tools/v81/pocket81_check.js $a > $OUT/pocket81_$a.log 2>&1; echo "== pocket81 $a: $(tail -1 $OUT/pocket81_$a.log)" >> $OUT/summary.txt
  timeout 2400 node docs/tools/v81/town81_test.js rivel_town,sentra_capital,magicka_city,volatilia,aruna_ruins,tradia $a > $OUT/town81_$a.log 2>&1; echo "== town81 $a: NG $(grep -c '^NG' $OUT/town81_$a.log) OK $(grep -c '^OK' $OUT/town81_$a.log)" >> $OUT/summary.txt
done
for a in earth 2d; do x=$([ $a = 2d ] && echo 2d);
  timeout 1500 node docs/tools/v82/route82_test.js $x > $OUT/route82_$a.log 2>&1; echo "== route82 $a: $(head -1 $OUT/route82_$a.log)" >> $OUT/summary.txt
  FLAGS=palace_open timeout 1500 node docs/tools/v82/route82_test.js $x > $OUT/route82_palace_open_$a.log 2>&1; echo "== route82 palace_open $a: $(head -1 $OUT/route82_palace_open_$a.log)" >> $OUT/summary.txt
  timeout 1500 node docs/tools/v82/save82_test.js /home/claude/envsnap_a82before $x > $OUT/save82_$a.log 2>&1; echo "== save82 $a: $(tail -1 $OUT/save82_$a.log)" >> $OUT/summary.txt
  timeout 1500 node docs/tools/v82/switch82_test.js $x > $OUT/switch82_$a.log 2>&1; echo "== switch82 $a: $(tail -1 $OUT/switch82_$a.log)" >> $OUT/summary.txt
  timeout 1500 node docs/tools/v82/layout82_reach.js $x > $OUT/layout82_reach_$a.log 2>&1; echo "== layout82_reach $a: $(head -1 $OUT/layout82_reach_$a.log)" >> $OUT/summary.txt
  timeout 600 node docs/tools/v82/layout82_check.js $x > $OUT/layout82_check_$a.log 2>&1; echo "== layout82_check $a: $(head -1 $OUT/layout82_check_$a.log)" >> $OUT/summary.txt
done
FLAGS=palace_open timeout 1500 node docs/tools/v82/route82_test.js walk > $OUT/route82_walk.log 2>&1; echo "== route82 walk: $(grep '歩く確かめ' $OUT/route82_walk.log)" >> $OUT/summary.txt
timeout 600 node docs/tools/v82/theme82_diff.mjs > $OUT/theme82_diff.log 2>&1; echo "== theme82_diff: $(grep 'ちがう町どうしで' $OUT/theme82_diff.log)" >> $OUT/summary.txt
echo DONE >> $OUT/summary.txt
