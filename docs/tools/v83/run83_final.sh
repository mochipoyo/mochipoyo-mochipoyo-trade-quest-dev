#!/bin/bash
cd /home/claude/envwork/docs/tools
O=/home/claude/work/v83ver/final
mkdir -p $O
run() { local name=$1; shift; timeout 2400 "$@" > $O/$name.log 2>&1; local ec=$?; echo "== $name: $(grep -E '結果|部屋・地図|NG [0-9]|ちがう町|作り直した部屋|エラー|地図 [0-9]|歩く確かめ|errors \[|ERRORS' $O/$name.log | tail -2 | tr '\n' ' ' | cut -c1-260) EXIT $ec" >> $O/summary.txt; }
: > $O/summary.txt
run route83_earth node v83/route83_test.js
run route83_2d node v83/route83_test.js 2d
FLAGS=palace_open run route83_walk_po node v83/route83_test.js walk rivel_town,sentra_capital,magicka_city,volatilia
FLAGS=palace_open run route83_walk_po_2d node v83/route83_test.js 2d walk rivel_town,sentra_capital,magicka_city,volatilia
run remake83_earth node v83/remake81_check83.js ""
run remake83_2d node v83/remake81_check83.js "" 2d
run pocket83_earth node v83/pocket81_check83.js ""
run pocket83_2d node v83/pocket81_check83.js 2d
run town81_earth node v81/town81_test.js rivel_town,sentra_capital,magicka_city,volatilia,kalion_city "" palace_open=1
run town81_2d node v81/town81_test.js rivel_town,sentra_capital,magicka_city,volatilia,kalion_city 2d palace_open=1
run academy83_earth node v83/academy83_test.js
run academy83_2d node v83/academy83_test.js 2d
run tm83_place_earth node v83/tm83_place.js
run tm83_place_2d node v83/tm83_place.js 2d
run tm83_logic node v83/tm83_duel_logic.js
run navnew83 node v83/navnew83.js
run navnew83_2d node v83/navnew83.js 2d
run vol_migrate node v83/vol83_migrate_test.js /tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/vol_r811.json "" 1
run save82_earth node v82/save82_test.js /home/claude/envsnap_a82before
run save82_2d node v82/save82_test.js /home/claude/envsnap_a82before 2d
run save82_from82 node v82/save82_test.js /home/claude/envsnap_a82t5
run switch82_earth node v82/switch82_test.js
run layout82_reach_earth node v82/layout82_reach.js
run theme82_diff node v82/theme82_diff.mjs
cd /home/claude/work
for t in maptest ch67test ch1012test navtest; do RPG_DIR=/home/claude/envwork/ timeout 1500 node $t.js > $O/reg_$t.log 2>&1; echo "== reg $t: $(grep -E 'ERRORS|errors \[|fails' $O/reg_$t.log | tail -1 | cut -c1-200) EXIT $?" >> $O/summary.txt; done
echo DONE >> $O/summary.txt
